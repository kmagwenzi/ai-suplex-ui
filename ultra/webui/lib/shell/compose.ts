/**
 * compose.ts — the deterministic composer (T012b).
 *
 * Ported verbatim from `777/lean-webui/lib/prompts.ts:82` — `composePrompt`, two
 * `.replace()` calls. The model maps fields; this function owns the bytes. Byte
 * identity is a property of the function, not of good intentions (PRD C2), so the
 * implementation is copied, not "improved".
 */

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
 * The C1 grammar — the AGENTS.md five-line envelope. `<name>` is a catalogue
 * name; the two placeholders below are the composer's only inputs.
 */
export function baseTemplate(name: string): string {
  return `AI-Suplex: ${name}
CONTENT
  - <Source type>: <value>

ADDITIONAL: <instructions>`;
}

/**
 * Fill the envelope's two placeholders. A missing/empty field leaves its
 * placeholder intact — the operator sees what is still unfilled.
 */
export function composeCommand(
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

/** The DOM-free guard the palette and the route both use: a source type this app accepts. */
export function isSourceType(value: unknown): value is SourceType {
  return value === "vault-file" || value === "raw" || value === "chat-reference";
}
