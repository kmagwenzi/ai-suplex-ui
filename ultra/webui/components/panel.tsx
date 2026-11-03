import type { ReactNode } from "react";

export type PanelTone = "error" | "gate" | "empty" | "info";

const TONE = {
  error: {
    wrap: "border-error/40",
    title: "text-error",
    glyph: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
        <path d="M12 9v4M12 17h.01" />
      </svg>
    ),
  },
  gate: {
    wrap: "border-attention/40",
    title: "text-attention",
    glyph: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <rect x="3" y="11" width="18" height="11" rx="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    ),
  },
  empty: {
    wrap: "border-border border-dashed",
    title: "text-muted",
    glyph: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <circle cx="12" cy="12" r="9" />
      </svg>
    ),
  },
  info: {
    wrap: "border-border",
    title: "text-ink",
    glyph: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 8h.01M11 12h1v4h1" />
      </svg>
    ),
  },
} as const;

/**
 * The one error/empty/gate panel primitive. Flat: a 1px border on the surface,
 * a tinted title, a drawn glyph — no shadow, no thick coloured left border.
 */
export function Panel({
  tone = "info",
  title,
  children,
}: {
  tone?: PanelTone;
  title: string;
  children?: ReactNode;
}) {
  const t = TONE[tone];
  return (
    <div role={tone === "error" || tone === "gate" ? "alert" : undefined} className={`rounded-lg border bg-surface p-5 ${t.wrap}`}>
      <div className="flex items-start gap-3">
        <span className={`mt-0.5 shrink-0 ${t.title}`}>{t.glyph}</span>
        <div className="min-w-0">
          <h2 className={`text-sm font-semibold ${t.title}`}>{title}</h2>
          {children ? <div className="mt-1 text-sm leading-relaxed text-muted">{children}</div> : null}
        </div>
      </div>
    </div>
  );
}
