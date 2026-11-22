import test from "node:test";
import assert from "node:assert/strict";
import { runKnowledge, KNOWLEDGE_QUERIES, type KnowledgeQuery } from "./knowledge-room";
import type { RoomGraph } from "./opportunity-room";

/**
 * The Knowledge room's engine is pure, so the search path is testable without a browser.
 * Search is the only input a stranger can type into, so it gets the strictest assertions:
 * it must never invent a match, never crash on nothing, and always cite live nodes.
 */

const GRAPH: RoomGraph = {
  name: "knowledge-graph",
  nodes: [
    { id: "n1", type: "artifact", label: "AI-Suplex 777 — the free foundation", date: "2026-11-01" },
    { id: "n2", type: "artifact", label: "AI-Suplex Ultra — the harness", date: "2026-11-10" },
    { id: "n3", type: "project", label: "Workflow Console", date: "2026-10-20" },
    { id: "n4", type: "b-bomb", label: "Ultra launch narrative", date: "2026-11-18" },
  ],
  edges: [
    { from: "n1", to: "n2", rel: "powers" },
    { from: "n3", to: "n1", rel: "relates_to" },
    { from: "n2", to: "n4", rel: "relates_to" },
  ],
};

test("every question answers and cites only real nodes", () => {
  for (const q of KNOWLEDGE_QUERIES) {
    const result = runKnowledge(GRAPH, q.id);
    assert.ok(result.answer.length > 20, q.id + " composes a sentence");
    const ids = new Set(GRAPH.nodes.map((n) => n.id));
    for (const e of result.evidence) assert.ok(ids.has(e.id), q.id + " cites a live node");
  }
});

test("connect finds the recorded path from 777 to Ultra", () => {
  const result = runKnowledge(GRAPH, "connect");
  assert.match(result.answer, /1 hop/);
  assert.deepEqual(result.visited.nodes.map((n) => n.id), ["n1", "n2"]);
  assert.equal(result.evidence.length, 0, "the trace is the evidence for a path");
});

test("search matches titles and joins one hop of context", () => {
  const result = runKnowledge(GRAPH, "search", "ultra");
  // 777 matches nothing; "AI-Suplex Ultra" and the Ultra narrative both match.
  assert.match(result.answer, /2 nodes mention "ultra"/);
  const ids = result.visited.nodes.map((n) => n.id);
  assert.ok(ids.includes("n2") && ids.includes("n4"), "the matches are on the stage");
  assert.ok(ids.includes("n1") || ids.includes("n3"), "a neighbour joins them");
});

test("search with no match says so without inventing one", () => {
  const result = runKnowledge(GRAPH, "search", "zzzz");
  assert.equal(result.visited.nodes.length, 0);
  assert.equal(result.evidence.length, 0);
  assert.match(result.answer, /Nothing in this graph mentions/);
  assert.match(result.answer, /absence here is not absence there/);
});

test("an empty term is a prompt, not a query", () => {
  const result = runKnowledge(GRAPH, "search", "   ");
  assert.match(result.answer, /Type a term/);
  assert.equal(result.visited.nodes.length, 0);
});

test("the same graph always answers the same", () => {
  const queries: KnowledgeQuery[] = ["connect", "hubs", "newest"];
  for (const q of queries) {
    assert.deepEqual(runKnowledge(GRAPH, q), runKnowledge(GRAPH, q));
  }
  assert.deepEqual(runKnowledge(GRAPH, "search", "ultra"), runKnowledge(GRAPH, "search", "ultra"));
});

test("an empty graph answers honestly instead of crashing", () => {
  const empty: RoomGraph = { name: "knowledge-graph", nodes: [], edges: [] };
  for (const q of ["connect", "hubs", "newest", "search"] as KnowledgeQuery[]) {
    const result = runKnowledge(empty, q, "ultra");
    assert.ok(result.answer.length > 10);
    assert.equal(result.visited.nodes.length, 0);
  }
});
