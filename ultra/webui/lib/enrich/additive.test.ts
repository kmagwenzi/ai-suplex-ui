import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { enrichWikiPage } from "./wiki";
import { enrichDecisionLinks } from "./decision-canvas";
import { enrichResonanceEdges } from "./resonance";
import { objectModel, textModel } from "./mock-model";
import { clearEnrichmentEnv } from "./test-env";
import type { CorpusEntity, WikiPage } from "./types";

const page: WikiPage = {
  id: "p1",
  title: "Paynow integration",
  type: "artifact",
  focus: "wqr",
  tags: ["paynow"],
  path: "Artifacts/paynow.md",
};

const corpus: CorpusEntity[] = [
  {
    id: "a1",
    title: "Paynow integration",
    type: "artifact",
    focus: "wqr",
    tags: ["paynow"],
    path: "Artifacts/a.md",
    keyInsights: ["Paynow integration ID 26609"],
  },
  {
    id: "b1",
    title: "Week 4 review",
    type: "episodic",
    focus: "wqr",
    tags: ["paynow"],
    path: "Sessions/b.md",
  },
];

beforeEach(clearEnrichmentEnv);

test("additive: keyless → null for all three points, inputs never mutated", async () => {
  const corpusSnapshot = JSON.stringify(corpus);
  const pageSnapshot = JSON.stringify(page);

  assert.equal(await enrichWikiPage(page), null);
  assert.equal(await enrichDecisionLinks(corpus), null);
  assert.equal(await enrichResonanceEdges(corpus), null);

  // The deterministic render (the serialized inputs) is byte-identical before/after.
  assert.equal(JSON.stringify(corpus), corpusSnapshot);
  assert.equal(JSON.stringify(page), pageSnapshot);
});

test("additive: keyed → returns additive data, inputs still never mutated", async () => {
  const corpusSnapshot = JSON.stringify(corpus);

  const links = await enrichDecisionLinks(corpus, {
    model: objectModel({ links: [{ requirement: "r", decision: "d", evidence: "e", outcome: "o" }] }),
  });
  assert.ok(Array.isArray(links));

  const edges = await enrichResonanceEdges(corpus, {
    model: objectModel({ edges: [{ from: "a1", to: "b1", type: "supports", reason: "same focus" }] }),
  });
  assert.ok(Array.isArray(edges));

  const prose = await enrichWikiPage(page, { model: textModel("prose") });
  assert.equal(typeof prose, "string");

  // Enrichment is a pure function of its inputs: the corpus is untouched.
  assert.equal(JSON.stringify(corpus), corpusSnapshot);
});
