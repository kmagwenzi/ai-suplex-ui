/**
 * The Opportunity room — the map, not the table.
 *
 * Every answer here is COMPOSED FROM THE GRAPH: a chip selects a rule, the rule reads
 * nodes and edges, and the sentence it prints cites the nodes it used. No model, no key,
 * no network beyond the one fetch. Deterministic: the same graph always answers the same.
 */

export interface RoomNode {
  id: string;
  type: string;
  label: string;
  focus?: string;
  date?: string;
  desc?: string;
  path?: string;
}

export interface RoomEdge {
  from: string;
  to: string;
  rel: string;
}

export interface RoomGraph {
  name: string;
  nodes: RoomNode[];
  edges: RoomEdge[];
}

export type QueryId = "overdue" | "pitch" | "concentration";

export interface Evidence {
  id: string;
  label: string;
  why: string;
}

export interface RunResult {
  query: QueryId;
  title: string;
  answer: string;
  evidence: Evidence[];
  visited: { nodes: RoomNode[]; edges: RoomEdge[] };
}

export const QUERIES: { id: QueryId; label: string; question: string }[] = [
  {
    id: "overdue",
    label: "Who went quiet?",
    question: "Which follow-up is overdue — and how old is it?",
  },
  {
    id: "pitch",
    label: "What should I pitch?",
    question: "What should I pitch to whom — and what proves it?",
  },
  {
    id: "concentration",
    label: "Where is it concentrated?",
    question: "Where is my pipeline concentrated — and what is the risk?",
  },
];

const DAY = 86_400_000;

/** Age in days, or null when the node carries no date. Deterministic per graph. */
export function ageDays(date: string | undefined, now: number): number | null {
  if (!date) return null;
  const t = Date.parse(date + "T00:00:00Z");
  if (Number.isNaN(t)) return null;
  return Math.max(0, Math.floor((now - t) / DAY));
}

function degree(edges: RoomEdge[]): Map<string, number> {
  const d = new Map<string, number>();
  for (const e of edges) {
    d.set(e.from, (d.get(e.from) ?? 0) + 1);
    d.set(e.to, (d.get(e.to) ?? 0) + 1);
  }
  return d;
}

function neighbours(edges: RoomEdge[], id: string): { id: string; rel: string }[] {
  const out: { id: string; rel: string }[] = [];
  for (const e of edges) {
    if (e.from === id) out.push({ id: e.to, rel: e.rel });
    else if (e.to === id) out.push({ id: e.from, rel: e.rel });
  }
  return out;
}

/** The nodes the answer actually cites, plus the edges between them. */
function subgraph(graph: RoomGraph, ids: Set<string>): RunResult["visited"] {
  const nodes = graph.nodes.filter((n) => ids.has(n.id));
  const edges = graph.edges.filter((e) => ids.has(e.from) && ids.has(e.to));
  return { nodes, edges };
}

function byId(graph: RoomGraph): Map<string, RoomNode> {
  return new Map(graph.nodes.map((n) => [n.id, n]));
}

const QUIET = /follow.?up|repl(y|ied)|propos|applicat|outreach|call|pitch|interview|deadline|reply/i;

function runOverdue(graph: RoomGraph, now: number): RunResult {
  const quiet = graph.nodes
    .map((n) => ({ node: n, age: ageDays(n.date, now) }))
    .filter((r) => r.age !== null && QUIET.test(r.node.label))
    .sort((a, b) => (b.age ?? 0) - (a.age ?? 0) || a.node.id.localeCompare(b.node.id))
    .slice(0, 6);

  if (quiet.length === 0) {
    return {
      query: "overdue",
      title: "Who went quiet?",
      answer:
        "Nothing in this graph matches a follow-up, a proposal or a reply. That is not the same as nothing being overdue — it means the vault records no waiting conversation.",
      evidence: [],
      visited: { nodes: [], edges: [] },
    };
  }

  const oldest = quiet[0];
  const ids = new Set(quiet.map((q) => q.node.id));
  return {
    query: "overdue",
    title: "Who went quiet?",
    answer:
      `${quiet.length} thread${quiet.length === 1 ? "" : "s"} in this graph read as a waiting conversation. The oldest is "${oldest.node.label}" — ${oldest.age} days since it was recorded. Silence is a decision that makes itself: every day it stays open, the answer becomes a no.`,
    evidence: quiet.map((q) => ({
      id: q.node.id,
      label: q.node.label,
      why: `${q.age}d · ${q.node.type}`,
    })),
    visited: subgraph(graph, ids),
  };
}

