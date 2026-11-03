export type Tier = "ultra" | "free";

export interface Surface {
  /** Allowlist/route key. */
  key: string;
  label: string;
  route: string;
  description: string;
  /** Minimum tier that unlocks the surface. */
  minTier: Tier;
  /** Cockpit: locked in this phase regardless of tier (T010 owns the real thing). */
  locked?: boolean;
}

/**
 * The seven rows — the contract. Exactly seven, no separate "home" row: the
 * Knowledge Canvas is the hero at `/`.
 */
export const SURFACES: Surface[] = [
  {
    key: "knowledge-canvas",
    label: "Knowledge Canvas",
    route: "/",
    description: "The vault's knowledge graph, projected as a self-contained canvas.",
    minTier: "ultra",
  },
  {
    key: "decision-canvas",
    label: "decision-canvas",
    route: "/decisions",
    description: "Open decisions and their evidence, as a deterministic canvas.",
    minTier: "ultra",
  },
  {
    key: "insight-resonance",
    label: "Insight Resonance",
    route: "/resonance",
    description: "Insights that repeat across sessions, surfaced by resonance.",
    minTier: "ultra",
  },
  {
    key: "wiki",
    label: "Living Wiki",
    route: "/wiki",
    description: "The living wiki, embedded as-is with a source rail.",
    minTier: "ultra",
  },
  {
    key: "opportunity",
    label: "Opportunity Mapper",
    route: "/opportunity",
    description: "Pipeline, follow-ups, channels, utilisation and price bands.",
    minTier: "ultra",
  },
  {
    key: "deep-ultra",
    label: "Deep Ultra",
    route: "/deep-ultra",
    description: "The Deep Ultra scoreboard, rendered verbatim from the tool.",
    minTier: "ultra",
  },
  {
    key: "cockpit",
    label: "AS MC cockpit",
    route: "/cockpit",
    description: "The local ops surface — approvals, tasklists, vault log.",
    minTier: "ultra",
    locked: true,
  },
];

export const TIER_ENV = "AISUPLEX_TIER";

/** Read server-side. A capability flag, never a license server. */
export function getTier(): Tier {
  return process.env[TIER_ENV] === "free" ? "free" : "ultra";
}

/** Locked (this phase) always gates; otherwise the tier decides. */
export function isSurfaceAvailable(surface: Surface, tier: Tier): boolean {
  if (surface.locked) return false;
  if (tier === "free" && surface.minTier === "ultra") return false;
  return true;
}

export function gateReason(surface: Surface, tier: Tier): string | null {
  if (surface.locked) {
    return "Wired in T010 — a local-only ops surface, not available in this build.";
  }
  if (tier === "free" && surface.minTier === "ultra") {
    return "Ultra tier required — set AISUPLEX_TIER=ultra to view this surface.";
  }
  return null;
}
