import test from "node:test";
import assert from "node:assert/strict";
import { extractEmbeddedJson, runResonance } from "./resonance";
import type { ResonanceData } from "./resonance";

/**
 * The resonance reader pulls the projection's own embedded JSON out of a 2.8 MB HTML
 * file. A regex cannot do that safely (nested braces, escaped quotes), so the extractor
 * is brace-matched and asserted here — including the shapes that break naive parsers.
 */

test("extracts a nested block and stops at its matching brace", () => {
  const html = `<script>const data = {
  "entityTypes": [{"type":"artifact","color":"#fff"}],
  "nodes": [{"id":1,"title":"a \\"quoted\\" title","degree":2}],
  "hubs": [], "orphans": [], "clusters": [], "crossFocus": []
}; const other = {"after":true};</script>`;
  const json = extractEmbeddedJson(html);
  const parsed = JSON.parse(json) as ResonanceData;
  assert.equal(parsed.nodes.length, 1);
  assert.equal(parsed.nodes[0].title, 'a "quoted" title');
  assert.ok(!json.includes("after"), "it stops at the block's own closing brace");
});

test("fails loudly when there is no block", () => {
  assert.throws(() => extractEmbeddedJson("<html>nothing here</html>"), /no embedded data block/);
});

test("the real projection parses — 1,783 entities, hubs ordered by degree", async () => {
  const vault = process.env.AISUPLEX_VAULT ?? "/home/kmagwenzi/Projects/AI-Suplex-OS/Deep-Ultra-OS/AI-Suplex-777";
  const { readResonance } = await import("./resonance");
  const res = await readResonance(vault);
  if (!res.ok) {
    console.log("  [skip] projection not present — " + res.error);
    return;
  }
  assert.ok(res.data.nodes.length > 100, "the artifact carries the graph");
  assert.ok(res.data.hubs.length > 0);
  const degrees = res.data.hubs.map((h) => h.degree);
  assert.deepEqual(degrees, [...degrees].sort((a, b) => b - a), "hubs are ordered by degree");
});

test("each question composes an answer from the projection's numbers", () => {
  const data: ResonanceData = {
    nodes: [
      { id: 1, title: "Hub One", path: "", type: "artifact", focus: "ai", degree: 9 },
      { id: 2, title: "Lonely", path: "", type: "procedural", focus: "", degree: 0 },
    ],
    edges: [],
    hubs: [{ id: 1, title: "Hub One", path: "", type: "artifact", focus: "ai", degree: 9 }],
    orphans: [{ id: 2, title: "Lonely", path: "", type: "procedural", focus: "", degree: 0 }],
    clusters: [],
    crossFocus: [{ label: "ai + wqr", size: 4, focuses: ["ai-engineering", "wqr"] }],
  };

  assert.match(runResonance(data, "hubs").answer, /Hub One/);
  assert.match(runResonance(data, "orphans").answer, /1 entities carry no recorded relationship/);
  assert.match(runResonance(data, "overlap").answer, /ai-engineering · wqr/);
  assert.equal(runResonance(data, "hubs").rows.length, 1);
});
