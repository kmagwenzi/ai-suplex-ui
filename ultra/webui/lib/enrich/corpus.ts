/**
 * corpus.ts — format the frontmatter corpus into a compact, deterministic prompt block.
 * Shared by the decision-canvas and resonance enrichment points (2 call sites), so both
 * present the corpus to the model the same way.
 */
import type { CorpusEntity } from "./types";

/** Bound the prompt size — enrichment must stay cheap and fail closed, never O(corpus). */
const MAX_ENTITIES = 200;
const MAX_BODY_CHARS = 1200;

function formatEntity(entity: CorpusEntity): string {
  const parts = [
    `id: ${entity.id}`,
    `title: ${entity.title}`,
    `type: ${entity.type}`,
    entity.focus ? `focus: ${entity.focus}` : "",
    entity.focuses?.length ? `focuses: ${entity.focuses.join(", ")}` : "",
    entity.tags?.length ? `tags: ${entity.tags.join(", ")}` : "",
    entity.summary ? `summary: ${entity.summary}` : "",
    entity.keyInsights?.length ? `key_insights: ${entity.keyInsights.join("; ")}` : "",
    entity.nextActions?.length ? `next_actions: ${entity.nextActions.join("; ")}` : "",
    entity.date ? `date: ${entity.date}` : "",
    entity.body ? `excerpt: ${entity.body.slice(0, MAX_BODY_CHARS)}` : "",
  ];
  return parts.filter(Boolean).join("\n");
}

/** Compact, deterministic corpus rendering — entities in input order, bounded. */
export function formatCorpus(corpus: CorpusEntity[]): string {
  return corpus.slice(0, MAX_ENTITIES).map(formatEntity).join("\n\n");
}
