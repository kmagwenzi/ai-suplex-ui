import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  composePrompt,
  memoryLoopKind,
  prefillFor,
  type PrefillInput,
} from "./prompts";

const ENVELOPE =
  "# ⚡ AI-Suplex: Session Start\n\n" +
  "CONTENT\n  - <Source type>: <value>\n\n" +
  "ADDITIONAL: <instructions>\n\n---\n\n" +
  "BODY — never touched";

function prefillInput(overrides: Partial<PrefillInput> = {}): PrefillInput {
  return {
    cycle: 3,
    week: 2,
    tasklists: [],
    threads: [],
    ...overrides,
  };
}

describe("memoryLoopKind", () => {
  it("is null when the pattern declares no memory loop", () => {
    assert.equal(memoryLoopKind("no loop here, just a pattern"), null);
  });

  it("is yes for a plain MEMORY LOOP section", () => {
    assert.equal(memoryLoopKind("MEMORY LOOP:\nRun before answering."), "yes");
  });

  it("is conditional when the loop can be skipped", () => {
    assert.equal(
      memoryLoopKind("Runs 3lm learn → index (memory loop) unless `Skip memory loop`"),
      "conditional",
    );
  });

  it("is conditional when the loop runs only at session end", () => {
    assert.equal(
      memoryLoopKind("Memory loop — only at session end (R6)"),
      "conditional",
    );
  });
});

describe("composePrompt", () => {
  it("fills the CONTENT source and ADDITIONAL, leaving the body untouched", () => {
    const out = composePrompt(
      ENVELOPE,
      { type: "vault-file", value: "Tasklists/2026-11-01-a.md" },
      "Save to Sessions/Active/Start/",
    );
    assert.ok(out.includes("  - File Reference: Tasklists/2026-11-01-a.md"));
    assert.ok(out.includes("ADDITIONAL: Save to Sessions/Active/Start/"));
    assert.ok(out.includes("BODY — never touched"));
    assert.ok(!out.includes("<Source type>"));
  });

  it("keeps the placeholders when the source and ADDITIONAL are empty", () => {
    const out = composePrompt(ENVELOPE, { type: null, value: "" }, "");
    assert.ok(out.includes("  - <Source type>: <value>"));
    assert.ok(out.includes("ADDITIONAL: <instructions>"));
  });
});

describe("prefillFor — session-start", () => {
  it("points at the active daily tasklist", () => {
    const p = prefillFor(
      "session-start",
      prefillInput({
        tasklists: [
          { file: "2026-11-01-a.md", title: "A", status: "active", tasks: 3, done: 0 },
          { file: "2026-11-01-week-reset-tasklist.md", title: "Reset", status: "active", tasks: 9, done: 0 },
        ],
      }),
    );
    assert.equal(p.type, "vault-file");
    assert.equal(p.value, "Tasklists/2026-11-01-a.md");
  });

  it("is empty when no daily tasklist is active", () => {
    const p = prefillFor("session-start", prefillInput());
    assert.equal(p.type, null);
    assert.match(p.note ?? "", /no active daily tasklist/);
  });
});

describe("prefillFor — save-context", () => {
  it("points at the first open instance", () => {
    const p = prefillFor(
      "save-context",
      prefillInput({
        threads: [
          {
            thread: "daily-tasks",
            ref: null,
            slug: null,
            singleton: true,
            file: "Context Kick-start/Active/daily-tasks.md",
            status: "open",
            opened: "2026-11-01T09:00",
          },
        ],
      }),
    );
    assert.equal(p.type, "vault-file");
    assert.equal(p.value, "Context Kick-start/Active/daily-tasks.md");
  });

  it("resolves a bare filename from suplex://threads to its Active path (T033)", () => {
    const p = prefillFor(
      "save-context",
      prefillInput({
        threads: [
          {
            thread: "project-tasks",
            ref: "9",
            slug: "777-command-panel",
            singleton: false,
            file: "project-tasks-9-777-command-panel.md", // the resource's real shape
            status: "closed",
            opened: "2026-11-06T20:45",
          },
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
    assert.equal(p.value, "Context Kick-start/Active/daily-tasks.md");
  });

  it("prefers an open instance over a closed one left in Active", () => {
    const p = prefillFor(
      "save-context",
      prefillInput({
        threads: [
          { thread: "project-tasks", ref: "3", slug: "lean-webui", singleton: false, file: "project-tasks-3-lean-webui.md", status: "closed", opened: "2026-10-31T09:57" },
          { thread: "project-tasks", ref: "9", slug: "777-command-panel", singleton: false, file: "project-tasks-9-777-command-panel.md", status: "open", opened: "2026-11-06T20:45" },
        ],
      }),
    );
    assert.equal(p.value, "Context Kick-start/Active/project-tasks-9-777-command-panel.md");
  });
});

describe("prefillFor — weekly-review and the unavailable cases", () => {
  it("pre-fills the week identifier", () => {
    const p = prefillFor("weekly-review", prefillInput());
    assert.equal(p.type, "raw");
    assert.equal(p.value, "Cycle 3 · Week 2");
  });

  it("names the missing resource instead of fabricating artifacts", () => {
    const er = prefillFor("session-end-report", prefillInput());
    assert.match(er.note ?? "", /on the mcp v1 read surface/);

    const bb = prefillFor("b-bomb-promotion", prefillInput());
    assert.match(bb.note ?? "", /on the mcp v1 read surface/);
  });
});
