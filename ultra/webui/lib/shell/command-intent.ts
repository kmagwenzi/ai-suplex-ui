/**
 * command-intent.ts — intent → one command + three fields (T012c).
 *
 * The model maps fields only (PRD V1): it never returns the rendered command.
 * The deterministic keyword matcher is the no-key path AND the fallback for
 * every enrichment failure, so the palette works identically without a key.
 *
 * Pure of Next.js: the route is a thin wrapper, and this module is unit-tested
 * under `tsx` with no framework and no network.
 */
import { z } from "zod";
import { enrichObject, type EnrichObjectOptions } from "@/lib/enrich/object";
import { hasKey } from "@/lib/enrich/gate";
import type { CommandDef } from "./commands";

export interface IntentResult {
  mode: "ai" | "deterministic";
  command: string | null;
  sourceType: "vault-file" | "raw" | "chat-reference" | null;
  sourceValue: string;
  additional: string;
  confidence: number;
  why: string;
}

export interface MapIntentOptions {
  /** TEST SEAM ONLY — mirrors `enrichObject`'s seam; production never sets it. */
  model?: EnrichObjectOptions<unknown>["model"];
  /** Enrichment timeout in ms (default 20 s, per the PRD). */
  timeoutMs?: number;
}

const NO_MATCH = "no match — pick a command from the catalogue";

/** Static membership table — no runtime insertion. */
const STOPWORD: Record<string, true> = {
  the: true,
  a: true,
  an: true,
  of: true,
  to: true,
  for: true,
  and: true,
  my: true,
  this: true,
  that: true,
  it: true,
  in: true,
  on: true,
  with: true,
  from: true,
};

function words(input: string, stripStopwords: boolean): string[] {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 0 && !(stripStopwords && STOPWORD[word]));
}

function scoreCommand(
  intentWords: string[],
  phrase: string,
  intentTokens: Set<string>,
  command: CommandDef,
): number {
  const nameWords = words(command.name, false);
  const nameText = nameWords.join(" ");
  let score = phrase.length > 0 && nameText.includes(phrase) ? 5 : 0;

  for (const word of intentWords) {
    if (nameWords.includes(word)) score += 3;
  }
  const summaryTokens = new Set(words(command.summary, true));
  for (const token of intentTokens) {
    if (summaryTokens.has(token)) score += 1;
  }
  return score;
}

/**
 * The deterministic matcher, exactly as specified: +5 phrase, +3 per name
 * token, +1 per summary token; highest score wins, ties alphabetical by name;
 * score 0 → no command. It never invents content (`sourceType` stays null).
 */
export function matchCommand(intent: string, commands: CommandDef[]): IntentResult {
  const phrase = words(intent, true).join(" ");
  const intentWords = words(intent, true);
  const intentTokens = new Set(intentWords);

  let best: { command: CommandDef; score: number } | null = null;
  for (const command of commands) {
    const score = scoreCommand(intentWords, phrase, intentTokens, command);
    if (
      !best ||
      score > best.score ||
      (score === best.score && command.name < best.command.name)
    ) {
      best = { command, score };
    }
  }

  if (!best || best.score === 0) {
    return {
      mode: "deterministic",
      command: null,
      sourceType: null,
      sourceValue: "",
      additional: "",
      confidence: 0,
      why: NO_MATCH,
    };
  }

  return {
    mode: "deterministic",
    command: best.command.name,
    sourceType: null,
    sourceValue: "",
    additional: "",
    confidence: Number(Math.min(1, best.score / 12).toFixed(2)),
    why: `matched "${best.command.name}" deterministically (score ${best.score}).`,
  };
}

/** Fixed in the PRD, not improvised — the model maps fields, never prose. */
const SYSTEM_PROMPT =
  "You map an operator's intent to exactly one AI-Suplex command. You never answer the request, " +
  "never describe what you would do, and never invent a command outside the list. Choose the " +
  "closest command and set `confidence` honestly; if nothing fits, pick the closest and use " +
  "confidence ≤ 0.4. `sourceValue` is a short pointer (a path, a URL, a one-line reference), " +
  "never the whole artifact.";

/**
 * Map an intent to a command + fields. With a key (or a test model) the model
 * maps; on any failure — no key, provider error, timeout, schema mismatch — the
 * deterministic matcher answers. The return shape is identical either way.
 */
export async function mapIntent(
  intent: string,
  commands: CommandDef[],
  options: MapIntentOptions = {},
): Promise<IntentResult> {
  const fallback = matchCommand(intent, commands);
  if (commands.length === 0) return fallback;
  if (!options.model && !hasKey()) return fallback;

  const names = [...new Set(commands.map((command) => command.name))];
  const mapping = z.object({
    command: z.enum(names as [string, ...string[]]),
    sourceType: z.enum(["vault-file", "raw", "chat-reference"]).nullable(),
    sourceValue: z.string().max(500),
    additional: z.string().max(500),
    confidence: z.number().min(0).max(1),
    why: z.string().max(200),
  });

  const catalogue = commands
    .map((command) => `- ${command.name}${command.role ? ` [${command.role}]` : ""}${command.summary ? `: ${command.summary}` : ""}`)
    .join("\n");

  const result = await enrichObject({
    schema: mapping,
    prompt: `Operator intent: ${intent}\n\nCommands:\n${catalogue}`,
    system: SYSTEM_PROMPT,
    timeoutMs: options.timeoutMs ?? 20_000,
    model: options.model,
  });

  if (!result) return fallback;
  return {
    mode: "ai",
    command: result.command,
    sourceType: result.sourceType,
    sourceValue: result.sourceValue,
    additional: result.additional,
    confidence: result.confidence,
    why: result.why,
  };
}
