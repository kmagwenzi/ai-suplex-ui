/**
 * envelope.ts — the command envelope (T031).
 *
 * A command is **five lines**: the trigger, `CONTENT`, one source line, a blank,
 * and `ADDITIONAL`. Nothing more.
 *
 * Ported from `ultra/webui/lib/shell/compose.ts` with one deliberate difference:
 * this composer builds the envelope **from fields** instead of patching a
 * document. It cannot carry a pattern body, because it never accepts one —
 * the defect T029 found is structurally impossible here, not merely avoided.
 *
 * Pure: no imports, no clock, no I/O. Every surface that composes a command
 * (the panel, an API route, a test) calls this and owns zero bytes of its own.
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

/** The unfilled envelope: the shape an operator sees before typing anything. */
export function baseTemplate(command: string): string {
  return [
    `AI-Suplex: ${bareCommandName(command)}`,
    "CONTENT",
    "  - <Source type>: <value>",
    "",
    "ADDITIONAL: <instructions>",
  ].join("\n");
}

/** True when the operator has not filled the source yet. */
export function isEmptySelection(source: SourceSelection): boolean {
  return !source.type || source.value.trim().length === 0;
}

/**
 * Fill the two placeholders. An empty field leaves its placeholder intact —
 * the operator sees exactly what is still unfilled, and no value is invented.
 */
export function composeCommand(
  command: string,
  source: SourceSelection,
  additional: string,
): string {
  const content = isEmptySelection(source)
    ? "  - <Source type>: <value>"
    : `  - ${SOURCE_LABEL[source.type as SourceType]}: ${source.value.trim()}`;
  const filled = additional.trim();
  const extra = filled.length > 0 ? `ADDITIONAL: ${filled}` : "ADDITIONAL: <instructions>";
  return [`AI-Suplex: ${bareCommandName(command)}`, "CONTENT", content, "", extra].join("\n");
}

/**
 * A value survives a source-type change **only if the new type can represent
 * it**. Prose cannot be a file, so switching to `vault-file` drops it; a vault
 * path survives into raw text, because text can hold anything. This is what
 * lets the picker bind directly to the state instead of rendering a derived
 * value — the control can never show "empty" over a full state (T029/3).
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

/**
 * The five-line envelope is the contract; this is the assertion's yardstick.
 * Physical lines — the blank between CONTENT and ADDITIONAL is part of the shape.
 */
export function lineCount(text: string): number {
  return text.split("\n").length;
}
