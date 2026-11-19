"use strict";

/**
 * main.js — the desktop shell.
 *
 * The console is a Next server that talks to the MCP harness over stdio. The
 * shell does three things and nothing else:
 *
 *   1. start that server on a free loopback port,
 *   2. hand it the harness it must spawn, and a writable config path,
 *   3. open a window on it — and kill the server when the window closes.
 *
 * Both children run on Electron's own Node (`ELECTRON_RUN_AS_NODE`), so the
 * package ships one runtime, not two. That is also why the harness's own
 * `spawnSync(process.execPath, [Tools/3lm.js])` keeps working unchanged.
 */

const { app, BrowserWindow, Menu, dialog, ipcMain, shell } = require("electron");
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const http = require("node:http");
const net = require("node:net");
const path = require("node:path");

const IS_DEV = !app.isPackaged;
const APP_ID = "co.zw.ai-suplex.console";

let server = null;
let window = null;
let baseUrl = null;
let quitting = false;

/**
 * stdout is block-buffered when the app is launched from a launcher rather than
 * a terminal, so a crash early in boot can leave no trace at all. This records
 * every line to a file as well — the first thing to ask for in a bug report.
 */
function log(line) {
  console.log(line);
  try {
    const file = path.join(app.getPath("userData"), "shell.log");
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.appendFileSync(file, new Date().toISOString() + "  " + line + "\n");
  } catch {
    /* logging must never be the reason the app fails */
  }
}

/** The built console: the standalone output, assembled by scripts/bundle.mjs. */
function consoleRoot() {
  return IS_DEV
    ? path.join(__dirname, "..", "dist-app")
    : path.join(process.resourcesPath, "app");
}

/**
 * The MCP harness — assembled **inside** the app tree by scripts/bundle.mjs, or
 * the sibling repo in development. (It was `resources/harness` once; that is
 * beside the app, not in it, and the packaged app could not find it.)
 */
function harnessRoot() {
  if (process.env.HARNESS_PATH) return path.dirname(process.env.HARNESS_PATH);
  return IS_DEV
    ? path.resolve(__dirname, "..", "..", "..", "..", "ai-suplex-harness")
    : path.join(consoleRoot(), "harness");
}

/**
 * The console's own settings file. A packaged app directory is read-only
 * (AppImage is a mount, a .app is signed), so the setting lives in userData and
 * the server is told where it is.
 */
function configPath() {
  return path.join(app.getPath("userData"), ".console.json");
}

/**
 * First run has no vault. Rather than open on an error, point at a copy of the
 * sample vault so the console is alive — and writable, which the bundled copy is
 * not. /setup is one field away from the real one.
 */
function defaultVault() {
  const cfg = readConfig();
  if (cfg.vaultPath) return null;
  if (process.env.AISUPLEX_VAULT) return null;

  const bundled = path.join(consoleRoot(), "sample-vault");
  if (!fs.existsSync(path.join(bundled, "period.md"))) return null;

  const copy = path.join(app.getPath("userData"), "sample-vault");
  if (!fs.existsSync(path.join(copy, "period.md"))) {
    fs.mkdirSync(copy, { recursive: true });
    fs.cpSync(bundled, copy, { recursive: true });
  }
  return copy;
}

function readConfig() {
  try {
    return JSON.parse(fs.readFileSync(configPath(), "utf8"));
  } catch {
    return {};
  }
}

function freePort() {
  return new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.unref();
    probe.on("error", reject);
    probe.listen(0, "127.0.0.1", () => {
      const { port } = probe.address();
      probe.close(() => resolve(port));
    });
  });
}

/** Poll until the server answers, or give up with a sentence a human can read. */
function waitFor(url, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    const attempt = () => {
      const req = http.get(url, (res) => {
        res.resume();
        resolve();
      });
      req.on("error", () => {
        if (Date.now() > deadline) {
          reject(new Error("The console's server did not answer within " + Math.round(timeoutMs / 1000) + "s."));
          return;
        }
        setTimeout(attempt, 200);
      });
      req.setTimeout(3000, () => req.destroy());
    };
    attempt();
  });
}

