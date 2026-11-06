/**
 * catalogue.test.ts — T034. The catalogue is complete, and its declared
 * metadata is true.
 *
 * Two properties:
 *   1. **Partition** — every `⚡ Command — *.md` in the vault is accounted for
 *      exactly once: dispatchable · copy-only · Ultra-only · deprecated. A
 *      command can be hidden on purpose; it can never be lost by accident.
 *   2. **Parity** — `PROMPT_MEMORY_LOOP` still says what the live patterns say.
 *      The page stopped reading seven bodies to label a field; this test reads
 *      them so the label cannot drift.
 */

import { after, describe, it } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  COPY_ONLY_COMMANDS,
  DEPRECATED_COMMANDS,
  PROMPT_MEMORY_LOOP,
  ULTRA_ONLY_COMMANDS,
  memoryLoopKind,
} from "./prompts";
import { getClient, harnessPath } from "./mcp/client";
import { getPromptText } from "./mcp/prompts";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const APP = path.resolve(HERE, "..");
const HARNESS =
  process.env.HARNESS_PATH ??
  path.resolve(APP, "..", "..", "..", "ai-suplex-harness", "server.js");
const COMMANDS_DIR = "Prompt Patterns/AI-Suplex Commands";

/** The three command docs the seven prompts dispatch (the rest are patterns). */
const DISPATCHABLE_COMMAND_FILES = [
  `${COMMANDS_DIR}/⚡ Command — Session End Report.md`,
  `${COMMANDS_DIR}/⚡ Command — Save Context.md`,
  `${COMMANDS_DIR}/⚡ Command — Tasklist Generation.md`,
];

function vaultRoot(): string | null {
  if (process.env.SUPLEX_VAULT) return process.env.SUPLEX_VAULT;
  const manifest = path.join(path.dirname(HARNESS), "vault.json");
  if (!existsSync(manifest)) return null;
  try {
    return (JSON.parse(readFileSync(manifest, "utf8")) as { vault?: string }).vault ?? null;
  } catch {
    return null;
  }
}

const vault = vaultRoot();
const available = vault !== null && existsSync(path.join(vault, COMMANDS_DIR));

if (!available) {
  describe("catalogue — SKIPPED", () => {
    it("no vault beside the harness (set SUPLEX_VAULT)", () => {
      assert.ok(true, "skipped");
    });
  });
} else {
  const files = readdirSync(path.join(vault, COMMANDS_DIR))
    .filter((f) => f.startsWith("⚡ Command — ") && f.endsWith(".md"))
    .map((f) => `${COMMANDS_DIR}/${f}`)
    .sort();

  const buckets: Record<string, string[]> = {
    dispatchable: DISPATCHABLE_COMMAND_FILES,
    "copy-only": COPY_ONLY_COMMANDS.map((c) => c.link).filter((l) => l.includes("⚡ Command")),
    "ultra-only": ULTRA_ONLY_COMMANDS.map((c) => c.link),
    deprecated: DEPRECATED_COMMANDS.map((c) => c.link),
  };

  describe("the catalogue partitions the vault exactly", () => {
    it("every command doc is in exactly one bucket", () => {
      assert.ok(files.length >= 20, `expected the vault's command docs, found ${files.length}`);
      for (const file of files) {
        const owners = Object.entries(buckets)
          .filter(([, links]) => links.includes(file))
          .map(([name]) => name);
        assert.equal(
          owners.length,
          1,
          `${file} is in ${owners.length} buckets (${owners.join(", ") || "none"}) — it must be in exactly one`,
        );
      }
    });

    it("nothing is invented: every listed link exists on disk", () => {
      for (const c of [...COPY_ONLY_COMMANDS, ...ULTRA_ONLY_COMMANDS, ...DEPRECATED_COMMANDS]) {
        assert.ok(existsSync(path.join(vault, c.link)), `missing command doc: ${c.link}`);
      }
    });

    it("no copy-only row duplicates a dispatchable trigger", () => {
      const dispatchable = new Set([
        "AI-Suplex: Session End Report",
        "AI-Suplex: Save Context",
        "AI-Suplex: Tasklist Generation",
      ]);
      for (const c of COPY_ONLY_COMMANDS) {
        assert.ok(!dispatchable.has(c.trigger), `${c.trigger} is dispatchable, not copy-only`);
      }
    });

    it("every copy-only row has a trigger and a unique path", () => {
      const links = new Set<string>();
      for (const c of COPY_ONLY_COMMANDS) {
        assert.match(c.trigger, /^AI-Suplex: .+/);
        assert.ok(!links.has(c.link), `duplicate link: ${c.link}`);
        links.add(c.link);
      }
    });
  });
}

describe("declared metadata is still true", { skip: existsSync(HARNESS) ? false : "no harness" }, () => {
  after(() => {
    const internal = getClient() as unknown as { proc: { kill: (s?: string) => boolean } | null };
    internal.proc?.kill("SIGKILL");
  });

  it("PROMPT_MEMORY_LOOP matches every live pattern", async () => {
    for (const [name, declared] of Object.entries(PROMPT_MEMORY_LOOP)) {
      const { text } = await getPromptText(name);
      assert.equal(
        memoryLoopKind(text),
        declared,
        `${name}: the pattern says ${memoryLoopKind(text)}, the console declares ${declared}`,
      );
    }
  });
});
