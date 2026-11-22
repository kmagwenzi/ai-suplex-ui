import "server-only";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { configuredVaultPath, resolveVault } from "@/lib/shell/vault";
import { runBin, runTool } from "@/lib/shell/exec";
import {
  nextRitual,
  parseCrontab,
  parseHermesJobs,
  parseReceipt,
  type CronEntry,
  type HermesJob,
  type RitualReceipt,
} from "@/lib/shell/rhythm";

/**
 * The cockpit's data layer. File-first: it imports the vault's
 * `asm-cockpit/lib/file-service.mjs` (markdown reads + 3lm/Tools bridges) and execs the
 * deterministic operator tools. No Postgres, no daemon, no inbound port.
 *
 * Read-first by design: nothing here writes, approves, promotes or archives.
 */

export interface ParticipantInstance {
  thread: string;
  ref: string | null;
  slug: string | null;
  singleton: boolean;
  file: string;
  status: string;
  opened: string;
  writer: string;
  mission: string | null;
  ageDays: number;
}

export interface TasklistRow {
  file: string;
  title: string | null;
  status: string;
  tasks: number;
  done: number;
  next: string | null;
  nextTitle: string | null;
}

export interface StaleRow {
  label: string;
  days: number;
  fix: string;
}

/** One row of `close-stale --board --json`: a fact, and the tool's own verdict. */
export interface BoardLane {
  ref: string;
  slug: string;
  thread: string;
  mission: string;
  opened: string;
  touched: string;
  idle_days: number;
  status: string;
  stale: boolean;
}

export interface BoardTasklist {
  file: string;
  date: string;
  touched: string;
  status: string;
  done: number;
  open: number;
  verdict: "closeable" | "review" | "keep";
  why: string;
}

export interface BoardRead {
  now: string;
  stale_days?: number;
  lanes: { active: number; stale: number; rows: BoardLane[] };
  tasklists: { active: number; closeable: number; rows: BoardTasklist[] };
}

/** The tool's own read of the day: sessions, the last ship, the memory pulse. */
export interface Activity {
  date?: string;
  sessionStart?: boolean;
  sessionEnd?: boolean;
  lastShipped?: { title: string; date: string; path?: string } | null;
  weekly?: {
    review?: boolean;
    reviewFile?: string | null;
    ritual?: boolean;
    lastRitual?: string | null;
    ritualDays?: number | null;
  };
  memory?: {
    semantic: number;
    procedural: number;
    episodic: number;
    lessons: number;
    bBombs?: number;
  };
}

export interface OperatorStatus {
  date: string;
  cycle: number;
  week: number;
  open: number;
  ok: boolean;
  instances: ParticipantInstance[];
  tasklists: TasklistRow[];
  stale: StaleRow[];
  /** Present in current asmc.js; optional so an older tool still degrades honestly. */
  activity?: Activity;
  /** Close packets still owed a reconcile — a count from Inbox/, never a verdict. */
  inbox?: { count: number; oldest: string | null };
}

export interface Approvals {
  generated: string;
  pending: boolean;
  gates: unknown[];
  lessons: {
    pool: number;
    ready: number;
    borderline: number;
    readyItems: { score: number; text: string }[];
  };
  bBombs: { count: number };
}

export interface RitualStep {
  id: string;
  label: string;
  owner: string;
  status: string;
  tier: string;
}

/** The ritual that is actually next, read from the tool that sequences it. */
export interface RitualPlan {
  name: string;
  title: string;
  date: string;
  daysAway: number;
  steps: RitualStep[];
  /** Steps the Hustler owns — the ones the machine cannot do. */
  mine: number;
  scripted: number;
  skipped: number;
}

/** The clock: what cron runs, what the ritual asks, and when it last left a receipt. */
export interface RhythmRead {
  /** The deterministic half: `crontab -l` on this machine. */
  cron: { installed: boolean; entries: CronEntry[]; note: string | null };
  /** The agent-shaped half: documented in Tools/cron/hermes-jobs.md, not a profile read. */
  hermes: { jobs: HermesJob[]; note: string | null };
  plan: RitualPlan | null;
  planError: string | null;
  receipt: RitualReceipt | null;
}

