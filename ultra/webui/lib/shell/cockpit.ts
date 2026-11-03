import "server-only";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { configuredVaultPath, resolveVault } from "@/lib/shell/vault";
import { runTool } from "@/lib/shell/exec";

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

export interface OperatorStatus {
  date: string;
  cycle: number;
  week: number;
  open: number;
  ok: boolean;
  instances: ParticipantInstance[];
  tasklists: TasklistRow[];
  stale: StaleRow[];
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

export type Section<T> =
  | { ok: true; value: T }
  | { ok: false; error: string; command?: string; exitCode?: number | null };

export interface CockpitData {
  vault: string | null;
  status: Section<OperatorStatus>;
  approvals: Section<Approvals>;
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

function loadFileService(vault: string): Promise<FileService> {
  if (!fileService) {
    const file = path.join(
      vault,
      "Projects",
      "AI-Suplex Ultra Edition",
      "asm-cockpit",
      "lib",
      "file-service.mjs",
    );
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

/** Every section fails independently — a broken tool must not blank the cockpit. */
export async function loadCockpit(): Promise<CockpitData> {
  const vault = resolveVault();

  if (!vault) {
    const error = `AISUPLEX_VAULT is unset or unreadable (resolved: ${configuredVaultPath()}).`;
    return {
      vault: null,
      status: { ok: false, error },
      approvals: { ok: false, error },
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
      approvals: { ok: false, error },
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

  return {
    vault,
    status,
    approvals: section(
      () => service.approvals(),
      "node Tools/approvals.js --json",
    ),
    vaultContext: section(
      () => service.vaultContext() ?? "",
      "Memory/vault-context.md",
    ),
    vaultLog: section(() => service.vaultLog() ?? "", "Memory/vault-log.md"),
  };
}
