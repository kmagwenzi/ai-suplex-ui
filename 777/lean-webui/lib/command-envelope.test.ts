/**
 * command-envelope.test.ts — T029's findings, re-pinned after T032.
 *
 * Finding 1 (the documentation dump) is now **structurally fixed**: the panel
 * composes through `lib/command/envelope.ts` and has no path to a pattern body.
 * These tests go red again the moment someone re-introduces one — that is their
 * whole job, so they assert the *source*, not just the output.
 *
 * Finding 3 (a prefill must resolve) stays red until T033.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { composeCommand, lineCount } from "./command/envelope";
import { prefillFor, vaultFileOptions, type PrefillInput } from "./prompts";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PANEL = readFileSync(path.resolve(HERE, "..", "components", "command-catalogue.tsx"), "utf8");

function input(overrides: Partial<PrefillInput> = {}): PrefillInput {
  return { cycle: 3, week: 3, tasklists: [], threads: [], ...overrides };
}

describe("T029/1 — the panel has no path to the pattern document", () => {
  it("composes through the envelope, and fetches no body", () => {
    assert.ok(
      PANEL.includes('from "@/lib/command/envelope"'),
      "the panel must compose through lib/command/envelope",
    );
    assert.ok(PANEL.includes("composeCommand("), "the panel must call composeCommand");
    assert.ok(!PANEL.includes("/api/prompt"), "the panel must not fetch a pattern body");
    assert.ok(!PANEL.includes("composePrompt("), "the panel must not patch a document");
  });

  it("the composed command is five lines, not eight kilobytes", () => {
    const out = composeCommand(
      "Artifact Capture",
      { type: "chat-reference", value: "the T029 browser run" },
      "",
    );
    assert.equal(lineCount(out), 5);
    assert.ok(!out.includes("Prompt Pattern"));
    assert.ok(out.length < 300);
  });
});

describe("T029/2 — the field is the truth", () => {
  it("changing the source changes the command (guard)", () => {
    const a = composeCommand("Session Start", { type: "vault-file", value: "Tasklists/a.md" }, "");
    const b = composeCommand("Session Start", { type: "vault-file", value: "Tasklists/b.md" }, "");
    assert.notEqual(a, b);
    assert.ok(a.includes("  - File Reference: Tasklists/a.md"));
  });

  it("changing ADDITIONAL changes the command (guard)", () => {
    const a = composeCommand("Weekly Review", { type: null, value: "" }, "Save to Reviews/");
    const b = composeCommand("Weekly Review", { type: null, value: "" }, "Skip memory loop");
    assert.notEqual(a, b);
  });
});

describe("T029/3 — a prefill must resolve", () => {
  it("a vault-file prefill is a path, never a bare basename", () => {
    const p = prefillFor(
      "save-context",
      input({
        threads: [
          {
            thread: "daily-tasks",
            ref: null,
            slug: null,
            singleton: true,
            file: "daily-tasks.md",
            status: "open",
            opened: "2026-11-06T09:00",
          },
        ],
      }),
    );
    assert.equal(p.type, "vault-file");
    assert.match(
      p.value,
      /^(Tasklists|Context Kick-start|Memory|Artifacts|B-Bombs|Sessions|AI-Suplex Kick-start)\//,
      `prefill "${p.value}" is not a resolvable vault path`,
    );
  });

  it("every vault-file prefill is also offered by the picker (guard)", () => {
    const inputs = input({
      tasklists: [{ file: "2026-11-06-a.md", title: "A", status: "active", tasks: 3, done: 0 }],
      threads: [
        {
          thread: "project-tasks",
          ref: "9",
          slug: "777-command-panel",
          singleton: false,
          file: "project-tasks-9-777-command-panel.md",
          status: "open",
          opened: "2026-11-06T20:45",
        },
      ],
    });
    const offered = new Set(vaultFileOptions(inputs).map((o) => o.path));
    for (const name of ["session-start", "save-context"]) {
      const p = prefillFor(name, inputs);
      if (p.type !== "vault-file") continue;
      assert.ok(offered.has(p.value), `${name}: prefilled "${p.value}" is not in the picker`);
    }
  });
});
