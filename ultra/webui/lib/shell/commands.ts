/**
 * commands.ts — the AI-Suplex command catalogue, read file-first (T012a).
 *
 * No MCP client: the 17 `Prompt Patterns/AI-Suplex Commands/⚡ Command — *.md`
 * files are the source of truth. A file whose name cannot be parsed is skipped
 * and named — never invented, never guessed. The read is cached per process
 * (the vault does not change mid-request).
 */
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

export const COMMANDS_DIR = path.join("Prompt Patterns", "AI-Suplex Commands");
const FILE_PREFIX = "⚡ Command — ";

export interface CommandDef {
  /** From frontmatter `command:` (legacy spelling `pattern:`) — e.g. "Artifact Capture (YouTube)". */
  name: string;
  /** The trigger string: `AI-Suplex: <name>`. */
  command: string;
  role: string;
  patternFile: string;
  /** Vault-relative path, forward slashes. */
  file: string;
  /** One line of prose for the deterministic matcher (may be empty). */
  summary: string;
}

export interface CommandCatalogue {
  commands: CommandDef[];
  /** Files that could not be named — reported, never silently dropped. */
  skipped: string[];
  error?: string;
}

const cache = new Map<string, CommandCatalogue>();

/** Test + dev seam: forget cached catalogues (the vault files themselves do not change). */
export function clearCommandCache(): void {
  cache.clear();
}

function frontmatterOf(text: string): Record<string, string> | null {
  if (!text.startsWith("---")) return null;
  const end = text.indexOf("\n---", 3);
  if (end === -1) return null;
  const fields: Record<string, string> = {};
  for (const line of text.slice(3, end).split(/\r?\n/)) {
    const match = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(line);
    if (!match) continue;
    let value = match[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (value === "null" || value === "~") value = "";
    fields[match[1]] = value;
  }
  return fields;
}

/**
 * The first readable sentence of the command body — the matcher's recall signal.
 * Structural lines (headings, fences, tables, quotes, blanks) are skipped, so a
 * doc that opens with a heading still yields its first prose/code line. No prose
 * → empty string; the matcher then scores on the name alone.
 */
function summaryOf(text: string): string {
  const end = text.startsWith("---") ? text.indexOf("\n---", 3) : -1;
  const body = end === -1 ? text : text.slice(end + 4);
  const lines = body.split(/\r?\n/);
  const heading = lines.findIndex((line) => line.includes("# ⚡ AI-Suplex:"));
  const collected: string[] = [];

  for (const raw of lines.slice(heading + 1)) {
    const line = raw.trim();
    if (
      line === "" ||
      line.startsWith("#") ||
      line.startsWith("```") ||
      line.startsWith("|") ||
      line.startsWith(">") ||
      line.startsWith("*TWABAM")
    ) {
      continue;
    }
    collected.push(line.replace(/[*_`]/g, ""));
    if (collected.join(" ").length > 240) break;
  }

  const prose = collected.join(" ").replace(/\s+/g, " ").trim();
  if (prose.length === 0) return "";
  const sentence = /^(.{12,}?[.!?])(\s|$)/.exec(prose);
  return (sentence ? sentence[1] : prose).slice(0, 240);
}

function byName(a: CommandDef, b: CommandDef): number {
  if (a.name === b.name) return a.file < b.file ? -1 : a.file > b.file ? 1 : 0;
  return a.name < b.name ? -1 : 1;
}

/**
 * Load the catalogue. Never throws: a failed directory read returns `[]` plus
 * the message so the caller can show a named failure.
 */
export async function loadCommands(vault: string): Promise<CommandCatalogue> {
  const cached = cache.get(vault);
  if (cached) return cached;

  const dir = path.join(vault, COMMANDS_DIR);
  let entries: string[];
  try {
    entries = await readdir(dir);
  } catch (err) {
    const failed: CommandCatalogue = {
      commands: [],
      skipped: [],
      error: `cannot read ${dir}: ${(err as Error).message}`,
    };
    cache.set(vault, failed);
    return failed;
  }

  const files = entries
    .filter((entry) => entry.startsWith(FILE_PREFIX) && entry.endsWith(".md"))
    .sort();

  const commands: CommandDef[] = [];
  const skipped: string[] = [];

  for (const file of files) {
    let text: string;
    try {
      text = await readFile(path.join(dir, file), "utf8");
    } catch {
      skipped.push(file);
      continue;
    }
    if (text.trim().length === 0) {
      skipped.push(file);
      continue;
    }
    const frontmatter = frontmatterOf(text);
    const name = frontmatter?.command || frontmatter?.pattern || "";
    if (name.length === 0) {
      skipped.push(file);
      continue;
    }
    commands.push({
      name,
      command: `AI-Suplex: ${name}`,
      role: frontmatter?.role ?? "",
      patternFile: frontmatter?.pattern_file ?? "",
      file: path.posix.join(COMMANDS_DIR.split(path.sep).join("/"), file),
      summary: summaryOf(text),
    });
  }

  commands.sort(byName);
  const catalogue: CommandCatalogue = { commands, skipped };
  cache.set(vault, catalogue);
  return catalogue;
}
