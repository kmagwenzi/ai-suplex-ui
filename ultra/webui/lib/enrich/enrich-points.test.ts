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
  tags: ["paynow", "payments"],
  summary: "Paynow test mode",
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
    nextActions: ["confirm a live payment"],
  },
  {
    id: "b1",
    title: "Week 4 review",
    type: "episodic",
    focus: "wqr",
    tags: ["paynow"],
    path: "Sessions/b.md",
    summary: "Paynow still in test mode",
  },
];

beforeEach(clearEnrichmentEnv);

test("wiki: no key → null (frontmatter-only fallback)", async () => {
  assert.equal(await enrichWikiPage(page), null);
});

test("wiki: with a model → prose", async () => {
  const out = await enrichWikiPage(page, { model: textModel("Paynow is the WQR payment rail.") });
  assert.equal(out, "Paynow is the WQR payment rail.");
});

test("decision-canvas: no key → null (frontmatter fallback)", async () => {
  assert.equal(await enrichDecisionLinks(corpus), null);
});

test("decision-canvas: with a model → typed links", async () => {
  const out = await enrichDecisionLinks(corpus, {
    model: objectModel({
      links: [{ requirement: "r", decision: "d", evidence: "e", outcome: "o", sources: ["a1"] }],
    }),
  });
  assert.deepEqual(out, [
    { requirement: "r", decision: "d", evidence: "e", outcome: "o", sources: ["a1"] },
  ]);
});

test("resonance: no key → null (structural floor only)", async () => {
  assert.equal(await enrichResonanceEdges(corpus), null);
});

test("resonance: with a model → typed edges", async () => {
  const out = await enrichResonanceEdges(corpus, {
    model: objectModel({
      edges: [{ from: "a1", to: "b1", type: "contradicts", reason: "test mode vs live" }],
    }),
  });
  assert.deepEqual(out, [
    { from: "a1", to: "b1", type: "contradicts", reason: "test mode vs live" },
  ]);
});
