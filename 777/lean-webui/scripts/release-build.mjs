#!/usr/bin/env node
/**
 * release-build.mjs — the release bundle, cross-platform.
 *
 * `NEXT_OUTPUT=standalone next build` is a POSIX assignment: npm runs scripts
 * through cmd.exe on Windows, which cannot parse it (that is exactly how the
 * Windows CI job failed). So the environment is set here, where no shell is
 * involved, and `next` is spawned with it.
 */

import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const APP = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const env = {
  ...process.env,
  NEXT_OUTPUT: "standalone",
  NEXT_DIST_DIR: process.env.NEXT_DIST_DIR || ".next-standalone",
};

console.log("release-build: next build with NEXT_OUTPUT=standalone, distDir=" + env.NEXT_DIST_DIR);
const next = require.resolve("next/dist/bin/next");
const built = spawnSync(process.execPath, [next, "build"], {
  cwd: APP,
  env,
  stdio: "inherit",
});

if (built.status !== 0) {
  console.error("release-build: next build failed (" + built.status + ")");
  process.exit(built.status ?? 1);
}

// bundle.mjs assembles dist-app/ from what the build just wrote.
await import("./bundle.mjs");