function runPitch(graph: RoomGraph, now: number): RunResult {
  const deg = degree(graph.edges);
  const projects = graph.nodes
    .filter((n) => n.type === "project")
    .sort((a, b) => (deg.get(b.id) ?? 0) - (deg.get(a.id) ?? 0) || a.id.localeCompare(b.id));
  const hub = projects[0] ?? graph.nodes.slice().sort((a, b) => (deg.get(b.id) ?? 0) - (deg.get(a.id) ?? 0))[0];

  if (!hub) {
    return {
      query: "pitch",
      title: "What should I pitch?",
      answer: "This graph is empty — there is nothing to pitch from.",
      evidence: [],
      visited: { nodes: [], edges: [] },
    };
  }

  const links = neighbours(graph.edges, hub.id);
  const index = byId(graph);
  const named = links
    .map((l) => ({ node: index.get(l.id), rel: l.rel }))
    .filter((l): l is { node: RoomNode; rel: string } => Boolean(l.node))
    .sort((a, b) => a.node.id.localeCompare(b.node.id));

  const strongest = named[0];
  const ids = new Set([hub.id, ...named.slice(0, 6).map((l) => l.node.id)]);

  return {
    query: "pitch",
    title: "What should I pitch?",
    answer:
      `Pitch "${hub.label}". It is the most connected project in this graph (${links.length} recorded link${links.length === 1 ? "" : "s"})` +
      (strongest
        ? `, and the strongest evidence beside it is "${strongest.node.label}" (${strongest.rel}). That pair is the story: the work proves the claim.`
        : ", though nothing recorded sits beside it yet — the pitch would be a promise, not a receipt."),
    evidence: named.slice(0, 6).map((l) => ({ id: l.node.id, label: l.node.label, why: l.rel })),
    visited: subgraph(graph, ids),
  };
}

function runConcentration(graph: RoomGraph, _now: number): RunResult {
  const byFocus = new Map<string, number>();
  const byType = new Map<string, number>();
  for (const n of graph.nodes) {
    const f = n.focus || "(no focus)";
    byFocus.set(f, (byFocus.get(f) ?? 0) + 1);
    byType.set(n.type, (byType.get(n.type) ?? 0) + 1);
  }

  const top = Array.from(byFocus.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];
  const typeTop = Array.from(byType.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];
  const total = graph.nodes.length;
  const share = top ? Math.round((top[1] / total) * 100) : 0;

  const ids = new Set(graph.nodes.filter((n) => (n.focus || "(no focus)") === (top ? top[0] : "")).map((n) => n.id));

  return {
    query: "concentration",
    title: "Where is it concentrated?",
    answer: top
      ? `${top[1]} of ${total} nodes sit under ${top[0]} — ${share}% of the map. The dominant shape is "${typeTop ? typeTop[0] : "unknown"}" (${typeTop ? typeTop[1] : 0}). A single focus that large is leverage while it converts and exposure while it does not: if ${top[0]} stalls, ${share}% of this graph stalls with it.`
      : "This graph has no nodes to concentrate.",
    evidence: Array.from(byFocus.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 6)
      .map(([focus, count]) => ({ id: focus, label: focus, why: count + " nodes" })),
    visited: subgraph(graph, ids),
  };
}

/** One chip, one answer. Pure: same graph + same clock → same sentence. */
export function runQuery(graph: RoomGraph, query: QueryId, now: number): RunResult {
  if (query === "overdue") return runOverdue(graph, now);
  if (query === "pitch") return runPitch(graph, now);
  return runConcentration(graph, now);
}
