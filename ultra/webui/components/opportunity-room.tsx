"use client";

import { useEffect, useMemo, useState } from "react";
import { Panel } from "@/components/panel";
import {
  QUERIES,
  runQuery,
  type QueryId,
  type RoomEdge,
  type RoomGraph,
  type RoomNode,
} from "@/lib/shell/opportunity-room";

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ok"; graph: RoomGraph };

const W = 640;
const H = 300;

function GraphView({ nodes, edges }: { nodes: RoomNode[]; edges: RoomEdge[] }) {
  const cx = W / 2;
  const cy = H / 2;
  const radius = Math.min(W, H) / 2 - 52;
  const count = Math.max(1, nodes.length);
  const at = new Map(
    nodes.map((n, i) => {
      const a = (2 * Math.PI * i) / count - Math.PI / 2;
      return [n.id, { x: cx + radius * Math.cos(a), y: cy + radius * Math.sin(a), node: n }];
    }),
  );

  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="The visited subgraph" className="w-full">
      {edges.map((e, i) => {
        const a = at.get(e.from);
        const b = at.get(e.to);
        if (!a || !b) return null;
        return (
          <line
            key={e.from + "-" + e.to + "-" + i}
            x1={a.x}
            y1={a.y}
            x2={b.x}
            y2={b.y}
            className="stroke-border"
            strokeWidth={1}
          />
        );
      })}
      {Array.from(at.values()).map((p) => (
        <g key={p.node.id}>
          <circle cx={p.x} cy={p.y} r={7} className="fill-ink" opacity={0.85} />
          <text
            x={p.x}
            y={p.y + 20}
            textAnchor="middle"
            className="fill-muted font-mono"
            fontSize={9}
          >
            {p.node.label.length > 26 ? p.node.label.slice(0, 25) + "…" : p.node.label}
          </text>
          <title>{p.node.type + " · " + p.node.label}</title>
        </g>
      ))}
    </svg>
  );
}

/**
 * The Opportunity room: a chip, a rule, a sentence, the nodes it cited.
 *
 * It reads /api/graph/opportunities — the vault's own graph, exported per request —
 * and never calls a model. Everything on screen is composed from edges that were
 * recorded, which is what makes the answer defensible.
 */
export function OpportunityRoom() {
  const [state, setState] = useState<State>({ status: "loading" });
  const [query, setQuery] = useState<QueryId>("overdue");
  // One clock per mount, so a re-render cannot change "3 days old" mid-read.
  const [now] = useState(() => Date.now());

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/graph/opportunities");
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          if (active) {
            setState({
              status: "error",
              message: body?.error ?? `the graph route answered ${res.status}`,
            });
          }
          return;
        }
        const graph = (await res.json()) as RoomGraph;
        if (active) setState({ status: "ok", graph });
      } catch (err) {
        if (active) setState({ status: "error", message: (err as Error).message });
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const result = useMemo(
    () => (state.status === "ok" ? runQuery(state.graph, query, now) : null),
    [state, query, now],
  );

  if (state.status === "loading") {
    return (
      <div className="px-5 py-5 sm:px-8">
        <p className="font-mono text-[12px] text-muted">reading the graph…</p>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="px-5 py-5 sm:px-8">
        <Panel tone="error" title="The graph did not answer">
          <code className="font-mono text-[12px]">GET /api/graph/opportunities</code> — {state.message}
        </Panel>
      </div>
    );
  }

  return (
    <div className="border-b border-border">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 px-5 pt-4 sm:px-8">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">The room</h2>
        <span className="font-mono text-[12px] text-ink-2">
          {state.graph.nodes.length} nodes · {state.graph.edges.length} edges · composed, no model
        </span>
      </div>

      <div className="flex flex-wrap gap-2 px-5 pt-3 sm:px-8">
        {QUERIES.map((q) => {
          const on = q.id === query;
          return (
            <button
              key={q.id}
              type="button"
              onClick={() => setQuery(q.id)}
              aria-pressed={on}
              className={
                "border px-3 py-1.5 font-mono text-[12px] transition-colors " +
                (on
                  ? "border-attention text-attention"
                  : "border-border text-ink-2 hover:border-ink-2 hover:text-ink")
              }
            >
              {q.label}
            </button>
          );
        })}
      </div>

      {result ? (
        <div className="grid gap-x-8 gap-y-4 px-5 py-4 sm:grid-cols-[1fr_auto] sm:px-8">
          <div>
            <p className="max-w-[68ch] text-[15px] leading-relaxed text-ink">{result.answer}</p>

            {result.evidence.length > 0 ? (
              <ul className="mt-3 space-y-1 border-l-2 border-border pl-3">
                {result.evidence.map((e) => (
                  <li key={e.id} className="text-[12px] text-ink-2">
                    <span className="font-mono text-muted">{e.why}</span>
                    <span className="mx-2 text-muted">·</span>
                    {e.label}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <div className="min-w-0 sm:w-[420px]">
            <GraphView nodes={result.visited.nodes} edges={result.visited.edges} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
