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
 * Layout follows the Ultra showcase: a control rail, a retrieval canvas, then the answer
 * with its evidence beneath it. The showcase's SCORE/LESSON came from an LLM judge; this
 * stage has no model, so that block is the evidence the answer actually read.
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

// A narrow viewBox keeps the mono labels readable once the SVG scales into the stage.
const W = 760;
const H = 360;

/**
 * The whole scene, always drawn — the answer is a highlight, not a replacement.
 *
 * Drawing only the visited subgraph made an empty canvas whenever the answer was a path.
 * So: every node in the export sits on the stage, laid out in three rings by degree; the
 * ones the question matched burn gold and the edges between them light up. That is what
 * "the graph is the retrieval, visible as it resolves" looks like when it is true.
 */
function StageGraph({
  nodes,
  edges,
  matched,
}: {
  nodes: RoomNode[];
  edges: RoomEdge[];
  matched: Set<string>;
}) {
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

  // One hub at the centre, then three rings outward. An empty middle made the scene
  // read as a starfield with a hole in it; the graph's most connected node anchors it.
  const hub = ranked.slice(0, 1);
  const ring1 = ranked.slice(1, 8);
  const ring2 = ranked.slice(8, 26);
  const ring3 = ranked.slice(26);
  const cx = W / 2;
  const cy = H / 2;
  const pos = new Map<string, { x: number; y: number; r: number; node: RoomNode }>();

  const place = (list: RoomNode[], rx: number, ry: number, base: number, offset: number) => {
    list.forEach((n, i) => {
      const a = (2 * Math.PI * i) / Math.max(1, list.length) - Math.PI / 2 + offset;
      const hot = matched.has(n.id);
      pos.set(n.id, {
        x: cx + rx * Math.cos(a),
        y: cy + ry * Math.sin(a),
        r: hot ? 5.6 + Math.min(4, degree.get(n.id) ?? 0) : base,
        node: n,
      });
    });
  };

  place(hub, 0, 0, 7, 0);
  place(ring1, 96, 62, 4.6, 0);
  place(ring2, 200, 116, 3.2, 0.32);
  place(ring3, 296, 156, 2.6, 0.68);

  // Only matched nodes carry labels: a name on every dot is a word cloud, not a map.
  const labelled = new Set(ranked.filter((n) => matched.has(n.id)).slice(0, 6).map((n) => n.id));

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
            stroke={matched.has(e.from) && matched.has(e.to) ? "rgba(212,169,79,0.55)" : "rgba(148,163,184,0.15)"}
            strokeWidth={matched.has(e.from) && matched.has(e.to) ? 1.1 : 0.6}
            className="edge-draw"
            style={{ animationDelay: `${Math.min(500, i * 10)}ms` }}
          />
        );
      })}
      {Array.from(pos.values()).map((p) => (
        <g key={p.node.id}>
          <circle
            cx={p.x}
            cy={p.y}
            r={p.r}
            fill={matched.has(p.node.id) ? "var(--stage-gold-hi)" : "rgba(241,245,249,0.42)"}
          />
          {labelled.has(p.node.id) ? (
            <text x={p.x} y={p.y + p.r + 15} textAnchor="middle" fill="var(--stage-mut)" fontSize={10} className="font-mono">
              {p.node.label.length > 26 ? p.node.label.slice(0, 25) + "…" : p.node.label}
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
    <ol>
      {nodes.map((n, i) => {
        const next = nodes[i + 1];
        const rel = next
          ? edges.find((e) => (e.from === n.id && e.to === next.id) || (e.to === n.id && e.from === next.id))?.rel
          : null;
        return (
          <li key={n.id} className="border-t border-[color:var(--hairline)] py-3">
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
  const [term, setTerm] = useState("");
  const [draft, setDraft] = useState("");

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
      ? runKnowledge(state.graph, question as KnowledgeQuery, term)
      : runQuery(state.graph, question as QueryId, Date.now());
  }, [state, scene, question, term]);

  const ask = (value: string) => {
    const v = value.trim();
    if (!v) return;
    setTerm(v);
    setQuestion("search");
  };

  return (
    <div className="stage min-h-[560px]" data-scene={scene}>
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
                onClick={() => { setQuestion(q.id); setTerm(""); }}
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

          {scene === "knowledge" ? (
            <form
              className="mt-4 flex items-center gap-3 border-b border-[color:var(--hairline-strong)] pb-2"
              onSubmit={(e) => { e.preventDefault(); ask(draft); }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden className="shrink-0 text-[color:var(--stage-mut)]">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="ask your own — a word from the vault's titles"
                aria-label="Search the knowledge graph"
                className="w-full bg-transparent text-[14px] text-[color:var(--stage-ink)] placeholder:text-[color:var(--stage-mut)]/60 focus:outline-none"
              />
              {draft ? (
                <button type="submit" className="micro shrink-0 hover:text-[color:var(--stage-gold-hi)]">
                  Run →
                </button>
              ) : null}
            </form>
          ) : null}

          {state.status === "loading" ? (
            <div className="py-24 text-center"><span className="micro">Resolving the graph…</span></div>
          ) : state.status === "error" ? (
            <div className="pt-6"><Panel tone="error" title="The graph did not answer">{state.message}</Panel></div>
          ) : result ? (
            <>
              <div className="reveal py-6">
                <StageGraph
                  nodes={state.graph.nodes}
                  edges={state.graph.edges}
                  matched={new Set(result.visited.nodes.map((n) => n.id))}
                />
              </div>

              <div className="reveal-late grid gap-8 border-t border-[color:var(--hairline)] pt-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-12">
                <div className="min-w-0">
                  <div className="micro mb-2">Answer</div>
                  <p className="display text-[22px] text-[color:var(--stage-ink)] sm:text-[25px]">{result.answer}</p>
                </div>

                <div className="min-w-0">
                  <div className="micro mb-2">
                    {result.query === "connect" ? "Path" : result.query === "search" ? "Read" : "Evidence"}
                  </div>
                  {result.query === "connect" ? (
                    <ChainTrace nodes={result.visited.nodes} edges={result.visited.edges} />
                  ) : result.evidence.length > 0 ? (
                    <dl>
                      {result.evidence.slice(0, 6).map((e) => (
                        <div key={e.id} className="flex gap-3 border-t border-[color:var(--hairline)] py-1.5 first:border-t-0">
                          <dt className="w-[68px] shrink-0 font-mono text-[10px] leading-5 text-[color:var(--stage-mut)]">{e.why}</dt>
                          <dd className="min-w-0 truncate text-[12px] leading-5 text-[color:var(--stage-cream)]" title={e.label}>
                            {e.label}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  ) : (
                    <p className="text-[12px] leading-5 text-[color:var(--stage-mut)]">
                      This answer reads a path rather than a list — the hops are the evidence.
                    </p>
                  )}
                </div>
              </div>
            </>
          ) : null}
        </section>
      </div>
    </div>
  );
}
