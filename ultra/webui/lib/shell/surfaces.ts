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
  /**
   * `mvp` ships on 28 Nov. `concept` is designed, wired and deliberately held:
   * it renders behind a "post-launch" tag rather than pretending to be part of the offer.
   */
  status?: "mvp" | "concept";
}

/**
 * The MVP, ordered by what each surface buys — not by build order.
 *
 *   1 Opportunity Mapper — the only one that maps to the month's metric (money)
 *   2 Knowledge Canvas   — the demo that makes Ultra feel Ultra
 *   3 Deep Ultra         — energy and retention, not revenue
 *   4 Skills Evolution   — the vault's own compounding (a 777 tool, surfaced here)
 *   5 AS MC cockpit      — rank 0: the operator the others run on
 *
 * Insight Resonance is NOT a row: it is a background enhancer, reached from the
 * Knowledge Canvas. Living Wiki and Decision Canvas are concepts — held, not shipped.
 */
export const SURFACES: Surface[] = [
  {
    key: "opportunity",
    label: "Opportunity Mapper",
    route: "/",
    description: "Pipeline, follow-ups, channels, utilisation and price bands.",
    minTier: "ultra",
    status: "mvp",
  },
  {
    key: "knowledge-canvas",
    label: "Knowledge Canvas",
    route: "/knowledge",
    description: "The vault's knowledge graph, projected as a self-contained canvas.",
    minTier: "ultra",
    status: "mvp",
  },
  {
    key: "deep-ultra",
    label: "Deep Ultra",
    route: "/deep-ultra",
    description: "The Deep Ultra scoreboard, rendered verbatim from the tool.",
    minTier: "ultra",
    status: "mvp",
  },
  {
    key: "skills",
    label: "Skills Evolution",
    route: "/skills",
    description: "Workflows ready to become skills, and the library they would join.",
    minTier: "ultra",
    status: "mvp",
  },
  {
    key: "cockpit",
    label: "AS MC cockpit",
    route: "/cockpit",
    description: "The local ops surface — operator state, the ritual clock, approvals, tasklists, vault log.",
    minTier: "ultra",
    status: "mvp",
  },
  {
    key: "wiki",
    label: "Living Wiki",
    route: "/wiki",
    description: "The living wiki, embedded as-is with a source rail.",
    minTier: "ultra",
    status: "concept",
  },
  {
    key: "decision-canvas",
    label: "Decision Canvas",
    route: "/decisions",
    description: "Open decisions and their evidence, as a deterministic canvas.",
    minTier: "ultra",
    status: "concept",
  },
];

/** The five that ship. */
export const MVP_SURFACES = SURFACES.filter((s) => s.status !== "concept");
/** Designed and held — rendered behind a post-launch tag, never sold. */
export const CONCEPT_SURFACES = SURFACES.filter((s) => s.status === "concept");

/** Resonance is an enhancer: no row of its own, reached from the Knowledge Canvas. */
export const ENHANCERS = [
  {
    key: "insight-resonance",
    label: "Insight Resonance",
    route: "/resonance",
    description: "Hubs, orphans and co-occurrence — a background read on the same graph.",
  },
];

export const TIER_ENV = "AISUPLEX_TIER";

/** Read server-side. A capability flag, never a license server. */
export function getTier(): Tier {
  return process.env[TIER_ENV] === "free" ? "free" : "ultra";
}

/** Locked (this phase) always gates; otherwise the tier decides. */
export function isSurfaceAvailable(surface: Surface, tier: Tier): boolean {
  if (surface.locked) return false; // retained for future gating; no surface is locked today
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
