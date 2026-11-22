import test from "node:test";
import assert from "node:assert/strict";
import { buildCockpitView, formatDay, parseScope, SPAN_DAYS, THRESHOLD_DAYS } from "./cockpit-room";
import type { Approvals, CockpitData, OperatorStatus, ParticipantInstance, TasklistRow } from "./cockpit";

/**
 * The cockpit's view model is the operator's answer, so it is asserted rather than
 * eyeballed: the age ladder must clamp, the stale line must sit at seven days, and the
 * one sentence at the top must state the numbers the tools actually returned.
 */

function instance(over: Partial<ParticipantInstance>): ParticipantInstance {
  return {
    thread: "project-tasks",
    ref: "7",
    slug: "ultra-pages",
    singleton: false,
    file: "a.md",
    status: "open",
    opened: "2026-11-13T00:00",
    writer: "committer",
    mission: "old lane",
    ageDays: 9.3,
    ...over,
  };
}

function tasklist(over: Partial<TasklistRow>): TasklistRow {
  return {
    file: "list.md",
    title: "A list",
    status: "active",
    tasks: 4,
    done: 0,
    next: "T001",
    nextTitle: "first step",
    ...over,
  };
}

function approvals(over: Partial<Approvals> = {}): Approvals {
  return {
    generated: "2026-11-22T01:00:00.000Z",
    pending: false,
    gates: [],
    lessons: { pool: 10, ready: 0, borderline: 10, readyItems: [] },
    bBombs: { count: 3 },
    ...over,
  };
}

function status(over: Partial<OperatorStatus> = {}): OperatorStatus {
  return {
    date: "2026-11-22",
    cycle: 3,
    week: 5,
    open: 2,
    ok: true,
    instances: [instance({}), instance({ thread: "daily-tasks", ref: null, slug: null, singleton: true, file: "daily-tasks.md", mission: "today", ageDays: 1.6 })],
    tasklists: [],
    stale: [],
    ...over,
  };
}

function data(over: Partial<CockpitData> = {}): CockpitData {
  return {
    vault: "/vault",
    status: { ok: true, value: status() },
    approvals: { ok: true, value: approvals() },
    vaultContext: { ok: true, value: "# context" },
    vaultLog: { ok: true, value: "# log" },
    ...over,
  };
}

test("the scope link resolves, and an unknown value opens the operator", () => {
  assert.equal(parseScope("approvals"), "approvals");
  assert.equal(parseScope("tasklists"), "tasklists");
  assert.equal(parseScope(undefined), "operator");
  assert.equal(parseScope("nope"), "operator");
  assert.equal(parseScope("__proto__"), "operator", "no prototype key reaches the state machine");
});

test("formatDay is locale-free", () => {
  assert.equal(formatDay("2026-11-22"), "22 Nov 2026");
  assert.equal(formatDay("2026-11-22T01:00:00.000Z"), "22 Nov 2026");
  assert.equal(formatDay(null), "—");
  assert.equal(formatDay("not a date"), "not a date");
  assert.equal(formatDay("2026-13-01"), "2026-13-01", "an impossible month is passed through, not invented");
});

test("the age ladder clamps at the span and flags only past seven days", () => {
  const view = buildCockpitView(
    data({
      status: {
        ok: true,
        value: status({
          instances: [
            instance({ file: "young.md", ageDays: 1 }),
            instance({ file: "edge.md", ageDays: 7 }),
            instance({ file: "past.md", ageDays: 7.1 }),
            instance({ file: "old.md", ageDays: 40 }),
          ],
          open: 4,
        }),
      },
    }),
  );

  assert.equal(view.operator.marks.length, 4);
  assert.deepEqual(
    view.operator.marks.map((m) => m.key),
    ["old.md", "past.md", "edge.md", "young.md"],
    "oldest first",
  );
  const old = view.operator.marks.find((m) => m.key === "old.md");
  assert.equal(old?.frac, 1, "40 days clamps to the end of the ladder");
  assert.equal(old?.days, 40);
  assert.equal(view.operator.marks.find((m) => m.key === "edge.md")?.stale, false, "seven days exactly is not stale");
  assert.equal(view.operator.marks.find((m) => m.key === "past.md")?.stale, true);
  assert.equal(view.operator.marks.find((m) => m.key === "edge.md")?.frac, THRESHOLD_DAYS / SPAN_DAYS);
});

test("the operator answer names the stale lane and the day count", () => {
  const one = buildCockpitView(
    data({ status: { ok: true, value: status({ stale: [{ label: "Instance a.md", days: 9, fix: "close it" }] }) } }),
  );
  assert.match(one.operator.answer, /^2 instances open, and one has passed the 7-day line/);
  assert.match(one.operator.answer, /line: a at 9 days/, "the Instance prefix and the extension are stripped");
  assert.equal(one.operator.headline, "2 open · 1 stale");

  const none = buildCockpitView(data({ status: { ok: true, value: status({ stale: [] }) } }));
  assert.equal(
    none.operator.answer,
    "2 instances open, and none has passed the 7-day line. Nothing in the operator state needs you today.",
  );
  assert.equal(none.operator.headline, "2 open · guard clean");

  const many = buildCockpitView(
    data({
      status: {
        ok: true,
        value: status({
          stale: [
            { label: "Instance a.md", days: 9, fix: "close it" },
            { label: "Instance b.md", days: 12, fix: "close it" },
          ],
        }),
      },
    }),
  );
  assert.match(many.operator.answer, /2 have passed the 7-day line — the oldest at 12 days/);
});

