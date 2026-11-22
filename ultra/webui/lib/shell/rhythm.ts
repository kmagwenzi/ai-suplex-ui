/**
 * The rhythm — what runs on a clock, and what the ritual will ask of you.
 *
 * Pure parsing on purpose: the crontab, the calendar and the receipt log are all
 * strings here, so the cockpit's claims about them are tested without a crontab.
 */

export type CronKind = "ritual" | "backup" | "other";

export interface CronEntry {
  /** The five cron fields, verbatim. */
  schedule: string;
  /** Human cadence when the schedule is a simple one; the raw fields otherwise. */
  when: string;
  /** The script, plus its sub-command for the ritual runner. */
  label: string;
  kind: CronKind;
  /** Where the line writes its output, when it does. */
  redirect?: string;
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** "30 21 * * *" → "daily 21:30"; anything cleverer keeps its raw fields. */
export function humanCadence(schedule: string): string {
  const parts = schedule.trim().split(/\s+/);
  if (parts.length !== 5) return schedule.trim();
  const [min, hour, dom, mon, dow] = parts;
  if (!/^\d{1,2}$/.test(min) || !/^\d{1,2}$/.test(hour)) return schedule.trim();
  const time = pad(Number(hour)) + ":" + pad(Number(min));
  if (dom === "*" && mon === "*" && dow === "*") return "daily " + time;
  if (dom === "*" && mon === "*" && /^\d$/.test(dow)) {
    const day = DAYS[Number(dow)];
    if (day) return day + " " + time;
  }
  return schedule.trim();
}

/**
 * Parse `crontab -l`. Comments, blanks and five-field-only lines are dropped; the
 * command is reduced to its script so a cron line never dumps an absolute path
 * (or an environment tuple) into the surface.
 */
export function parseCrontab(text: string): CronEntry[] {
  const out: CronEntry[] = [];
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const fields = line.split(/\s+/);
    if (fields.length < 6) continue;

    const schedule = fields.slice(0, 5).join(" ");
    const command = fields.slice(5).join(" ");
    const redirectMatch = command.match(/>>?\s*(\S+)/);
    const redirect = redirectMatch ? redirectMatch[1] : undefined;
    const base = command.replace(/>>?\s*\S+/g, "").trim();
    const tokens = base.split(/\s+/).filter(Boolean);
    const script = tokens.find((t) => /\.(sh|js|py)$/.test(t)) ?? tokens[0] ?? base;
    const name = script.split("/").pop() ?? script;
    const arg = tokens[tokens.indexOf(script) + 1];
    const isRitual = /rituals?\.(sh|js)/i.test(base);
    const kind: CronKind = isRitual ? "ritual" : /backup/i.test(name) ? "backup" : "other";
    const label = isRitual && arg && !arg.startsWith("-") ? name + " " + arg : name;

    out.push({ schedule, when: humanCadence(schedule), label, kind, redirect });
  }
  return out;
}

export interface HermesJob {
  schedule: string;
  when: string;
  name: string;
  /** `discord`, `local`, or `stdout` when the job is `--no-agent`. */
  deliver: string;
  script: string;
}

/**
 * The agent half of the schedule, read from `Tools/cron/hermes-jobs.md` — the vault's
 * own record of the jobs that carry an LLM or a gateway. This is documentation, not a
 * live profile read, and the surface says so.
 */
export function parseHermesJobs(markdown: string): HermesJob[] {
  const lines = markdown.split("\n");

  // One job's block is the lines between its own `hermes cron create` and the next
  // one — a fixed window would read the following job's flags as this job's.
  const starts: number[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (/hermes cron create\s+"[^"]+"/.test(lines[i])) starts.push(i);
  }

  const jobs: HermesJob[] = [];
  for (let k = 0; k < starts.length; k++) {
    const from = starts[k];
    const head = /hermes cron create\s+"([^"]+)"/.exec(lines[from]);
    if (!head) continue;

    const block = lines.slice(from, Math.min(from + 12, k + 1 < starts.length ? starts[k + 1] : lines.length)).join(" ");
    const name = /--name\s+"([^"]+)"/.exec(block);
    if (!name) continue;

    const deliver = /--deliver\s+([\w-]+)/.exec(block);
    const script = /--script\s+([\w.-]+)/.exec(block);
    const noAgent = /--no-agent/.test(block);

    jobs.push({
      schedule: head[1],
      when: humanCadence(head[1]),
      name: name[1],
      deliver: deliver ? deliver[1] : "local",
      script: script ? script[1] : noAgent ? "script" : "",
    });
  }
  return jobs;
}

