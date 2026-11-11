/**
 * contracts.test.ts — T040. Every dispatchable command has a content contract,
 * and every contract points at a real pattern.
 *
 * The point of the contract is that CONTENT stops being one generic line: Save
 * Context declares Thread · Instance · Writer, Session Start declares Task ID +
 * the tasklist. These tests keep the declaration honest and complete.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { CONTRACTS, contractFor, prefillField, withTypeAwareDefault } from "./contracts";
import { PROMPT_STAGE, type PrefillInput } from "../prompts";
import { fieldLine, lineCount, composeEnvelope } from "./envelope";

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
    return (JSON.parse(readFileSync(manifest, "utf8")) as { vault?: string }).vault ?? null;
  } catch {
    return null;
  }
}

function input(overrides: Partial<PrefillInput> = {}): PrefillInput {
  return { cycle: 3, week: 3, tasklists: [], threads: [], ...overrides };
}

describe("every dispatchable prompt has a contract", () => {
  it("covers exactly the nine prompts the catalogue exposes", () => {
    const prompts = Object.keys(PROMPT_STAGE).sort();
    const contracted = Object.keys(CONTRACTS).sort();
    assert.deepEqual(contracted, prompts);
  });

  it("every contract declares at least one field, and required fields teach their format", () => {
    for (const [name, contract] of Object.entries(CONTRACTS)) {
      assert.ok(contract.fields.length > 0, `${name} declares no fields`);
      assert.ok(contract.purpose.length > 10, `${name} has no purpose`);
      assert.match(contract.patternFile, /^Prompt Patterns\//, `${name} has no pattern doc`);
      for (const field of contract.fields) {
        assert.ok(field.key.length > 0);
        assert.ok(field.placeholder.startsWith("<"), `${name}/${field.key} placeholder must look unfilled`);
        assert.ok(field.hint.length > 5, `${name}/${field.key} needs a hint`);
        if (field.kind === "enum") assert.ok((field.options ?? []).length > 1);
      }
    }
  });

  it("Save Context reads 'Workspace' but emits 'Thread' (label ≠ key)", () => {
    const field = CONTRACTS["save-context"].fields.find((f) => f.key === "Thread");
    assert.ok(field, "save-context declares a Thread field");
    assert.equal(field.label, "Workspace");
    assert.equal(field.key, "Thread");
  });
});

const vault = vaultRoot();

describe("contracts point at real patterns", { skip: vault ? false : "no vault beside the harness" }, () => {
  it("every patternFile exists", () => {
    for (const [name, contract] of Object.entries(CONTRACTS)) {
      assert.ok(
        existsSync(path.join(vault as string, contract.patternFile)),
        `${name}: missing ${contract.patternFile}`,
      );
    }
  });
});

describe("prefill is true or empty, per field", () => {
  const active = {
    file: "2026-11-07-cycle-3-week-3-day-4-tasklist.md",
    title: "the day",
    status: "active" as const,
    tasks: 18,
    done: 8,
    next: "T042",
    nextTitle: "panel renders the contract's fields",
  };
  const thread = {
    thread: "project-tasks",
    ref: "9",
    slug: "777-command-panel",
    singleton: false,
    file: "project-tasks-9-777-command-panel.md",
    status: "open",
    opened: "2026-11-06T20:45",
    writer: "committer",
  };

  it("session-start prefills the next task and its tasklist", () => {
    const i = input({ tasklists: [active], threads: [thread] });
    assert.equal(prefillField("session-start", "Task ID", i), "T042");
    assert.equal(
      prefillField("session-start", "File Reference", i),
      "Tasklists/2026-11-07-cycle-3-week-3-day-4-tasklist.md",
    );
  });

  it("save-context prefills the lane only when the vault is unambiguous", () => {
    const one = input({ threads: [thread] });
    assert.equal(prefillField("save-context", "Thread", one), "project-tasks");
    assert.equal(prefillField("save-context", "Instance", one), "9 · 777-command-panel");
    assert.equal(prefillField("save-context", "Writer", one), "committer");

    // two open lanes: any pick would be a guess the operator must clear
    const two = input({ threads: [thread, { ...thread, thread: "random-tasks", ref: "1", slug: "quick-wins" }] });
    assert.equal(prefillField("save-context", "Thread", two), "");
    assert.equal(prefillField("save-context", "Instance", two), "");
    assert.equal(prefillField("save-context", "Writer", two), "");
  });

  it("a singleton lane has no instance ref", () => {
    const i = input({
      threads: [{ ...thread, thread: "daily-tasks", ref: null, slug: null, singleton: true, file: "daily-tasks.md" }],
    });
    assert.equal(input({ threads: [] }).threads.length, 0);
    assert.equal(prefillField("save-context", "Instance", i), "");
    assert.equal(prefillField("save-context", "Thread", i), "daily-tasks");
  });

  it("weekly-review prefills the identifier and leaves the data empty", () => {
    assert.equal(prefillField("weekly-review", "Raw Content", input()), "Cycle 3 · Week 3");
    assert.equal(prefillField("artifact-capture", "Source", input()), "");
  });
});

describe("composition honours the declared shape", () => {
  it("Save Context is seven lines, Tasklist Generation six", () => {
    const save = CONTRACTS["save-context"];
    const saveLines = save.fields.map((f) => fieldLine(f.key, "", f.placeholder));
    assert.equal(lineCount(composeEnvelope("Save Context", saveLines, "")), 7);

    const gen = CONTRACTS["tasklist-generation"];
    const genLines = gen.fields.map((f) => fieldLine(f.key, "", f.placeholder));
    assert.equal(lineCount(composeEnvelope("Tasklist Generation", genLines, "")), 6);
  });

  it("contractFor finds a command and rejects an unknown one", () => {
    assert.equal(contractFor("save-context")?.name, "save-context");
    assert.equal(contractFor("nope"), undefined);
  });
});

describe("the create/execute guardrail (Define ≠ Kickstart)", () => {
  it("Define declares the creation fields Kickstart lacks, and vice versa", () => {
    const defineKeys = CONTRACTS["define-workspace"].fields.map((f) => f.key);
    const kickKeys = CONTRACTS["kickstart-workspace"].fields.map((f) => f.key);

    for (const k of ["Title", "Mission", "Outcome", "Tasks", "Create Tasklist"]) {
      assert.ok(defineKeys.includes(k), `define-workspace declares ${k}`);
      assert.ok(!kickKeys.includes(k), `kickstart-workspace must NOT declare ${k}`);
    }
    assert.ok(kickKeys.includes("Workspace"), "kickstart-workspace declares Workspace");
    assert.ok(!defineKeys.includes("Workspace"), "define-workspace must NOT declare Workspace");
  });
});

describe("withTypeAwareDefault — the type-aware Create Tasklist", () => {
  it("sets YES for Daily Work and Project", () => {
    assert.equal(withTypeAwareDefault("define-workspace", "Workspace Type", "Daily Work", {})["Create Tasklist"], "YES");
    assert.equal(withTypeAwareDefault("define-workspace", "Workspace Type", "Project", {})["Create Tasklist"], "YES");
  });

  it("sets NO for Quick Task and Review", () => {
    assert.equal(withTypeAwareDefault("define-workspace", "Workspace Type", "Quick Task", {})["Create Tasklist"], "NO");
    assert.equal(withTypeAwareDefault("define-workspace", "Workspace Type", "Review", {})["Create Tasklist"], "NO");
  });

  it("leaves Create Tasklist alone on other fields or commands", () => {
    assert.deepEqual(withTypeAwareDefault("define-workspace", "Title", "x", {}), { Title: "x" });
    assert.deepEqual(withTypeAwareDefault("kickstart-workspace", "Workspace Type", "Project", {}), { "Workspace Type": "Project" });
  });
});
