# lib/enrich — optional LLM enrichment (AI SDK Phase 2)

The **only** place the Vercel AI SDK is imported in the Ultra UI. The deterministic render is the
default; this layer is an **opt-in, key-gated** upgrade that changes depth, never structure.

## Env (opt-in)

| Var | Required | Meaning |
|---|---|---|
| `AISUPLEX_MODEL_PROVIDER` | yes | `openai` · `anthropic` · `deepseek` · `google` · `openrouter` · `custom` |
| `AISUPLEX_MODEL_ID` | yes | model id (e.g. `gpt-4o-mini`) |
| `<PROVIDER>_API_KEY` | yes | provider key (`OPENAI_API_KEY` · `ANTHROPIC_API_KEY` · `DEEPSEEK_API_KEY` · `GOOGLE_GENERATIVE_AI_API_KEY` · `OPENROUTER_API_KEY`); `AISUPLEX_MODEL_API_KEY` for `custom` |
| `AISUPLEX_MODEL_BASE_URL` | no | custom endpoint (`custom` / self-hosted) |

Enrichment is **ON only when provider + model + key are all present**. A stray `OPENAI_API_KEY` does
**not** enable it — the `AISUPLEX_MODEL_PROVIDER` + `AISUPLEX_MODEL_ID` opt-in is the switch. Never
commit keys; use a local `.env` (gitignored).

## Dependencies (for the UI lane to merge into `package.json`)

This lane does **not** own `package.json` (see the mount contract). The UI lane adds these at its
`T012`/scaffold merge — the tests here require them:

- runtime: `ai` · `@ai-sdk/openai` · `@ai-sdk/anthropic` · `@ai-sdk/deepseek` · `@ai-sdk/google` · `zod`
- dev: `tsx` (test runner) · `typescript` · `@types/node`

> **⚠️ `generateObject` is deprecated in `ai` v7** (in favour of `generateText` with an `output`
> setting), but `Spec — Ultra UI Integration (AI SDK)` §4/§12.2 pins `generateObject` for structured
> extraction. The wrapper uses it as specified; flag before adopting the v7 `output` form.

## Fallback contract

Every enrich call **fails closed**: missing key, provider error, timeout, or schema mismatch → `null`
→ the caller renders the deterministic artifact. Removing the key is a **no-op on structure**.

## Modules

### Primitives (provider-agnostic)

- `gate.ts` — `getEnrichConfig()` · `hasKey()` · `isCustomEndpoint()` *(no `ai` import — the no-key path never loads the SDK)*
- `abort.ts` — `effectiveSignal(signal, timeoutMs)` — merge caller signal + internal timeout
- `provider.ts` — `resolveModel(config)` — env-driven provider → model, dynamic `import()`, fails closed
- `object.ts` — `enrichObject<T>({ schema, prompt, system?, signal?, timeoutMs? }) → Promise<T | null>`
- `text.ts` — `enrichText({ prompt, system?, signal?, timeoutMs? }) → Promise<string | null>`

### Enrichment points (additive overlays)

Each takes the frontmatter corpus/page and returns **additive data** (or `null` keyless). They never
touch the vault, never mutate their inputs.

- `types.ts` — shared contracts: `CorpusEntity` · `WikiPage` · `DecisionLink` · `ResonanceEdge` · `EnrichOptions`
- `corpus.ts` — `formatCorpus(corpus)` — compact, bounded prompt block (≤200 entities)
- `wiki.ts` — `enrichWikiPage(page, opts?) → Promise<string | null>` — prose for one page (`generateText`)
- `decision-canvas.ts` — `enrichDecisionLinks(corpus, opts?) → Promise<DecisionLink[] | null>` — `requirement → decision → evidence → outcome` (`generateObject`)
- `resonance.ts` — `enrichResonanceEdges(corpus, opts?) → Promise<ResonanceEdge[] | null>` — typed edges `supports` · `contradicts` · `led_to` (`generateObject`)

### Tests

- `object.test.ts` · `text.test.ts` — primitives (no-key null · success · error · timeout)
- `enrich-points.test.ts` — the three points, keyless null + keyed data
- `additive.test.ts` — additive proof: keyless → null, inputs never mutated
- `spec.test.ts` — §9 acceptance (gate purity · deterministic-first · no vendor lock-in)
- `mock-model.ts` · `test-env.ts` — test helpers (not `.test.ts`)

## Scope

This lane owns `lib/enrich/**` only. `app/**`, `components/**`, and theme belong to the UI build lane.
