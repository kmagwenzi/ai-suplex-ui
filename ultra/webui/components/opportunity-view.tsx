"use client";

import { useEffect, useState } from "react";
import { Panel } from "@/components/panel";

interface PipelineRow { focus: string; total: number; count: number }
interface OverdueRow { counterparty: string; focus: string; channel: string; expected_value: number; follow_up_at: string }
interface ChannelRow { channel: string; won: number; replied: number; total: number; rate: number }
interface UnderutilizedRow { focus: string; bBombCount: number }
interface PriceBandRow { focus: string; min: number; median: number; max: number }

interface OpportunityData {
  pipeline: PipelineRow[];
  overdue: OverdueRow[];
  channels: ChannelRow[];
  underutilized: UnderutilizedRow[];
  priceBands: PriceBandRow[];
}

type State =
  | { status: "loading" }
  | { status: "error"; command: string; message: string }
  | { status: "ok"; data: OpportunityData };

function fmtInt(n: number): string {
  return n.toLocaleString("en-US");
}

function fmtRate(r: number): string {
  return `${(r * 100).toFixed(1).replace(/\.0$/, "")}%`;
}

const TH = "px-3 py-1.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted";
const TD = "px-3 py-1.5 text-[13px]";
const TDN = "px-3 py-1.5 text-right text-[13px] num";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="px-5 py-5 sm:px-8">
      <h2 className="text-sm font-semibold text-ink">{title}</h2>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full border-collapse">
          {children}
        </table>
      </div>
    </section>
  );
}

function EmptyRow({ colSpan }: { colSpan: number }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-3 py-1.5 text-[13px] text-muted">
        none
      </td>
    </tr>
  );
}

export function OpportunityView() {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/surface/opportunity");
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          if (active) {
            setState({
              status: "error",
              command: body?.command ?? "node Tools/opportunity.js --json",
              message: body?.message ?? body?.error ?? `HTTP ${res.status}`,
            });
          }
          return;
        }
        const data = (await res.json()) as OpportunityData;
        if (active) setState({ status: "ok", data });
      } catch (err) {
        if (active) setState({ status: "error", command: "node Tools/opportunity.js --json", message: String(err) });
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  if (state.status === "loading") {
    return <p className="px-5 py-5 text-sm text-muted sm:px-8">Loading Opportunity Mapper…</p>;
  }

  if (state.status === "error") {
    return (
      <div className="p-6">
        <Panel tone="error" title="Opportunity Mapper — tool failed">
          <code className="font-mono text-[13px]">{state.command}</code> — {state.message}.
        </Panel>
      </div>
    );
  }

  const { data } = state;

  return (
    <div className="divide-y divide-border">
      {/* 1 · Open pipeline */}
      <Section title="Open pipeline">
        <thead>
          <tr className="border-b border-border">
            <th className={TH}>Focus</th>
            <th className={`${TH} text-right`}>Total</th>
            <th className={`${TH} text-right`}>Count</th>
          </tr>
        </thead>
        <tbody>
          {data.pipeline.length === 0 ? (
            <EmptyRow colSpan={3} />
          ) : (
            data.pipeline.map((r) => (
              <tr key={r.focus} className="border-b border-border/60">
                <td className={TD}>{r.focus}</td>
                <td className={TDN}>{fmtInt(r.total)}</td>
                <td className={TDN}>{r.count}</td>
              </tr>
            ))
          )}
        </tbody>
      </Section>

      {/* 2 · Overdue follow-ups */}
      <Section title="Overdue follow-ups">
        <thead>
          <tr className="border-b border-border">
            <th className={TH}>Counterparty</th>
            <th className={TH}>Focus</th>
            <th className={TH}>Channel</th>
            <th className={`${TH} text-right`}>Expected value</th>
            <th className={`${TH} text-right`}>Follow-up</th>
          </tr>
        </thead>
        <tbody>
          {data.overdue.length === 0 ? (
            <EmptyRow colSpan={5} />
          ) : (
            data.overdue.map((r) => (
              <tr key={`${r.counterparty}-${r.follow_up_at}`} className="border-b border-border/60">
                <td className={TD}>{r.counterparty}</td>
                <td className={TD}>{r.focus}</td>
                <td className={TD}>{r.channel}</td>
                <td className={TDN}>{fmtInt(r.expected_value)}</td>
                <td className={TDN}>{r.follow_up_at}</td>
              </tr>
            ))
          )}
        </tbody>
      </Section>

      {/* 3 · Channel performance */}
      <Section title="Channel performance">
        <thead>
          <tr className="border-b border-border">
            <th className={TH}>Channel</th>
            <th className={`${TH} text-right`}>Won</th>
            <th className={`${TH} text-right`}>Replied</th>
            <th className={`${TH} text-right`}>Total</th>
            <th className={`${TH} text-right`}>Reply rate</th>
          </tr>
        </thead>
        <tbody>
          {data.channels.length === 0 ? (
            <EmptyRow colSpan={5} />
          ) : (
            data.channels.map((r) => (
              <tr key={r.channel} className="border-b border-border/60">
                <td className={TD}>{r.channel}</td>
                <td className={TDN}>{r.won}</td>
                <td className={TDN}>{r.replied}</td>
                <td className={TDN}>{r.total}</td>
                <td className={TDN}>{fmtRate(r.rate)}</td>
              </tr>
            ))
          )}
        </tbody>
      </Section>

      {/* 4 · Under-utilised portfolio */}
      <Section title="Under-utilised portfolio">
        <thead>
          <tr className="border-b border-border">
            <th className={TH}>Focus</th>
            <th className={`${TH} text-right`}>B-Bombs</th>
          </tr>
        </thead>
        <tbody>
          {data.underutilized.length === 0 ? (
            <EmptyRow colSpan={2} />
          ) : (
            data.underutilized.map((r) => (
              <tr key={r.focus} className="border-b border-border/60">
                <td className={TD}>{r.focus}</td>
                <td className={TDN}>{r.bBombCount}</td>
              </tr>
            ))
          )}
        </tbody>
      </Section>

      {/* 5 · Price bands */}
      <Section title="Price bands">
        <thead>
          <tr className="border-b border-border">
            <th className={TH}>Focus</th>
            <th className={`${TH} text-right`}>Min</th>
            <th className={`${TH} text-right`}>Median</th>
            <th className={`${TH} text-right`}>Max</th>
          </tr>
        </thead>
        <tbody>
          {data.priceBands.length === 0 ? (
            <EmptyRow colSpan={4} />
          ) : (
            data.priceBands.map((r) => (
              <tr key={r.focus} className="border-b border-border/60">
                <td className={TD}>{r.focus}</td>
                <td className={TDN}>{fmtInt(r.min)}</td>
                <td className={TDN}>{fmtInt(r.median)}</td>
                <td className={TDN}>{fmtInt(r.max)}</td>
              </tr>
            ))
          )}
        </tbody>
      </Section>
    </div>
  );
}
