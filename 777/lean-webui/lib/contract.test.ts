/**
 * contract.test.ts — the drift guard: what the UI can call must exist on
 * `contract.json`. A tool or prompt the console shows but the contract does not
 * own is a fabricated capability, so this test fails loudly instead of letting
 * it render.
 *
 * Static: it reads the app's own source for `callTool("<name>"` sites plus the
 * declared prompt/resource maps. It never starts the MCP server.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { PROMPT_STAGE } from "./prompts";
import { RESOURCE_URIS } from "./mcp/resources";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const APP = path.resolve(HERE, "..");
const HARNESS =
  process.env.HARNESS_PATH ??
  path.resolve(APP, "..", "..", "..", "ai-suplex-harness", "server.js");

function vaultRoot(): string | null {
  if (process.env.SUPLEX_VAULT) return process.env.SUPLEX_VAULT;
  const manifest = path.join(path.dirname(HARNESS), "vault.json");
  if (!existsSync(manifest)) return null;
  try {
    const parsed = JSON.parse(readFileSync(manifest, "utf8")) as { vault?: string };
    return parsed.vault ?? null;
  } catch {
    return null;
  }
}

interface Contract {
  contract: string;
  tier: string;
  resources: string[];
  tools: string[];
  prompts: string[];
}

function contract(): { path: string; data: Contract } | null {
  const vault = vaultRoot();
  if (!vault) return null;
  const file = path.join(vault, "contract.json");
  if (!existsSync(file)) return null;
  return { path: file, data: JSON.parse(readFileSync(file, "utf8")) as Contract };
}

/** Every `callTool("<name>"` the app actually ships. */
function toolCallSites(): string[] {
  const names = new Set<string>();
  const roots = ["app", "lib", "components"].map((d) => path.join(APP, d));
  const files: string[] = [];
  for (const root of roots) {
    if (!existsSync(root)) continue;
    for (const entry of readdirSync(root, { recursive: true, withFileTypes: true })) {
      if (!entry.isFile()) continue;
      if (!/\.(ts|tsx)$/.test(entry.name)) continue;
      if (/\.test\.tsx?$/.test(entry.name)) continue;
      files.push(path.join(entry.parentPath ?? root, entry.name));
    }
  }
  for (const file of files) {
    const source = readFileSync(file, "utf8");
    for (const match of source.matchAll(/callTool\(\s*"([a-z0-9_]+)"/g)) {
      names.add(match[1]);
    }
  }
  return [...names].sort();
}

const found = contract();

if (!found) {
  describe("contract subset — SKIPPED", () => {
    it("no contract.json was found beside the harness (set SUPLEX_VAULT)", () => {
      assert.ok(true, "skipped: point SUPLEX_VAULT at the vault to enable the guard");
    });
  });
} else {
  describe("contract subset — the UI never invents a capability", () => {
    it("every tool the app calls exists in contract.json", () => {
      const called = toolCallSites();
      assert.ok(called.length > 0, "no callTool() sites found — the scan is broken");
      const unknown = called.filter((n) => !found.data.tools.includes(n));
      assert.deepEqual(unknown, [], `tools missing from contract.json: ${unknown.join(", ")}`);
    });

    it("every prompt the catalogue exposes exists in contract.json", () => {
      const exposed = Object.keys(PROMPT_STAGE);
      const unknown = exposed.filter((n) => !found.data.prompts.includes(n));
      assert.deepEqual(unknown, [], `prompts missing from contract.json: ${unknown.join(", ")}`);
    });

    it("every static resource the app reads exists in contract.json", () => {
      const statics = Object.values(RESOURCE_URIS)
        .map((uri) => uri.replace("suplex://", ""))
        .filter((p) => !p.includes("/")); // memory/* are nested; tasklist/* is dynamic
      const unknown = statics.filter((p) => !found.data.resources.includes(p));
      assert.deepEqual(unknown, [], `resources missing from contract.json: ${unknown.join(", ")}`);
    });

    it("the console is on the free tier it claims", () => {
      assert.equal(found.data.contract, "mcp v1");
      assert.equal(found.data.tier, "free");
    });
  });
}
