"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

/**
 * Resonance, as an enhancer rather than a surface.
 *
 * It reads /api/resonance — the projection's own numbers — and states the one thing the
 * graph cannot say about itself: how much of the record is unconnected, and where two
 * focuses already overlap. One line, two figures, one way in.
 */
type Counts = { nodes: number; hubs: number; orphans: number; orphansImported: number; clusters: number; crossFocus: number };

export function ResonanceEnhancer({ context }: { context: "opportunity" | "knowledge" }) {
  const [counts, setCounts] = useState<Counts | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/resonance");
        if (!res.ok) throw new Error(String(res.status));
        const body = (await res.json()) as { counts: Counts };
        if (active) setCounts(body.counts);
      } catch {
        if (active) setFailed(true);
      }
    })();
    return () => { active = false; };
  }, []);

  if (failed) return null;

  const realOrphans = counts ? counts.orphans - counts.orphansImported : null;

  return (
    <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1 border-t border-border px-6 py-3 sm:px-9">
      <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">Resonance</span>
      {counts ? (
        <>
          <span className="font-mono text-[11px] text-ink-2">
            {realOrphans} unconnected record{realOrphans === 1 ? "" : "s"}
            <span className="text-muted"> · {counts.orphansImported} imported</span>
          </span>
          <span className="font-mono text-[11px] text-ink-2">
            {counts.crossFocus} cross-focus cluster{counts.crossFocus === 1 ? "" : "s"}
          </span>
        </>
      ) : (
        <span className="font-mono text-[11px] text-muted">reading…</span>
      )}
      <Link
        href="/resonance"
        className="ml-auto font-mono text-[10.5px] text-muted underline decoration-border underline-offset-4 transition-colors hover:text-ink"
      >
        {context === "opportunity" ? "what is not connected →" : "resonance overlay →"}
      </Link>
    </div>
  );
}
