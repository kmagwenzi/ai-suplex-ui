"use client";

import { useEffect, useState } from "react";

interface CallRecord {
  id: number;
  name: string;
  ok: boolean;
  ms: number;
  code: number;
}

interface TelemetrySnapshot {
  p50: number;
  p95: number;
  count: number;
  records: CallRecord[];
}

/**
 * The `?debug=1` overlay — per-call name · ms · exit code, with p50/p95.
 * Measurement only; it never claims the vault's state.
 */
export function DebugOverlay() {
  const [snap, setSnap] = useState<TelemetrySnapshot | null>(null);

  useEffect(() => {
    let active = true;
    const tick = async () => {
      try {
        const r = await fetch("/api/telemetry");
        if (active) setSnap((await r.json()) as TelemetrySnapshot);
      } catch {
        /* keep the last snapshot */
      }
    };
    tick();
    const iv = setInterval(tick, 2000);
    return () => {
      active = false;
      clearInterval(iv);
    };
  }, []);

  return (
    <div className="fixed bottom-4 right-4 z-50 max-h-[60vh] w-[420px] max-w-[calc(100vw-2rem)] overflow-auto rounded-lg bg-[#161411] text-[#e7e4dd] shadow-2xl">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5">
        <span className="mono text-[11px] uppercase tracking-[0.04em]">
          mcp debug
        </span>
        <span className="num text-[11px]">
          p50 <span className="text-accent-on-dark">{snap?.p50 ?? "—"}</span>ms · p95{" "}
          <span className="text-accent-on-dark">{snap?.p95 ?? "—"}</span>ms ·{" "}
          {snap?.count ?? 0} calls
        </span>
      </div>
      <table className="w-full text-[11px]">
        <thead>
          <tr className="text-left text-[#9b958a]">
            <th className="px-4 py-1.5 font-normal">call</th>
            <th className="px-2 py-1.5 text-right font-normal">ms</th>
            <th className="px-4 py-1.5 text-right font-normal">exit</th>
          </tr>
        </thead>
        <tbody>
          {(snap?.records ?? []).slice(0, 30).map((r) => (
            <tr key={r.id} className="border-t border-white/5">
              <td className="mono px-4 py-1 text-[#e7e4dd]">{r.name}</td>
              <td className="num px-2 py-1 text-right">{r.ms}</td>
              <td
                className={
                  "num px-4 py-1 text-right " + (r.ok ? "text-accent-on-dark" : "text-error-on-dark")
                }
              >
                {r.code}
              </td>
            </tr>
          ))}
          {!snap || snap.records.length === 0 ? (
            <tr>
              <td colSpan={3} className="px-4 py-2 text-[#9b958a]">
                no calls yet
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
