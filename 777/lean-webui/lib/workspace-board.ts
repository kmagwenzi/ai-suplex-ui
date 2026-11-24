/**
 * workspace-board.ts — the pure grouping + labelling for the /workspaces board.
 *
 * Spec: Projects/AI-Suplex 777/2026-11-11-workspaces-tab-design.md.
 *
 * Pure — no MCP, no clock, no reads. Turns the Instance[] from suplex://threads
 * into the four workspace-type groups the board renders, plus the human label
 * for a writer class. Reuses lib/workspace.ts — it never re-declares the map.
 */

import type { Instance } from "./types";
import {
  WORKSPACE_LABEL,
  WORKSPACE_LANES,
  workspaceLabel,
  type WorkspaceLane,
} from "./workspace";

/** How many rows a section shows before it collapses. */
export const COLLAPSE_AT = 3;

/**
 * A section shows at most COLLAPSE_AT rows until expanded, and always reports
 * how many it is hiding — a silent cut-off is a lie about the size of the list.
 */
export function visibleRows<T>(
  rows: T[],
  expanded: boolean,
  limit: number = COLLAPSE_AT,
): { shown: T[]; hidden: number } {
  if (expanded || rows.length <= limit) return { shown: rows, hidden: 0 };
  return { shown: rows.slice(0, limit), hidden: rows.length - limit };
}

export interface WorkspaceGroup {
  lane: WorkspaceLane;
  label: string;
  instances: Instance[];
}

/** Group instances by workspace type, in canonical lane order. */
/** Newest first: a workspace you just opened belongs at the top of its section. */
export function newestFirst(instances: Instance[]): Instance[] {
  return instances.slice().sort((a, b) => {
    const ao = a.opened ?? "";
    const bo = b.opened ?? "";
    if (ao === bo) return a.file.localeCompare(b.file);
    return bo.localeCompare(ao);
  });
}

export function groupByWorkspaceType(instances: Instance[]): WorkspaceGroup[] {
  return WORKSPACE_LANES.map((lane) => ({
    lane,
    label: WORKSPACE_LABEL[lane],
    instances: newestFirst(instances.filter((i) => i.thread === lane)),
  }));
}

/**
 * The composer hand-off for closing one workspace. Type and instance are facts
 * read off the row — not guesses — so the closer opens with its target named.
 * A singleton carries no ref/slug, so its query names the type alone; the
 * composer's contract is the thing that decides what those params fill.
 */
export function closeWorkspaceHref(i: Instance): string {
  const q = new URLSearchParams({
    command: "close-workspace",
    type: workspaceLabel(i.thread),
  });
  const instance = i.ref ?? i.slug;
  if (instance) q.set("instance", instance);
  return "/commands?" + q.toString();
}

/** The human label for a writer class (R8: producer / committer). */
export function writerLabel(writer?: string): string {
  if (writer === "producer") return "Contributor agent";
  if (writer === "committer") return "Trusted local agent";
  return writer ?? "—";
}
