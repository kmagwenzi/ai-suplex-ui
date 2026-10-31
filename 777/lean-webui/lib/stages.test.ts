import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  deriveStages,
  isDailyTasklist,
  STAGE_META,
} from "./stages";
import type { Signals, StageId, StageState } from "./types";

const TODAY = "2026-10-31";

function base(overrides: Partial<Signals> = {}): Signals {
  return {
    today: TODAY,
    activeDailyTasklistToday: false,
    contextDate: TODAY,
    sessionStartToday: null,
    artifactToday: null,
    endReportToday: null,
    episodeToday: null,
    instanceWrittenToday: false,
    weeklyReviewThisWeek: null,
    ritualThisWeek: null,
    ...overrides,
  };
}

function stateOf(signals: Signals, id: StageId): StageState {
  const stage = deriveStages(signals).find((s) => s.id === id);
  assert.ok(stage, `missing stage ${id}`);
  return stage.state;
}

describe("isDailyTasklist", () => {
  it("marks date-prefixed plans as daily, thread instances as not", () => {
    assert.strictEqual(
      isDailyTasklist("2026-11-01-re-entry-gate-the-gate-opens.md"),
      true,
    );
    assert.strictEqual(
      isDailyTasklist("2026-11-03-cycle-3-week-3-the-first-evidenced-week.md"),
      true,
    );
    assert.strictEqual(
      isDailyTasklist("2026-10-27-project-tasks-lean-webui-tasklist.md"),
      false,
    );
    assert.strictEqual(
      isDailyTasklist("2026-10-21-random-tasks-testing-ai-suplex-ui.md"),
      false,
    );
    assert.strictEqual(isDailyTasklist("2026-10-20-week-reset-tasklist.md"), false);
  });
});

describe("deriveStages — the frontier", () => {
  it("starts at Plan when no daily tasklist exists for today", () => {
    const s = base({ activeDailyTasklistToday: false, contextDate: TODAY });
    assert.strictEqual(stateOf(s, "plan"), "current");
    assert.strictEqual(stateOf(s, "context"), "done");
  });

  it("moves to Session Start once today's plan is written", () => {
    const s = base({ activeDailyTasklistToday: true });
    assert.strictEqual(stateOf(s, "plan"), "done");
    assert.strictEqual(stateOf(s, "context"), "done");
    assert.strictEqual(stateOf(s, "session-start"), "current");
  });

  it("moves to Execute once the session is started", () => {
    const s = base({ activeDailyTasklistToday: true, sessionStartToday: true });
    assert.strictEqual(stateOf(s, "session-start"), "done");
    assert.strictEqual(stateOf(s, "execute"), "current");
  });
});

describe("deriveStages — done / blocked / skipped", () => {
  it("blocks Session Start when there is no active tasklist to start from", () => {
    const s = base({ activeDailyTasklistToday: false });
    assert.strictEqual(stateOf(s, "session-start"), "blocked");
    assert.strictEqual(stateOf(s, "context"), "done");
  });

  it("blocks Context when the context date is stale", () => {
    const s = base({ contextDate: "2026-10-30" });
    const context = deriveStages(s).find((x) => x.id === "context");
    assert.strictEqual(context?.state, "blocked");
    assert.ok(context?.reason.includes("2026-10-30"));
  });

  it("blocks Capture and Close when no session is open", () => {
    const s = base({ activeDailyTasklistToday: true, sessionStartToday: false });
    assert.strictEqual(stateOf(s, "capture"), "blocked");
    assert.strictEqual(stateOf(s, "close"), "blocked");
  });

  it("blocks Remember when there is no end report", () => {
    const s = base({
      activeDailyTasklistToday: true,
      sessionStartToday: true,
      endReportToday: false,
    });
    assert.strictEqual(stateOf(s, "remember"), "blocked");
  });

  it("marks Save Context done when an instance file was written today", () => {
    const s = base({ instanceWrittenToday: true });
    assert.strictEqual(stateOf(s, "save-context"), "done");
  });

  it("derives done for every file-backed stage from a full signal set", () => {
    const s = base({
      activeDailyTasklistToday: true,
      contextDate: TODAY,
      sessionStartToday: true,
      artifactToday: true,
      endReportToday: true,
      episodeToday: true,
      instanceWrittenToday: true,
      weeklyReviewThisWeek: true,
      ritualThisWeek: true,
    });
    const states = Object.fromEntries(
      deriveStages(s).map((x) => [x.id, x.state]),
    );
    assert.strictEqual(states.plan, "done");
    assert.strictEqual(states.context, "done");
    assert.strictEqual(states["session-start"], "done");
    assert.strictEqual(states.capture, "done");
    assert.strictEqual(states.close, "done");
    assert.strictEqual(states.remember, "done");
    assert.strictEqual(states["save-context"], "done");
    assert.strictEqual(states.review, "done");
    assert.strictEqual(states.ritual, "done");
    // Execute is the human lane — no output file, never "done".
    assert.strictEqual(states.execute, "current");
  });
});

describe("deriveStages — copied ≠ done", () => {
  it("never marks a stage done without its output signal", () => {
    const s: Signals = {
      today: TODAY,
      activeDailyTasklistToday: false,
      contextDate: null,
      sessionStartToday: null,
      artifactToday: null,
      endReportToday: null,
      episodeToday: null,
      instanceWrittenToday: false,
      weeklyReviewThisWeek: null,
      ritualThisWeek: null,
    };
    const done = deriveStages(s).filter((x) => x.state === "done");
    assert.deepStrictEqual(
      done.map((x) => x.id),
      [],
    );
  });

  it("treats an unknown (null) signal as not-done, never as done", () => {
    const s = base({ activeDailyTasklistToday: true });
    assert.notStrictEqual(stateOf(s, "session-start"), "done");
  });
});

describe("deriveStages — shape", () => {
  it("returns exactly the 10 spine stages in order", () => {
    assert.deepStrictEqual(
      deriveStages(base()).map((s) => s.id),
      STAGE_META.map((s) => s.id),
    );
  });

  it("attaches a non-empty reason to every stage", () => {
    for (const s of deriveStages(base())) {
      assert.ok(s.reason.length > 0, `stage ${s.id} has no reason`);
    }
  });

  it("marks a blocked stage with a reason that names the missing input", () => {
    const s = base({ activeDailyTasklistToday: false });
    const blocked = deriveStages(s).filter((x) => x.state === "blocked");
    assert.ok(blocked.length > 0);
    for (const b of blocked) {
      assert.ok(b.reason.length > 0, `blocked stage ${b.id} has no reason`);
    }
  });
});
