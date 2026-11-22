import type {
  Approvals,
  CockpitData,
  OperatorStatus,
  Section,
  TasklistRow,
} from "./cockpit";

/**
 * The cockpit room — deterministic views over the four reads.
 *
 * The cockpit is the operator the other surfaces run on, so its first job is one
 * sentence: what needs the Hustler, today. Every answer below is composed from the
 * numbers the tools already returned — no model, no estimation, no clock beyond the
 * vault's own date. If a section's tool fails, that section says so and the rest of
 * the console keeps standing.
 */

export type CockpitScope = "operator" | "approvals" | "tasklists" | "vault";

/** An open instance, placed on a 14-day ladder so "stale" is visible, not asserted. */
export interface AgeMark {
  key: string;
  thread: string;
  instance: string;
  mission: string | null;
  days: number;
  /** 0–1, clamped: how far along the 14-day span this instance sits. */
  frac: number;
  stale: boolean;
}

export interface ScopeRow {
  id: CockpitScope;
  label: string;
  /** The number the rail shows; null when the scope has no single count. */
  count: number | null;
  /** One word for the rail — the state, not the label repeated. */
  state: string;
}

export interface OperatorView {
  ok: boolean;
  error: string | null;
  answer: string;
  headline: string;
  marks: AgeMark[];
  stale: { label: string; days: number; fix: string }[];
  guard: boolean;
  open: number;
  lastShipped: { title: string; date: string } | null;
  memory: { semantic: number; procedural: number; episodic: number; lessons: number } | null;
  weekly: { review: boolean; ritual: boolean; lastRitual: string | null };
}

export interface ApprovalsView {
  ok: boolean;
  error: string | null;
  answer: string;
  headline: string;
  pending: boolean;
  gates: string[];
  pool: number;
  ready: number;
  borderline: number;
  readyItems: { score: number; text: string }[];
  bBombs: number;
}

export interface TasklistsView {
  ok: boolean;
  error: string | null;
  answer: string;
  headline: string;
  /** Only tasklists that carry tasks — an empty file is not in flight. */
  rows: TasklistRow[];
  inFlight: number;
  nearDone: number;
  empty: number;
}

export interface CockpitView {
  identity: { date: string; cycle: number; week: number; open: number; stale: number; vault: string | null };
  scopes: ScopeRow[];
  operator: OperatorView;
  approvals: ApprovalsView;
  tasklists: TasklistsView;
  vault: { context: Section<string>; log: Section<string> };
}

export const SCOPE_IDS: CockpitScope[] = ["operator", "approvals", "tasklists", "vault"];

/**
 * The rail is also a link: /cockpit?scope=approvals opens the inbox directly, which is
 * what a demo (and the ⌘K palette) wants. An unknown value falls back to the operator
 * rather than an empty stage.
 */
