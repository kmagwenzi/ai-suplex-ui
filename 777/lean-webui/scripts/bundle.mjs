#!/usr/bin/env node
/**
 * bundle.mjs — assemble the folder the desktop shell ships.
 *
 * A Next standalone build is not self-sufficient: it expects `static/` beside
 * the server it copied, and this app is useless without the MCP harness to talk
 * to. So the artefact is three trees in one directory:
 *
 *   dist-app/
 *     server.js  .next-standalone/  node_modules/   <- the console (Next standalone)
 *     harness/                                      <- mcp v1, dependency-free
 *     sample-vault/                                 <- a first run that works
 *
 * Nothing here is invented: the harness is copied from its repo, never rebuilt,
 * so the shipped server cannot drift from the one the tests exercised.
 */

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const APP = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIST = process.env.NEXT_DIST_DIR || ".next-standalone";
const OUT = path.join(APP, "dist-app");
const HARNESS = process.env.HARNESS_SRC
  ? path.resolve(process.env.HARNESS_SRC)
  : path.resolve(APP, "..", "..", "..", "ai-suplex-harness");

function fail(message) {
  console.error("bundle: " + message);
  process.exit(1);
}

function copy(from, to, filter) {
  if (!fs.existsSync(from)) fail("missing " + from);
  fs.cpSync(from, to, { recursive: true, filter, force: true });
}

const standalone = path.join(APP, DIST, "standalone");
if (!fs.existsSync(path.join(standalone, "server.js"))) {
  fail(
    "no " + DIST + "/standalone/server.js — build first:\n" +
      "  NEXT_OUTPUT=standalone NEXT_DIST_DIR=" + DIST + " npm run build",
  );
}
if (!fs.existsSync(path.join(HARNESS, "server.js"))) {
  fail("no MCP harness at " + HARNESS + " (set HARNESS_SRC)");
}

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

// 1 — the console: the server tree, then the static assets it expects beside it.
copy(standalone, OUT);
copy(path.join(APP, DIST, "static"), path.join(OUT, DIST, "static"));

// 2 — the harness. Its vault.json is the developer's local link; it must not
//     travel — the packaged app resolves the vault from the console setting.
copy(HARNESS, path.join(OUT, "harness"), (src) => {
  const rel = path.relative(HARNESS, src);
  if (rel === "") return true;
  const [top] = rel.split(path.sep);
  return top !== "vault.json" && top !== "node_modules" && top !== "test" && top !== ".git";
});

// 3 — a first run that opens on something real. Next's tracer usually copies
//     this already; only fill the gap, never nest a second copy inside it.
const sample = path.join(APP, "sample-vault");
const sampleOut = path.join(OUT, "sample-vault");
if (fs.existsSync(path.join(sample, "period.md")) && !fs.existsSync(path.join(sampleOut, "period.md"))) {
  copy(sample, sampleOut);
}

// 4 — the sample vault is a fixture without the framework CLI, and the harness
//     loads Tools/paths.js *from the vault*. Take the shipped Tools from the
//     777 edition at assembly time — one source of truth, never a second copy in
//     this repo.
const TOOLS = process.env.TOOLS_SRC
  ? path.resolve(process.env.TOOLS_SRC)
  : path.resolve(APP, "..", "..", "..", "777-Edition", "AI-Suplex-777", "Tools");
if (fs.existsSync(path.join(sampleOut, "period.md"))) {
  if (fs.existsSync(path.join(TOOLS, "paths.js"))) {
    if (!fs.existsSync(path.join(sampleOut, "Tools", "paths.js"))) {
      copy(TOOLS, path.join(sampleOut, "Tools"));
    }
  } else {
    console.warn("bundle: no framework Tools at " + TOOLS + " — the sample vault will not answer");
  }
}

const pkg = JSON.parse(fs.readFileSync(path.join(APP, "package.json"), "utf8"));
let commit = "unknown";
try {
  commit = execFileSync("git", ["-C", APP, "rev-parse", "--short", "HEAD"], { encoding: "utf8" }).trim();
} catch {
  /* not a checkout — a build from an archive has no commit */
}

fs.writeFileSync(
  path.join(OUT, "BUILD.txt"),
  [
    pkg.description,
    "version   " + pkg.version,
    "commit    " + commit,
    "built     " + new Date().toISOString(),
    "console   " + DIST + "/standalone (Next " + pkg.dependencies.next + ")",
    "harness   " + path.basename(HARNESS),
    "",
    "The console reads a vault through the MCP harness and writes nothing outside",
    "it. Settings live in the app's user-data directory, not here.",
    "",
  ].join("\n"),
);

const size = (p) => {
  let total = 0;
  for (const entry of fs.readdirSync(p, { withFileTypes: true })) {
    const child = path.join(p, entry.name);
    if (entry.isDirectory()) total += size(child);
    else if (entry.isFile()) total += fs.statSync(child).size;
  }
  return total;
};

console.log("bundle: " + path.relative(process.cwd(), OUT) + " — " + (size(OUT) / 1e6).toFixed(1) + " MB");
console.log("bundle: server.js + " + DIST + " + harness + sample-vault, commit " + commit);
