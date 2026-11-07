/**
 * envelope.ts — the command envelope (T031, generalised at T041).
 *
 * A command is **the trigger, `CONTENT`, one line per declared field, a blank,
 * and `ADDITIONAL`**. Nothing more.
 *
 * Ported from `ultra/webui/lib/shell/compose.ts` with one deliberate difference:
 * this composer builds the envelope **from fields** instead of patching a
 * document. It cannot carry a pattern body, because it never accepts one.
 *
 * T041: CONTENT is no longer forced to one line. Save Context needs three
 * (Thread · Instance · Writer), Tasklist Generation two (Raw · File). The
 * caller supplies the already-rendered lines from its contract
 * (`lib/command/contracts.ts`); this module owns only the shape.
 *
 * Pure: no imports, no clock, no I/O.
 */

export type SourceType = "vault-file" | "raw" | "chat-reference";

export const SOURCE_LABEL: Record<SourceType, string> = {
  "vault-file": "File Reference",
  raw: "Raw Content",
  "chat-reference": "Chat Reference",
};

export const SOURCE_TYPES: SourceType[] = ["vault-file", "raw", "chat-reference"];

export function isSourceType(value: unknown): value is SourceType {
  return value === "vault-file" || value === "raw" || value === "chat-reference";
}

export interface SourceSelection {
  type: SourceType | null;
  value: string;
}

const PREFIX = /^\s*(?:#\s*⚡\s*)?(?:ai-suplex\s*:\s*)?/i;

/**
 * The bare trigger name — `"AI-Suplex: Session Start"`, `"# ⚡ AI-Suplex: Session
 * Start"` and `"Session Start"` all collapse to `"Session Start"`, so a caller
 * can pass whatever it has without ever producing `AI-Suplex: AI-Suplex: …`.
 */
export function bareCommandName(command: string): string {
  const stripped = command.replace(PREFIX, "").replace(/\s+/g, " ").trim();
  return stripped.length > 0 ? stripped : command.trim();
}

/**
 * The envelope. `contentLines` are rendered lines of the form
 * `  - <key>: <value>` — exactly one per declared field.
 */
export function composeEnvelope(
  command: string,
  contentLines: string[],
  additional: string,
): string {
  const filled = additional.trim();
  return [
    `AI-Suplex: ${bareCommandName(command)}`,
    "CONTENT",
    ...contentLines,
    "",
    filled.length > 0 ? `ADDITIONAL: ${filled}` : "ADDITIONAL: <instructions>",
  ].join("\n");
}

/** The unfilled envelope: every declared field at its placeholder. */
export function baseTemplate(command: string, contentLines: string[]): string {
  return composeEnvelope(command, contentLines, "");
}

/** True when the operator has not filled the source yet. */
export function isEmptySelection(source: SourceSelection): boolean {
  return !source.type || source.value.trim().length === 0;
}

/**
 * A value survives a source-type change **only if the new type can represent
 * it**. Prose cannot be a file, so switching to `vault-file` drops it; a vault
 * path survives into raw text, because text can hold anything.
 */
export function retargetSourceValue(
  value: string,
  next: SourceType,
  vaultPaths: string[],
): string {
  if (next !== "vault-file") return value;
  const trimmed = value.trim();
  return vaultPaths.includes(trimmed) ? trimmed : "";
}

/** One `source` field's line: the source type is the key once a value exists. */
export function sourceLine(source: SourceSelection): string {
  return isEmptySelection(source)
    ? "  - <Source type>: <value>"
    : `  - ${SOURCE_LABEL[source.type as SourceType]}: ${source.value.trim()}`;
}

/** A plain field's line: the placeholder stands in until the operator types. */
export function fieldLine(key: string, value: string, placeholder: string): string {
  const trimmed = value.trim();
  return `  - ${key}: ${trimmed.length > 0 ? trimmed : placeholder}`;
}

/** Physical lines — the blank between CONTENT and ADDITIONAL is part of the shape. */
export function lineCount(text: string): number {
  return text.split("\n").length;
}
