import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  closeWorkspaceHref,
  groupByWorkspaceType,
  visibleRows,
  writerLabel,
} from "./workspace-board";
import type { Instance } from "./types";

function inst(overrides: Partial<Instance> = {}): Instance {
  return {
    thread: "project-tasks",
    ref: "11",
    slug: "workspaces-tab",
    singleton: false,
    file: "project-tasks-11-workspaces-tab.md",
    status: "open",
    opened: "2026-11-11T16:49",
    ...overrides,
  };
}

describe("groupByWorkspaceType", () => {
  it("groups into the four lanes in canonical order", () => {
    const groups = groupByWorkspaceType([
      inst({ thread: "project-tasks" }),
      inst({ thread: "daily-tasks", singleton: true, ref: null, slug: null, file: "daily-tasks.md" }),
      inst({ thread: "random-tasks", ref: "1", slug: "quick-wins" }),
    ]);
    assert.deepEqual(
      groups.map((g) => g.lane),
      ["daily-tasks", "project-tasks", "random-tasks", "realist"],
    );
    assert.equal(groups[0].instances.length, 1);
    assert.equal(groups[1].instances.length, 1);
    assert.equal(groups[2].instances.length, 1);
    assert.equal(groups[3].instances.length, 0);
  });

  it("labels each group with the client-facing name", () => {
    const groups = groupByWorkspaceType([]);
    assert.deepEqual(
      groups.map((g) => g.label),
      ["Daily Work", "Project", "Quick Task", "Review"],
    );
  });

  it("preserves multiple instances in one lane", () => {
    const groups = groupByWorkspaceType([
      inst({ thread: "project-tasks", ref: "7", slug: "ultra-pages" }),
      inst({ thread: "project-tasks", ref: "9", slug: "command-panel" }),
    ]);
    const project = groups.find((g) => g.lane === "project-tasks");
    assert.ok(project);
    assert.equal(project.instances.length, 2);
  });
});

describe("closeWorkspaceHref — the close hand-off names its target", () => {
  it("carries the type label and the ref for an N-lane workspace", () => {
    assert.equal(
      closeWorkspaceHref(inst()),
      "/commands?command=close-workspace&type=Project&instance=11",
    );
  });

  it("falls back to the slug when the vault gave no ref", () => {
    assert.equal(
      closeWorkspaceHref(inst({ ref: null })),
      "/commands?command=close-workspace&type=Project&instance=workspaces-tab",
    );
  });

  it("a singleton names the type alone — it has no ref or slug", () => {
    assert.equal(
      closeWorkspaceHref(
        inst({ thread: "daily-tasks", ref: null, slug: null, singleton: true, file: "daily-tasks.md" }),
      ),
      "/commands?command=close-workspace&type=Daily+Work",
    );
  });

  it("an unknown lane keeps its raw token legible instead of inventing a label", () => {
    assert.equal(
      closeWorkspaceHref(inst({ thread: "long-running", ref: "4" })),
      "/commands?command=close-workspace&type=long-running&instance=4",
    );
  });
});

describe("writerLabel", () => {
  it("maps the two writer classes to client labels", () => {
    assert.equal(writerLabel("producer"), "Contributor agent");
    assert.equal(writerLabel("committer"), "Trusted local agent");
  });

  it("falls back to the raw token or a dash for unknown", () => {
    assert.equal(writerLabel("mystery"), "mystery");
    assert.equal(writerLabel(), "—");
    assert.equal(writerLabel(undefined), "—");
  });
});

describe("visibleRows — collapse, but never silently", () => {
  const rows = [1, 2, 3, 4, 5];

  it("shows everything when the list fits", () => {
    const r = rows.slice(0, 3);
    assert.deepEqual(visibleRows(r, false), { shown: r, hidden: 0 });
  });

  it("collapses to the limit and reports what it hides", () => {
    assert.deepEqual(visibleRows(rows, false), { shown: [1, 2, 3], hidden: 2 });
  });

  it("shows all when expanded", () => {
    assert.deepEqual(visibleRows(rows, true), { shown: rows, hidden: 0 });
  });

  it("honours a custom limit", () => {
    assert.deepEqual(visibleRows(rows, false, 1), { shown: [1], hidden: 4 });
  });
});

