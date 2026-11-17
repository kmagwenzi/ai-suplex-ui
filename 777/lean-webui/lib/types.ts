/**
 * types.ts — the data shapes the console derives from `mcp v1` resources.
 *
 * Pure types + no runtime deps: stages.ts (derivation) and resources.ts (typed
 * reads) both import from here, and Vitest can load stages.ts without Next.
 */

// ── the operator brief (`suplex://context` · `suplex://tasklists`) ──────────
export interface Instance {
  thread: string;
  ref: string | null;
  slug: string | null;
  singleton: boolean;
  file: string;
  status: string;
  opened: string; // ISO `yyyy-mm-ddThh:mm`
  writer?: string;
  agent?: string;
  mission?: string;
  ageDays?: number;
}

export interface TasklistSummary {
  file: string; // `2026-11-01-re-entry-gate-….md`
  title: string;
  status: "active" | "parked" | "proposed" | string;
  tasks: number;
  done: number;
  next?: string;
  nextTitle?: string;
}

/** What the vault can prove about today (`asmc open --json` → activity). */
export interface Activity {
  date: string;
  sessionStart: boolean;
  sessionEnd: boolean;
  /** A start after the latest end: the day is open, so Close is not done. */
  sessionOpen: boolean;
  latestStart: string | null;
  latestEnd: string | null;
  artifacts: number;
  episodes: number;
}

export interface OperatorBrief {
  vault: string;
  date: string; // ISO `yyyy-mm-dd`
  period: string;
  cycle: number;
  week: number;
  open: number;
  instances: Instance[];
  tasklists: TasklistSummary[];
  /** Present on vaults whose asmc reports activity; absent → signals stay null. */
  activity?: Activity;
}

// ── the approval inbox (`suplex://approvals`) ───────────────────────────────
export interface Approvals {
  generated: string;
  pending: boolean;
  gates: unknown[];
  lessons: {
    pool: number;
    ready: number;
    borderline: number;
    readyItems: unknown[];
  };
  bBombs?: { count: number };
}

// ── the pipeline ────────────────────────────────────────────────────────────
export type StageId =
  | "plan"
  | "context"
  | "session-start"
  | "execute"
  | "capture"
  | "close"
  | "remember"
  | "save-context"
  | "review"
  | "ritual";

export type StageState = "done" | "current" | "blocked" | "skipped";

export type Executor =
  | "agent"
  | "deterministic"
  | "human"
  | "agent+tool"
  | "tool+human";

export interface StageMeta {
  id: StageId;
  name: string;
  command: string;
  executor: Executor;
  output: string;
  inputs: string[];
  gate?: string;
}

export interface DerivedStage extends StageMeta {
  state: StageState;
  reason: string;
  /**
   * False when the stage's output signal is not on the read surface. The strip
   * may still call it `current`, but the console must not *assert* it.
   */
  verified: boolean;
}

/**
 * The signals the derivation reads. Every field that W1 cannot observe from
 * the 8 `mcp v1` resources is `null` (unknown) — and an unknown signal is
 * **never** treated as `done` (copied ≠ done; absence of evidence is not the
 * output file).
 */
export interface Signals {
  today: string;
  activeDailyTasklistToday: boolean;
  contextDate: string | null;
  sessionStartToday: boolean | null;
  artifactToday: boolean | null;
  endReportToday: boolean | null;
  episodeToday: boolean | null;
  instanceWrittenToday: boolean;
  weeklyReviewThisWeek: boolean | null;
  ritualThisWeek: boolean | null;
}
