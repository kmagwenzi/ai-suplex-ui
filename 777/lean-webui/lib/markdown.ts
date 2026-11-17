/**
 * markdown.ts — the small text transforms the console needs.
 * Pure: no reads, no clock.
 */

/**
 * Drop a leading YAML frontmatter block. The vault's tasklists open with one;
 * rendering it inside an 'Overview' section shows the operator raw YAML instead
 * of their plan.
 */
export function stripFrontmatter(md: string): string {
  const text = md.replace(/^\uFEFF/, "");
  const m = text.match(/^---\r?\n[\s\S]*?\r?\n---\s*(?:\r?\n|$)/);
  return m ? text.slice(m[0].length) : text;
}
