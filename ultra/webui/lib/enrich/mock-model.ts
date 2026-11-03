/**
 * mock-model.ts — test-only mock providers for the enrichment primitives.
 *
 * Not a `.test.ts` file — imported by the test suites. Builds `MockLanguageModelV4`
 * instances (from `ai/test`) that return canned structured JSON, prose, or throw/hang,
 * so the primitives can be exercised with no network and no env key.
 */
import { MockLanguageModelV4 } from "ai/test";

const USAGE = {
  inputTokens: { total: 0, noCache: 0, cacheRead: 0, cacheWrite: 0 },
  outputTokens: { total: 0, text: 0, reasoning: 0 },
};

/** A model that returns `json` as its structured output (for `generateObject`). */
export function objectModel(json: unknown): MockLanguageModelV4 {
  return new MockLanguageModelV4({
    provider: "test",
    modelId: "test-object",
    doGenerate: async () => ({
      content: [{ type: "text" as const, text: "" }],
      structuredOutputText: JSON.stringify(json),
      finishReason: { unified: "stop" as const, raw: undefined },
      usage: USAGE,
      warnings: [],
    }),
  });
}

/** A model that returns `text` as its prose output (for `generateText`). */
export function textModel(text: string): MockLanguageModelV4 {
  return new MockLanguageModelV4({
    provider: "test",
    modelId: "test-text",
    doGenerate: async () => ({
      content: [{ type: "text" as const, text }],
      finishReason: { unified: "stop" as const, raw: undefined },
      usage: USAGE,
      warnings: [],
    }),
  });
}

/** A model whose `doGenerate` rejects — simulates a provider error. */
export function throwingModel(): MockLanguageModelV4 {
  return new MockLanguageModelV4({
    provider: "test",
    modelId: "test-throw",
    doGenerate: async () => {
      throw new Error("provider exploded");
    },
  });
}

/** A model that only settles when its abort signal fires — simulates a timeout. */
export function hangingModel(): MockLanguageModelV4 {
  return new MockLanguageModelV4({
    provider: "test",
    modelId: "test-hang",
    doGenerate: (options) => {
      const { promise, reject } = Promise.withResolvers<never>();
      options.abortSignal?.addEventListener("abort", () =>
        reject(options.abortSignal?.reason ?? new Error("aborted")),
      );
      // `AbortSignal.timeout` uses an unref'd timer, so the loop would empty before the
      // abort fires in a bare test. This ref'd timer keeps the loop alive past the abort
      // and doubles as a hard safety net against a never-settling promise.
      const safety = setTimeout(() => reject(new Error("provider never responded")), 5_000);
      promise.then(
        () => clearTimeout(safety),
        () => clearTimeout(safety),
      );
      return promise;
    },
  });
}
