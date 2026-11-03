/**
 * gate.ts — the single decision point for optional LLM enrichment (AI SDK Phase 2).
 *
 * Contract (Spec — Ultra UI Integration (AI SDK) §12):
 *   - Opt-in: enrichment is ON only when AISUPLEX_MODEL_PROVIDER + AISUPLEX_MODEL_ID + a provider
 *     key are all present. A stray OPENAI_API_KEY in the environment must NOT enable it.
 *   - Never throws: any missing/invalid part returns null.
 *   - No `ai` import here — the deterministic path never pulls the SDK into the module graph.
 *     object.ts / text.ts import the provider + `ai` dynamically, only after hasKey().
 */

export type EnrichProvider =
  | "openai"
  | "anthropic"
  | "deepseek"
  | "google"
  | "openrouter"
  | "custom";

export interface EnrichConfig {
  provider: EnrichProvider;
  model: string;
  apiKey: string;
  baseURL?: string;
}

const PROVIDER_KEY_ENV: Record<EnrichProvider, string> = {
  openai: "OPENAI_API_KEY",
  anthropic: "ANTHROPIC_API_KEY",
  deepseek: "DEEPSEEK_API_KEY",
  google: "GOOGLE_GENERATIVE_AI_API_KEY",
  openrouter: "OPENROUTER_API_KEY",
  custom: "AISUPLEX_MODEL_API_KEY",
};

function readEnv(name: string): string | undefined {
  try {
    const raw =
      typeof process !== "undefined" && process.env ? process.env[name] : undefined;
    return raw && raw.trim() ? raw.trim() : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Resolve the enrichment config, or null when enrichment is off.
 * Pure env read — no network, no throw, no `ai` import.
 */
export function getEnrichConfig(): EnrichConfig | null {
  const providerRaw = readEnv("AISUPLEX_MODEL_PROVIDER");
  if (!providerRaw) return null;
  const provider = providerRaw.toLowerCase() as EnrichProvider;
  if (!(provider in PROVIDER_KEY_ENV)) return null;

  const model = readEnv("AISUPLEX_MODEL_ID");
  if (!model) return null;

  // A dedicated key wins; otherwise fall back to the provider's standard var.
  const apiKey =
    readEnv("AISUPLEX_MODEL_API_KEY") || readEnv(PROVIDER_KEY_ENV[provider]);
  if (!apiKey) return null;

  const baseURL = readEnv("AISUPLEX_MODEL_BASE_URL");
  return baseURL ? { provider, model, apiKey, baseURL } : { provider, model, apiKey };
}

/** The one switch every enrichment call branches on. Never throws. */
export function hasKey(): boolean {
  return getEnrichConfig() !== null;
}

/** True when the provider needs a custom base URL (self-hosted / OpenAI-compatible). */
export function isCustomEndpoint(config: EnrichConfig): boolean {
  return config.provider === "custom" || Boolean(config.baseURL);
}
