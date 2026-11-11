import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { groupByWorkspaceType, writerLabel } from "./workspace-board";
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
