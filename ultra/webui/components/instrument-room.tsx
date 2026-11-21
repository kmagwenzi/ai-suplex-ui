"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Panel } from "@/components/panel";
import type { RoomEdge, RoomGraph, RoomNode } from "@/lib/shell/opportunity-room";
import { QUERIES, runQuery, type QueryId } from "@/lib/shell/opportunity-room";
import { KNOWLEDGE_QUERIES, runKnowledge, type KnowledgeQuery } from "@/lib/shell/knowledge-room";

/**
 * The instrument — one stage, two scenes.
 *
 * Adapted from the Ultra showcase: navy night, a hairline lattice, mono micro-labels,
 * a serif display line carrying the answer, and the graph drawn as the retrieval itself.
 * The shell stays paper; this is the depth you look *into*.
 */

type Scene = "knowledge" | "opportunity";

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ok"; graph: RoomGraph };

const SCENES: { id: Scene; label: string; href: string }[] = [
  { id: "knowledge", label: "Knowledge Graph", href: "/" },
  { id: "opportunity", label: "Opportunity Mapper", href: "/opportunity" },
];

// A narrow viewBox keeps the mono labels at a readable size once the SVG is scaled
// into a column — at 860 units wide they rendered at ~5px.
const W = 620;
const H = 380;

/** Deterministic two-ring layout: the loaded nodes inside, the rest on the rim. */
function StageGraph({ nodes, edges }: { nodes: RoomNode[]; edges: RoomEdge[] }) {
  const degree = useMemo(() => {
    const d = new Map<string, number>();
    for (const e of edges) {
      d.set(e.from, (d.get(e.from) ?? 0) + 1);
      d.set(e.to, (d.get(e.to) ?? 0) + 1);
    }
    return d;
  }, [edges]);

  const ranked = useMemo(
    () => nodes.slice().sort((a, b) => (degree.get(b.id) ?? 0) - (degree.get(a.id) ?? 0) || a.id.localeCompare(b.id)),
    [nodes, degree],
  );

  const inner = ranked.slice(0, Math.min(5, ranked.length));
  const outer = ranked.slice(inner.length);
  const cx = W / 2;
  const cy = H / 2;
  const pos = new Map<string, { x: number; y: number; r: number; node: RoomNode }>();

  inner.forEach((n, i) => {
    const a = (2 * Math.PI * i) / Math.max(1, inner.length) - Math.PI / 2;
    pos.set(n.id, { x: cx + 108 * Math.cos(a), y: cy + 74 * Math.sin(a), r: 6 + Math.min(5, degree.get(n.id) ?? 0), node: n });
  });
  outer.forEach((n, i) => {
    const a = (2 * Math.PI * i) / Math.max(1, outer.length) - Math.PI / 2 + 0.32;
    pos.set(n.id, { x: cx + 252 * Math.cos(a), y: cy + 148 * Math.sin(a), r: 3.4, node: n });
  });

  const labelled = new Set(ranked.slice(0, 8).map((n) => n.id));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="The retrieved subgraph" className="h-auto w-full">
      {edges.map((e, i) => {
        const a = pos.get(e.from);
        const b = pos.get(e.to);
        if (!a || !b) return null;
        return (
          <line
            key={e.from + e.to + i}
            x1={a.x}
            y1={a.y}
            x2={b.x}
            y2={b.y}
            stroke="rgba(148,163,184,0.24)"
            strokeWidth={0.9}
            className="edge-draw"
            style={{ animationDelay: `${Math.min(500, i * 14)}ms` }}
          />
        );
      })}
      {Array.from(pos.values()).map((p) => (
        <g key={p.node.id}>
          <circle cx={p.x} cy={p.y} r={p.r} fill={labelled.has(p.node.id) ? "var(--stage-gold-hi)" : "rgba(241,245,249,0.5)"} />
          {labelled.has(p.node.id) ? (
            <text x={p.x} y={p.y + p.r + 15} textAnchor="middle" fill="var(--stage-mut)" fontSize={9.5} className="font-mono">
              {p.node.label.length > 32 ? p.node.label.slice(0, 31) + "…" : p.node.label}
            </text>
          ) : null}
          <title>{p.node.label}</title>
        </g>
      ))}
    </svg>
  );
}

/** A chain is a trace, not a scatter: two dots on a canvas say nothing about the hops. */
function ChainTrace({ nodes, edges }: { nodes: RoomNode[]; edges: RoomEdge[] }) {
  return (
    <ol className="mt-1">
      {nodes.map((n, i) => {
        const next = nodes[i + 1];
        const rel = next
          ? edges.find((e) => (e.from === n.id && e.to === next.id) || (e.to === n.id && e.from === next.id))?.rel
          : null;
        return (
          <li key={n.id} className="border-t border-[color:var(--hairline)] py-3 first:border-t-0">
            <span className="micro">{i === 0 ? "start" : `hop ${i}`}</span>
            <span className="mt-1 block text-[13px] leading-5 text-[color:var(--stage-ink)]">{n.label}</span>
            {next ? <span className="mt-1.5 block font-mono text-[10px] text-[color:var(--stage-gold-hi)]">↓ {rel ?? "edge"}</span> : null}
          </li>
        );
      })}
    </ol>
  );
}

