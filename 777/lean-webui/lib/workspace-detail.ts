/**
 * workspace-detail.ts — the pure identity + matching for the workspace deep
 * view (/workspaces/[id]).
 *
 * Spec: Projects/AI-Suplex 777/2026-11-17-workflow-console-wave-2-scope.md (P002).
 *
 * Pure — no MCP, no clock, no reads. Two jobs:
 *
 * 1. Identity — an instance's route id is its context filename without the
 *    extension ("ownership is the filename", Spec — Context & Threads §2).
 * 2. Tasklist matching — a tasklist belongs to a workspace when its filename
 *    carries the canonical `{date}-{thread}-{slug}` token. A singleton's
 *    tasklists do not carry the lane token in their names, so for singletons
 *    the match is **empty and typed as unknown** — the view renders that
 *    honestly instead of guessing (absence of evidence is not a match).
 */

import type { Instance, TasklistSummary } from "./types";

/** The route id for an instance: the context filename without `.md`. */
export function instanceId(file: string): string {
  return file.replace(/\.md$/, "");
}

/** Find an instance by its route id (accepts the id with or without `.md`). */
export function findInstance(
  instances: Instance[],
  id: string,
): Instance | null {
  const wanted = instanceId(decodeURIComponent(id));
  return instances.find((i) => instanceId(i.file) === wanted) ?? null;
}

/**
 * The tasklists matched to one instance by the canonical filename token
 * `-{thread}-{slug}`. Singletons and slug-less instances match nothing —
 * the caller renders the typed unknown.
 */
export function matchTasklistsFor(
  instance: Instance,
  tasklists: TasklistSummary[],
): TasklistSummary[] {
  if (instance.singleton || !instance.slug) return [];
  const token = `-${instance.thread}-${instance.slug}`;
  return tasklists.filter((t) => t.file.includes(token));
}

/**
 * Where a tasklist body may live, in read order. `suplex://tasklist/{path}`
 * is jailed to `Tasklists/`, and the summary carries only the basename — so
 * the reader tries the known folders instead of guessing one.
 */
export const TASKLIST_DIRS = ["Active", "Archive", "Combined"] as const;

/** The resource paths to try for one tasklist basename. */
export function tasklistCandidates(file: string): string[] {
  return TASKLIST_DIRS.map((dir) => `Tasklists/${dir}/${file}`);
}

/** The human progress line: "3/18 done", or the typed empty. */
export function tasklistProgress(t: TasklistSummary): string {
  if (!t.tasks) return "— no tasks parsed —";
  return `${t.done}/${t.tasks} done`;
}
