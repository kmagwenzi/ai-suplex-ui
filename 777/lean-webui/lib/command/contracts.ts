/**
 * contracts.ts — the per-command CONTENT contract (T039/T040).
 *
 * Every command's own doc says what CONTENT means. They are not the same shape:
 * Save Context wants `Thread` + `Instance` + `Writer`; Session Start wants a
 * Task ID (and optionally the tasklist); Tasklist Generation wants the raw list.
 * A single `<Source type>: <value>` line flattened all seven into one.
 *
 * This module declares each command's real fields, the pattern that governs it,
 * and the placeholder that teaches its format. The composer renders exactly
 * these lines — no more, no fewer (T041).
 */

import { instancePath, type PrefillInput } from "../prompts";
import { isDailyTasklist } from "../stages";
import { WORKSPACE_LANES, WORKSPACE_TYPE_LABELS } from "../workspace";

export type FieldKind = "text" | "raw" | "enum" | "vault-file" | "instance" | "source";

export interface ContentField {
  /** The key printed in the command — `- <key>: <value>`. */
  key: string;
  /** Display label — reads "Workspace" while the command emits `key`. Defaults to `key`. */
  label?: string;
  kind: FieldKind;
  required: boolean;
  /** Shown in the UI *and* used verbatim when the field is empty — it teaches the format. */
  placeholder: string;
  /** One sentence in the panel: what belongs here. */
  hint: string;
  /** For `enum`. */
  options?: string[];
  /** For `source`: which source types this command accepts. */
  sourceTypes?: Array<"vault-file" | "raw" | "chat-reference">;
}

export interface CommandContract {
  /** The `mcp v1` prompt name. */
  name: string;
  /** The vault doc that defines the work — shown in the panel (T043). */
  patternFile: string;
  /** One line: what this command does with the content. */
  purpose: string;
  fields: ContentField[];
  /** What ADDITIONAL is for, when the command has a prescribed use. */
  additionalHint: string;
}

const THREADS: string[] = WORKSPACE_LANES; // internal lane tokens — the command emits these verbatim
const WRITERS = ["committer", "producer"];
const WORKSPACE_TYPE_OPTIONS: string[] = WORKSPACE_TYPE_LABELS;
const MODES = ["Trusted local agent", "Contributor agent"];

