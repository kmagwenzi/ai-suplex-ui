import type {
  Approvals,
  CockpitData,
  OperatorStatus,
  RhythmRead,
  RitualPlan,
  Section,
  TasklistRow,
  BoardRead,
  BoardTasklist,
} from "./cockpit";
import { isFirstRun } from "./first-run";
import { linkFor, type RowLink } from "./links";
import { daysBetween, type CronEntry, type HermesJob, type RitualReceipt } from "./rhythm";

/**
 * The cockpit room — deterministic views over the four reads.
 *
 * The cockpit is the operator the other surfaces run on, so its first job is one
 * sentence: what needs the Hustler, today. Every answer below is composed from the
 * numbers the tools already returned — no model, no estimation, no clock beyond the
 * vault's own date. If a section's tool fails, that section says so and the rest of
 * the console keeps standing.
 */

export type CockpitScope = "operator" | "rhythm" | "approvals" | "tasklists" | "vault";

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
  /** The instance file itself — a row that cannot reach its source is a claim, not a read. */
  link: RowLink | null;
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
  /** Close packets awaiting the daily-tasks reconcile. */
  inbox: number;
  lastShipped: { title: string; date: string; link: RowLink | null } | null;
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

export interface RhythmView {
  ok: boolean;
  error: string | null;
  answer: string;
  headline: string;
  plan: RitualPlan | null;
  planError: string | null;
  cron: { installed: boolean; entries: CronEntry[]; note: string | null };
  hermes: { jobs: HermesJob[]; note: string | null };
  receipt: RitualReceipt | null;
  /** The one file every receipt lives in. */
  receiptLink: RowLink | null;
  /** Days since the last receipt — the ritual's proof-of-life gap. */
  receiptAge: number | null;
  /** True when a cron line still appends into Memory/ritual-log.md. */
  redirects: boolean;
}

/** A tasklist row with the file it came from. */
export type TasklistRowView = TasklistRow & { link: RowLink | null };

export interface TasklistsView {
  ok: boolean;
  error: string | null;
  answer: string;
  headline: string;
  /** Only tasklists that carry tasks — an empty file is not in flight. */
  rows: TasklistRowView[];
  inFlight: number;
  nearDone: number;
  empty: number;
}

export interface BoardLaneProposal {
  ref: string;
  slug: string;
  idle: number;
  mission: string;
  /** The exact command pair — a reason is human, so it is a placeholder. */
  packet: string;
  archive: string;
}

export interface BoardView {
  ok: boolean;
  error: string | null;
  lanes: number;
  staleDays: number;
  stale: BoardLaneProposal[];
  closeable: BoardTasklist[];
  review: BoardTasklist[];
  inbox: number;
  /** The dated proposal the Tue/Sat step writes. */
  resource: string;
  commandTasklists: string;
  commandReview: string;
}

export interface CockpitView {
  identity: { date: string; cycle: number; week: number; open: number; stale: number; vault: string | null };
  scopes: ScopeRow[];
  operator: OperatorView;
  rhythm: RhythmView;
  approvals: ApprovalsView;
  tasklists: TasklistsView;
  board: BoardView;
  vault: { context: Section<string>; log: Section<string> };
  /**
   * The vault has no lanes, no tasklist and no lessons: the console is not reporting a
   * healthy board, it is reporting an empty one. The page swaps the stage for the
   * first-run contract rather than rendering five honest zeros that read as success.
   */
  firstRun: boolean;
}

export const SCOPE_IDS: CockpitScope[] = ["operator", "rhythm", "approvals", "tasklists", "vault"];

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

