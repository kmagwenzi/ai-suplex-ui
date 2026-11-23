/**
 * Links, not islands — every row reaches the file it names.
 *
 * The cockpit renders numbers that were read from files. A number without a way back to its
 * source is a claim, not evidence: the reader has to trust the panel. So each row carries a
 * link, built the way every wikilink in this vault resolves — by name, inside Obsidian.
 *
 * Pure on purpose: no fs, no vault reads. The caller passes the basename (what `asmc status`
 * reports) or a vault-relative path (what an artifact row knows) and gets an `obsidian://` URI.
 */

export type LinkKind = "instance" | "tasklist" | "receipt" | "hermes" | "artifact" | "review";

/** A resolved row link: the URI to open, and the path it believes it names. */
export interface RowLink {
  href: string;
  /** Vault-relative path, without the `.md` — for a title attribute or a copy. */
  path: string;
  kind: LinkKind;
}

/** Kinds whose source is one fixed file, whatever the row says. */
const FIXED: Partial<Record<LinkKind, string>> = {
  receipt: "Memory/ritual-log.md",
  hermes: "Tools/cron/hermes-jobs.md",
};

/**
 * The folders a kind resolves to, when it has exactly one home. A tasklist does not: an open
 * one sits in `Tasklists/Active`, a closed one in `Tasklists/Archive` — so the tasklist link
 * stays a bare name and lets Obsidian's own resolution pick the file.
 */
const HOME: Record<LinkKind, string[] | null> = {
  instance: ["AI-Suplex Kick-start", "Context Kick-start", "Active"],
  tasklist: null,
  receipt: null,
  hermes: null,
  artifact: null,
  review: null,
};

/** Every kind a row can be. The contract test walks this, so a new kind cannot ship bare. */
export const LINK_KINDS: LinkKind[] = ["instance", "tasklist", "receipt", "hermes", "artifact", "review"];

/** The Obsidian vault name is the folder name of the vault path. */
export function vaultNameFromPath(vaultPath: string | null | undefined): string {
  if (!vaultPath) return "";
  const parts = vaultPath.replace(/\\/g, "/").split("/").filter(Boolean);
  return parts.length ? parts[parts.length - 1] : "";
}

/** Strip a trailing `.md` — Obsidian resolves both, and the shorter form reads better. */
export function withoutExtension(file: string): string {
  return file.replace(/\.md$/i, "");
}

/**
 * The one encoder. Spaces and emoji are normal in this vault's paths, so the query value is
 * encoded — and only the query value: a fully encoded URI breaks Obsidian's own handling.
 */
export function obsidianHref(vaultName: string, path: string): string {
  return "obsidian://open?vault=" + encodeURIComponent(vaultName) + "&file=" + encodeURIComponent(withoutExtension(path));
}

/**
 * Build the link for a row.
 *
 * `file` may be a bare basename (`daily-tasks.md`) or a vault-relative path
 * (`Artifacts/…/x.md`). A path is used as-is; a basename gains its kind's folder when the kind
 * has exactly one home, and is left bare otherwise.
 */
export function linkFor(
  kind: LinkKind,
  file: string | null | undefined,
  vaultPath: string | null | undefined,
): RowLink | null {
  const vault = vaultNameFromPath(vaultPath);
  if (!vault) return null;

  const fixed = FIXED[kind];
  const clean = (file ?? "").replace(/^\/+/, "");
  if (!fixed && !clean) return null;

  const path = fixed ?? (clean.includes("/") ? clean : [...(HOME[kind] ?? []), clean].join("/"));
  if (!path) return null;

  return { href: obsidianHref(vault, path), path: withoutExtension(path), kind };
}
