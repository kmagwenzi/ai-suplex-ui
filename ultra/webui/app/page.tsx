import { InstrumentRoom } from "@/components/instrument-room";

export const dynamic = "force-dynamic";

/**
 * Knowledge Graph — a scene of the instrument.
 *
 * The room answers a question on the stage; the 1,783-node canvas stays one link
 * away, because a map you cannot read is not evidence.
 */
export default function KnowledgePage() {
  return (
    <div className="flex min-h-full flex-col">
      <InstrumentRoom scene="knowledge" />
      <div className="px-6 py-7 sm:px-9">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="max-w-[62ch] text-[13px] leading-6 text-ink-2">
            Every answer above is composed from the same graph the canvas draws. Open the canvas for
            the whole map rather than one question — a single deterministic file, offline, no network
            at render time.
          </p>
          <div className="flex shrink-0 flex-wrap items-center gap-3">
            {/* Resonance is an enhancer on this graph, not a row of its own. */}
            <a
              href="/resonance"
              className="font-mono text-[11px] text-muted underline decoration-border underline-offset-4 transition-colors hover:text-ink"
            >
              resonance overlay →
            </a>
            <a
              href="/canvas"
              className="inline-flex items-center gap-2 border border-ink px-4 py-2 text-[13px] text-ink transition-colors hover:bg-ink hover:text-bg"
            >
              Open the full canvas
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