function isoDate(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export interface NextRitual {
  name: "tuesday" | "saturday";
  date: string;
  daysAway: number;
}

/**
 * The next Tuesday or Saturday from a calendar date. The vault's own date is the
 * input — the browser clock never decides when a ritual is due.
 */
export function nextRitual(today: string): NextRitual {
  const [y, m, d] = today.split("-").map(Number);
  const base = Date.UTC(y, (m || 1) - 1, d || 1);
  if (!Number.isFinite(base)) return { name: "tuesday", date: today, daysAway: 0 };

  const dow = new Date(base).getUTCDay();
  const targets: [NextRitual["name"], number][] = [
    ["tuesday", 2],
    ["saturday", 6],
  ];

  let best: NextRitual = { name: "tuesday", date: today, daysAway: 7 };
  for (const [name, target] of targets) {
    const delta = (target - dow + 7) % 7;
    if (delta < best.daysAway) best = { name, date: isoDate(base + delta * 86400000), daysAway: delta };
  }
  return best;
}

export function daysBetween(from: string, to: string): number {
  const a = Date.parse(from + "T00:00:00Z");
  const b = Date.parse(to + "T00:00:00Z");
  if (!Number.isFinite(a) || !Number.isFinite(b)) return 0;
  return Math.max(0, Math.round((b - a) / 86400000));
}

export interface RitualReceipt {
  date: string;
  name: string;
  ran: string[];
  handed: string[];
  verdict: string;
}

const ENTRY_HEAD = /^###\s+(\d{4}-\d{2}-\d{2})\s*·\s*(.+)$/;

function ids(text: string): string[] {
  const t = text.trim();
  if (!t || /^none$/i.test(t)) return [];
  return t
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * The last dated entry in Memory/ritual-log.md. The log is written by one verb, but
 * an old cron line still appends banners into it — so the parser reads only the
 * receipt's own three keys and takes the last `### date · name` block.
 */
export function parseReceipt(markdown: string): RitualReceipt | null {
  const lines = markdown.split("\n");
  let at = -1;
  let head: RegExpExecArray | null = null;
  for (let i = 0; i < lines.length; i++) {
    const m = ENTRY_HEAD.exec(lines[i].trim());
    if (m) {
      at = i;
      head = m;
    }
  }
  if (at === -1 || !head) return null;

  const entry: RitualReceipt = { date: head[1], name: head[2].trim(), ran: [], handed: [], verdict: "" };

  // An entry is its own three keys and nothing else. The log also carries cron
  // banners, so the read stops at the first blank or unrecognised line — a stray
  // "`- ran:`" in a banner can never be mistaken for the receipt.
  let started = false;
  for (let i = at + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (ENTRY_HEAD.test(line) || /^###\s/.test(line)) break;
    if (!line) {
      if (!started) continue;
      break;
    }

    const ran = /^-\s*ran:\s*(.*)$/i.exec(line);
    if (ran) {
      entry.ran = ids(ran[1]);
      started = true;
      continue;
    }
    const handed = /^-\s*handed off:\s*(.*)$/i.exec(line);
    if (handed) {
      entry.handed = ids(handed[1]);
      started = true;
      continue;
    }
    const verdict = /^-\s*verdict:\s*(.*)$/i.exec(line);
    if (verdict) {
      entry.verdict = verdict[1].trim();
      started = true;
      continue;
    }
    break;
  }
  return entry;
}
