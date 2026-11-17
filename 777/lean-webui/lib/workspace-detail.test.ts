import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  TASKLIST_DIRS,
  findInstance,
  instanceId,
  matchTasklistsFor,
  tasklistCandidates,
  tasklistProgress,
} from "./workspace-detail";
import type { Instance, TasklistSummary } from "./types";

const lane: Instance = {
  thread: "project-tasks",
  ref: "14",
  slug: "777-workflow-console",
  singleton: false,
  file: "project-tasks-14-777-workflow-console.md",
  status: "open",
  opened: "2026-11-17T14:55",
};

const daily: Instance = {
  thread: "daily-tasks",
  ref: null,
  slug: null,
  singleton: true,
  file: "daily-tasks.md",
  status: "open",
  opened: "2026-10-16T15:42",
};

const tasklists: TasklistSummary[] = [
  {
    file: "2026-11-17-project-tasks-777-workflow-console-ship-tasklist.md",
    title: "777 Vault Workflow Console: ship Wave 2",
    status: "active",
    tasks: 11,
    done: 2,
    next: "P002",
    nextTitle: "Workspace view",
  },
  {
    file: "2026-11-12-project-tasks-ultra-showcase-refinement-tasklist.md",
    title: "Ultra showcase refinement",
    status: "active",
    tasks: 9,
    done: 1,
  },
  {
    file: "2026-11-17-cycle-3-week-5-day-1-2-the-zesa-recovery-tasklist.md",
    title: "The ZESA recovery",
    status: "active",
    tasks: 15,
    done: 0,
    next: "T000",
    nextTitle: "context core",
  },
];

describe("instanceId — ownership is the filename", () => {
  it("strips the .md extension", () => {
    assert.equal(
      instanceId("project-tasks-14-777-workflow-console.md"),
      "project-tasks-14-777-workflow-console",
    );
  });

  it("leaves a bare id untouched", () => {
    assert.equal(instanceId("daily-tasks"), "daily-tasks");
  });
});

describe("findInstance", () => {
  it("finds by id without extension", () => {
    assert.equal(
      findInstance([lane, daily], "project-tasks-14-777-workflow-console"),
      lane,
    );
  });

  it("accepts the id with the extension", () => {
    assert.equal(findInstance([lane, daily], "daily-tasks.md"), daily);
  });

  it("returns null for an unknown id — never a guessed instance", () => {
    assert.equal(findInstance([lane], "project-tasks-99-ghost"), null);
  });
});

describe("matchTasklistsFor — the canonical filename token", () => {
  it("matches the tasklist carrying -{thread}-{slug}", () => {
    const got = matchTasklistsFor(lane, tasklists);
    assert.deepEqual(
      got.map((t) => t.file),
      ["2026-11-17-project-tasks-777-workflow-console-ship-tasklist.md"],
    );
  });

  it("never matches a sibling slug by substring (pages is not ultra-pages)", () => {
    const narrow: Instance = { ...lane, slug: "pages", file: "project-tasks-7-pages.md" };
    assert.deepEqual(matchTasklistsFor(narrow, tasklists), []);
  });

  it("returns [] for a singleton — typed unknown, never a guess", () => {
    assert.deepEqual(matchTasklistsFor(daily, tasklists), []);
  });

  it("returns [] when the slug is missing", () => {
    const ghost: Instance = { ...lane, slug: null, file: "project-tasks-13-x.md" };
    assert.deepEqual(matchTasklistsFor(ghost, tasklists), []);
  });
});

describe("tasklistCandidates — the jailed resource path", () => {
  it("tries Tasklists/Active first, then Archive, then Combined", () => {
    assert.deepEqual(TASKLIST_DIRS, ["Active", "Archive", "Combined"]);
    assert.deepEqual(tasklistCandidates("x.md"), [
      "Tasklists/Active/x.md",
      "Tasklists/Archive/x.md",
      "Tasklists/Combined/x.md",
    ]);
  });

  it("always scopes inside Tasklists/ (the harness jail)", () => {
    for (const rel of tasklistCandidates("y.md")) {
      assert.ok(rel.startsWith("Tasklists/"));
    }
  });
});

describe("tasklistProgress", () => {
  it("renders the done/tasks line", () => {
    assert.equal(tasklistProgress(tasklists[0]), "2/11 done");
  });

  it("renders the typed empty when no tasks parsed", () => {
    assert.equal(
      tasklistProgress({ file: "f.md", title: "t", status: "active", tasks: 0, done: 0 }),
      "— no tasks parsed —",
    );
  });
});
