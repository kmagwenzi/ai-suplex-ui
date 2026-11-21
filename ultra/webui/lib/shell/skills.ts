import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { runTool } from "./exec";

/**
 * Skills Evolution — the read-only half of the gated path.
 *
 * The surface PROPOSES (what could become a skill) and shows what already exists.
 * It never writes: promotion stays a command the human runs, exactly as the command
 * bar's "copied ≠ done" rule requires.
 */

export type Section<T> = { ok: true; data: T } | { ok: false; error: string };

export interface Candidate {
  id: string;
  title: string;
  steps: number;
  purpose: string;
  evolved: boolean;
  /** `workspace` rows are recent closed workspaces: a narrative, never a numbered procedure. */
  kind: "procedural" | "workspace";
  thread?: string | null;
  date?: string;
  age_days?: number;
}

export interface Scan {
  source: string;
  candidates: number;
  evolved: number;
  workspaces: { dir: string; since_days: number; count: number };
  rows: Candidate[];
}

export interface SkillRecord {
  name: string;
  role: string;
  version: string;
  quality: number;
  status: string;
  usesTools: string[];
}

export interface DraftRecord {
  name: string;
  quality: number;
  status: string;
}

function frontmatter(text: string): Record<string, string> {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return {};
  const out: Record<string, string> = {};
  for (const line of m[1].split("\n")) {
    const i = line.indexOf(":");
    if (i === -1) continue;
    out[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^["']|["']$/g, "");
  }
  return out;
}

function listField(raw: string | undefined): string[] {
  if (!raw) return [];
  const inner = raw.replace(/^\[|\]$/g, "").trim();
  if (!inner) return [];
  return inner.split(",").map((s) => s.trim()).filter(Boolean);
}

export function promoteCommand(title: string): string {
  return `node Tools/skill-generate.js --from <procedural> --name "${title}"`;
}

/** The candidates: what Memory/procedural holds that Skills/ does not yet carry. */
export async function scanCandidates(vault: string): Promise<Section<Scan>> {
  const res = await runTool(["Tools/skill-generate.js", "--scan", "--json"], vault, 30_000);
  if (!res.ok) return { ok: false, error: res.message };
  try {
    return { ok: true, data: JSON.parse(res.stdout) as Scan };
  } catch {
    return { ok: false, error: "the scan returned output that is not JSON" };
  }
}

/** The library: every curated skill, with the quality score the ritual maintains. */
export async function listSkills(vault: string): Promise<Section<SkillRecord[]>> {
  const dir = path.join(vault, "Skills");
  try {
    const files = (await readdir(dir)).filter((f) => f.endsWith(".md"));
    const records: SkillRecord[] = [];
    for (const file of files) {
      const fm = frontmatter(await readFile(path.join(dir, file), "utf8"));
      records.push({
        name: fm.skill_name || file.replace(/\.md$/, ""),
        role: fm.role || "—",
        version: fm.version || "0",
        quality: Number.parseFloat(fm.quality || "0") || 0,
        status: fm.status || "unknown",
        usesTools: listField(fm.uses_tools),
      });
    }
    records.sort((a, b) => b.quality - a.quality || a.name.localeCompare(b.name));
    return { ok: true, data: records };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

/** Drafts waiting for a human: the queue the gate exists for. */
export async function listDrafts(vault: string): Promise<Section<DraftRecord[]>> {
  const dir = path.join(vault, "Skills", "_drafts");
  try {
    const files = (await readdir(dir)).filter((f) => f.endsWith(".md"));
    const records: DraftRecord[] = [];
    for (const file of files) {
      const fm = frontmatter(await readFile(path.join(dir, file), "utf8"));
      records.push({
        name: fm.skill_name || file.replace(/\.md$/, ""),
        quality: Number.parseFloat(fm.quality || "0") || 0,
        status: fm.status || "draft",
      });
    }
    return { ok: true, data: records };
  } catch {
    // No drafts directory is a fact, not a failure: nothing has been proposed yet.
    return { ok: true, data: [] };
  }
}

export interface PromoteRow {
  id: string;
  name: string;
  role: string;
  draft: string;
  existing: string | null;
  target: string;
  quality: number;
  steps: number;
  blockers: string[];
}

export interface PromoteQueue {
  skills: string;
  drafts: string;
  count: number;
  rows: PromoteRow[];
}

/**
 * The approval queue, read from the gate itself.
 *
 * The blockers are computed by `Tools/skill-promote.js` — the surface renders them, it never
 * re-derives them. One checklist, one owner: the command that would refuse the write.
 */
export async function promoteQueue(vault: string): Promise<Section<PromoteQueue>> {
  const res = await runTool(["Tools/skill-promote.js", "--json"], vault, 30_000);
  if (!res.ok) return { ok: false, error: res.message };
  try {
    return { ok: true, data: JSON.parse(res.stdout) as PromoteQueue };
  } catch {
    return { ok: false, error: "the queue returned output that is not JSON" };
  }
}
