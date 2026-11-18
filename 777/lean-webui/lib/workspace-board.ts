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
import { WORKSPACE_LABEL, WORKSPACE_LANES, type WorkspaceLane } from "./workspace";

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

/** The human label for a writer class (R8: producer / committer). */
export function writerLabel(writer?: string): string {
  if (writer === "producer") return "Contributor agent";
  if (writer === "committer") return "Trusted local agent";
  return writer ?? "—";
}
