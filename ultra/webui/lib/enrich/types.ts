/**
 * types.ts — shared input/output contracts for the Phase-2 enrichment points.
 *
 * These are the *additive* shapes the keyed pass returns. The deterministic floor
 * never produces them — that is the honesty rule from the resonance PRD: the
 * structural pass surfaces topology + co-occurrence and labels it structural; only
 * the keyed pass mints typed edges.
 */
import type { LanguageModel } from "ai";

/** A frontmatter corpus entity, in the shape the deterministic surfaces already tokenize. */
export interface CorpusEntity {
  /** Stable id — the vault-relative path when available, else a title slug. */
  id: string;
  title: string;
  /** `semantic` · `procedural` · `b-bomb` · `episodic` · `artifact` · `community-skill` */
  type: string;
  focus?: string;
  focuses?: string[];
  tags?: string[];
  summary?: string;
  /** Markdown body or an excerpt of it. */
  body?: string;
  /** Vault-relative path. */
  path: string;
  keyInsights?: string[];
  nextActions?: string[];
  date?: string;
}

/** One wiki page the Living Wiki renders. */
export interface WikiPage {
  id: string;
  title: string;
  type: string;
  focus?: string;
  tags?: string[];
  summary?: string;
  body?: string;
  path: string;
}

/** A decision-canvas link — the keyed extraction over the frontmatter corpus. */
export interface DecisionLink {
  requirement: string;
  decision: string;
  evidence: string;
  outcome: string;
  /** Ids of the corpus entities that back this link (evidence tracing). */
  sources?: string[];
}

/** The typed edges the keyed resonance pass mints — never the deterministic floor. */
export type ResonanceEdgeType = "supports" | "contradicts" | "led_to";

export interface ResonanceEdge {
  /** Corpus entity id (or title when no id) of the source. */
  from: string;
  /** Corpus entity id (or title when no id) of the target. */
  to: string;
  type: ResonanceEdgeType;
  /** One-sentence justification for the edge. */
  reason: string;
}

/** Shared call options for the three enrichment points (wiki · decision-canvas · resonance). */
export interface EnrichOptions {
  signal?: AbortSignal;
  timeoutMs?: number;
  /** TEST SEAM ONLY — inject a model to bypass env + provider resolution. */
  model?: LanguageModel;
}
