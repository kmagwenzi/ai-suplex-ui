/**
 * object.ts — `enrichObject<T>`: the thin, provider-agnostic `generateObject` wrapper
 * (Spec — Ultra UI Integration (AI SDK) §12.2 · tasklist T003).
 *
 * Fails closed, never open: no key, provider error, timeout, or schema mismatch → `null`,
 * and the caller renders the deterministic fallback. The `ai` module is loaded with a
 * dynamic `import()` only after the gate passes — this is the spec's whole point (§12.1:
 * "The AI SDK is never imported on the no-key path"), so a static import cannot work.
 */
import type { ZodType } from "zod";
import type { LanguageModel } from "ai";
import { getEnrichConfig } from "./gate";
import { resolveModel } from "./provider";
import { effectiveSignal } from "./abort";

const DEFAULT_TIMEOUT_MS = 30_000;

export interface EnrichObjectOptions<T> {
  /** The output schema — a zod object; the SDK parses the model's JSON against it. */
  schema: ZodType<T>;
  prompt: string;
  system?: string;
  /** Caller-owned abort signal (a timeout is still applied unless `timeoutMs` is 0). */
  signal?: AbortSignal;
  /** Timeout in ms; `0` disables the internal timeout (caller owns the signal then). */
  timeoutMs?: number;
  /**
   * TEST SEAM ONLY — inject a model to bypass env + provider resolution. Never set by
   * production callers; the runtime contract (§12.2) is `{ schema, prompt, system?, signal? }`.
   */
  model?: LanguageModel;
}

/**
 * Generate one structured object, or `null` when enrichment is off or the call fails.
 * Never throws — every failure path resolves to `null` (fail closed).
 */
export async function enrichObject<T>(options: EnrichObjectOptions<T>): Promise<T | null> {
  const config = getEnrichConfig();
  const model = options.model ?? (config ? await resolveModel(config) : null);
  if (!model) return null;

  try {
    const { generateObject } = await import("ai");
    const result = await generateObject({
      model,
      schema: options.schema,
      prompt: options.prompt,
      system: options.system,
      abortSignal: effectiveSignal(options.signal, options.timeoutMs ?? DEFAULT_TIMEOUT_MS),
    });
    return result.object as T;
  } catch {
    return null;
  }
}
