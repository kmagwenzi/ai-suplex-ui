/**
 * envelope.test.ts — T031 + T041. The envelope contract, pinned.
 *
 * A command carries exactly the lines its contract declares: one field → five
 * physical lines, three fields → seven. The document can never appear — there
 * is no parameter through which one could arrive.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  bareCommandName,
  baseTemplate,
  composeEnvelope,
  fieldLine,
  isEmptySelection,
  isSourceType,
  lineCount,
  retargetSourceValue,
  sourceLine,
  SOURCE_LABEL,
} from "./envelope";

describe("the envelope carries exactly its declared lines", () => {
  it("one field is five physical lines", () => {
    const out = composeEnvelope("Artifact Capture", [sourceLine({ type: null, value: "" })], "");
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

  it("three fields are seven physical lines — Save Context's real shape", () => {
    const out = composeEnvelope(
      "Save Context",
      [
        fieldLine("Thread", "project-tasks", "<daily-tasks | project-tasks | random-tasks | realist>"),
        fieldLine("Instance", "9 · 777-command-panel", "<ref or slug — omit for singletons>"),
        fieldLine("Writer", "committer", "<committer | producer>"),
      ],
      "",
    );
    assert.equal(lineCount(out), 7);
    assert.ok(out.includes("  - Thread: project-tasks"));
    assert.ok(out.includes("  - Instance: 9 · 777-command-panel"));
    assert.ok(out.includes("  - Writer: committer"));
  });

  it("an empty field keeps its placeholder — never a guess", () => {
    const line = fieldLine("Task ID", "   ", "<e.g. T009>");
    assert.equal(line, "  - Task ID: <e.g. T009>");
  });

  it("ADDITIONAL fills and clears", () => {
    const out = composeEnvelope("Weekly Review", [fieldLine("Raw Content", "the week", "<x>")], " Save to Reviews/ ");
    assert.ok(out.includes("ADDITIONAL: Save to Reviews/"));
    assert.ok(composeEnvelope("Weekly Review", [], "").includes("ADDITIONAL: <instructions>"));
  });
});

describe("the source line", () => {
  it("names the type once a value exists", () => {
    assert.equal(
      sourceLine({ type: "vault-file", value: " Tasklists/a.md " }),
      "  - File Reference: Tasklists/a.md",
    );
    assert.equal(sourceLine({ type: "raw", value: "something" }), "  - Raw Content: something");
  });

  it("falls back to the grammar when empty", () => {
    assert.equal(sourceLine({ type: null, value: "" }), "  - <Source type>: <value>");
    assert.equal(sourceLine({ type: "vault-file", value: "  " }), "  - <Source type>: <value>");
  });
});

describe("the name normalises, the prefix never doubles", () => {
  it("accepts a bare name, a full trigger, or a rendered heading", () => {
    assert.equal(bareCommandName("Session Start"), "Session Start");
    assert.equal(bareCommandName("AI-Suplex: Session Start"), "Session Start");
    assert.equal(bareCommandName("# ⚡ AI-Suplex: Session Start"), "Session Start");
    assert.ok(baseTemplate("AI-Suplex: Session Start", ["  - x"]).startsWith("AI-Suplex: Session Start"));
  });
});

describe("the envelope can never carry a document", () => {
  it("has no separator and no pattern body, whatever the fields say", () => {
    const out = composeEnvelope(
      "B-Bomb Promotion",
      [fieldLine("File Reference", "Artifacts/x.md", "<Artifacts/….md>")],
      "ADDITIONAL: nested — still just text",
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
  });

  it("keeps a real vault path, and keeps anything in text", () => {
    assert.equal(retargetSourceValue("Tasklists/a.md", "vault-file", paths), "Tasklists/a.md");
    assert.equal(retargetSourceValue("a sentence", "chat-reference", paths), "a sentence");
  });

  it("isEmptySelection agrees", () => {
    assert.ok(isEmptySelection({ type: null, value: "x" }));
    assert.ok(isEmptySelection({ type: "raw", value: "  " }));
    assert.ok(!isEmptySelection({ type: "raw", value: "x" }));
    assert.equal(SOURCE_LABEL["vault-file"], "File Reference");
  });
});
