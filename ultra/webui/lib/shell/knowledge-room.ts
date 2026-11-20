import type { RoomEdge, RoomGraph, RoomNode } from "./opportunity-room";

/**
 * The Knowledge room — the same engine as the Opportunity room, asked different questions.
 *
 * The full vault is 1,783 entities and 6,041 edges: a hairball at any zoom. The room
 * composes a legible answer first, and the whole canvas stays one link away. Every
 * sentence here is a fact about edges that exist.
 */

export type KnowledgeQuery = "connect" | "hubs" | "newest";

export interface KnowledgeEvidence {
  id: string;
  label: string;
  why: string;
}

export interface KnowledgeResult {
  query: KnowledgeQuery;
  title: string;
  answer: string;
  evidence: KnowledgeEvidence[];
  visited: { nodes: RoomNode[]; edges: RoomEdge[] };
}

export const KNOWLEDGE_QUERIES: { id: KnowledgeQuery; label: string; question: string }[] = [
  { id: "connect", label: "777 → Ultra", question: "What connects 777 to Ultra — and through what?" },
  { id: "hubs", label: "What holds it together?", question: "Which work carries the most connections?" },
  { id: "newest", label: "What is newest?", question: "What was recorded most recently?" },
];

const PAIR = { a: /777|vault/i, b: /ultra/i };

function index(graph: RoomGraph): Map<string, RoomNode> {
  return new Map(graph.nodes.map((n) => [n.id, n]));
}

function adjacency(graph: RoomGraph): Map<string, { id: string; rel: string }[]> {
  const adj = new Map<string, { id: string; rel: string }[]>();
  for (const e of graph.edges) {
    if (!adj.has(e.from)) adj.set(e.from, []);
    if (!adj.has(e.to)) adj.set(e.to, []);
    adj.get(e.from)!.push({ id: e.to, rel: e.rel });
    adj.get(e.to)!.push({ id: e.from, rel: e.rel });
  }
  for (const list of adj.values()) list.sort((x, y) => x.id.localeCompare(y.id));
  return adj;
}

function degreeOf(graph: RoomGraph): Map<string, number> {
  const d = new Map<string, number>();
  for (const e of graph.edges) {
    d.set(e.from, (d.get(e.from) ?? 0) + 1);
    d.set(e.to, (d.get(e.to) ?? 0) + 1);
  }
  return d;
}

function subgraph(graph: RoomGraph, ids: Set<string>): KnowledgeResult["visited"] {
  return {
    nodes: graph.nodes.filter((n) => ids.has(n.id)),
    edges: graph.edges.filter((e) => ids.has(e.from) && ids.has(e.to)),
  };
}

/** Shortest path between the best 777-ish node and the best Ultra-ish node. BFS, deterministic. */
function shortestPath(graph: RoomGraph): string[] | null {
  const from = graph.nodes.find((n) => PAIR.a.test(n.label));
  const to = graph.nodes.find((n) => n !== from && PAIR.b.test(n.label));
  if (!from || !to) return null;

  const adj = adjacency(graph);
  const prev = new Map<string, string>();
  const seen = new Set([from.id]);
  const queue = [from.id];
  while (queue.length) {
    const cur = queue.shift()!;
    if (cur === to.id) break;
    for (const next of adj.get(cur) ?? []) {
      if (seen.has(next.id)) continue;
      seen.add(next.id);
      prev.set(next.id, cur);
      queue.push(next.id);
    }
  }
  if (!seen.has(to.id)) return null;
  const path = [to.id];
  let cur = to.id;
  while (prev.has(cur)) {
    cur = prev.get(cur)!;
    path.unshift(cur);
  }
  return path;
}

function runConnect(graph: RoomGraph): KnowledgeResult {
  const path = shortestPath(graph);
  const byId = index(graph);
  if (!path || path.length < 2) {
    return {
      query: "connect",
      title: "777 → Ultra",
      answer:
        "No recorded path joins a 777 node to an Ultra node in this graph. That is not proof they are unrelated — it means no edge was written down.",
      evidence: [],
      visited: { nodes: [], edges: [] },
    };
  }

  const nodes = path.map((id) => byId.get(id)).filter((n): n is RoomNode => Boolean(n));
  const hops = nodes.length - 1;
  const ids = new Set(path);
  return {
    query: "connect",
    title: "777 → Ultra",
    answer:
      `${nodes[0].label} reaches ${nodes[nodes.length - 1].label} in ${hops} hop${hops === 1 ? "" : "s"}. The chain is recorded edge by recorded edge — nothing here was inferred.`,
    evidence: nodes.map((n, i) => ({
      id: n.id,
      label: n.label,
      why: i === 0 ? "start" : i === nodes.length - 1 ? "end" : `hop ${i}`,
    })),
    visited: subgraph(graph, ids),
  };
}

function runHubs(graph: RoomGraph): KnowledgeResult {
  const deg = degreeOf(graph);
  const ranked = graph.nodes
    .slice()
    .sort((a, b) => (deg.get(b.id) ?? 0) - (deg.get(a.id) ?? 0) || a.id.localeCompare(b.id))
    .slice(0, 8);
  const top = ranked[0];

  if (!top) {
    return { query: "hubs", title: "What holds it together?", answer: "This graph has no nodes.", evidence: [], visited: { nodes: [], edges: [] } };
  }

  const total = graph.edges.length;
  const share = Math.round(((deg.get(top.id) ?? 0) / Math.max(1, total)) * 100);
  const ids = new Set(ranked.map((n) => n.id));
  return {
    query: "hubs",
    title: "What holds it together?",
    answer:
      `"${top.label}" carries ${deg.get(top.id)} of ${total} edges (${share}%). The eight leaders below account for the shape of this map — if the work is real, it hangs off them.`,
    evidence: ranked.map((n) => ({ id: n.id, label: n.label, why: `${deg.get(n.id)} links · ${n.type}` })),
    visited: subgraph(graph, ids),
  };
}

function runNewest(graph: RoomGraph): KnowledgeResult {
  const dated = graph.nodes
    .filter((n) => n.date)
    .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? "") || a.id.localeCompare(b.id))
    .slice(0, 8);
  const top = dated[0];

  if (!top) {
    return { query: "newest", title: "What is newest?", answer: "No node in this graph carries a date.", evidence: [], visited: { nodes: [], edges: [] } };
  }

  const ids = new Set(dated.map((n) => n.id));
  return {
    query: "newest",
    title: "What is newest?",
    answer:
      `The most recent recorded work is "${top.label}" (${top.date}). The last eight span ${dated[0].date} to ${dated[dated.length - 1].date} — that spread is how fast this map is moving.`,
    evidence: dated.map((n) => ({ id: n.id, label: n.label, why: `${n.date} · ${n.type}` })),
    visited: { nodes: graph.nodes.filter((n) => ids.has(n.id)), edges: [] },
  };
}

export function runKnowledge(graph: RoomGraph, query: KnowledgeQuery): KnowledgeResult {
  if (query === "connect") return runConnect(graph);
  if (query === "hubs") return runHubs(graph);
  return runNewest(graph);
}
