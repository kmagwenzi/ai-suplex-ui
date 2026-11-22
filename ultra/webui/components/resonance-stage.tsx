"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Panel } from "@/components/panel";
import { RESONANCE_QUERIES, type ResonanceQuery } from "@/lib/shell/resonance-shared";

/**
 * Insight Resonance — the surface the $50 gates on.
 *
 * It reads the projection's own embedded data (never a second implementation of the
 * clustering) and composes three answers: what holds the vault together, what is
 * orphaned, and where two focuses already overlap. The canvas stays one link away.
 */

type Payload = {
  ok: true;
  counts: { nodes: number; hubs: number; orphans: number; orphansImported: number; clusters: number; crossFocus: number };
  hubs: { id: number; title: string; type: string; degree: number }[];
  orphans: { id: number; title: string; type: string }[];
  crossFocus: { label: string; size: number; focuses: string[] }[];
};

type State = { status: "loading" } | { status: "error"; message: string } | { status: "ok"; data: Payload };

export function ResonanceStage() {
  const [state, setState] = useState<State>({ status: "loading" });
  const [query, setQuery] = useState<ResonanceQuery>("hubs");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/resonance");
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          if (active) setState({ status: "error", message: body?.error ?? `the route answered ${res.status}` });
          return;
        }
        const data = (await res.json()) as Payload;
        if (active) setState({ status: "ok", data });
      } catch (err) {
        if (active) setState({ status: "error", message: (err as Error).message });
      }
    })();
    return () => { active = false; };
  }, []);

  const view = useMemo(() => {
    if (state.status !== "ok") return null;
    const { counts, hubs, orphans, crossFocus } = state.data;
    const realOrphans = counts.orphans - counts.orphansImported;

    if (query === "hubs") {
      const top = hubs[0];
      const max = Math.max(1, ...hubs.map((h) => h.degree));
      return {
        answer: top
          ? `"${top.title}" carries ${top.degree} recorded links — the strongest hub in a graph of ${counts.nodes} entities. The top ${counts.hubs} hubs are where the vault's meaning actually concentrates.`
          : "This projection recorded no relationships yet.",
        rows: hubs.slice(0, 8).map((h) => ({ key: String(h.id), label: h.title, note: `${h.degree} links`, bar: h.degree / max })),
      };
    }

    if (query === "orphans") {
      return {
        answer: counts.orphans
          ? `${counts.orphans} entities carry no recorded relationship — but ${counts.orphansImported} of those are imported community skills. That leaves ${realOrphans} real orphans: work nothing cites, so nothing can find.`
          : "Every entity carries at least one relationship.",
        rows: orphans.slice(0, 8).map((o) => ({ key: String(o.id), label: o.title || "(untitled)", note: o.type, bar: 0 })),
      };
    }

    const top = crossFocus[0];
    return {
      answer: top
        ? `${counts.crossFocus} clusters span more than one focus. ${top.size} records sit where ${top.focuses.join(" · ")} overlap — that overlap is leverage: one piece of work already paying twice.`
        : "No cluster spans two focus areas yet — the work is filed in silos.",
      rows: crossFocus.slice(0, 8).map((c) => ({ key: c.label, label: c.label, note: `${c.size} records · ${c.focuses.join(" · ")}`, bar: 0 })),
    };
  }, [state, query]);

  return (
    <div className="stage min-h-[560px]" data-scene="resonance">
      <div className="grid gap-8 px-6 py-8 sm:px-9 lg:grid-cols-[228px_minmax(0,1fr)] lg:gap-12 lg:py-10">
        <div className="flex flex-wrap gap-2 lg:hidden">
          {RESONANCE_QUERIES.map((q) => (
            <button
              key={q.id}
              type="button"
              onClick={() => setQuery(q.id)}
              aria-pressed={q.id === query}
              className={
                "border px-2.5 py-1 text-[12px] transition-colors " +
                (q.id === query
                  ? "border-[color:var(--stage-gold)] text-[color:var(--stage-ink)]"
                  : "border-[color:var(--hairline-strong)] text-[color:var(--stage-mut)]")
              }
            >
              {q.label}
            </button>
          ))}
        </div>

        <aside className="hidden flex-col lg:flex">
          <div className="micro mb-2">Resonance</div>
          {RESONANCE_QUERIES.map((q) => {
            const on = q.id === query;
            return (
              <button
                key={q.id}
                type="button"
                onClick={() => setQuery(q.id)}
                aria-pressed={on}
                className={
                  "border-l py-1.5 pl-3 text-left text-[13px] transition-colors " +
                  (on
                    ? "border-[color:var(--stage-gold-hi)] text-[color:var(--stage-gold-hi)]"
                    : "border-[color:var(--hairline-strong)] text-[color:var(--stage-mut)] hover:text-[color:var(--stage-ink)]")
                }
              >
                {q.label}
              </button>
            );
          })}
        </aside>

        <section className="min-w-0">
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 border-b border-[color:var(--hairline)] pb-3">
            <span className="micro">Structural resonance</span>
            <span className="micro">
              {state.status === "ok"
                ? `${state.data.counts.nodes} entities · ${state.data.counts.clusters} clusters`
                : ""}
            </span>
          </div>

          {state.status === "loading" ? (
            <div className="py-24 text-center"><span className="micro">Reading the projection…</span></div>
          ) : state.status === "error" ? (
            <div className="pt-6"><Panel tone="error" title="The resonance data did not answer">{state.message}</Panel></div>
          ) : view ? (
            <div className="grid gap-8 pt-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-12">
              <div className="reveal min-w-0">
                <div className="micro mb-2">Answer</div>
                <p className="display text-[22px] text-[color:var(--stage-ink)] sm:text-[25px]">{view.answer}</p>
                <Link
                  href="/resonance/canvas"
                  className="mt-5 inline-block font-mono text-[11px] text-[color:var(--stage-mut)] underline decoration-[color:var(--hairline-strong)] underline-offset-4 hover:text-[color:var(--stage-ink)]"
                >
                  open the resonance canvas →
                </Link>
              </div>

              <div className="reveal-late min-w-0">
                <div className="micro mb-2">Read</div>
                {view.rows.map((r) => (
                  <div key={r.key} className="border-t border-[color:var(--hairline)] py-2">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="min-w-0 truncate text-[12px] text-[color:var(--stage-cream)]" title={r.label}>{r.label}</span>
                      <span className="shrink-0 font-mono text-[10px] text-[color:var(--stage-mut)]">{r.note}</span>
                    </div>
                    {r.bar > 0 ? (
                      <div className="mt-1.5 h-[2px] w-full bg-[color:var(--hairline)]">
                        <div className="h-full" style={{ width: `${Math.round(r.bar * 100)}%`, background: "var(--stage-gold-hi)" }} />
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
