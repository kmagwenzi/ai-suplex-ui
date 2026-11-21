import test from "node:test";
import assert from "node:assert/strict";
import { runQuery, ageDays, QUERIES, type RoomGraph } from "./opportunity-room";

/**
 * The room's engine is pure, so it is testable without a browser, a server or a key.
 * These assertions are the contract the surface leans on: an answer cites the nodes it
 * used, it is deterministic, and an empty graph produces an honest sentence, not a crash.
 */

const NOW = Date.parse("2026-11-20T00:00:00Z");

const GRAPH: RoomGraph = {
  name: "opportunities",
  nodes: [
    { id: "p1", type: "project", label: "AI-Suplex Ultra", focus: "digital-products", date: "2026-11-01" },
    { id: "p2", type: "project", label: "WQR", focus: "wqr", date: "2026-10-01" },
    { id: "a1", type: "artifact", label: "Proposal — AfriBlocks follow-up", focus: "freelance", date: "2026-11-10" },
    { id: "a2", type: "artifact", label: "Application — Best10", focus: "freelance", date: "2026-11-11" },
    { id: "b1", type: "b-bomb", label: "The Ultra pitch narrative", focus: "digital-products", date: "2026-11-15" },
  ],
  edges: [
    { from: "p1", to: "b1", rel: "relates_to" },
    { from: "p1", to: "a1", rel: "relates_to" },
    { from: "p2", to: "a2", rel: "relates_to" },
  ],
};

test("ageDays is null without a date and floored with one", () => {
  assert.equal(ageDays(undefined, NOW), null);
  assert.equal(ageDays("2026-11-10", NOW), 10);
  assert.equal(ageDays("2026-11-20", NOW), 0);
});

test("every query answers and cites nodes that exist in the graph", () => {
  for (const q of QUERIES) {
    const result = runQuery(GRAPH, q.id, NOW);
    assert.ok(result.answer.length > 20, q.id + " composes a sentence");
    const ids = new Set(GRAPH.nodes.map((n) => n.id));
    for (const e of result.evidence) {
      if (e.id.startsWith("(") || e.id === "digital-products" || e.id === "freelance" || e.id === "wqr") continue;
      assert.ok(ids.has(e.id), q.id + " evidence " + e.id + " is a real node");
    }
  }
});

test("overdue names the oldest waiting thread first", () => {
  const result = runQuery(GRAPH, "overdue", NOW);
  assert.ok(result.evidence.length > 0, "finds the quiet threads");
  const first = result.evidence[0];
  assert.match(first.label, /follow-up|Application/i);
  // The stage prints the age and the type only — one line per row, never three.
  assert.match(first.why, /^\d+d · \w+$/);
  assert.match(result.answer, /oldest/);
});

test("pitch picks the most connected project and cites its neighbour", () => {
  const result = runQuery(GRAPH, "pitch", NOW);
  assert.match(result.answer, /AI-Suplex Ultra/);
  assert.ok(result.evidence.length >= 1, "it names the evidence beside the hub");
  assert.ok(result.visited.nodes.some((n) => n.id === "p1"));
});

test("concentration reports the dominant focus as a share", () => {
  const result = runQuery(GRAPH, "concentration", NOW);
  assert.match(result.answer, /digital-products|freelance|wqr/);
  assert.match(result.answer, /% of the map/);
});

test("the same graph always answers the same", () => {
  for (const q of QUERIES) {
    assert.deepEqual(runQuery(GRAPH, q.id, NOW), runQuery(GRAPH, q.id, NOW));
  }
});

test("an empty graph answers honestly instead of crashing", () => {
  const empty: RoomGraph = { name: "opportunities", nodes: [], edges: [] };
  for (const q of QUERIES) {
    const result = runQuery(empty, q.id, NOW);
    assert.ok(result.answer.length > 10);
    assert.equal(result.evidence.length, 0);
    assert.equal(result.visited.nodes.length, 0);
  }
});
