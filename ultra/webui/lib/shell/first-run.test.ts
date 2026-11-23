import test from "node:test";
import assert from "node:assert/strict";
import { FIRST_RUN, firstRunCommands, firstRunFor, isFirstRun, isRunnableCommand } from "./first-run";
import { MVP_SURFACES } from "./surfaces";

/**
 * The first-run contract is a promise to a stranger, so it is asserted like one: every
 * shipped surface must have a spec, every step must be a command this repo ships, and a
 * vault with nothing in it must be recognisable as day one.
 */

test("every MVP surface has a first-run spec", () => {
  for (const surface of MVP_SURFACES) {
    const spec = firstRunFor(surface.key);
    assert.ok(spec, surface.key + " has no first-run spec");
    assert.equal(spec!.key, surface.key);
  }
});

test("every spec names the absence in one line and offers exactly three steps", () => {
  for (const spec of Object.values(FIRST_RUN)) {
    assert.ok(spec.title.length > 0, spec.key + " has no title");
    assert.ok(spec.line.length > 20, spec.key + " has no line");
    assert.equal(spec.steps.length, 3, spec.key + " must offer three steps, found " + spec.steps.length);
    for (const step of spec.steps) {
      assert.ok(step.why.length > 10, spec.key + " has a step with no reason");
    }
  }
});

test("every step is a real, copy-pasteable command", () => {
  const PLACEHOLDER = /[<>]|\.\.\.|TODO|\bYOUR\b|\bPATH\b/;
  for (const spec of Object.values(FIRST_RUN)) {
    for (const command of firstRunCommands(spec.key)) {
      assert.ok(isRunnableCommand(command), spec.key + " step is not a command: " + command);
      assert.ok(!PLACEHOLDER.test(command), spec.key + " step is a placeholder: " + command);
    }
  }
});

test("no surface repeats another surface's command list", () => {
  const seen = new Set<string>();
  for (const spec of Object.values(FIRST_RUN)) {
    const key = firstRunCommands(spec.key).join("|");
    assert.ok(!seen.has(key), spec.key + " duplicates another surface's steps");
    seen.add(key);
  }
});

test("day one is a vault-level fact, decided by three numbers", () => {
  assert.equal(isFirstRun({ instances: 0, tasklists: 0, lessons: 0 }), true);
  assert.equal(isFirstRun({ instances: 1, tasklists: 0, lessons: 0 }), false);
  assert.equal(isFirstRun({ instances: 0, tasklists: 1, lessons: 0 }), false);
  assert.equal(isFirstRun({ instances: 0, tasklists: 0, lessons: 1 }), false);
});

test("an unknown key has no spec, so a surface cannot invent one", () => {
  assert.equal(firstRunFor("no-such-surface"), null);
  assert.equal(firstRunFor("wiki"), null);
});