export type Section<T> =
  | { ok: true; value: T }
  | { ok: false; error: string; command?: string; exitCode?: number | null };

export interface CockpitData {
  vault: string | null;
  status: Section<OperatorStatus>;
  /** The board: the same rules the sweep runs, read-only. */
  board?: Section<BoardRead>;
  approvals: Section<Approvals>;
  rhythm: Section<RhythmRead>;
  vaultContext: Section<string>;
  vaultLog: Section<string>;
}

interface FileService {
  approvals(): Approvals;
  vaultLog(): string | null;
  vaultContext(): string | null;
  listActiveTasklists(): string[];
}

/**
 * Load the vault's file-service at runtime. It is ESM living outside this app, so the
 * import must not be statically analysed by the bundler — hence the constructed importer.
 */
const importEsm = new Function("specifier", "return import(specifier)") as (
  specifier: string,
) => Promise<FileService>;

let fileService: Promise<FileService> | null = null;

/** The project folder has been renamed once already — resolve it, do not assume it. */
const SERVICE_CANDIDATES = [
  ["Projects", "AI-Suplex Ultra Edition", "asm-cockpit", "lib", "file-service.mjs"],
  ["Projects", "AI-Suplex Ultra", "asm-cockpit", "lib", "file-service.mjs"],
];

function findFileService(vault: string): string {
  for (const parts of SERVICE_CANDIDATES) {
    const file = path.join(vault, ...parts);
    if (fs.existsSync(file)) return file;
  }
  throw new Error(
    "asm-cockpit/lib/file-service.mjs was not found — looked under Projects/AI-Suplex Ultra Edition and Projects/AI-Suplex Ultra",
  );
}

function loadFileService(vault: string): Promise<FileService> {
  if (!fileService) {
    const file = findFileService(vault);
    // The module resolves its own vault at import time; make it agree with this shell.
    if (!process.env.AISUPLEX_VAULT) process.env.AISUPLEX_VAULT = vault;
    fileService = importEsm(pathToFileURL(file).href);
  }
  return fileService;
}

function parseJson<T>(stdout: string): T {
  // The tools print JSON on stdout; a banner would be a tool bug, not something to guess past.
  return JSON.parse(stdout) as T;
}

/**
 * The board — the sweep's own rules, read live. The cockpit uses them to PROPOSE;
 * it never archives. `close-stale --board --json` is the single owner of the verdicts.
 */
async function loadBoard(vault: string): Promise<Section<BoardRead>> {
  const result = await runTool(["Tools/close-stale.js", "--board", "--json"], vault, 30000);
  if (!result.ok) {
    return {
      ok: false,
      error: result.message,
      command: "node Tools/close-stale.js --board --json",
      exitCode: result.code,
    };
  }
  try {
    return { ok: true, value: parseJson<BoardRead>(result.stdout) };
  } catch {
    return {
      ok: false,
      error: "the board tool returned output that is not JSON",
      command: "node Tools/close-stale.js --board --json",
    };
  }
}

async function loadStatus(vault: string): Promise<Section<OperatorStatus>> {
  const result = await runTool(["Tools/asmc.js", "status", "--json"], vault, 30000);
  if (!result.ok) {
    return {
      ok: false,
      error: result.message,
      command: "node Tools/asmc.js status --json",
      exitCode: result.code,
    };
  }
  try {
    const parsed = parseJson<OperatorStatus>(result.stdout);
    return { ok: true, value: parsed };
  } catch {
    return {
      ok: false,
      error: "the operator tool returned output that is not JSON",
      command: "node Tools/asmc.js status --json",
    };
  }
}

/**
 * The rhythm: `crontab -l` (a read), the next ritual's own plan, and the receipt log.
 * A machine with no crontab is not an error — it is a fact the cockpit should state.
 */
