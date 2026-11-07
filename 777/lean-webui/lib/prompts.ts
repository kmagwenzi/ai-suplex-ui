/**
 * prompts.ts — the command catalogue's facts + the composer's pure helpers.
 *
 * The catalogue comes from `prompts/list` — names, commands, descriptions. This
 * module holds only the *metadata* the prompt surface does not carry (stage,
 * output, memory-loop classification, the copy-only rows) and the prefill rules
 * that turn live resources into editable starting values. No MCP calls, no reads,
 * no clock. Since T032 the command text itself is built by `lib/command/envelope.ts`.
 */

import type { Instance, StageId, TasklistSummary } from "./types";
import { EXECUTOR_GLYPH, EXECUTOR_LABEL, STAGE_META, isDailyTasklist } from "./stages";

// ── the `prompts/list` shape ────────────────────────────────────────────────
export interface PromptArgument {
  name: string;
  required: boolean;
}

export interface PromptListItem {
  name: string;
  command: string; // "AI-Suplex: Session Start"
  description: string;
  arguments: PromptArgument[];
}

/** The stage each `mcp v1` prompt belongs to (PRD D1 / spec §8). */
export const PROMPT_STAGE: Record<string, StageId> = {
  "session-start": "session-start",
  "session-end-report": "close",
  "artifact-capture": "capture",
  "save-context": "save-context",
  "tasklist-generation": "plan",
  "weekly-review": "review",
  "b-bomb-promotion": "review",
};

/** The declared save path each command produces (spec §6 / pattern files). */
export const PROMPT_OUTPUT: Record<string, string> = {
  "session-start": "Sessions/Active/Start/",
  "session-end-report": "Sessions/Active/End/",
  "artifact-capture": "Artifacts/… · Insights/…",
  "save-context": "Context Kick-start/Active/",
  "tasklist-generation": "Tasklists/",
  "weekly-review": "Reviews/",
  "b-bomb-promotion": "B-Bombs/…",
};

export type MemoryLoop = "yes" | "conditional" | "no" | null;

/**
 * The memory loop each `mcp v1` prompt declares, as metadata the console owns.
 *
 * T034: this used to be derived by fetching all seven pattern bodies on every
 * page load — 30 KB of documents read only to label a field. The classification
 * is stable, so it is declared here and **pinned to the live patterns by a
 * test** (`lib/catalogue.test.ts`); if a pattern changes its loop, that test
 * goes red, not a label quietly wrong.
 */
export const PROMPT_MEMORY_LOOP: Record<string, MemoryLoop> = {
  "session-start": "yes",
  "session-end-report": "conditional",
  "artifact-capture": "yes",
  "save-context": "conditional",
  "tasklist-generation": "conditional",
  "weekly-review": "yes",
  "b-bomb-promotion": "yes",
};

/**
 * Classify the pattern's MEMORY LOOP section. `null` = the pattern does not
 * declare one — shown as "—", never invented.
 */
