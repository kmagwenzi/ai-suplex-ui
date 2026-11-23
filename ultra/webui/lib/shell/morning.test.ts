import test from "node:test";
import assert from "node:assert/strict";
import { counterNoun, morningDelta, morningLineText, parseSnapshots, type SnapshotRow } from "./morning";

/**
 * The Morning Read is the only panel that can lie without a tool failing, so its edges are
 * pinned: no baseline is stated as no baseline, a still day is stated as still, and a delta
 * is subtraction over two recorded rows — never an inference.
 */

function row(over: Partial<SnapshotRow> = {}): SnapshotRow {
  return {
    date: "2026-11-22",
    open: 4,
    stale: 0,
    tasklists: 2,
    inbox: 11,
    lessons: 705,
    bBombs: 62,
    episodic: 97,
    artifacts: 3,
    lastShipped: "2026-11-22",
    ...over,
  };
}

test("no rows is a first run, not an error", () => {
  const view = morningDelta([]);
  assert.equal(view.kind, "no-baseline");
  assert.equal(view.days, 0);
  assert.equal(view.asOf, null);
  assert.deepEqual(view.lines, []);
});

test("one row is still a first run — there is nothing to subtract", () => {
  const view = morningDelta([row()]);
  assert.equal(view.kind, "no-baseline");
  assert.equal(view.days, 1);
  assert.equal(view.asOf, "2026-11-22");
  assert.equal(view.since, null);
});

test("two identical days are stated as unchanged, never as movement", () => {
  const view = morningDelta([row(), row({ date: "2026-11-23" })]);
  assert.equal(view.kind, "unchanged");
  assert.deepEqual(view.lines, []);
  assert.equal(view.since, "2026-11-22");
  assert.equal(view.asOf, "2026-11-23");
});

test("a moved day lists only what moved, with the arithmetic shown", () => {
  const view = morningDelta([
    row(),
    row({ date: "2026-11-23", lessons: 708, artifacts: 5, open: 3, inbox: 8 }),
  ]);
  assert.equal(view.kind, "moved");
  const byKey = new Map(view.lines.map((l) => [l.key, l]));
  assert.equal(byKey.get("lessons")!.delta, 3);
  assert.equal(byKey.get("artifacts")!.delta, 2);
  assert.equal(byKey.get("open")!.from, 4);
  assert.equal(byKey.get("open")!.to, 3);
  assert.equal(byKey.has("bBombs"), false, "an unchanged counter is not listed");
  assert.equal(morningLineText(byKey.get("lessons")!), "+3 lessons");
  assert.equal(counterNoun("episodes", 1), "episode", "one episode, not one episodes");
  assert.equal(counterNoun("B-Bombs", -1), "B-Bomb");
  assert.equal(counterNoun("lessons", 2), "lessons");
  assert.equal(morningLineText(byKey.get("open")!), "open instances 4 → 3");
});

test("a new ship is the first line, because it is what a reader wants first", () => {
  const view = morningDelta([row(), row({ date: "2026-11-23", lastShipped: "2026-11-23", open: 3 })]);
  assert.equal(view.lines[0].key, "shipped");
  assert.equal(morningLineText(view.lines[0]), "shipped 2026-11-23");
  assert.equal(view.lines[1].key, "open");
});

test("the newest two rows are the comparison, whatever order they arrive in", () => {
  const view = morningDelta([
    row({ date: "2026-11-23", lessons: 708 }),
    row({ date: "2026-11-21", lessons: 700 }),
    row({ date: "2026-11-22", lessons: 705 }),
  ]);
  assert.equal(view.since, "2026-11-22");
  assert.equal(view.asOf, "2026-11-23");
  assert.equal(view.days, 3);
});

test("the parser drops a corrupt line and keeps the day's last word", () => {
  const text = [
    '{"date":"2026-11-21","lessons":700}',
    "not json",
    '{"date":"2026-11-22","lessons":705}',
    '{"date":"2026-11-22","lessons":706}',
    "",
  ].join("\n");
  const rows = parseSnapshots(text);
  assert.equal(rows.length, 2);
  assert.equal(rows[1].date, "2026-11-22");
  assert.equal(rows[1].lessons, 706);
  assert.equal(rows[0].open, 0, "absent counters read as zero, never as undefined");
});

test("an empty file is an empty history, not a crash", () => {
  assert.deepEqual(parseSnapshots(""), []);
  assert.deepEqual(parseSnapshots("\n\n"), []);
});
