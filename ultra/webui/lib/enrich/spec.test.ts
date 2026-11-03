/**
 * spec.test.ts — wire Spec — Ultra UI Integration (AI SDK) §9 acceptance into tests.
 *
 * In-lane criteria (§9.1 gate purity · §9.2 deterministic-first · §9.6 no vendor
 * lock-in) are asserted here; §9.3 additive is asserted in additive.test.ts; the
 * free-path and vault-side halves of §9.1/§9.7 are the T010 purity grep over
 * `777/lean-webui`, `Tools/`, `Mappings/` (the SDK may only appear under
 * `ultra/webui/lib/enrich/**`).
 */
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getEnrichConfig, hasKey } from "./gate";
import { enrichWikiPage } from "./wiki";
import { enrichDecisionLinks } from "./decision-canvas";
import { enrichResonanceEdges } from "./resonance";
import { objectModel, textModel } from "./mock-model";
import { clearEnrichmentEnv } from "./test-env";
import type { CorpusEntity, WikiPage } from "./types";

const here = path.dirname(fileURLToPath(import.meta.url));

const page: WikiPage = {
  id: "p1",
  title: "Paynow integration",
  type: "artifact",
  focus: "wqr",
  tags: ["paynow"],
  path: "Artifacts/paynow.md",
};

const corpus: CorpusEntity[] = [
  { id: "a1", title: "Paynow integration", type: "artifact", focus: "wqr", tags: ["paynow"], path: "Artifacts/a.md" },
  { id: "b1", title: "Week 4 review", type: "episodic", focus: "wqr", tags: ["paynow"], path: "Sessions/b.md" },
];

beforeEach(clearEnrichmentEnv);

// §9.1 — free-path purity: the gate (the deterministic entry) never imports the SDK.
test("§9.1 gate.ts carries no ai/@ai-sdk import", () => {
  const src = fs.readFileSync(path.join(here, "gate.ts"), "utf8");
  assert.ok(!/from\s+["'](ai|@ai-sdk|@vercel\/ai)/.test(src), "gate.ts must not import the SDK");
});

// §9.1 — the primitives load the SDK lazily (dynamic import), never statically.
test("§9.1 primitives use dynamic import(), not static value imports", () => {
  for (const file of ["object.ts", "text.ts", "provider.ts"]) {
    const src = fs.readFileSync(path.join(here, file), "utf8");
    assert.ok(
      !/^import\s+(?!type\b)[^;]*from\s+["'](ai|@ai-sdk|@vercel\/ai)/m.test(src),
      `${file} must not statically import the SDK (type-only imports are allowed)`,
    );
    assert.ok(/await\s+import\(["'](ai|@ai-sdk)/.test(src), `${file} must load the SDK via import()`);
  }
});

// §9.2 — deterministic-first: with no key, every enrichment point returns null.
test("§9.2 no key → all three enrichment points fall back to null", async () => {
  assert.equal(await enrichWikiPage(page), null);
  assert.equal(await enrichDecisionLinks(corpus), null);
  assert.equal(await enrichResonanceEdges(corpus), null);
});

// §9.3 — additive: with a key the same inputs enrich; keyed output is additive data.
test("§9.3 with a key → additive data, never a structural change to inputs", async () => {
  const prose = await enrichWikiPage(page, { model: textModel("prose") });
  const links = await enrichDecisionLinks(corpus, { model: objectModel({ links: [{ requirement: "r", decision: "d", evidence: "e", outcome: "o" }] }) });
  const edges = await enrichResonanceEdges(corpus, { model: objectModel({ edges: [{ from: "a1", to: "b1", type: "supports", reason: "r" }] }) });
  assert.equal(typeof prose, "string");
  assert.ok(Array.isArray(links) && Array.isArray(edges));
});

// §9.6 — no vendor lock-in: the opt-in env gate; a stray provider key never enables it.
test("§9.6 a stray OPENAI_API_KEY alone does not enable enrichment", () => {
  process.env.OPENAI_API_KEY = "sk-stray";
  assert.equal(hasKey(), false);
});

test("§9.6 an unknown provider resolves to null (provider is env-driven, no default)", () => {
  process.env.AISUPLEX_MODEL_PROVIDER = "nonexistent-vendor";
  process.env.AISUPLEX_MODEL_ID = "x";
  process.env.AISUPLEX_MODEL_API_KEY = "k";
  assert.equal(getEnrichConfig(), null);
});

test("§9.6 full opt-in (provider + model + key) resolves a config", () => {
  process.env.AISUPLEX_MODEL_PROVIDER = "openai";
  process.env.AISUPLEX_MODEL_ID = "gpt-4o-mini";
  process.env.OPENAI_API_KEY = "sk-real";
  const config = getEnrichConfig();
  assert.ok(config);
  assert.equal(config.provider, "openai");
  assert.equal(config.model, "gpt-4o-mini");
});