export function parseScope(value?: string | string[] | null): CockpitScope {
  const first = Array.isArray(value) ? value[0] : value;
  return SCOPE_IDS.includes(first as CockpitScope) ? (first as CockpitScope) : "operator";
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** The stale line, and the span the age bars are drawn against. */
export const THRESHOLD_DAYS = 7;
export const SPAN_DAYS = 14;

/** Locale-free on purpose: the vault's date reads the same on every machine. */
export function formatDay(iso?: string | null): string {
  if (!iso) return "—";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return iso;
  const month = MONTHS[Number(m[2]) - 1];
  if (!month) return iso;
  return `${Number(m[3])} ${month} ${m[1]}`;
}

function count(n: number, one: string, many?: string): string {
  return `${n} ${n === 1 ? one : (many ?? one + "s")}`;
}

function sentence(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function gateText(gate: unknown): string {
  if (typeof gate === "string") return gate;
  try {
    return JSON.stringify(gate);
  } catch {
    return "a gate the approvals tool could not describe";
  }
}

function operatorAnswer(open: number, stale: { label: string; days: number }[]): string {
  const opened = `${count(open, "instance")} open`;
  if (stale.length === 0) {
    return `${opened}, and none has passed the ${THRESHOLD_DAYS}-day line. Nothing in the operator state needs you today.`;
  }
  if (stale.length === 1) {
    return `${opened}, and one has passed the ${THRESHOLD_DAYS}-day line: ${stale[0].label} at ${stale[0].days} days. Close it, or it becomes a truth nobody is maintaining.`;
  }
  const oldest = Math.max(...stale.map((s) => s.days));
  return `${opened}, and ${stale.length} have passed the ${THRESHOLD_DAYS}-day line — the oldest at ${oldest} days.`;
}

function approvalsAnswer(pending: boolean, gates: number, ready: number): string {
  if (!pending) {
    return "Nothing waits on you: no gate is open and no lesson clears the 70-point bar.";
  }
  const parts: string[] = [];
  if (gates > 0) parts.push(`${count(gates, "gate")} open`);
  if (ready > 0) parts.push(`${count(ready, "lesson")} at or above the 70-point bar`);
  return `${sentence(parts.join(", and "))}. The call is yours — nothing here approves itself.`;
}

function tasklistsAnswer(inFlight: number, nearDone: number, total: number): string {
  if (total === 0) return "No tasklist in the vault carries a task. Nothing is in flight.";
  const head = `${count(inFlight, "tasklist")} in flight`;
  if (nearDone === 0) return `${head}, and none is within three boxes of done.`;
  return `${head}; ${nearDone} ${nearDone === 1 ? "is" : "are"} within three boxes of done.`;
}

function buildOperator(status: Section<OperatorStatus>): OperatorView {
  if (!status.ok) {
    return {
      ok: false,
      error: status.error,
      answer: "The operator state could not be read — the tool that produces it failed.",
      headline: "unavailable",
      marks: [],
      stale: [],
      guard: false,
      open: 0,
      lastShipped: null,
      memory: null,
      weekly: { review: false, ritual: false, lastRitual: null },
    };
  }

  const s = status.value;
  const marks: AgeMark[] = s.instances
    .map((i) => {
      const days = Math.round(i.ageDays * 10) / 10;
      return {
        key: i.file,
        thread: i.thread,
        instance: i.singleton ? "singleton" : `${i.ref}/${i.slug}`,
        mission: i.mission,
        days,
        frac: Math.min(1, Math.max(0, days / SPAN_DAYS)),
        stale: i.ageDays > THRESHOLD_DAYS,
      };
    })
    .sort((a, b) => b.days - a.days || a.key.localeCompare(b.key));

  const stale = s.stale.map((row) => ({
    label: row.label.replace(/^Instance\s+/, "").replace(/\.md$/, ""),
    days: row.days,
    fix: row.fix,
  }));
  const activity = s.activity;
  const lastShipped = activity?.lastShipped?.title
    ? { title: activity.lastShipped.title, date: formatDay(activity.lastShipped.date) }
    : null;

  return {
    ok: true,
    error: null,
    answer: operatorAnswer(s.open, stale),
    headline: `${s.open} open · ${stale.length ? `${stale.length} stale` : "guard clean"}`,
    marks,
    stale,
    guard: s.ok,
    open: s.open,
    lastShipped,
    memory: activity?.memory
      ? {
          semantic: activity.memory.semantic,
          procedural: activity.memory.procedural,
          episodic: activity.memory.episodic,
          lessons: activity.memory.lessons,
        }
      : null,
    weekly: {
      review: Boolean(activity?.weekly?.review),
      ritual: Boolean(activity?.weekly?.ritual),
      lastRitual: activity?.weekly?.lastRitual ? formatDay(activity.weekly.lastRitual) : null,
    },
  };
}

function buildApprovals(approvals: Section<Approvals>): ApprovalsView {
  if (!approvals.ok) {
    return {
      ok: false,
      error: approvals.error,
      answer: "The approvals inbox could not be read — the tool that produces it failed.",
      headline: "unavailable",
      pending: false,
      gates: [],
      pool: 0,
      ready: 0,
      borderline: 0,
      readyItems: [],
      bBombs: 0,
    };
  }

  const a = approvals.value;
  const gates = a.gates.map(gateText);
  return {
    ok: true,
    error: null,
    answer: approvalsAnswer(a.pending, gates.length, a.lessons.ready),
    headline: `${gates.length} gate${gates.length === 1 ? "" : "s"} · ${a.lessons.ready} ready`,
    pending: a.pending,
    gates,
    pool: a.lessons.pool,
    ready: a.lessons.ready,
    borderline: a.lessons.borderline,
    readyItems: a.lessons.readyItems.slice().sort((x, y) => y.score - x.score || x.text.localeCompare(y.text)),
    bBombs: a.bBombs.count,
  };
}

function buildTasklists(status: Section<OperatorStatus>): TasklistsView {
  if (!status.ok) {
    return {
      ok: false,
      error: status.error,
      answer: "The tasklists could not be read — the operator tool failed.",
      headline: "unavailable",
      rows: [],
      inFlight: 0,
      nearDone: 0,
      empty: 0,
    };
  }

  const all = status.value.tasklists;
  // In flight first (the rail's number is 24, so the list must lead with those), then
  // closest to done, then the closed and parked ones as the record they are.
  const flightRank = (r: TasklistRow) => (/^active/i.test(r.status) && r.done < r.tasks ? 0 : 1);
  const rows = all
    .filter((t) => t.tasks > 0)
    .sort(
      (a, b) =>
        flightRank(a) - flightRank(b) ||
        Math.max(0, a.tasks - a.done) - Math.max(0, b.tasks - b.done) ||
        a.file.localeCompare(b.file),
    );

  const inFlight = rows.filter((r) => /^active/i.test(r.status) && r.done < r.tasks).length;
  const nearDone = rows.filter((r) => r.done < r.tasks && r.tasks - r.done <= 3).length;

  return {
    ok: true,
    error: null,
    answer: tasklistsAnswer(inFlight, nearDone, rows.length),
    headline: `${rows.length} with tasks · ${all.length - rows.length} empty`,
    rows,
    inFlight,
    nearDone,
    empty: all.length - rows.length,
  };
}

export function buildCockpitView(data: CockpitData): CockpitView {
  const operator = buildOperator(data.status);
  const approvals = buildApprovals(data.approvals);
  const tasklists = buildTasklists(data.status);
  const waiting = approvals.gates.length + approvals.ready;

  return {
    identity: {
      date: data.status.ok ? formatDay(data.status.value.date) : formatDay(null),
      cycle: data.status.ok ? data.status.value.cycle : 0,
      week: data.status.ok ? data.status.value.week : 0,
      open: operator.open,
      stale: operator.stale.length,
      vault: data.vault,
    },
    scopes: [
      {
        id: "operator",
        label: "Operator state",
        count: operator.ok ? operator.open : null,
        state: !operator.ok ? "unavailable" : operator.stale.length ? `${operator.stale.length} stale` : "fresh",
      },
      {
        id: "approvals",
        label: "Approvals inbox",
        count: approvals.ok ? waiting : null,
        state: !approvals.ok ? "unavailable" : approvals.pending ? "pending" : "clear",
      },
      {
        id: "tasklists",
        label: "Active tasklists",
        count: tasklists.ok ? tasklists.inFlight : null,
        state: !tasklists.ok ? "unavailable" : `${tasklists.inFlight} in flight`,
      },
      { id: "vault", label: "Vault", count: null, state: "read-only" },
    ],
    operator,
    approvals,
    tasklists,
    vault: { context: data.vaultContext, log: data.vaultLog },
  };
}
