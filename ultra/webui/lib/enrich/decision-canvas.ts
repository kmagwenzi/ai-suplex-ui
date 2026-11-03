/**
 * decision-canvas.ts — keyed decision-canvas enrichment (tasklist T007 · Spec §3).
 *
 * `generateObject` extracts `requirement → decision → evidence → outcome` links over the
 * frontmatter corpus. Keyless, the caller renders the frontmatter fallback (the shipped
 * path). This module is the additive, key-gated overlay.
 */
import { z } from "zod";
import type { CorpusEntity, DecisionLink, EnrichOptions } from "./types";
import { enrichObject } from "./object";
import { formatCorpus } from "./corpus";

const DecisionLinksSchema = z.object({
  links: z.array(
    z.object({
      requirement: z.string(),
      decision: z.string(),
      evidence: z.string(),
      outcome: z.string(),
      sources: z.array(z.string()).optional(),
    }),
  ),
});

const SYSTEM_PROMPT =
  "You are an AI-Suplex decision analyst. Extract decision links from the corpus: for each " +
  "named decision, the requirement that drove it, the evidence backing it, and its outcome. " +
  "Each link must reference at least one real entity id from the corpus in `sources`. " +
  "Do not invent decisions that are not present in the corpus.";

/**
 * Extract decision links from the corpus, or `null` when enrichment is off or fails.
 * Additive only — the caller merges the links into the deterministic canvas.
 */
export async function enrichDecisionLinks(
  corpus: CorpusEntity[],
  options?: EnrichOptions,
): Promise<DecisionLink[] | null> {
  const result = await enrichObject<{ links: DecisionLink[] }>({
    schema: DecisionLinksSchema,
    prompt: formatCorpus(corpus),
    system: SYSTEM_PROMPT,
    signal: options?.signal,
    timeoutMs: options?.timeoutMs,
    model: options?.model,
  });
  return result ? result.links : null;
}
