/**
 * workspace.ts — the client-facing label layer over the internal `thread` lanes.
 *
 * Spec: `Projects/AI-Suplex 777/2026-11-11-workspaces-lean-webui-design.md`.
 *
 * The hybrid rule (Option C): `thread` stays the internal identifier — the
 * frontmatter key, the filename prefix, `suplex://threads`. This module maps
 * each lane to the "Workspace" language a human reads and declares the
 * type-aware tasklist default. Pure — no MCP calls, no clock, no reads.
 */

export type WorkspaceLane =
  | "daily-tasks"
  | "project-tasks"
  | "random-tasks"
  | "realist";

export interface WorkspaceTypeDef {
  /** The client-facing label a human reads. */
  label: string;
  /** The internal lane token (self-keyed). */
  lane: WorkspaceLane;
  /** One singleton lane, or many parallel instances. */
  instances: 1 | "many";
  /** The "Create tasklist" default — Yes for Daily/Project, No for Quick/Review. */
  tasklistDefault: boolean;
}

export const WORKSPACE_TYPES: Record<WorkspaceLane, WorkspaceTypeDef> = {
  "daily-tasks": {
    label: "Daily Work",
    lane: "daily-tasks",
    instances: 1,
    tasklistDefault: true,
  },
  "project-tasks": {
    label: "Project",
    lane: "project-tasks",
    instances: "many",
    tasklistDefault: true,
  },
  "random-tasks": {
    label: "Quick Task",
    lane: "random-tasks",
    instances: "many",
    tasklistDefault: false,
  },
  realist: {
    label: "Review",
    lane: "realist",
    instances: 1,
    tasklistDefault: false,
  },
};

/** The ordered lane tokens, for enum field options. */
export const WORKSPACE_LANES: WorkspaceLane[] = Object.keys(
  WORKSPACE_TYPES,
) as WorkspaceLane[];

/** Lane token → client label (derived from `WORKSPACE_TYPES` — single source). */
export const WORKSPACE_LABEL: Record<WorkspaceLane, string> = Object.fromEntries(
  Object.entries(WORKSPACE_TYPES).map(([lane, def]) => [lane, def.label]),
) as Record<WorkspaceLane, string>;

/** The label for a lane, with the raw token as fallback (unknown lanes stay legible). */
export function workspaceLabel(thread: string): string {
  return (WORKSPACE_LABEL as Partial<Record<string, string>>)[thread] ?? thread;
}

/** Whether a lane's "Create tasklist" default is Yes (Daily/Project). */
export function defaultTasklist(lane: string): boolean {
  const def = (WORKSPACE_TYPES as Partial<Record<string, WorkspaceTypeDef>>)[lane];
  return def?.tasklistDefault ?? false;
}
