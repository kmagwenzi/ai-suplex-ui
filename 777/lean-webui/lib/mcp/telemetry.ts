/**
 * telemetry.ts — server-side per-call record + p50/p95, for the MCP dot and
 * the `?debug=1` overlay. One module singleton; never sent to a client as truth
 * — it is a measurement, not the vault's state.
 */

export interface CallRecord {
  id: number;
  name: string; // `resources/read suplex://context`
  ok: boolean;
  ms: number;
  code: number; // 0 on success; JSON-RPC error code on failure
  at: number;
}

const MAX_RECORDS = 500;
const records: CallRecord[] = [];
let seq = 0;

export function recordCall(
  name: string,
  ok: boolean,
  ms: number,
  code: number,
): void {
  records.push({ id: ++seq, name, ok, ms, code, at: Date.now() });
  if (records.length > MAX_RECORDS) records.shift();
}

function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return 0;
  const i = Math.ceil(q * sorted.length) - 1;
  return sorted[Math.max(0, i)];
}

export interface TelemetrySnapshot {
  p50: number;
  p95: number;
  count: number;
  records: CallRecord[]; // newest first
}

export function snapshot(): TelemetrySnapshot {
  const sorted = records.map((r) => r.ms).sort((a, b) => a - b);
  return {
    p50: Math.round(quantile(sorted, 0.5)),
    p95: Math.round(quantile(sorted, 0.95)),
    count: records.length,
    records: [...records].reverse(),
  };
}

export function lastRecord(): CallRecord | null {
  return records.length ? records[records.length - 1] : null;
}
