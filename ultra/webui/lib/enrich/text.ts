/**
 * text.ts — `enrichText`: the thin, provider-agnostic `generateText` wrapper
 * (Spec — Ultra UI Integration (AI SDK) §12.2 · tasklist T004) for prose (the Living Wiki).
 *
 * Fails closed: no key, provider error, or timeout → `null`. The `ai` module is loaded
 * with a dynamic `import()` only after the gate passes — a static import cannot work
 * without pulling the SDK into the deterministic (no-key) path.
 */
import type { LanguageModel } from "ai";
import { getEnrichConfig } from "./gate";
import { resolveModel } from "./provider";
import { effectiveSignal } from "./abort";

const DEFAULT_TIMEOUT_MS = 30_000;

export interface EnrichTextOptions {
  prompt: string;
  system?: string;
  signal?: AbortSignal;
  /** Timeout in ms; `0` disables the internal timeout (caller owns the signal then). */
  timeoutMs?: number;
  /** TEST SEAM ONLY — inject a model to bypass env + provider resolution. */
  model?: LanguageModel;
}

/**
 * Generate prose for a page, or `null` when enrichment is off or the call fails.
 * Never throws — every failure path resolves to `null` (fail closed).
 */
export async function enrichText(options: EnrichTextOptions): Promise<string | null> {
  const config = getEnrichConfig();
  const model = options.model ?? (config ? await resolveModel(config) : null);
  if (!model) return null;

  try {
    const { generateText } = await import("ai");
    const result = await generateText({
      model,
      prompt: options.prompt,
      system: options.system,
      abortSignal: effectiveSignal(options.signal, options.timeoutMs ?? DEFAULT_TIMEOUT_MS),
    });
    return result.text;
  } catch {
    return null;
  }
}
