/**
 * The Morning Read — what changed since the last snapshot.
 *
 * Ultra's moat is that every number is a read of the vault. That also means the app has
 * nothing to say to a returning user unless it remembers yesterday — so `Tools/asmc.js
 * snapshot` writes one line a day, and this module subtracts two lines.
 *
 * Arithmetic, not inference: no model, no estimate, no "insights". If nothing moved, the
 * strip says nothing moved, because a dashboard that manufactures movement teaches its
 * reader to stop believing it.
 */

/** One day's line, exactly as `asmc snapshot` writes it. */
export interface SnapshotRow {
  date: string;
  open: number;
  stale: number;
  tasklists: number;
  inbox: number;
  lessons: number;
  bBombs: number;
  episodic: number;
  artifacts: number;
  lastShipped: string | null;
}

export type MorningKind = "no-baseline" | "unchanged" | "moved";

export interface MorningLine {
  key: string;
  label: string;
  from: number | string;
  to: number | string;
  /** Present for counters; absent for the shipped date. */
  delta: number | null;
}

export interface MorningView {
  kind: MorningKind;
  /** The date the comparison is drawn against — the previous row. */
  since: string | null;
  /** The date of the newest row. */
  asOf: string | null;
  lines: MorningLine[];
  /** How many days are on record (the strip's evidence of its own history). */
  days: number;
}

/** Counters, in the order a reader cares: what shipped, what was learned, what is waiting. */
const COUNTERS: { key: keyof SnapshotRow; label: string; unit: string }[] = [
  { key: "lessons", label: "lessons", unit: "" },
  { key: "artifacts", label: "artifacts", unit: "" },
  { key: "bBombs", label: "B-Bombs", unit: "" },
  { key: "episodic", label: "episodes", unit: "" },
];

/**
 * Parse the JSONL the tool writes. A corrupt line is dropped, never repaired — the same
 * rule the tool uses. Duplicate dates keep the LAST line (the day's final word).
 */
export function parseSnapshots(text: string): SnapshotRow[] {
  const byDate = new Map<string, SnapshotRow>();
  for (const line of text.split("\n")) {
    if (!line.trim()) continue;
    let row: unknown;
    try {
      row = JSON.parse(line);
    } catch {
      continue;
    }
    if (!row || typeof row !== "object") continue;
    const r = row as Partial<SnapshotRow>;
    if (typeof r.date !== "string") continue;
    byDate.set(r.date, {
      date: r.date,
      open: Number(r.open) || 0,
      stale: Number(r.stale) || 0,
      tasklists: Number(r.tasklists) || 0,
      inbox: Number(r.inbox) || 0,
      lessons: Number(r.lessons) || 0,
      bBombs: Number(r.bBombs) || 0,
      episodic: Number(r.episodic) || 0,
      artifacts: Number(r.artifacts) || 0,
      lastShipped: typeof r.lastShipped === "string" ? r.lastShipped : null,
    });
  }
  return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * The delta between the last two days. Fewer than two rows is **not** an error: it is the
 * honest first run, and the strip says so rather than drawing a cheerful zero.
 */
export function morningDelta(rows: SnapshotRow[]): MorningView {
  const sorted = rows.slice().sort((a, b) => a.date.localeCompare(b.date));
  const days = sorted.length;

  if (days < 2) {
    return {
      kind: "no-baseline",
      since: null,
      asOf: days === 1 ? sorted[0].date : null,
      lines: [],
      days,
    };
  }

  const prev = sorted[days - 2];
  const now = sorted[days - 1];
  const lines: MorningLine[] = [];

  if (now.lastShipped && now.lastShipped !== prev.lastShipped) {
    lines.push({
      key: "shipped",
      label: "shipped",
      from: prev.lastShipped ?? "—",
      to: now.lastShipped,
      delta: null,
    });
  }

  for (const counter of COUNTERS) {
    const from = Number(prev[counter.key]) || 0;
    const to = Number(now[counter.key]) || 0;
    if (to === from) continue;
    lines.push({ key: counter.key, label: counter.label, from, to, delta: to - from });
  }

  // Movement in the board itself: open lanes, packets waiting, tasklists in flight.
  for (const board of [
    { key: "open", label: "open instances" },
    { key: "inbox", label: "packets waiting" },
    { key: "tasklists", label: "tasklists in flight" },
  ] as const) {
    const from = Number(prev[board.key]) || 0;
    const to = Number(now[board.key]) || 0;
    if (to === from) continue;
    lines.push({ key: board.key, label: board.label, from, to, delta: to - from });
  }

  return {
    kind: lines.length === 0 ? "unchanged" : "moved",
    since: prev.date,
    asOf: now.date,
    lines,
    days,
  };
}

/** "+1 episode", not "+1 episodes" — a counter that reads wrong is a counter nobody trusts. */
export function counterNoun(label: string, delta: number | null): string {
  if (!delta || Math.abs(delta) !== 1) return label;
  return label.endsWith("s") ? label.slice(0, -1) : label;
}

/** "+3 lessons" · "instances 4 → 3" — one string per line, for a hover or a test. */
export function morningLineText(line: MorningLine): string {
  if (line.key === "shipped") return "shipped " + line.to;
  if (line.key === "lessons" || line.key === "artifacts" || line.key === "bBombs" || line.key === "episodic") {
    const n = line.delta ?? 0;
    return (n > 0 ? "+" : "") + n + " " + counterNoun(line.label, n);
  }
  return line.label + " " + line.from + " → " + line.to;
}
