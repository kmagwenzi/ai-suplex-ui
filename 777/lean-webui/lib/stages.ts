/**
 * stages.ts — stage-state derivation, a pure function over `mcp v1` resources.
 *
 * Spec: `Projects/Lean UI — Design Spec.md` §9 (done/blocked per stage) and §2
 * (the spine: stages are the navigation, commands are the verbs).
 *
 * The function takes a flat `Signals` object and returns the 10 stages with a
 * derived `done` / `current` / `blocked` / `skipped` state. It has no UI input:
 * a stage turns `done` **only** when its output signal is true — never when a
 * button was pressed. That is the "copied ≠ done" rule made structural.
 */

import type {
  DerivedStage,
  Executor,
  Signals,
  StageId,
  StageMeta,
  StageState,
} from "./types";

export const STAGE_META: StageMeta[] = [
  {
    id: "plan",
    name: "Plan",
    command: "Tasklist Generation · Weekly Plan · Cycle Plan",
    executor: "agent",
    output: "Tasklists/",
    inputs: ["suplex://tasklists", "suplex://tasklist/{path}"],
  },
  {
    id: "context",
    name: "Context",
    command: "Kickstart · suplex_status",
    executor: "deterministic",
    output: "context brief",
    inputs: ["suplex://context", "suplex://mission"],
  },
  {
    id: "session-start",
    name: "Session Start",
    command: "AI-Suplex: Session Start",
    executor: "agent",
    output: "Sessions/Active/Start/",
    inputs: ["suplex://tasklist/{path}"],
  },
  {
    id: "execute",
    name: "Execute",
    command: "—",
    executor: "human",
    output: "—",
    inputs: [],
  },
  {
    id: "capture",
    name: "Capture",
    command: "Artifact Capture · Batch Insight · B-Bomb Promotion",
    executor: "agent+tool",
    output: "Artifacts/… · Insights/… · B-Bombs/…",
    inputs: ["suplex://tasklist/{path}"],
  },
  {
    id: "close",
    name: "Close",
    command: "AI-Suplex: Session End Report",
    executor: "agent",
    output: "Sessions/Active/End/",
    inputs: ["suplex://mission"],
  },
  {
    id: "remember",
    name: "Remember",
    command: "suplex_close",
    executor: "deterministic",
    output: "episode + lessons",
    inputs: ["suplex://memory/index", "suplex://memory/lessons"],
  },
  {
    id: "save-context",
    name: "Save Context",
    command: "AI-Suplex: Save Context",
    executor: "agent",
    output: "Context Kick-start/Active/",
    inputs: ["suplex://threads"],
  },
  {
    id: "review",
    name: "Review",
    command: "Weekly Review · suplex_promote",
    executor: "agent+tool",
    output: "Reviews/ · Memory/",
    inputs: ["suplex://memory/lessons", "suplex://memory/index"],
    gate: "promote",
  },
  {
    id: "ritual",
    name: "Ritual",
    command: "Weekly Ritual",
    executor: "tool+human",
    output: "indexes · MOCs",
    inputs: ["suplex://context", "suplex://approvals"],
    gate: "ritual",
  },
];

export const EXECUTOR_GLYPH: Record<Executor, string> = {
  agent: "🧠",
  deterministic: "⚙️",
  human: "👤",
  "agent+tool": "🧠⚙️",
  "tool+human": "⚙️👤",
};

export const EXECUTOR_LABEL: Record<Executor, string> = {
  agent: "agent",
  deterministic: "deterministic",
  human: "human",
  "agent+tool": "agent + tool",
  "tool+human": "tool + human",
};

/** A tasklist filename is a *daily* plan when it is not a thread instance. */
export function isDailyTasklist(file: string): boolean {
  return !/-(project-tasks|random-tasks|long-running|week-reset)-/.test(file);
}

/**
 * §9 — derive every stage's state from the signals. Pure: same input → same
 * output; no reads, no clock (today is passed in), no writes.
 */
export function deriveStages(signals: Signals): DerivedStage[] {
  const { today } = signals;

  const done: Record<StageId, boolean> = {
    plan: signals.activeDailyTasklistToday,
    context: signals.contextDate === today,
    "session-start": signals.sessionStartToday === true,
    execute: false,
    capture: signals.artifactToday === true,
    close: signals.endReportToday === true,
    remember: signals.episodeToday === true,
    "save-context": signals.instanceWrittenToday,
    review: signals.weeklyReviewThisWeek === true,
    ritual: signals.ritualThisWeek === true,
  };

  const blocked: Record<StageId, string | null> = {
    plan: null,
    context:
      signals.contextDate !== null && signals.contextDate !== today
        ? `context date is ${signals.contextDate} — stale, run Kickstart`
        : null,
    "session-start": signals.activeDailyTasklistToday
      ? null
      : "no active daily tasklist for today",
    execute: null,
    capture:
      signals.sessionStartToday === false
        ? "no open session to capture into"
        : null,
    close:
      signals.sessionStartToday === false
        ? "no open session to close"
        : null,
    remember:
      signals.endReportToday === false
        ? "no Session End report for today"
        : null,
    "save-context": null,
    review: null,
    ritual: null,
  };

  // The frontier is the first stage that is neither done nor blocked.
  const frontierIdx = STAGE_META.findIndex((m) => !done[m.id] && !blocked[m.id]);

  return STAGE_META.map((meta, i) => {
    let state: StageState;
    let reason: string;

    if (done[meta.id]) {
      state = "done";
      reason = doneReason(meta.id, signals);
    } else if (blocked[meta.id]) {
      state = "blocked";
      reason = blocked[meta.id] as string;
    } else if (i === frontierIdx) {
      state = "current";
      reason = currentReason(meta.id);
    } else if (i < frontierIdx) {
      state = "skipped";
      reason = "bypassed — no output required";
    } else {
      state = "skipped";
      reason = "upcoming";
    }

    return { ...meta, state, reason };
  });
}

function doneReason(id: StageId, s: Signals): string {
  switch (id) {
    case "plan":
      return "active daily tasklist for today exists";
    case "context":
      return "context fresh (date = today)";
    case "session-start":
      return "Session Start file exists for today";
    case "capture":
      return "an artifact was captured today";
    case "close":
      return "Session End report exists for today";
    case "remember":
      return "today's episode is written";
    case "save-context":
      return "an instance file was written today";
    case "review":
      return "weekly review exists for this week";
    case "ritual":
      return "ritual ran this week";
    case "execute":
      return "—";
  }
}

function currentReason(id: StageId): string {
  switch (id) {
    case "plan":
      return "no plan for today yet — write the daily tasklist";
    case "context":
      return "load fresh context";
    case "session-start":
      return "the next command starts the session";
    case "execute":
      return "the work is the human's lane";
    case "capture":
      return "capture what the work produced";
    case "close":
      return "close the session with a report";
    case "remember":
      return "close writes the episode + lessons";
    case "save-context":
      return "persist the instance brief";
    case "review":
      return "review the week";
    case "ritual":
      return "run the weekly ritual";
  }
}
