import test from "node:test";
import assert from "node:assert/strict";
import {
  daysBetween,
  humanCadence,
  nextRitual,
  parseCrontab,
  parseHermesJobs,
  parseReceipt,
} from "./rhythm";

/**
 * The rhythm is the cockpit's claim about the clock. It is parsed, not eyeballed:
 * a wrong "next Tuesday" is a wrong instruction to the Hustler.
 */

test("a simple schedule becomes a human cadence; a clever one keeps its fields", () => {
  assert.equal(humanCadence("30 21 * * *"), "daily 21:30");
  assert.equal(humanCadence("0 6 * * 6"), "Sat 06:00");
  assert.equal(humanCadence("0 6 * * 2"), "Tue 06:00");
  assert.equal(humanCadence("0 7 * * 1-5"), "0 7 * * 1-5", "a range is not guessed at");
  assert.equal(humanCadence("*/15 9-17 * * *"), "*/15 9-17 * * *");
  assert.equal(humanCadence("0 6 * *"), "0 6 * *", "a short line is passed through");
});

test("the crontab is read into entries without leaking absolute paths", () => {
  const text = [
    "# a comment",
    "",
    "0 6 * * 6 /home/k/Projects/x/Tools/rituals.sh saturday >> /home/k/v/Memory/ritual-log.md 2>&1",
    "30 21 * * * /home/k/v/Tools/rituals.sh daily",
    "0 18 * * * /home/k/scripts/ai-suplex-backup.sh",
    "0 9 * * 1 /opt/bin/some-other-job --flag",
  ].join(String.fromCharCode(10));

  const entries = parseCrontab(text);
  assert.equal(entries.length, 4, "comments and blanks are dropped");

  assert.equal(entries[0].kind, "ritual");
  assert.equal(entries[0].label, "rituals.sh saturday");
  assert.equal(entries[0].when, "Sat 06:00");
  assert.equal(entries[0].redirect, "/home/k/v/Memory/ritual-log.md");

  assert.equal(entries[1].label, "rituals.sh daily");
  assert.equal(entries[1].redirect, undefined);

  assert.equal(entries[2].kind, "backup");
  assert.equal(entries[2].label, "ai-suplex-backup.sh");

  assert.equal(entries[3].kind, "other");
  assert.equal(entries[3].label, "some-other-job");
  for (const e of entries) assert.ok(!e.label.includes("/"), "no absolute path reaches the surface");
});

test("the next ritual is the closer of Tuesday and Saturday", () => {
  const sunday = nextRitual("2026-11-22");
  assert.deepEqual(sunday, { name: "tuesday", date: "2026-11-24", daysAway: 2 });

  const monday = nextRitual("2026-11-23");
  assert.deepEqual(monday, { name: "tuesday", date: "2026-11-24", daysAway: 1 });

  const tuesday = nextRitual("2026-11-24");
  assert.equal(tuesday.name, "tuesday");
  assert.equal(tuesday.daysAway, 0, "the ritual is today, not next week");

  const saturday = nextRitual("2026-11-21");
  assert.equal(saturday.name, "saturday");
  assert.equal(saturday.daysAway, 0);

  const wednesday = nextRitual("2026-11-25");
  assert.deepEqual(wednesday, { name: "saturday", date: "2026-11-28", daysAway: 3 });
});

test("daysBetween counts calendar days, never negative", () => {
  assert.equal(daysBetween("2026-10-21", "2026-11-22"), 32);
  assert.equal(daysBetween("2026-11-22", "2026-11-22"), 0);
  assert.equal(daysBetween("2026-11-22", "2026-11-21"), 0, "a future receipt is not a negative age");
  assert.equal(daysBetween("nonsense", "2026-11-22"), 0);
});

test("each agent job owns its block, so flags never leak across jobs", () => {
  const doc = [
    "### 1 · Daily",
    "\u0060\u0060\u0060bash",
    'hermes cron create "0 7 * * *"',
    '  --name "operator-brief"',
    "  --deliver discord",
    "  --script operator-brief.sh",
    "  --no-agent",
    "\u0060\u0060\u0060",
    "### 2 · Sat",
    "\u0060\u0060\u0060bash",
    'hermes cron create "30 6 * * 6"',
    '  --name "outreach-audit"',
    "  --skill realist",
    '  "Count terminal states only."',
  ].join(String.fromCharCode(10));

  const jobs = parseHermesJobs(doc);
  assert.equal(jobs.length, 2);
  assert.deepEqual(jobs[0], {
    schedule: "0 7 * * *",
    when: "daily 07:00",
    name: "operator-brief",
    deliver: "discord",
    script: "operator-brief.sh",
  });
  assert.equal(jobs[1].name, "outreach-audit");
  assert.equal(jobs[1].deliver, "local", "no --deliver in its own block means local");
  assert.equal(jobs[1].script, "", "the next job's script is never borrowed");
});

test("a doc with no cron block yields no jobs", () => {
  assert.deepEqual(parseHermesJobs("# Hermes cron\n\nNothing scheduled.\n"), []);
});

test("the receipt is the last dated entry, and only its own keys", () => {
  const log = [
    "# Ritual Receipt",
    "",
    "### 2026-10-14 · saturday",
    "- ran: S1,S2",
    "- handed off: S3",
    "- verdict: ok",
    "",
    "### 2026-10-21 · tuesday",
    "- ran: T1,T2,T3",
    "- handed off: T7,T8,T9,T11",
    "- verdict: ok · verified 1/1 · commit pending",
    "",
    "\u001b[1;33m── DAILY MAINTENANCE · tier=auto ──\u001b[0m",
    "- ran: this is a banner, not a receipt",
  ].join(String.fromCharCode(10));

  const receipt = parseReceipt(log);
  assert.ok(receipt);
  assert.equal(receipt.date, "2026-10-21");
  assert.equal(receipt.name, "tuesday");
  assert.deepEqual(receipt.ran, ["T1", "T2", "T3"]);
  assert.deepEqual(receipt.handed, ["T7", "T8", "T9", "T11"]);
  assert.equal(receipt.verdict, "ok · verified 1/1 · commit pending");
});

test("a log with no receipt answers null rather than inventing one", () => {
  assert.equal(parseReceipt("# Ritual Receipt\n\nnothing dated here\n"), null);
  assert.equal(parseReceipt(""), null);
});
