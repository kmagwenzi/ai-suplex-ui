/**
 * test-env.ts — clear every enrichment env var so "no key" tests are deterministic
 * regardless of the ambient shell (a stray OPENAI_API_KEY must never enable enrichment).
 */

const ENRICHMENT_ENV_VARS = [
  "AISUPLEX_MODEL_PROVIDER",
  "AISUPLEX_MODEL_ID",
  "AISUPLEX_MODEL_API_KEY",
  "AISUPLEX_MODEL_BASE_URL",
  "OPENAI_API_KEY",
  "ANTHROPIC_API_KEY",
  "DEEPSEEK_API_KEY",
  "GOOGLE_GENERATIVE_AI_API_KEY",
  "OPENROUTER_API_KEY",
] as const;

export function clearEnrichmentEnv(): void {
  for (const name of ENRICHMENT_ENV_VARS) delete process.env[name];
}
