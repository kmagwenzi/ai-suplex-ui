import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  WORKSPACE_LABEL,
  WORKSPACE_LANES,
  WORKSPACE_TYPE_LABELS,
  WORKSPACE_TYPES,
  defaultTasklist,
  tasklistDefaultFor,
  workspaceLabel,
} from "./workspace";

describe("WORKSPACE_TYPES — the four lanes", () => {
  it("declares the four canonical lanes in order", () => {
    assert.deepEqual(WORKSPACE_LANES, [
      "daily-tasks",
      "project-tasks",
      "random-tasks",
      "realist",
    ]);
  });

  it("maps each lane to its client-facing label", () => {
    assert.deepEqual(WORKSPACE_LABEL, {
      "daily-tasks": "Daily Work",
      "project-tasks": "Project",
      "random-tasks": "Quick Task",
      realist: "Review",
    });
  });

  it("declares singletons vs many correctly", () => {
    assert.equal(WORKSPACE_TYPES["daily-tasks"].instances, 1);
    assert.equal(WORKSPACE_TYPES["project-tasks"].instances, "many");
    assert.equal(WORKSPACE_TYPES["random-tasks"].instances, "many");
    assert.equal(WORKSPACE_TYPES["realist"].instances, 1);
  });
});

describe("workspaceLabel", () => {
  it("returns the human label for a known lane", () => {
    assert.equal(workspaceLabel("random-tasks"), "Quick Task");
    assert.equal(workspaceLabel("daily-tasks"), "Daily Work");
    assert.equal(workspaceLabel("realist"), "Review");
  });

  it("falls back to the token for an unknown lane", () => {
    assert.equal(workspaceLabel("legacy-lane"), "legacy-lane");
  });
});

describe("defaultTasklist — type-aware", () => {
  it("is Yes for Daily and Project, No for Quick Task and Review", () => {
    assert.equal(defaultTasklist("daily-tasks"), true);
    assert.equal(defaultTasklist("project-tasks"), true);
    assert.equal(defaultTasklist("random-tasks"), false);
    assert.equal(defaultTasklist("realist"), false);
  });

  it("defaults to No for an unknown lane", () => {
    assert.equal(defaultTasklist("nope"), false);
  });
});

describe("WORKSPACE_TYPE_LABELS", () => {
  it("lists the four client labels in lane order", () => {
    assert.deepEqual(WORKSPACE_TYPE_LABELS, [
      "Daily Work",
      "Project",
      "Quick Task",
      "Review",
    ]);
  });
});

describe("tasklistDefaultFor — the type-aware default", () => {
  it("accepts a client label", () => {
    assert.equal(tasklistDefaultFor("Daily Work"), "YES");
    assert.equal(tasklistDefaultFor("Project"), "YES");
    assert.equal(tasklistDefaultFor("Quick Task"), "NO");
    assert.equal(tasklistDefaultFor("Review"), "NO");
  });

  it("accepts a lane token", () => {
    assert.equal(tasklistDefaultFor("daily-tasks"), "YES");
    assert.equal(tasklistDefaultFor("random-tasks"), "NO");
  });

  it("defaults to NO for an unknown type", () => {
    assert.equal(tasklistDefaultFor("mystery"), "NO");
  });
});
