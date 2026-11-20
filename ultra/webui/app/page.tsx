import { KnowledgeRoom } from "@/components/knowledge-room";

export const dynamic = "force-dynamic";

/**
 * The Knowledge surface opens with a composed answer, not a canvas.
 *
 * 1,783 entities is a hairball at any zoom; the room asks a question first and the full
 * projection stays one link away — the same contract as every other surface here.
 */
export default function KnowledgePage() {
  return (
    <div className="flex min-h-full flex-col">
      <KnowledgeRoom />
      <div className="px-6 py-8 sm:px-9">
        <h2 className="text-[15px] font-semibold text-ink">The projection underneath</h2>
        <p className="mt-1 max-w-[62ch] text-[13px] leading-6 text-ink-2">
          Every room above is composed from the same graph the canvas draws. Open the canvas when
          you want the whole map rather than an answer — it is a single deterministic file, offline,
          no network at render time.
        </p>
        <a
          href="/canvas"
          className="mt-4 inline-flex items-center gap-2 border border-ink px-4 py-2 text-[13px] text-ink transition-colors hover:bg-ink hover:text-bg"
        >
          Open the full canvas
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </a>
      </div>
    </div>
  );
}
