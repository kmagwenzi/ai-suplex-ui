/**
 * resonance.ts — keyed Insight Resonance enrichment (tasklist T008 · Spec §3).
 *
 * `generateObject` mints typed edges (`supports` · `contradicts` · `led_to`) over the
 * frontmatter corpus. The deterministic floor is structural-only and never fakes a typed
 * edge (resonance PRD honesty rule); this keyed pass is the only place those edges exist.
 */
import { z } from "zod";
import type { CorpusEntity, EnrichOptions, ResonanceEdge, ResonanceEdgeType } from "./types";
import { enrichObject } from "./object";
import { formatCorpus } from "./corpus";

const ResonanceEdgesSchema = z.object({
  edges: z.array(
    z.object({
      from: z.string(),
      to: z.string(),
      type: z.enum(["supports", "contradicts", "led_to"]),
      reason: z.string(),
    }),
  ),
});

const SYSTEM_PROMPT =
  "You are an AI-Suplex insight analyst. Mint typed edges between the corpus entities: " +
  "`supports` (one reinforces another), `contradicts` (one conflicts with another), or " +
  "`led_to` (one directly caused another). Use the exact entity `id` values in `from`/`to`, " +
  "and give a one-sentence `reason`. Do not invent connections that are not present in the corpus.";

/**
 * Mint typed edges over the corpus, or `null` when enrichment is off or fails.
 * Additive only — the caller overlays the edges onto the structural resonance canvas.
 */
export async function enrichResonanceEdges(
  corpus: CorpusEntity[],
  options?: EnrichOptions,
): Promise<ResonanceEdge[] | null> {
  const result = await enrichObject<{ edges: ResonanceEdge[] }>({
    schema: ResonanceEdgesSchema,
    prompt: formatCorpus(corpus),
    system: SYSTEM_PROMPT,
    signal: options?.signal,
    timeoutMs: options?.timeoutMs,
    model: options?.model,
  });
  return result ? result.edges : null;
}

export type { ResonanceEdgeType };