test("the approvals answer leads with what is waiting, or says nothing is", () => {
  const clear = buildCockpitView(data());
  assert.equal(clear.approvals.answer, "Nothing waits on you: no gate is open and no lesson clears the 70-point bar.");

  const ready = buildCockpitView(
    data({
      approvals: {
        ok: true,
        value: approvals({
          pending: true,
          lessons: { pool: 688, ready: 3, borderline: 685, readyItems: [{ score: 75, text: "one" }] },
        }),
      },
    }),
  );
  assert.equal(ready.approvals.answer, "3 lessons at or above the 70-point bar. The call is yours — nothing here approves itself.");
  assert.equal(ready.approvals.headline, "0 gates · 3 ready");

  const both = buildCockpitView(
    data({
      approvals: {
        ok: true,
        value: approvals({
          pending: true,
          gates: ["T010 waiting on a schema decision"],
          lessons: { pool: 688, ready: 1, borderline: 687, readyItems: [{ score: 80, text: "two" }] },
        }),
      },
    }),
  );
  assert.equal(
    both.approvals.answer,
    "1 gate open, and 1 lesson at or above the 70-point bar. The call is yours — nothing here approves itself.",
  );
  assert.deepEqual(both.approvals.gates, ["T010 waiting on a schema decision"]);
});

test("ready lessons are ranked, not left in file order", () => {
  const view = buildCockpitView(
    data({
      approvals: {
        ok: true,
        value: approvals({
          pending: true,
          lessons: {
            pool: 3,
            ready: 3,
            borderline: 0,
            readyItems: [
              { score: 70, text: "low" },
              { score: 90, text: "high" },
              { score: 75, text: "mid" },
            ],
          },
        }),
      },
    }),
  );
  assert.deepEqual(view.approvals.readyItems.map((i) => i.text), ["high", "mid", "low"]);
});

test("tasklists drop the empty files and rank by what is left", () => {
  const view = buildCockpitView(
    data({
      status: {
        ok: true,
        value: status({
          tasklists: [
            tasklist({ file: "b.md", title: "B", tasks: 10, done: 0 }),
            tasklist({ file: "empty.md", title: "Empty", tasks: 0 }),
            tasklist({ file: "a.md", title: "A", tasks: 10, done: 9 }),
            tasklist({ file: "c.md", title: "C", tasks: 4, done: 4, status: "parked", next: null, nextTitle: null }),
          ],
        }),
      },
    }),
  );

  assert.deepEqual(
    view.tasklists.rows.map((r) => r.file),
    ["a.md", "b.md", "c.md"],
    "in flight first, closest to done; the parked list closes the record",
  );
  assert.equal(view.tasklists.empty, 1, "the taskless file is counted, not listed");
  assert.equal(view.tasklists.inFlight, 2, "parked is not in flight even at 100%");
  assert.equal(view.tasklists.nearDone, 1);
  assert.equal(view.tasklists.headline, "3 with tasks · 1 empty");
  assert.equal(view.tasklists.answer, "2 tasklists in flight; 1 is within three boxes of done.");
});

test("a failed tool blanks its own section and nothing else", () => {
  const view = buildCockpitView(
    data({ status: { ok: false, error: "node Tools/asmc.js status --json · exit 1" } }),
  );

  assert.equal(view.operator.ok, false);
  assert.match(view.operator.answer, /could not be read/);
  assert.equal(view.tasklists.ok, false);
  assert.deepEqual(view.tasklists.rows, []);
  assert.equal(view.identity.date, "—");
  assert.equal(view.approvals.ok, true, "the inbox still reads");
  assert.equal(view.vault.context.ok, true);

  assert.deepEqual(
    view.scopes.map((s) => s.state),
    ["unavailable", "clear", "unavailable", "read-only"],
    "a failed section says unavailable in the rail — it never reads as clear",
  );
  assert.equal(view.scopes[0].count, null, "no number is better than a zero nobody computed");

  const inboxFailed = buildCockpitView(
    data({ approvals: { ok: false, error: "approvals.js exited 1" } }),
  );
  assert.equal(inboxFailed.scopes[1].state, "unavailable");
  assert.equal(inboxFailed.scopes[1].count, null);
});

test("the rail names the four sections and carries their counts", () => {
  const view = buildCockpitView(
    data({
      approvals: {
        ok: true,
        value: approvals({ pending: true, gates: ["g"], lessons: { pool: 2, ready: 2, borderline: 0, readyItems: [] } }),
      },
    }),
  );

  assert.deepEqual(view.scopes.map((s) => s.label), [
    "Operator state",
    "Approvals inbox",
    "Active tasklists",
    "Vault",
  ]);
  assert.deepEqual(view.scopes.map((s) => s.count), [2, 3, 0, null]);
  assert.equal(view.scopes[0].state, "fresh");
  assert.equal(view.scopes[1].state, "pending");
  assert.equal(view.scopes[3].state, "read-only");
});

test("the vault sections reach the stage untouched", () => {
  const view = buildCockpitView(
    data({
      vaultContext: { ok: true, value: "# real context" },
      vaultLog: { ok: false, error: "ENOENT", command: "Memory/vault-log.md" },
      vault: null,
    }),
  );
  assert.deepEqual(view.vault.context, { ok: true, value: "# real context" });
  assert.equal(view.vault.log.ok, false);
  assert.equal(view.identity.vault, null);
});
