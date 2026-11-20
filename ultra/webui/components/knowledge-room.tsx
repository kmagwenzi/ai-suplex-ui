"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Panel } from "@/components/panel";
import type { RoomGraph, RoomNode, RoomEdge } from "@/lib/shell/opportunity-room";
import { KNOWLEDGE_QUERIES, runKnowledge, type KnowledgeQuery, type KnowledgeResult } from "@/lib/shell/knowledge-room";

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ok"; graph: RoomGraph };

const W = 560;
const H = 260;

function short(label: string, n = 30): string {
  return label.length > n ? label.slice(0, n - 1) + "…" : label;
}

/** A chain: what connects A to B, drawn as the hops it actually takes. */
function ChainView({ nodes, edges }: { nodes: RoomNode[]; edges: RoomEdge[] }) {
  const n = Math.max(1, nodes.length);
  const step = (W - 120) / Math.max(1, n - 1);
  const pts = nodes.map((node, i) => ({ node, x: 60 + i * step, y: H / 2 }));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="The recorded path" className="w-full">
      {pts.slice(0, -1).map((p, i) => {
        const q = pts[i + 1];
        const rel = edges.find((e) => (e.from === p.node.id && e.to === q.node.id) || (e.to === p.node.id && e.from === q.node.id));
        return (
          <g key={p.node.id + q.node.id}>
            <line x1={p.x + 9} y1={p.y} x2={q.x - 9} y2={q.y} stroke="currentColor" className="text-border-strong" strokeWidth={1} />
            <text x={(p.x + q.x) / 2} y={p.y - 12} textAnchor="middle" className="fill-muted font-mono" fontSize={8}>
              {rel?.rel ?? "—"}
            </text>
          </g>
        );
      })}
      {pts.map((p) => (
        <g key={p.node.id}>
          <circle cx={p.x} cy={p.y} r={9} className="fill-ink" opacity={0.9} />
          <text x={p.x} y={p.y + 30} textAnchor="middle" className="fill-ink-2" fontSize={9}>
            {short(p.node.label, 22)}
          </text>
          <title>{p.node.label}</title>
        </g>
      ))}
    </svg>
  );
}

/** A hub and its spokes: what carries the most edges. */
function HubView({ nodes, edges }: { nodes: RoomNode[]; edges: RoomEdge[] }) {
  if (nodes.length === 0) return null;
  const [hub, ...spokes] = nodes;
  const cx = W / 2;
  const cy = H / 2;
  const r = Math.min(W, H) / 2 - 46;
  const pos = spokes.map((s, i) => {
    const a = (2 * Math.PI * i) / Math.max(1, spokes.length) - Math.PI / 2;
    return { s, x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
  });
  const linked = new Set(edges.map((e) => e.from + "|" + e.to));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="The leading hubs" className="w-full">
      {pos.map((p) => (
        <line
          key={p.s.id}
          x1={cx}
          y1={cy}
          x2={p.x}
          y2={p.y}
          stroke="currentColor"
          className={linked.has(hub.id + "|" + p.s.id) || linked.has(p.s.id + "|" + hub.id) ? "text-accent" : "text-border"}
          strokeWidth={1}
        />
      ))}
      <circle cx={cx} cy={cy} r={13} className="fill-ink" />
      <text x={cx} y={cy + 30} textAnchor="middle" className="fill-ink" fontSize={10}>
        {short(hub.label, 26)}
      </text>
      {pos.map((p) => (
        <g key={p.s.id}>
          <circle cx={p.x} cy={p.y} r={5.5} className="fill-ink-2" />
          <text x={p.x} y={p.y + 18} textAnchor="middle" className="fill-muted" fontSize={8}>
            {short(p.s.label, 20)}
          </text>
          <title>{p.s.label}</title>
        </g>
      ))}
    </svg>
  );
}

/** A timeline: what was recorded, newest first. */
function TimelineView({ nodes }: { nodes: RoomNode[] }) {
  const rowH = Math.min(30, (H - 20) / Math.max(1, nodes.length));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="The newest work" className="w-full">
      <line x1={70} y1={12} x2={70} y2={12 + rowH * nodes.length} stroke="currentColor" className="text-border-strong" strokeWidth={1} />
      {nodes.map((n, i) => (
        <g key={n.id}>
          <circle cx={70} cy={16 + i * rowH} r={3.5} className="fill-ink" />
          <text x={60} y={19 + i * rowH} textAnchor="end" className="fill-muted font-mono" fontSize={8}>
            {n.date ?? ""}
          </text>
          <text x={84} y={19 + i * rowH} className="fill-ink-2" fontSize={9}>
            {short(n.label, 54)}
          </text>
          <title>{n.label}</title>
        </g>
      ))}
    </svg>
  );
}

