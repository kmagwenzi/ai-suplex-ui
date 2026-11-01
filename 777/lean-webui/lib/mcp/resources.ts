/**
 * resources.ts — the 8 `mcp v1` resources as typed reads, plus the derived
 * `Signals` the stage-derivation consumes.
 *
 * Every read revalidates from the server — the UI holds **no** in-memory model
 * it trusts over the next read ("no cache as truth", spec §3.1).
 */

import { getClient } from "./client";
import type { Approvals, Instance, OperatorBrief, Signals } from "../types";
import { isDailyTasklist } from "../stages";

export const RESOURCE_URIS = {
  context: "suplex://context",
  mission: "suplex://mission",
  threads: "suplex://threads",
  tasklists: "suplex://tasklists",
  memoryIndex: "suplex://memory/index",
  memoryLessons: "suplex://memory/lessons",
  approvals: "suplex://approvals",
} as const;

export interface ResourceContent {
  uri: string;
  mimeType: string;
  text: string;
}

function readContents(result: unknown, uri: string): ResourceContent {
  if (
    typeof result !== "object" ||
    result === null ||
    !("contents" in result) ||
    !Array.isArray(result.contents) ||
    result.contents.length === 0
  ) {
    throw new Error(`resource ${uri} returned no content`);
  }
  const first = result.contents[0];
  if (
    typeof first !== "object" ||
    first === null ||
    !("uri" in first) ||
    !("text" in first)
  ) {
    throw new Error(`resource ${uri} content is malformed`);
  }
  return {
    uri: String(first.uri),
    mimeType: "mimeType" in first ? String(first.mimeType) : "text/markdown",
    text: String(first.text),
  };
}

async function readText(uri: string): Promise<string> {
  const content = readContents(await getClient().call("resources/read", { uri }), uri);
  return content.text;
}

async function readJson<T>(uri: string): Promise<T> {
  const text = await readText(uri);
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`resource ${uri} is not valid JSON`);
  }
}

export function readContext(): Promise<OperatorBrief> {
  return readJson<OperatorBrief>(RESOURCE_URIS.context);
}

export function readTasklists(): Promise<OperatorBrief> {
  return readJson<OperatorBrief>(RESOURCE_URIS.tasklists);
}

export function readThreads(): Promise<Instance[]> {
  return readJson<Instance[]>(RESOURCE_URIS.threads);
}

export function readApprovals(): Promise<Approvals> {
  return readJson<Approvals>(RESOURCE_URIS.approvals);
}

export function readMission(): Promise<string> {
  return readText(RESOURCE_URIS.mission);
}

export function readMemoryIndex(): Promise<string> {
  return readText(RESOURCE_URIS.memoryIndex);
}

export function readMemoryLessons(): Promise<string> {
  return readText(RESOURCE_URIS.memoryLessons);
}

export function readTasklist(relPath: string): Promise<string> {
  return readText(`suplex://tasklist/${encodeURIComponent(relPath)}`);
}

/** Today, in the machine's local calendar (the vault's dates are local too). */
export function localToday(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** The signals the stage-derivation reads, built from live resources. */
export function buildSignals(
  brief: OperatorBrief,
  tasklists: OperatorBrief,
  threads: Instance[],
): Signals {
  const today = localToday();
  const list = tasklists.tasklists ?? brief.tasklists ?? [];
  return {
    today,
    activeDailyTasklistToday: list.some(
      (t) => t.status === "active" && isDailyTasklist(t.file) && t.file.startsWith(today),
    ),
    contextDate: brief.date ?? null,
    // Not on the W1 read surface — unknown, never treated as done.
    sessionStartToday: null,
    artifactToday: null,
    endReportToday: null,
    episodeToday: null,
    weeklyReviewThisWeek: null,
    ritualThisWeek: null,
    instanceWrittenToday: (threads.length ? threads : brief.instances ?? []).some(
      (i) => typeof i.opened === "string" && i.opened.startsWith(today),
    ),
  };
}

export interface ConsoleData {
  today: string;
  brief: OperatorBrief | null;
  tasklists: OperatorBrief | null;
  threads: Instance[] | null;
  signals: Signals | null;
  /** resource URIs that failed to read — listed in the fatal panel */
  failed: string[];
}

/**
 * Read the pipeline-critical resources independently. `context` is the only
 * fatal read — it alone carries cycle/week/instances/tasklists, so the other
 * reads can degrade. `approvals` is deliberately **not** fetched here: it is
 * read separately by the Today page (the only screen that renders it), so a
 * slow `approvals --json` can never blank the pipeline or the commands page.
 *
 * A single failed read degrades to `null` and is named in `failed`; it never
 * rejects the whole surface (no all-or-nothing).
 */
export async function readConsoleData(): Promise<ConsoleData> {
  const [brief, tasklists, threads] = await Promise.all([
    readContext().catch(() => null),
    readTasklists().catch(() => null),
    readThreads().catch(() => null),
  ]);

  const failed: string[] = [];
  if (!brief) failed.push(RESOURCE_URIS.context);
  if (!tasklists) failed.push(RESOURCE_URIS.tasklists);
  if (!threads) failed.push(RESOURCE_URIS.threads);

  // context cannot be reconstructed — fall back to the brief's inline
  // tasklists/instances when the richer reads fail, so only context is fatal.
  const signals = brief
    ? buildSignals(brief, tasklists ?? brief, threads ?? (brief.instances ?? []))
    : null;

  return { today: localToday(), brief, tasklists, threads, signals, failed };
}
