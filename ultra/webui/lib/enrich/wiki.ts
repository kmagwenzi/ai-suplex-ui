/**
 * wiki.ts — Living Wiki enrichment (tasklist T006 · Spec §3).
 *
 * `generateText` adds prose to the *same* page; structure is unchanged. Keyless, the
 * caller renders frontmatter-only — this module is the keyed additive overlay.
 */
import type { EnrichOptions, WikiPage } from "./types";
import { enrichText } from "./text";

const MAX_BODY_CHARS = 4000;

const SYSTEM_PROMPT =
  "You are an AI-Suplex Living Wiki editor. Write plain markdown prose: 2–4 sentences, " +
  "no headings, no bullet lists, no external links. Summarise and connect the page's " +
  "content to its focus and tags.";

/**
 * Produce a prose overview for one wiki page, or `null` when enrichment is off or fails.
 * The returned prose is additive — the caller appends it to the deterministic page body.
 */
export async function enrichWikiPage(
  page: WikiPage,
  options?: EnrichOptions,
): Promise<string | null> {
  const prompt = [
    `Write a concise prose overview for the wiki page "${page.title}".`,
    `Type: ${page.type}`,
    page.focus ? `Focus: ${page.focus}` : "",
    page.tags?.length ? `Tags: ${page.tags.join(", ")}` : "",
    page.summary ? `Summary: ${page.summary}` : "",
    page.body ? `Content excerpt:\n${page.body.slice(0, MAX_BODY_CHARS)}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  return enrichText({
    prompt,
    system: SYSTEM_PROMPT,
    signal: options?.signal,
    timeoutMs: options?.timeoutMs,
    model: options?.model,
  });
}