async function loadRhythm(vault: string, today: string): Promise<Section<RhythmRead>> {
  let cron: RhythmRead["cron"] = { installed: false, entries: [], note: null };

  const crontab = await runBin("crontab", ["-l"], vault, 10000);
  if (crontab.ok) {
    cron = { installed: true, entries: parseCrontab(crontab.stdout), note: null };
  } else if (crontab.code === 1 && /no crontab/i.test(crontab.stderr ?? "")) {
    cron = { installed: false, entries: [], note: "no crontab is installed for this user" };
  } else if (/ENOENT/.test(crontab.message)) {
    cron = { installed: false, entries: [], note: "crontab is not available on this machine" };
  } else {
    cron = { installed: false, entries: [], note: crontab.message.split("\n")[0] };
  }

  let hermes: RhythmRead["hermes"] = { jobs: [], note: null };
  try {
    const jobs = parseHermesJobs(fs.readFileSync(path.join(vault, "Tools", "cron", "hermes-jobs.md"), "utf8"));
    hermes = {
      jobs,
      note: jobs.length === 0 ? "Tools/cron/hermes-jobs.md lists no agent-shaped job" : null,
    };
  } catch {
    hermes = { jobs: [], note: "Tools/cron/hermes-jobs.md is not in this vault" };
  }

  const next = nextRitual(today);
  let plan: RitualPlan | null = null;
  let planError: string | null = null;

  // Without --run this is a plan, not a ritual: ritual.js has no side effect here.
  const result = await runTool(["Tools/ritual.js", next.name, "--tier", "ultra", "--json"], vault, 30000);
  if (!result.ok) {
    planError = result.message.split("\n")[0];
  } else {
    try {
      const raw = parseJson<{ title?: string; steps?: RitualStep[] }>(result.stdout);
      const steps: RitualStep[] = (raw.steps ?? []).map((s) => ({
        id: s.id,
        label: s.label,
        owner: s.owner,
        status: s.status,
        tier: s.tier,
      }));
      plan = {
        name: next.name,
        title: raw.title ?? next.name,
        date: next.date,
        daysAway: next.daysAway,
        steps,
        mine: steps.filter((s) => s.owner === "hustler").length,
        scripted: steps.filter((s) => s.owner === "builder").length,
        skipped: steps.filter((s) => s.status === "skipped").length,
      };
    } catch {
      planError = "the ritual tool returned output that is not JSON";
    }
  }

  let receipt: RitualReceipt | null = null;
  try {
    receipt = parseReceipt(fs.readFileSync(path.join(vault, "Memory", "ritual-log.md"), "utf8"));
  } catch {
    receipt = null;
  }

  return { ok: true, value: { cron, hermes, plan, planError, receipt } };
}

/** Every section fails independently — a broken tool must not blank the cockpit. */
export async function loadCockpit(): Promise<CockpitData> {
  const vault = resolveVault();

  if (!vault) {
    const error = `AISUPLEX_VAULT is unset or unreadable (resolved: ${configuredVaultPath()}).`;
    return {
      vault: null,
      status: { ok: false, error },
      board: { ok: false, error },
      approvals: { ok: false, error },
      rhythm: { ok: false, error },
      vaultContext: { ok: false, error },
      vaultLog: { ok: false, error },
    };
  }

  const [status, service] = await Promise.all([
    loadStatus(vault),
    loadFileService(vault).catch((err: Error) => err),
  ]);

  if (service instanceof Error) {
    const error = `the cockpit data layer could not be loaded — ${service.message}`;
    return {
      vault,
      status,
      board: { ok: false, error },
      approvals: { ok: false, error },
      rhythm: { ok: false, error },
      vaultContext: { ok: false, error },
      vaultLog: { ok: false, error },
    };
  }

  const section = <T>(read: () => T, command: string): Section<T> => {
    try {
      return { ok: true, value: read() };
    } catch (err) {
      return { ok: false, error: (err as Error).message.split("\n")[0], command };
    }
  };

  const today = status.ok ? status.value.date : new Date().toISOString().slice(0, 10);
  const rhythm = await loadRhythm(vault, today);
  const board = await loadBoard(vault);

  return {
    vault,
    status,
    board,
    approvals: section(
      () => service.approvals(),
      "node Tools/approvals.js --json",
    ),
    rhythm,
    vaultContext: section(
      () => service.vaultContext() ?? "",
      "Memory/vault-context.md",
    ),
    vaultLog: section(() => service.vaultLog() ?? "", "Memory/vault-log.md"),
  };
}
