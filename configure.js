#!/usr/bin/env node
"use strict";

/**
 * configure.js — print the AI-Suplex MCP registration with absolute paths.
 *
 * Works co-located (Tools/mcp/aionui/ inside the vault) AND extracted (its own repo):
 *   node configure.js                                          # co-located: walk up to the vault
 *   node configure.js --vault /path/to/AI-Suplex-777            # explicit vault
 *   node configure.js --vault <v> --server /path/to/harness/server.js
 *
 * No side effects: it prints the JSON + the AionUI UI steps.
 */

const fs = require("fs");
const path = require("path");

const argv = process.argv.slice(2);
function opt(name) {
  const i = argv.indexOf("--" + name);
  return i > -1 ? argv[i + 1] : null;
}

function walkUp() {
  let dir = __dirname;
  for (;;) {
    if (fs.existsSync(path.join(dir, "period.md"))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

const VAULT = opt("vault") || process.env.AISUPLEX_VAULT || walkUp();
if (!VAULT) {
  console.error("Could not find the vault. Pass it: node configure.js --vault /path/to/AI-Suplex-777");
  process.exit(2);
}
const SERVER = opt("server") || path.join(VAULT, "Tools", "mcp", "server.js");
const V = path.resolve(VAULT);

const config = {
  mcpServers: {
    "ai-suplex": {
      command: "node",
      args: [SERVER],
      env: { AISUPLEX_VAULT: V },
    },
  },
};

console.log("AI-Suplex MCP registration — paste into AionUI's unified MCP management,");
console.log("or save as your client's mcp.json:\n");
console.log(JSON.stringify(config, null, 2));
console.log("\nUI path: Settings → MCP → Add server");
console.log("  Name:      ai-suplex");
console.log("  Command:   node");
console.log("  Args:      " + SERVER);
console.log("  Transport: stdio");
console.log("  Env:       AISUPLEX_VAULT=" + V);
console.log("\nVerify: open `suplex://context`, then call `suplex_status`.");