export const CONTRACTS: Record<string, CommandContract> = {
  "session-start": {
    name: "session-start",
    patternFile: "Prompt Patterns/📄 Pattern - Session Start Prompt Generation.md",
    purpose: "Turn a task into a battle-ready session start prompt.",
    fields: [
      {
        key: "Task ID",
        kind: "text",
        required: true,
        placeholder: "<e.g. T009>",
        hint: "the task this session will execute",
      },
      {
        key: "File Reference",
        kind: "vault-file",
        required: false,
        placeholder: "<Tasklists/….md>",
        hint: "the tasklist the task lives in",
      },
    ],
    additionalHint: "Save to, Open in new tab",
  },

  "session-end-report": {
    name: "session-end-report",
    patternFile: "Prompt Patterns/AI-Suplex Commands/⚡ Command — Session End Report.md",
    purpose: "Turn the session's raw numbers into the end report.",
    fields: [
      {
        key: "Raw Content",
        kind: "raw",
        required: true,
        placeholder: "<Session completed. Rating X/5. Y artifacts.>",
        hint: "the session's numbers — nothing here is derived for you",
      },
      {
        key: "Chat Reference",
        kind: "text",
        required: false,
        placeholder: "<the session summary, in one line>",
        hint: "optional pointer to the conversation",
      },
    ],
    additionalHint: "Run 3lm end → learn → index · Skip memory loop",
  },

  "artifact-capture": {
    name: "artifact-capture",
    patternFile: "Prompt Patterns/📄 Pattern - Artifact Capture.md",
    purpose: "Capture work-in-progress as a structured artifact.",
    fields: [
      {
        key: "Source",
        kind: "source",
        required: true,
        placeholder: "<pick a source>",
        hint: "the raw work — a conversation, a vault file, or pasted text",
        sourceTypes: ["chat-reference", "vault-file", "raw"],
      },
    ],
    additionalHint: "Save to <path> · Skip memory loop",
  },

  "save-context": {
    name: "save-context",
    patternFile: "Prompt Patterns/AI-Suplex Commands/⚡ Command — Save Context.md",
    purpose: "Persist this instance's context — or leave a close packet.",
    fields: [
      {
        key: "Thread",
        label: "Workspace",
        kind: "enum",
        required: true,
        placeholder: "<daily-tasks | project-tasks | random-tasks | realist>",
        hint: "the workspace this window belongs to — it sets the filename (R3)",
        options: THREADS,
      },
      {
        key: "Instance",
        kind: "instance",
        required: false,
        placeholder: "<ref or slug — omit for singletons>",
        hint: "required for N lanes; never guess it",
      },
      {
        key: "Writer",
        kind: "enum",
        required: true,
        placeholder: "<committer | producer>",
        hint: "a producer never writes Memory/ and never syncs (R8)",
        options: WRITERS,
      },
    ],
    additionalHint: "Skip memory loop",
  },

  "tasklist-generation": {
    name: "tasklist-generation",
    patternFile: "Prompt Patterns/AI-Suplex Commands/⚡ Command — Tasklist Generation.md",
    purpose: "Turn raw to-dos into a structured tasklist.",
    fields: [
      {
        key: "Raw Content",
        kind: "raw",
        required: true,
        placeholder: "<the to-dos, one per line>",
        hint: "the raw list — the Orchestrator structures it",
      },
      {
        key: "File Reference",
        kind: "vault-file",
        required: false,
        placeholder: "<a plan or a week note>",
        hint: "optional context for the plan",
      },
    ],
    additionalHint: "Save to <path>",
  },

  "weekly-review": {
    name: "weekly-review",
    patternFile: "Prompt Patterns/📄 Pattern - Weekly Review Generation.md",
    purpose: "Turn a week's sessions into strategic intelligence.",
    fields: [
      {
        key: "Raw Content",
        kind: "raw",
        required: true,
        placeholder: "<the week's sessions, artifacts, blockers>",
        hint: "the identifier alone is not the data — paste what happened",
      },
      {
        key: "File Reference",
        kind: "vault-file",
        required: false,
        placeholder: "<the week's review or plan>",
        hint: "optional file to read alongside",
      },
    ],
    additionalHint: "Save to Reviews/",
  },

  "b-bomb-promotion": {
    name: "b-bomb-promotion",
    patternFile: "Prompt Patterns/📄 Pattern - B-Bomb Promotion.md",
    purpose: "Promote an artifact to a polished B-Bomb.",
    fields: [
      {
        key: "File Reference",
        kind: "vault-file",
        required: true,
        placeholder: "<Artifacts/….md>",
        hint: "the artifact to promote",
      },
      {
        key: "Raw Content",
        kind: "raw",
        required: false,
        placeholder: "<paste the artifact content>",
        hint: "or paste the content instead of pointing at a file",
      },
    ],
    additionalHint: "Save to B-Bombs/<Period>/Cycle X/Week Y/",
  },

  "define-workspace": {
    name: "define-workspace",
    patternFile: "Prompt Patterns/AI-Suplex Commands/⚡ Command — Define Workspace.md",
    purpose: "Create a workspace brief — one lane, one brief, one writer.",
    fields: [
      {
        key: "Workspace Type",
        kind: "enum",
        required: true,
        placeholder: "<Daily Work | Project | Quick Task | Review>",
        hint: "the kind of workspace — it maps to the internal lane",
        options: WORKSPACE_TYPE_OPTIONS,
      },
      {
        key: "Title",
        kind: "text",
        required: true,
        placeholder: "<kebab-slug>",
        hint: "the workspace slug — stable for its life",
      },
      {
        key: "Mission",
        kind: "text",
        required: true,
        placeholder: "<one line>",
        hint: "what this workspace is for",
      },
      {
        key: "Outcome",
        kind: "text",
        required: true,
        placeholder: "<the acceptance test>",
        hint: "the definition of done — when is this complete?",
      },
      {
        key: "Tasks",
        kind: "raw",
        required: false,
        placeholder: "<one per line>",
        hint: "the initial tasks — the system assigns IDs",
      },
      {
        key: "Create Tasklist",
        kind: "enum",
        required: false,
        placeholder: "<YES | NO — default by type>",
        hint: "default follows the workspace type (Daily/Project: YES, Quick/Review: NO)",
        options: ["YES", "NO"],
      },
      {
        key: "Agent",
        kind: "text",
        required: false,
        placeholder: "<agent name | Ask me later>",
        hint: "which agent will run this workspace",
      },
      {
        key: "Mode",
        kind: "enum",
        required: false,
        placeholder: "<Trusted local agent | Contributor agent>",
        hint: "committer or producer — the write-scope (R8)",
        options: MODES,
      },
    ],
    additionalHint: "Skip memory loop",
  },

  "kickstart-workspace": {
    name: "kickstart-workspace",
    patternFile: "Prompt Patterns/AI-Suplex Commands/⚡ Command — Kickstart Workspace.md",
    purpose: "Load and run a defined workspace.",
    fields: [
      {
        key: "Workspace Type",
        kind: "enum",
        required: true,
        placeholder: "<Daily Work | Project | Quick Task | Review>",
        hint: "the kind of workspace — it maps to the internal lane",
        options: WORKSPACE_TYPE_OPTIONS,
      },
      {
        key: "Workspace",
        kind: "instance",
        required: false,
        placeholder: "<slug or ref>",
        hint: "which workspace to run — omit when only one is open",
      },
      {
        key: "Mode",
        kind: "enum",
        required: false,
        placeholder: "<Trusted local agent | Contributor agent>",
        hint: "committer or producer",
        options: MODES,
      },
    ],
    additionalHint: "Skip memory loop",
  },
};

