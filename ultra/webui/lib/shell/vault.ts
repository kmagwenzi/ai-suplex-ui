import { homedir } from "node:os";
import { realpathSync } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";

/**
 * The allowlist passthrough seam. A surface key is an opaque allowlist token,
 * never a path segment — traversal is impossible by construction because the
 * value is looked up from this closed map, not joined from user input.
 */
export const ARTIFACT_ALLOWLIST = {
  "knowledge-canvas": "Projections/knowledge-canvas/index.html",
  "decision-canvas": "Projections/decision-canvas/index.html",
  "insight-resonance": "Projections/insight-resonance/index.html",
  wiki: "Projections/wiki/index.html",
} as const;

export type SurfaceKey = keyof typeof ARTIFACT_ALLOWLIST;

export function isSurfaceKey(key: string): key is SurfaceKey {
  return Object.prototype.hasOwnProperty.call(ARTIFACT_ALLOWLIST, key);
}

export const VAULT_ENV = "AISUPLEX_VAULT";

/** The configured path — env first, else the default. Never realpath'd here. */
export function configuredVaultPath(): string {
  const env = process.env[VAULT_ENV];
  if (env && env.length > 0) return env;
  return path.join(
    homedir(),
    "Projects",
    "AI-Suplex-OS",
    "Deep-Ultra-OS",
    "AI-Suplex-777",
  );
}

/**
 * Resolve the vault to a realpath'd absolute base, or null if it does not
 * resolve. Null is the single "vault unavailable" signal the shell routes map
 * to a named 501 panel.
 */
export function resolveVault(): string | null {
  try {
    return realpathSync(configuredVaultPath());
  } catch {
    return null;
  }
}

export type ArtifactMeta =
  | { ok: true; size: number; mtime: string; path: string }
  | { ok: false; kind: "vault" | "fs"; path: string };

/** One line of derived metadata (size + mtime) — the only thing read from the file. */
export async function artifactMeta(
  key: SurfaceKey,
  base: string,
): Promise<ArtifactMeta> {
  const full = path.join(base, ARTIFACT_ALLOWLIST[key]);
  try {
    const s = await stat(full);
    return { ok: true, size: s.size, mtime: s.mtime.toISOString(), path: full };
  } catch {
    return { ok: false, kind: "fs", path: full };
  }
}

export type ArtifactRead =
  | { ok: true; bytes: Uint8Array; path: string }
  | { ok: false; path: string; message: string };

/** Read the raw file bytes, unmodified. No transform, no injection. */
export async function readArtifact(
  key: SurfaceKey,
  base: string,
): Promise<ArtifactRead> {
  const full = path.join(base, ARTIFACT_ALLOWLIST[key]);
  try {
    const bytes: Uint8Array = await readFile(full);
    return { ok: true, bytes, path: full };
  } catch (err) {
    return { ok: false, path: full, message: (err as Error).message };
  }
}