export function InstrumentRoom({ scene }: { scene: Scene }) {
  const questions = scene === "knowledge" ? KNOWLEDGE_QUERIES : QUERIES;
  const [state, setState] = useState<State>({ status: "loading" });
  const [question, setQuestion] = useState<string>(questions[0].id);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const endpoint = scene === "knowledge" ? "/api/graph/knowledge-graph" : "/api/graph/opportunities";
        const res = await fetch(endpoint);
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          if (active) setState({ status: "error", message: body?.error ?? `the graph route answered ${res.status}` });
          return;
        }
        const graph = (await res.json()) as RoomGraph;
        if (active) setState({ status: "ok", graph });
      } catch (err) {
        if (active) setState({ status: "error", message: (err as Error).message });
      }
    })();
    return () => { active = false; };
  }, [scene]);

  const result = useMemo(() => {
    if (state.status !== "ok") return null;
    return scene === "knowledge"
      ? runKnowledge(state.graph, question as KnowledgeQuery)
      : runQuery(state.graph, question as QueryId, Date.now());
  }, [state, scene, question]);

  return (
    <div className="stage min-h-[540px]" data-scene={scene}>
      <div className="grid gap-8 px-6 py-8 sm:px-9 lg:grid-cols-[228px_minmax(0,1fr)] lg:gap-12 lg:py-10">
        {/* ── control rail ─────────────────────────────────────────── */}
        <aside className="flex flex-col">
          <div className="micro mb-2">Scene</div>
          {SCENES.map((s) => {
            const on = s.id === scene;
            return (
              <Link
                key={s.id}
                href={s.href}
                aria-current={on ? "page" : undefined}
                className={
                  "border-l py-1.5 pl-3 text-[13px] transition-colors " +
                  (on
                    ? "border-[color:var(--stage-gold)] bg-[rgba(184,134,46,0.07)] text-[color:var(--stage-ink)]"
                    : "border-[color:var(--hairline-strong)] text-[color:var(--stage-mut)] hover:text-[color:var(--stage-ink)]")
                }
              >
                {s.label}
              </Link>
            );
          })}

          <div className="micro mb-2 mt-7">Questions</div>
          {questions.map((q) => {
            const on = q.id === question;
            return (
              <button
                key={q.id}
                type="button"
                onClick={() => setQuestion(q.id)}
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

        {/* ── the stage ────────────────────────────────────────────── */}
        <section className="min-w-0">
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 border-b border-[color:var(--hairline)] pb-3">
            <span className="micro">Retrieval graph</span>
            <span className="micro flex items-center gap-5">
              {state.status === "ok" ? (
                <span className="hidden sm:inline">
                  {state.graph.nodes.length} nodes · {state.graph.edges.length} edges
                </span>
              ) : null}
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: "var(--stage-gold-hi)" }} />
                matched
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: "rgba(241,245,249,0.5)" }} />
                reached
              </span>
            </span>
          </div>

          {state.status === "loading" ? (
            <div className="py-20 text-center"><span className="micro">Resolving the graph…</span></div>
          ) : state.status === "error" ? (
            <div className="pt-6"><Panel tone="error" title="The graph did not answer">{state.message}</Panel></div>
          ) : result ? (
            // The stage column is explicitly floored: with a bare 1fr it collapsed to
            // ~220px and the mono node labels became unreadable.
            <div className="grid gap-8 pt-6 lg:grid-cols-[minmax(0,1fr)_minmax(340px,460px)] lg:gap-10">
              <div className="reveal min-w-0">
                <p className="display text-[23px] text-[color:var(--stage-ink)] sm:text-[26px]">{result.answer}</p>

                {result.query !== "connect" && result.evidence.length > 0 ? (
                  <dl className="mt-6">
                    {result.evidence.map((e) => (
                      <div key={e.id} className="grid gap-x-4 gap-y-0.5 border-t border-[color:var(--hairline)] py-2 sm:grid-cols-[104px_minmax(0,1fr)]">
                        <dt className="font-mono text-[10px] leading-5 text-[color:var(--stage-mut)]">{e.why}</dt>
                        <dd className="min-w-0 text-[12.5px] leading-5 text-[color:var(--stage-cream)]">{e.label}</dd>
                      </div>
                    ))}
                  </dl>
                ) : null}
              </div>

              <div className="reveal-late min-w-0 self-start">
                {result.query === "connect" ? (
                  <ChainTrace nodes={result.visited.nodes} edges={result.visited.edges} />
                ) : result.visited.nodes.length > 2 ? (
                  <StageGraph nodes={result.visited.nodes} edges={result.visited.edges} />
                ) : null}
              </div>
            </div>
          ) : (
            <div className="py-20 text-center"><span className="micro">Nothing to light for this question</span></div>
          )}
        </section>
      </div>
    </div>
  );
}