export function contractFor(name: string): CommandContract | undefined {
  return CONTRACTS[name];
}

/** The contract's field, or undefined when a command declares none. */
export function fieldOf(name: string, key: string): ContentField | undefined {
  return CONTRACTS[name]?.fields.find((f) => f.key === key);
}

/**
 * A field's starting value from what `mcp v1` proves. Empty means **the field
 * stays at its placeholder** — a guess the operator must clear is a defect
 * (T033's rule, now per field).
 */
export function prefillField(name: string, key: string, input: PrefillInput): string {
  const open = input.threads.find((t) => t.status === "open") ?? input.threads[0];

  if (name === "session-start") {
    const active = input.tasklists.find((t) => t.status === "active" && isDailyTasklist(t.file));
    if (!active) return "";
    if (key === "Task ID") return active.next ?? "";
    if (key === "File Reference") return `Tasklists/${active.file}`;
    return "";
  }

  if (name === "save-context") {
    // Four lanes can be open at once; picking one would be a guess the operator
    // has to clear. Prefill only when the vault itself is unambiguous.
    const openLanes = input.threads.filter((t) => t.status === "open");
    if (openLanes.length !== 1) return "";
    const only = openLanes[0];
    if (key === "Thread") return only.thread;
    if (key === "Instance") return only.singleton ? "" : `${only.ref ?? ""} · ${only.slug ?? ""}`.trim();
    if (key === "Writer") return only.writer ?? "";
    return "";
  }

  if (name === "weekly-review" && key === "Raw Content") {
    return `Cycle ${input.cycle} · Week ${input.week}`;
  }

  return "";
}

/** The instance paths a `vault-file` field may point at, resolved like the picker. */
export function instancePaths(input: PrefillInput): string[] {
  return input.threads.map((t) => instancePath(t.file));
}