function operatorAnswer(open: number, stale: { label: string; days: number }[], inbox: number): string {
  const opened = `${count(open, "instance")} open`;
  const packets =
    inbox > 0
      ? ` ${count(inbox, "close packet")} still await the reconcile.`
      : "";
  if (stale.length === 0) {
    return `${opened}, and none has passed the ${THRESHOLD_DAYS}-day line.${packets || " Nothing in the operator state needs you today."}`;
  }
  if (stale.length === 1) {
    return `${opened}, and one has passed the ${THRESHOLD_DAYS}-day line: ${stale[0].label} at ${stale[0].days} days. Close it, or it becomes a truth nobody is maintaining.${packets}`;
  }
  const oldest = Math.max(...stale.map((s) => s.days));
  return `${opened}, and ${stale.length} have passed the ${THRESHOLD_DAYS}-day line — the oldest at ${oldest} days.${packets}`;
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

function buildOperator(status: Section<OperatorStatus>, vault: string | null): OperatorView {
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
      inbox: 0,
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
        link: linkFor("instance", i.file, vault),
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
    ? {
        title: activity.lastShipped.title,
        date: formatDay(activity.lastShipped.date),
        link: linkFor("artifact", activity.lastShipped.path, vault),
      }
    : null;

  return {
    ok: true,
    error: null,
    answer: operatorAnswer(s.open, stale, s.inbox?.count ?? 0),
    headline: `${s.open} open · ${stale.length ? `${stale.length} stale` : "guard clean"}${
      s.inbox?.count ? ` · ${s.inbox.count} packet${s.inbox.count === 1 ? "" : "s"}` : ""
    }`,
    marks,
    stale,
    guard: s.ok,
    open: s.open,
    inbox: s.inbox?.count ?? 0,
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

function rhythmAnswer(read: RhythmRead, receiptAge: number | null): string {
  const parts: string[] = [];

  if (read.plan) {
    const when =
      read.plan.daysAway === 0
        ? "is today"
        : read.plan.daysAway === 1
          ? "is tomorrow"
          : "is in " + read.plan.daysAway + " days";
    parts.push(
      "The " +
        sentence(read.plan.name) +
        " ritual " +
        when +
        " — " +
        count(read.plan.steps.length, "step") +
        ", " +
        read.plan.mine +
        " of them yours",
    );
  } else {
    parts.push("The ritual plan could not be read");
  }

  const rituals = read.cron.entries.filter((e) => e.kind === "ritual").length;
  parts.push(
    rituals > 0
      ? "the crontab carries " + count(rituals, "ritual entry", "ritual entries")
      : "nothing in the crontab runs a ritual",
  );

  if (read.receipt) {
    const age = receiptAge ?? 0;
    parts.push(
      "the last receipt is " + formatDay(read.receipt.date) + (age > 7 ? ", " + age + " days old" : ""),
    );
  } else {
    parts.push("no receipt has been written");
  }

  return parts.map(sentence).join(". ") + ".";
}

function buildRhythm(section: Section<RhythmRead>, today: string, vault: string | null): RhythmView {
  if (!section.ok) {
    return {
      ok: false,
      error: section.error,
      answer: "The rhythm could not be read — the clock and the ritual log are out of reach.",
      headline: "unavailable",
      plan: null,
      planError: null,
      cron: { installed: false, entries: [], note: null },
      hermes: { jobs: [], note: null },
      receipt: null,
      receiptLink: null,
      receiptAge: null,
      redirects: false,
    };
  }

  const read = section.value;
  const receiptAge = read.receipt ? daysBetween(read.receipt.date, today) : null;
  const lastReceipt = read.receipt ? formatDay(read.receipt.date) : "—";

  const cronPart = read.cron.installed ? read.cron.entries.length + " cron" : "no cron";

  return {
    ok: true,
    error: null,
    answer: rhythmAnswer(read, receiptAge),
    headline: cronPart + " · " + read.hermes.jobs.length + " agent · receipt " + lastReceipt,
    plan: read.plan,
    planError: read.planError,
    cron: read.cron,
    hermes: read.hermes,
    receipt: read.receipt,
    receiptLink: linkFor("receipt", "Memory/ritual-log.md", vault),
    receiptAge,
    redirects: read.cron.entries.some((e) => Boolean(e.redirect)),
  };
}

function buildTasklists(status: Section<OperatorStatus>, vault: string | null): TasklistsView {
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

  const linked: TasklistRowView[] = rows.map((r) => ({ ...r, link: linkFor("tasklist", r.file, vault) }));

  const inFlight = rows.filter((r) => /^active/i.test(r.status) && r.done < r.tasks).length;
  const nearDone = rows.filter((r) => r.done < r.tasks && r.tasks - r.done <= 3).length;

  return {
    ok: true,
    error: null,
    answer: tasklistsAnswer(inFlight, nearDone, rows.length),
    headline: `${rows.length} with tasks · ${all.length - rows.length} empty`,
    rows: linked,
    inFlight,
    nearDone,
    empty: all.length - rows.length,
  };
}

/**
 * The board view — the sweep's facts, and the command per item. Functions cannot cross
 * the server/client boundary, so every command string is precomputed here.
 */
function buildBoard(section: Section<BoardRead> | undefined, inbox: number): BoardView {
  const empty: BoardView = {
    ok: false,
    error: section && !section.ok ? section.error : "the board was not read",
    lanes: 0,
    staleDays: 3,
    stale: [],
    closeable: [],
    review: [],
    inbox,
    resource: "",
    commandTasklists: "node Tools/close-stale.js --archive-tasklists",
    commandReview: "node Tools/close-stale.js --archive-tasklists --include-review",
  };
  if (!section || !section.ok) return empty;

  const b = section.value;
  const stale = b.lanes.rows
    .filter((r) => r.stale)
    .map((r) => ({
      ref: r.ref,
      slug: r.slug,
      idle: r.idle_days,
      mission: r.mission,
      packet: `node Tools/close-stale.js --packet ${r.ref} --reason "<why it is finished>"`,
      archive: `node Tools/close-stale.js --archive ${r.ref}`,
    }));

  return {
    ok: true,
    error: null,
    lanes: b.lanes.active,
    staleDays: b.stale_days ?? 3,
    stale,
    closeable: b.tasklists.rows.filter((r) => r.verdict === "closeable"),
    review: b.tasklists.rows.filter((r) => r.verdict === "review"),
    inbox,
    resource: `Memory/asmc/board-${b.now}.md`,
    commandTasklists: "node Tools/close-stale.js --archive-tasklists",
    commandReview: "node Tools/close-stale.js --archive-tasklists --include-review",
  };
}

export function buildCockpitView(data: CockpitData): CockpitView {
  const today = data.status.ok ? data.status.value.date : new Date().toISOString().slice(0, 10);
  const operator = buildOperator(data.status, data.vault);
  const rhythm = buildRhythm(data.rhythm, today, data.vault);
  const approvals = buildApprovals(data.approvals);
  const tasklists = buildTasklists(data.status, data.vault);
  const board = buildBoard(data.board, operator.inbox);
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
        id: "rhythm",
        label: "Rhythm",
        count: rhythm.plan ? rhythm.plan.steps.length : null,
        state: !rhythm.ok
          ? "unavailable"
          : rhythm.plan
            ? rhythm.plan.daysAway === 0
              ? "due today"
              : `in ${rhythm.plan.daysAway}d`
            : "unplanned",
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
    rhythm,
    approvals,
    tasklists,
    board,
    vault: { context: data.vaultContext, log: data.vaultLog },
    firstRun:
      data.status.ok &&
      isFirstRun({
        instances: data.status.value.open,
        tasklists: data.status.value.tasklists.filter((t) => t.tasks > 0).length,
        lessons: data.status.value.activity?.memory?.lessons ?? 0,
      }),
  };
}
