import { readdirSync, statSync } from "node:fs";
import path from "node:path";

export interface WikiSource {
  /** Vault-relative label, e.g. "Memory/semantic". */
  label: string;
  /** Absolute path (obsidian://open target). */
  absolute: string;
  /** Recursive markdown file count. */
  count: number;
}

/**
 * The deterministic source roots the Living Wiki is built from — the same
 * constants `Tools/ultra/wiki.js` reads (semantic memory · artifacts · B-Bombs
 * · skills · outreach). Derive the list by fs-listing, never by invention.
 */
export function wikiSourceRoots(base: string): WikiSource[] {
  const roots = [
    { label: "Memory/semantic", rel: "Memory/semantic" },
    { label: "Artifacts", rel: "Artifacts" },
    { label: "B-Bombs", rel: "B-Bombs" },
    { label: "Skills", rel: "Skills" },
    { label: "Outreach", rel: "Outreach" },
  ];
  return roots
    .map(({ label, rel }) => ({
      label,
      absolute: path.join(base, rel),
      count: countMarkdown(path.join(base, rel)),
    }))
    .filter((r) => r.count > 0);
}

function countMarkdown(dir: string): number {
  let n = 0;
  const walk = (d: string): void => {
    let entries: string[];
    try {
      entries = readdirSync(d);
    } catch {
      return;
    }
    for (const e of entries) {
      const p = path.join(d, e);
      let st;
      try {
        st = statSync(p);
      } catch {
        continue;
      }
      if (st.isDirectory()) walk(p);
      else if (e.endsWith(".md")) n++;
    }
  };
  walk(dir);
  return n;
}
