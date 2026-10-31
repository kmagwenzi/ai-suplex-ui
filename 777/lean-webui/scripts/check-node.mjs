#!/usr/bin/env node
/**
 * Node 20 preflight — fail loudly, before dev/build, on an unsupported runtime.
 *
 * AI-Suplex 777 runs on Node >= 20 with no `node:sqlite` on the free path.
 * This gate stops the build on Node < 20 and greps the app for `node:sqlite`.
 */
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const REQUIRED_MAJOR = 20;
const major = Number(process.versions.node.split(".")[0]);

if (!Number.isInteger(major) || major < REQUIRED_MAJOR) {
  console.error(
    `lean-webui requires Node >= ${REQUIRED_MAJOR}. You are on ${process.version}.\n` +
      `Install Node ${REQUIRED_MAJOR}+ and retry.`,
  );
  process.exit(1);
}

// Prove no node:sqlite import anywhere in the app source (deps + build + this
// gate script are excluded; the gate itself names the thing it guards against).
const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
try {
  const out = execFileSync(
    "grep",
    ["-rn", "--include=*.ts", "--include=*.tsx", "-E", "node:sqlite", "app", "lib", "components"],
    { cwd: appRoot, encoding: "utf8" },
  );
  if (out.trim()) {
    console.error(`node:sqlite found on the free path — not allowed:\n${out}`);
    process.exit(1);
  }
} catch (e) {
  if (e && typeof e === "object" && "status" in e && e.status !== 1) {
    throw e;
  }
  // grep exit 1 = no matches = clean.
}

console.log(`Node ${process.version} — ok (>= ${REQUIRED_MAJOR}), no node:sqlite.`);