function startServer(port, vault) {
  const root = consoleRoot();
  const entry = path.join(root, "server.js");
  if (!fs.existsSync(entry)) {
    throw new Error("The console build is missing: " + entry);
  }

  const env = {
    ...process.env,
    ELECTRON_RUN_AS_NODE: "1",
    NODE_ENV: "production",
    PORT: String(port),
    HOSTNAME: "127.0.0.1",
    CONSOLE_CONFIG: configPath(),
    HARNESS_PATH: path.join(harnessRoot(), "server.js"),
  };
  if (vault) env.AISUPLEX_VAULT = vault;

  log("spawning " + entry + " on port " + port);
  const child = spawn(process.execPath, [entry], {
    cwd: root,
    env,
    stdio: ["ignore", "pipe", "pipe"],
  });

  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  const relay = (tag) => (chunk) => {
    for (const line of chunk.split("\n")) {
      if (line.trim()) log(tag + ": " + line.trim());
    }
  };
  child.stdout.on("data", relay("console"));
  child.stderr.on("data", relay("console!"));

  child.on("exit", (code, signal) => {
    if (quitting) return;
    log("the console server exited: " + (signal || "code " + code));
    server = null;
    if (window && !window.isDestroyed()) window.destroy();
    dialog.showErrorBox(
      "The console stopped",
      "Its server exited (" + (signal || "code " + code) + "). Restart the app.",
    );
    app.quit();
  });

  return child;
}

function stopServer() {
  if (!server) return;
  const child = server;
  server = null;
  try {
    child.kill("SIGTERM");
  } catch {
    /* already gone */
  }
  const kill = setTimeout(() => {
    try {
      child.kill("SIGKILL");
    } catch {
      /* already gone */
    }
  }, 2000);
  kill.unref();
}

/** Links leave the app; they never navigate the window away from the console. */
function hardenNavigation(webContents, appOrigin) {
  const origin = new URL(appOrigin).origin;
  webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/i.test(url)) shell.openExternal(url);
    return { action: "deny" };
  });
  webContents.on("will-navigate", (event, url) => {
    if (new URL(url).origin === origin) return;
    event.preventDefault();
    if (/^https?:/i.test(url)) shell.openExternal(url);
  });
}

async function boot() {
  log("app=" + consoleRoot());
  log("harness=" + harnessRoot());
  log("config=" + configPath());
  const port = await freePort();
  const vault = defaultVault();
  server = startServer(port, vault);

  baseUrl = "http://127.0.0.1:" + port;
  await waitFor(baseUrl + "/api/health", 90000);
  // First run has no setting: open on Setup, where the picker is, instead of
  // pretending the bundled sample vault is the user's own work.
  await openWindow(fs.existsSync(configPath()) ? "/" : "/setup");
}

async function openWindow(route = "/") {
  window = new BrowserWindow({
    width: 1280,
    height: 880,
    minWidth: 960,
    minHeight: 640,
    backgroundColor: "#f6f4f0",
    title: "AI-Suplex 777 Console",
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  const self = window;
  self.once("ready-to-show", () => self.show());
  self.on("closed", () => {
    if (window === self) window = null;
  });
  hardenNavigation(self.webContents, baseUrl);
  await self.loadURL(baseUrl + route);
}

/**
 * The one thing the page cannot do for itself: open a native folder chooser.
 * Everything else stays in the web layer — the picker only names a directory,
 * and the console's own API still validates it (period.md) and stores it.
 */
ipcMain.handle("suplex:pick-vault", async () => {
  const parent = window && !window.isDestroyed() ? window : undefined;
  const picked = await dialog.showOpenDialog(parent, {
    title: "Choose your AI-Suplex vault",
    buttonLabel: "Use this vault",
    properties: ["openDirectory"],
    message: "Pick the folder that holds period.md",
  });
  if (picked.canceled || picked.filePaths.length === 0) return null;
  return picked.filePaths[0];
});

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (!window) return;
    if (window.isMinimized()) window.restore();
    window.focus();
  });

  app.setAppUserModelId(APP_ID);

  app.whenReady().then(async () => {
    if (process.platform !== "darwin") Menu.setApplicationMenu(null);
    try {
      await boot();
    } catch (error) {
      log("boot failed: " + (error && error.stack ? error.stack : error));
      dialog.showErrorBox(
        "The console could not start",
        (error && error.message ? error.message : String(error)) + "\n\nBuild it first: npm run bundle",
      );
      quitting = true;
      stopServer();
      app.quit();
    }
  });

  // macOS: the dock icon re-opens a window on the server that is already running.
  app.on("activate", () => {
    if (window || BrowserWindow.getAllWindows().length > 0) return;
    if (server && baseUrl) openWindow("/").catch(() => app.quit());
  });

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
  });

  app.on("before-quit", () => {
    quitting = true;
    stopServer();
  });
}
