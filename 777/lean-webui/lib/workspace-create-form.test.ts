import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { CREATABLE_LANES, slugFromTitle, tasksFromText, validateCreate } from "./workspace-create-form";

describe("CREATABLE_LANES", () => {
  it("offers only the N lanes", () => {
    assert.deepEqual([...CREATABLE_LANES], ["project-tasks", "random-tasks"]);
  });
});

describe("slugFromTitle", () => {
  it("kebab-cases a title", () => {
    assert.equal(slugFromTitle("Ship Wave 2 Today!"), "ship-wave-2-today");
  });

  it("collapses punctuation runs and trims dashes", () => {
    assert.equal(slugFromTitle("  --Hello   World--  "), "hello-world");
  });

  it("falls back to untitled when nothing survives", () => {
    assert.equal(slugFromTitle("!!!"), "untitled");
  });

  it("caps at 60 characters", () => {
    assert.ok(slugFromTitle("a".repeat(200)).length <= 60);
  });
});

describe("tasksFromText", () => {
  it("drops blanks and trims", () => {
    assert.deepEqual(tasksFromText("one\n\n  two  \n"), ["one", "two"]);
  });

  it("caps at 24 tasks", () => {
    const many = Array.from({ length: 40 }, (_, i) => "task " + i).join("\n");
    assert.equal(tasksFromText(many).length, 24);
  });
});

describe("validateCreate", () => {
  const ok = { thread: "project-tasks", slug: "walk-the-dog", title: "Walk", mission: "Do it" };

  it("accepts a complete draft", () => {
    assert.equal(validateCreate(ok), null);
  });

  it("refuses a singleton lane", () => {
    assert.match(validateCreate({ ...ok, thread: "daily-tasks" }) ?? "", /singletons/);
  });

  it("refuses a bad slug", () => {
    assert.match(validateCreate({ ...ok, slug: "Bad Slug" }) ?? "", /kebab-case/);
  });

  it("refuses a missing mission", () => {
    assert.match(validateCreate({ ...ok, mission: "  " }) ?? "", /mission/);
  });
});