export function memoryLoopKind(body: string): MemoryLoop {
  if (!/memory\s*loop/i.test(body)) return null;
  if (/skip\s*memory\s*loop|only\s+at\s+session\s+end|unless\s+`?skip/i.test(body)) {
    return "conditional";
  }
  return "yes";
}

// ── the composer ─────────────────────────────────────────────────────────────

export type SourceType = "vault-file" | "raw" | "chat-reference";

export const SOURCE_LABEL: Record<SourceType, string> = {
  "vault-file": "File Reference",
  raw: "Raw Content",
  "chat-reference": "Chat Reference",
};

export interface SourceSelection {
  type: SourceType | null;
  value: string;
}

/**
 * Fill the harness envelope's two placeholders with the user's inputs. The
 * pattern body — everything the harness returned — is untouched. The composer's
 * only job is context, not text (spec §6).
 */
export function composePrompt(
  baseText: string,
  source: SourceSelection,
  additional: string,
): string {
  let out = baseText;
  const contentLine =
    source.type && source.value.trim()
      ? `  - ${SOURCE_LABEL[source.type]}: ${source.value.trim()}`
      : null;
  out = out.replace(
    "  - <Source type>: <value>",
    contentLine ?? "  - <Source type>: <value>",
  );
  const add = additional.trim();
  out = out.replace(
    "ADDITIONAL: <instructions>",
    add ? `ADDITIONAL: ${add}` : "ADDITIONAL: <instructions>",
  );
  return out;
}

// ── context pre-fill (live resources → editable starting value) ─────────────

export interface Prefill {
  type: SourceType | null;
  value: string;
  note: string | null;
}

export interface PrefillInput {
  cycle: number;
  week: number;
  tasklists: TasklistSummary[];
  threads: Instance[];
}

/**
 * An instance's vault path. The `suplex://threads` resource reports the bare
 * filename (`daily-tasks.md`); a command needs the resolvable path. Both shapes
 * are accepted, so the prefill and the picker always agree (T029/3, T033).
 */
export function instancePath(file: string): string {
  const clean = file.trim();
  return clean.includes("/") ? clean : `Context Kick-start/Active/${clean}`;
}

/**
 * The starting source for a command, from what `mcp v1` actually exposes.
 * Every pre-fill is editable — never a locked auto-answer. Where the resource
 * does not exist on the read surface, the note says so instead of inventing it.
 *
 * Invariant (T033): a `vault-file` prefill is **always** a path this module
 * would also offer in `vaultFileOptions` — a prefill the picker cannot show is
 * a lying control, and a bare basename the agent cannot resolve is a dead one.
 */
export function prefillFor(name: string, input: PrefillInput): Prefill {
  switch (name) {
    case "session-start": {
      const active = input.tasklists.find(
        (t) => t.status === "active" && isDailyTasklist(t.file),
      );
      if (active) {
        return {
          type: "vault-file",
          value: `Tasklists/${active.file}`,
          note: "the active daily tasklist",
        };
      }
      return { type: null, value: "", note: "no active daily tasklist for today" };
    }
    case "save-context": {
      const inst = input.threads.find((t) => t.status === "open") ?? input.threads[0];
      if (inst) {
        return {
          type: "vault-file",
          value: instancePath(inst.file),
          note: `the ${inst.thread}${inst.ref ? ` · ${inst.ref}` : ""} instance`,
        };
      }
      return { type: null, value: "", note: "no open instances" };
    }
    case "weekly-review": {
      return {
        type: "raw",
        value: `Cycle ${input.cycle} · Week ${input.week}`,
        note:
          "artifacts aren't on the mcp v1 read surface — paste them or point at files",
      };
    }
    case "session-end-report": {
      return {
        type: "raw",
        value: "",
        note: "today's captures aren't on the mcp v1 read surface — paste them",
      };
    }
    case "tasklist-generation": {
      return { type: "raw", value: "", note: "paste the to-dos" };
    }
    case "artifact-capture": {
      return {
        type: null,
        value: "",
        note: "choose a source — vault file, raw text, or a chat reference",
      };
    }
    case "b-bomb-promotion": {
      return {
        type: null,
        value: "",
        note: "the Artifacts/ index isn't on the mcp v1 read surface — name the artifact",
      };
    }
    default:
      return { type: null, value: "", note: null };
  }
}

/** The vault files a `File Reference` source may point at (live resources). */
export interface VaultFileOption {
  label: string;
  path: string;
}

export function vaultFileOptions(input: PrefillInput): VaultFileOption[] {
  const opts: VaultFileOption[] = [
    ...input.tasklists.map((t) => ({
      label: t.title || t.file,
      path: `Tasklists/${t.file}`,
    })),
    ...input.threads.map((i) => ({ label: i.file, path: instancePath(i.file) })),
    {
      label: "Active Mission Context",
      path: "AI-Suplex Kick-start/Context Kick-start/Active Mission Context.md",
    },
    { label: "Memory/lessons.md", path: "Memory/lessons.md" },
    { label: "Memory/index.md", path: "Memory/index.md" },
  ];
  return opts;
}

/** One catalogue card: the prompt's MCP facts joined with its spec metadata. */
export interface PromptCard {
  name: string;
  command: string;
  description: string;
  arguments: PromptArgument[];
  stageName: string;
  output: string;
  memoryLoop: MemoryLoop;
  executorGlyph: string;
  executorLabel: string;
}

export function buildCard(item: PromptListItem): PromptCard {
  const stageId = PROMPT_STAGE[item.name];
  const meta = STAGE_META.find((m) => m.id === stageId);
  return {
    name: item.name,
    command: item.command,
    description: item.description,
    arguments: item.arguments,
    stageName: meta?.name ?? "—",
    output: PROMPT_OUTPUT[item.name] ?? meta?.output ?? "—",
    memoryLoop: PROMPT_MEMORY_LOOP[item.name] ?? null,
    executorGlyph: meta ? EXECUTOR_GLYPH[meta.executor] : "—",
    executorLabel: meta ? EXECUTOR_LABEL[meta.executor] : "—",
  };
}

// ── the copy-only commands (mcp v2 `commands` surface — listed, never dispatched) ──
export interface CopyOnlyCommand {
  command: string;
  trigger: string;
  link: string; // vault deep link (resolved against the real vault)
}

/**
 * Every `⚡ Command — *.md` the vault holds that is **not** one of the seven
 * dispatchable prompts, plus the one documented pattern-backed command.
 *
 * T034: derived from the vault, not curated by hand — the old six-row list both
 * dropped real commands (Cycle Plan, Weekly Plan, B-Bomb Hunt) and linked to the
 * wrong file (Weekly Ritual pointed at the Kick-start doc). The partition is
 * asserted in `lib/catalogue.test.ts`: 20 command docs = 3 dispatchable + 14
 * copy-only + 3 Ultra-only + 1 previous generation. Nothing silently dropped,
 * nothing invented.
 */
export const COPY_ONLY_COMMANDS: CopyOnlyCommand[] = [
  { command: "Artifact Capture (YouTube)", trigger: "AI-Suplex: Artifact Capture (youtube)", link: "Prompt Patterns/AI-Suplex Commands/⚡ Command — Artifact Capture (YouTube).md" },
  { command: "Artifact Capture (Markdown)", trigger: "AI-Suplex: Artifact Capture (Markdown)", link: "Prompt Patterns/AI-Suplex Commands/⚡ Command — Artifact Capture(Markdown).md" },
  { command: "Artifact Capture (file)", trigger: "AI-Suplex: Artifact Capture (file)", link: "Prompt Patterns/AI-Suplex Commands/⚡ Command — Artifact Capture(File).md" },
  { command: "Artifact Capture (Scratch Pad)", trigger: "AI-Suplex: Artifact Capture (Scratch Pad)", link: "Prompt Patterns/AI-Suplex Commands/⚡ Command — Artifact Capture(Scratch Pad).md" },
  { command: "B-Bomb Hunt", trigger: "AI-Suplex: B-Bomb Hunt", link: "Prompt Patterns/AI-Suplex Commands/⚡ Command — B-Bomb Hunt.md" },
  { command: "Batch Insight", trigger: "AI-Suplex: Batch Insight", link: "Prompt Patterns/📄 Pattern - Batch Insight Generation.md" },
  { command: "Cycle Plan", trigger: "AI-Suplex: Cycle Plan", link: "Prompt Patterns/AI-Suplex Commands/⚡ Command — Cycle Plan.md" },
  { command: "Cycle Review", trigger: "AI-Suplex: Cycle Review", link: "Prompt Patterns/AI-Suplex Commands/⚡ Command — Cycle Review.md" },
  { command: "Kickstart", trigger: "AI-Suplex: Kickstart", link: "Prompt Patterns/AI-Suplex Commands/⚡ Command — Kickstart.md" },
  { command: "Note Capture", trigger: "AI-Suplex: Note Capture", link: "Prompt Patterns/AI-Suplex Commands/⚡ Command — Note Capture.md" },
  { command: "Outreach Capture", trigger: "AI-Suplex: Outreach Capture", link: "Prompt Patterns/AI-Suplex Commands/⚡ Command — Outreach Capture.md" },
  { command: "Weekly Plan", trigger: "AI-Suplex: Weekly Plan", link: "Prompt Patterns/AI-Suplex Commands/⚡ Command — Weekly Plan.md" },
  { command: "Weekly Review", trigger: "AI-Suplex: Weekly Review", link: "Prompt Patterns/AI-Suplex Commands/⚡ Command — Weekly Review.md" },
  { command: "Weekly Ritual", trigger: "AI-Suplex: Weekly Ritual", link: "Prompt Patterns/AI-Suplex Commands/⚡ Command — Weekly Ritual.md" },
];

/**
 * Named, never listed in the free console: the Ultra-only commands do not ship
 * in 777 (Spec — Production & Editions). The catalogue test proves they are
 * accounted for, so "not shown" never means "forgotten".
 */
export const ULTRA_ONLY_COMMANDS: CopyOnlyCommand[] = [
  { command: "Deep Ultra Mode (Arcade)", trigger: "AI-Suplex: Deep Ultra Mode (Arcade)", link: "Prompt Patterns/AI-Suplex Commands/⚡ Command — Deep Ultra Mode (Arcade).md" },
  { command: "Deep Ultra Mode (Operative)", trigger: "AI-Suplex: Deep Ultra Mode (Operative)", link: "Prompt Patterns/AI-Suplex Commands/⚡ Command — Deep Ultra Mode (Operative).md" },
  { command: "Deep Ultra Mode (Pro)", trigger: "AI-Suplex: Deep Ultra Mode (Pro)", link: "Prompt Patterns/AI-Suplex Commands/⚡ Command — Deep Ultra Mode (Pro).md" },
];

/**
 * The previous-generation Artifact Capture doc is superseded by the dispatchable
 * prompt — listing it would put two different "AI-Suplex: Artifact Capture"
 * entries on one screen. Kept here so the partition accounts for it.
 */
export const DEPRECATED_COMMANDS: CopyOnlyCommand[] = [
  { command: "Artifact Capture (Previous Generation)", trigger: "AI-Suplex: Artifact Capture (Previous Generation)", link: "Prompt Patterns/AI-Suplex Commands/⚡ Command — Artifact Capture(Previous Generation).md" },
];
