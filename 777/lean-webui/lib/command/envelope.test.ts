/**
 * envelope.test.ts — T031. The five-line contract, pinned.
 *
 * These are the properties the panel (T032) and the prefill (T033) will rely on:
 * the envelope is short, it is built from fields, and it can never carry a
 * document — there is no parameter through which one could arrive.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  bareCommandName,
  baseTemplate,
  composeCommand,
  isEmptySelection,
  isSourceType,
  lineCount,
  retargetSourceValue,
  SOURCE_LABEL,
} from "./envelope";

describe("the envelope is five lines", () => {
  it("an unfilled command is exactly five non-empty lines", () => {
    const out = baseTemplate("Artifact Capture");
    assert.equal(lineCount(out), 5);
    assert.equal(
      out,
      [
        "AI-Suplex: Artifact Capture",
        "CONTENT",
        "  - <Source type>: <value>",
        "",
        "ADDITIONAL: <instructions>",
      ].join("\n"),
    );
  });

  it("a filled command is still five lines", () => {
    const out = composeCommand(
      "Artifact Capture",
      { type: "chat-reference", value: "the T029 browser run" },
      "Save to Artifacts/Cycle 3/",
    );
    assert.equal(lineCount(out), 5);
    assert.ok(out.includes("  - Chat Reference: the T029 browser run"));
    assert.ok(out.includes("ADDITIONAL: Save to Artifacts/Cycle 3/"));
    assert.ok(out.length < 300, "a command is a command, not a document");
  });
});

describe("fields are the only inputs", () => {
  it("an empty source leaves the placeholder, it does not guess", () => {
    for (const source of [
      { type: null, value: "" },
      { type: "vault-file" as const, value: "   " },
      { type: null, value: "something" },
    ]) {
      const out = composeCommand("Weekly Review", source, "");
      assert.ok(out.includes("  - <Source type>: <value>"), JSON.stringify(source));
      assert.ok(isEmptySelection(source));
    }
  });

  it("each source type is labelled in full", () => {
    for (const type of ["vault-file", "raw", "chat-reference"] as const) {
      const out = composeCommand("Note Capture", { type, value: "X" }, "");
      assert.ok(out.includes(`  - ${SOURCE_LABEL[type]}: X`));
    }
  });

  it("changing any field changes the command", () => {
    const base = "Artifact Capture";
    const a = composeCommand(base, { type: "raw", value: "one" }, "");
    const b = composeCommand(base, { type: "raw", value: "two" }, "");
    const c = composeCommand(base, { type: "raw", value: "one" }, "Skip memory loop");
    assert.notEqual(a, b);
    assert.notEqual(a, c);
  });

  it("trims what it is given", () => {
    const out = composeCommand("Note Capture", { type: "raw", value: "  hello  " }, "  Save to X  ");
    assert.ok(out.includes("  - Raw Content: hello"));
    assert.ok(out.includes("ADDITIONAL: Save to X"));
  });
});

describe("the name normalises, the prefix never doubles", () => {
  it("accepts a bare name, a full trigger, or a rendered heading", () => {
    const expected = "AI-Suplex: Session Start";
    assert.equal(bareCommandName("Session Start"), "Session Start");
    assert.equal(bareCommandName("AI-Suplex: Session Start"), "Session Start");
    assert.equal(bareCommandName("ai-suplex:  Session Start"), "Session Start");
    assert.equal(bareCommandName("# ⚡ AI-Suplex: Session Start"), "Session Start");
    assert.ok(baseTemplate("AI-Suplex: Session Start").startsWith(expected));
    assert.ok(baseTemplate("# ⚡ AI-Suplex: Session Start").startsWith(expected));
  });
});

describe("the envelope can never carry a document", () => {
  it("has no separator and no pattern body, whatever the fields say", () => {
    const out = composeCommand(
      "B-Bomb Promotion",
      { type: "vault-file", value: "Artifacts/2026-2027/Cycle 3/Week 3/x.md" },
      "ADDITIONAL: nested — and still just text",
    );
    assert.ok(!/\n---\n/.test(out));
    assert.ok(!out.includes("Prompt Pattern"));
    assert.equal(lineCount(out), 5);
  });

  it("isSourceType accepts only the three the contract knows", () => {
    for (const ok of ["vault-file", "raw", "chat-reference"]) assert.ok(isSourceType(ok));
    for (const bad of ["file", "", null, undefined, 3, {}]) assert.ok(!isSourceType(bad));
  });
});

describe("a value survives a type change only if the new type can hold it", () => {
  const paths = ["Tasklists/a.md", "Context Kick-start/Active/daily-tasks.md"];

  it("drops prose when the target is a file picker", () => {
    assert.equal(retargetSourceValue("Cycle 3 · Week 3", "vault-file", paths), "");
    assert.equal(retargetSourceValue("  ", "vault-file", paths), "");
  });

  it("keeps a real vault path", () => {
    assert.equal(retargetSourceValue("Tasklists/a.md", "vault-file", paths), "Tasklists/a.md");
  });

  it("keeps anything when the target is text", () => {
    assert.equal(retargetSourceValue("Tasklists/a.md", "raw", paths), "Tasklists/a.md");
    assert.equal(retargetSourceValue("a sentence", "chat-reference", paths), "a sentence");
  });
});

