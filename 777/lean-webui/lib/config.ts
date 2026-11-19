/**
 * config.ts — the console's own settings (not the vault's).
 *
 * Today that is one thing: which vault the console runs against. It is stored
 * beside the app as .console.json (gitignored) and handed to the harness as
 * AISUPLEX_VAULT, the resolution rule the harness itself documents.
 */

import fs from "node:fs";
import path from "node:path";

export interface ConsoleConfig {
  vaultPath?: string;
}

/**
 * Where the setting is stored. `process.cwd()` is right for a checkout, but a
 * packaged app directory is read-only (AppImage is a mount, a .app is signed),
 * so the desktop shell passes CONSOLE_CONFIG pointing into user data.
 */
const FILE =
  process.env.CONSOLE_CONFIG?.trim() || path.join(process.cwd(), ".console.json");

export function readConfig(): ConsoleConfig {
  try {
    const raw = fs.readFileSync(FILE, "utf8");
    const parsed = JSON.parse(raw) as ConsoleConfig;
    return typeof parsed.vaultPath === "string" ? parsed : {};
  } catch {
    return {};
  }
}

export function writeConfig(next: ConsoleConfig): void {
  fs.writeFileSync(FILE, JSON.stringify(next, null, 2) + "\n");
}

export interface VaultCheck {
  ok: boolean;
  reason?: string;
}

/** A vault is a directory with the period.md marker — the harness's own test. */
export function checkVault(p: string): VaultCheck {
  if (!p || !p.trim()) return { ok: false, reason: "no path given" };
  const abs = path.resolve(p.trim().replace(/^~(?=\/)/, process.env.HOME ?? "~"));
  let st: fs.Stats;
  try {
    st = fs.statSync(abs);
  } catch {
    return { ok: false, reason: "that directory does not exist" };
  }
  if (!st.isDirectory()) return { ok: false, reason: "that path is a file, not a directory" };
  if (!fs.existsSync(path.join(abs, "period.md"))) {
    return { ok: false, reason: "no period.md in it — that is not an AI-Suplex vault" };
  }
  return { ok: true };
}

/** The env the harness child is spawned with: our vault setting wins. */
export function harnessEnv(): NodeJS.ProcessEnv {
  const cfg = readConfig();
  const env = { ...process.env };
  if (cfg.vaultPath) env.AISUPLEX_VAULT = cfg.vaultPath;
  return env;
}
