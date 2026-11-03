/**
 * provider.ts — resolve the configured provider into a concrete model.
 *
 * Contract (Spec — Ultra UI Integration (AI SDK) §12.1): provider-agnostic, no vendor
 * default, keys user-supplied and env-configured. Every import here is a dynamic
 * `import()` so the deterministic path never pulls a provider (or the `ai` SDK) into
 * the module graph — `resolveModel` is only called after `hasKey()` is true.
 */
import type { LanguageModel } from "ai";
import type { EnrichConfig } from "./gate";

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

/**
 * Resolve a provider model from config. Returns null on any failure — an unknown
 * provider, a missing package, or a bad config must fail closed, never throw.
 */
export async function resolveModel(config: EnrichConfig): Promise<LanguageModel | null> {
  try {
    switch (config.provider) {
      case "openai": {
        const { createOpenAI } = await import("@ai-sdk/openai");
        return createOpenAI({ apiKey: config.apiKey, baseURL: config.baseURL })(config.model);
      }
      case "anthropic": {
        const { createAnthropic } = await import("@ai-sdk/anthropic");
        return createAnthropic({ apiKey: config.apiKey, baseURL: config.baseURL })(config.model);
      }
      case "deepseek": {
        const { createDeepSeek } = await import("@ai-sdk/deepseek");
        return createDeepSeek({ apiKey: config.apiKey, baseURL: config.baseURL })(config.model);
      }
      case "google": {
        const { createGoogle } = await import("@ai-sdk/google");
        return createGoogle({ apiKey: config.apiKey, baseURL: config.baseURL })(config.model);
      }
      case "openrouter": {
        const { createOpenAI } = await import("@ai-sdk/openai");
        return createOpenAI({
          apiKey: config.apiKey,
          baseURL: config.baseURL ?? OPENROUTER_BASE_URL,
        })(config.model);
      }
      case "custom": {
        const { createOpenAI } = await import("@ai-sdk/openai");
        return createOpenAI({ apiKey: config.apiKey, baseURL: config.baseURL })(config.model);
      }
      default:
        return null;
    }
  } catch {
    return null;
  }
}