/**
 * The path as a trace, not a canvas: two dots and a line across 380px told the reader
 * nothing. A chain reads in column, at any width, and names the relation on each hop.
 */
function ChainTrace({ nodes, edges }: { nodes: RoomNode[]; edges: RoomEdge[] }) {
  return (
    <ol className="border-t border-border">
      {nodes.map((n, i) => {
        const next = nodes[i + 1];
        const rel = next
          ? edges.find((e) => (e.from === n.id && e.to === next.id) || (e.to === n.id && e.from === next.id))?.rel
          : null;
        return (
          <li key={n.id} className="border-b border-border py-2">
            <span className="font-mono text-[10px] text-muted">{i === 0 ? "start" : `hop ${i}`}</span>
            <span className="mt-0.5 block text-[13px] leading-5 text-ink">{n.label}</span>
            {next ? (
              <span className="mt-1 block font-mono text-[10px] text-muted">↓ {rel ?? "edge"}</span>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

function Chart({ result }: { result: KnowledgeResult }) {
  if (result.visited.nodes.length === 0) return null;
  if (result.query === "connect") return <ChainTrace nodes={result.visited.nodes} edges={result.visited.edges} />;
  if (result.query === "hubs") return <HubView nodes={result.visited.nodes} edges={result.visited.edges} />;
  return <TimelineView nodes={result.visited.nodes} />;
}

export function KnowledgeRoom() {
  const [state, setState] = useState<State>({ status: "loading" });
  const [query, setQuery] = useState<KnowledgeQuery>("connect");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/graph/knowledge-graph");
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
  }, []);

  const result = useMemo(() => (state.status === "ok" ? runKnowledge(state.graph, query) : null), [state, query]);

  if (state.status === "loading") {
    return <div className="px-6 py-8 font-mono text-[12px] text-muted">reading the graph…</div>;
  }
  if (state.status === "error") {
    return (
      <div className="px-6 py-8">
        <Panel tone="error" title="The graph did not answer">
          <code className="font-mono text-[12px]">GET /api/graph/knowledge-graph</code> — {state.message}
        </Panel>
      </div>
    );
  }

  return (
    <section className="border-b border-border">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 px-6 pt-6 sm:px-9">
        <h2 className="text-[19px] font-semibold tracking-tight text-ink">The vault, asked a question</h2>
        <span className="font-mono text-[11px] text-muted">
          {state.graph.nodes.length} nodes · {state.graph.edges.length} edges · composed from recorded edges
        </span>
      </div>

      <div className="flex flex-wrap gap-2 px-6 pt-4 sm:px-9">
        {KNOWLEDGE_QUERIES.map((q) => {
          const on = q.id === query;
          return (
            <button
              key={q.id}
              type="button"
              onClick={() => setQuery(q.id)}
              aria-pressed={on}
              className={
                "border px-3 py-1.5 text-[13px] transition-colors " +
                (on ? "border-ink bg-ink text-bg" : "border-border text-ink-2 hover:border-ink-2 hover:text-ink")
              }
            >
              {q.label}
            </button>
          );
        })}
      </div>

      {result ? (
        <div className="grid gap-x-10 gap-y-6 px-6 py-6 sm:grid-cols-[minmax(0,1fr)_380px] sm:px-9">
          <div>
            <p className="max-w-[62ch] text-[18px] leading-[1.55] text-ink">{result.answer}</p>
            {/* A chain already reads as its own evidence — printing the same two nodes
                twice, once as rows and once as a trace, is noise, not proof. */}
            {result.query !== "connect" && result.evidence.length > 0 ? (
              <dl className="mt-5 border-t border-border">
                {result.evidence.map((e) => (
                  <div key={e.id} className="flex gap-4 border-b border-border py-2">
                    <dt className="w-[92px] shrink-0 font-mono text-[11px] leading-5 text-muted">{e.why}</dt>
                    <dd className="min-w-0 text-[13px] leading-5 text-ink-2">{e.label}</dd>
                  </div>
                ))}
              </dl>
            ) : null}
          </div>
          <div className="min-w-0 text-ink">
            <Chart result={result} />
            <Link
              href="/canvas"
              className="mt-3 inline-block font-mono text-[11px] text-muted underline decoration-border underline-offset-4 hover:text-ink"
            >
              open the full canvas →
            </Link>
          </div>
        </div>
      ) : null}
    </section>
  );
}
