/**
 * workspace-create-form.ts — the pure form logic for opening a workspace from
 * the console (P003). The write itself is the harness tool
 * `suplex_workspace_create` (contract 1.2.0); this module only shapes and
 * validates the draft before it is sent.
 */

/** The N lanes the console may open (singletons are the framework's). */
export const CREATABLE_LANES = ["project-tasks", "random-tasks"] as const;

export interface CreateDraft {
  thread: string;
  slug: string;
  title: string;
  mission: string;
  focus?: string;
  tasks?: string;
}

/** A kebab-case slug derived from a title, capped at the vault's 60 chars. */
export function slugFromTitle(title: string): string {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "untitled"
  );
}

/** One task per line; blank lines drop; the cap mirrors the harness (24). */
export function tasksFromText(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 24);
}

/** The first reason the draft is not sendable, or null when it is. */
export function validateCreate(draft: CreateDraft): string | null {
  if (!CREATABLE_LANES.includes(draft.thread as (typeof CREATABLE_LANES)[number])) {
    return "pick Project or Quick Task — singletons are opened by the framework";
  }
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(draft.slug || "")) {
    return "slug must be kebab-case: lowercase letters, digits, single dashes";
  }
  if (!draft.title?.trim()) return "a title is required";
  if (!draft.mission?.trim()) return "a mission is required — one sentence says what done means";
  return null;
}
