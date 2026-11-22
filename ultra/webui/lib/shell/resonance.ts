import { readFile } from "node:fs/promises";
import path from "node:path";

/**
 * Resonance, read as data.
 *
 * The projection writes one self-contained HTML file whose single source of truth is an
 * embedded JSON literal (`const data = {...}`). Rather than re-deriving clusters in the
 * UI — which would be a second implementation of the same rule — the host reads that
 * literal back. One producer, one contract: if the mapping changes shape, the extractor
 * fails loudly instead of showing numbers that quietly disagree.
 */

export interface ResonanceNode {
  id: number;
  title: string;
  path: string;
  type: string;
  focus: string;
  degree: number;
}

export interface ResonanceCluster {
  label: string;
  size: number;
  focuses: string[];
  [key: string]: unknown;
}

export interface ResonanceData {
  nodes: ResonanceNode[];
  edges: { source: number; target: number; type: string }[];
  hubs: ResonanceNode[];
  orphans: ResonanceNode[];
  clusters: ResonanceCluster[];
  crossFocus: ResonanceCluster[];
}

/**
 * Pull the first JSON object that starts at `marker` out of a text file.
 * Brace-matched, string- and escape-aware — a regex cannot do this safely.
 */
export function extractEmbeddedJson(html: string, marker = '"entityTypes"'): string {
  // The projection pretty-prints its JSON, so the block opens on the brace *before* the key.
  const keyAt = html.indexOf(marker);
  if (keyAt === -1) throw new Error("resonance: no embedded data block found");
  const start = html.lastIndexOf("{", keyAt);
  if (start === -1) throw new Error("resonance: the embedded data block has no opening brace");

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < html.length; i++) {
    const ch = html[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return html.slice(start, i + 1);
    }
  }
  throw new Error("resonance: the embedded data block is unterminated");
}

export type ResonanceSection =
  | { ok: true; data: ResonanceData }
  | { ok: false; error: string };

export async function readResonance(vault: string): Promise<ResonanceSection> {
  const file = path.join(vault, "Projections", "insight-resonance", "index.html");
  try {
    const html = await readFile(file, "utf8");
    const data = JSON.parse(extractEmbeddedJson(html)) as ResonanceData;
    return { ok: true, data };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

export { RESONANCE_QUERIES } from "./resonance-shared";
export type { ResonanceQuery } from "./resonance-shared";
import type { ResonanceQuery } from "./resonance-shared";

export interface ResonanceResult {
  query: ResonanceQuery;
  answer: string;
  rows: { key: string; label: string; note: string }[];
}

/** Composed from the projection's own numbers — never a second opinion about them. */
export function runResonance(data: ResonanceData, query: ResonanceQuery): ResonanceResult {
  if (query === "hubs") {
    const top = data.hubs[0];
    const share = data.nodes.length ? Math.round((data.hubs.length / data.nodes.length) * 100) : 0;
    return {
      query,
      answer: top
        ? `"${top.title}" carries ${top.degree} recorded links — the strongest hub in a graph of ${data.nodes.length} entities. The top ${data.hubs.length} hubs are ${share}% of the corpus; if the work is real, it hangs off them.`
        : "This projection recorded no relationships, so nothing holds it together yet.",
      rows: data.hubs.slice(0, 8).map((h) => ({ key: String(h.id), label: h.title, note: `${h.degree} links · ${h.type}` })),
    };
  }

  if (query === "orphans") {
    return {
      query,
      answer: data.orphans.length
        ? `${data.orphans.length} entities carry no recorded relationship at all. They are not worthless — they are unwritten: nothing cites them, so nothing can find them. That is the cheapest gap to close.`
        : "Every entity in this projection carries at least one relationship.",
      rows: data.orphans.slice(0, 8).map((o) => ({ key: String(o.id), label: o.title || "(untitled)", note: o.type })),
    };
  }

  const top = data.crossFocus[0];
  return {
    query,
    answer: top
      ? `${data.crossFocus.length} clusters span more than one focus. The widest, "${top.label}", joins ${top.size} records across ${top.focuses.join(" · ")} — that is where one piece of work is already paying twice.`
      : "No cluster spans two focus areas yet: the work is filed in silos, and convergence has not happened.",
    rows: data.crossFocus.slice(0, 8).map((c) => ({ key: c.label, label: c.label, note: `${c.size} records · ${c.focuses.join(" · ")}` })),
  };
}
