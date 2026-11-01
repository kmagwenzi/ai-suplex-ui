"use client";

import { useState } from "react";
import type { ToolResult } from "@/lib/mcp/tools";
import { confirmGate, promotePayload, ritualPayload, type RitualWhich } from "@/lib/gates";
import type { Approvals } from "@/lib/types";

interface GateItem {
  id: string;
  label: string;
}

function GateResult({ result, error }: { result: ToolResult | null; error: string | null }) {
  if (error) {
    return (
      <div className="mono mt-3 break-words rounded-md border border-border bg-surface-2 px-3 py-2 text-[12px] text-error">
        {error}
      </div>
    );
  }
  if (!result) return null;
  return (
    <pre className="mono mt-3 max-h-[36vh] overflow-auto whitespace-pre-wrap rounded-md border border-border bg-surface-2 p-3 text-[12px] text-ink">
      {result.stdout || result.executed || result.stderr || JSON.stringify(result, null, 2)}
    </pre>
  );
}

function PromoteGate() {
  const [min, setMin] = useState(70);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ToolResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const payload = promotePayload(typed, min);
  const ready = payload.approved === true;

  const submit = async () => {
    if (!ready) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const r = await fetch("/api/memory/promote", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = await r.json();
      if (!r.ok) setError(j?.error ?? "promote failed");
      else setResult(j);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-lg border border-border bg-surface p-5">
      <h3 className="text-[15px] font-semibold tracking-[-0.01em] text-ink">Promote</h3>
      <p className="mt-1 text-[12px] text-muted">
        Score and promote lessons at or above the threshold. Gated: type the word.
      </p>
      <label className="mt-3 block">
        <span className="mono text-[11px] uppercase tracking-[0.04em] text-muted">threshold</span>
        <input
          type="number"
          value={min}
          onChange={(e) => setMin(Number(e.target.value))}
          className="mt-1 block w-full rounded-md border border-border bg-surface px-3 py-2 text-[13px] text-ink"
        />
      </label>
      <label className="mt-2 block">
        <span className="mono text-[11px] uppercase tracking-[0.04em] text-muted">
          type PROMOTE to confirm
        </span>
        <input
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          placeholder="PROMOTE"
          className="mono mt-1 block w-full rounded-md border border-border bg-surface px-3 py-2 text-[13px] text-ink placeholder:text-muted"
        />
      </label>
      <button
        type="button"
        onClick={submit}
        disabled={!ready || busy}
        className="mt-3 w-full rounded-md bg-attention px-4 py-2 text-[13px] font-medium text-on-attention hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {busy ? "Promoting…" : "Promote"}
      </button>
      {typed && !ready ? (
        <div className="mt-1.5 text-[12px] text-muted">
          type the word exactly to confirm — a write you can&apos;t name is a write you didn&apos;t intend
        </div>
      ) : null}
      <GateResult result={result} error={error} />
    </div>
  );
}

function ApproveGate({ items }: { items: GateItem[] }) {
  const [item, setItem] = useState("");
  const [decision, setDecision] = useState<"approve" | "reject">("approve");
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ToolResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const ready = item !== "" && confirmGate(typed, item);

  const submit = async () => {
    if (!ready) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const r = await fetch("/api/memory/approve", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ item, decision }),
      });
      const j = await r.json();
      if (!r.ok) setError(j?.error ?? "approve failed");
      else setResult(j);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-lg border border-border bg-surface p-5">
      <h3 className="text-[15px] font-semibold tracking-[-0.01em] text-ink">Approve</h3>
      <p className="mt-1 text-[12px] text-muted">
        A Hustler decision, executed by the framework. Reject is a safe no-op.
      </p>
      {items.length === 0 ? (
        <p className="mt-3 text-[13px] text-ink-2">
          No pending gates — the approval inbox is empty on the free path.
        </p>
      ) : (
        <>
          <label className="mt-3 block">
            <span className="mono text-[11px] uppercase tracking-[0.04em] text-muted">item</span>
            <select
              value={item}
              onChange={(e) => setItem(e.target.value)}
              className="mt-1 block w-full rounded-md border border-border bg-surface px-3 py-2 text-[13px] text-ink"
            >
              <option value="">choose an item…</option>
              {items.map((it) => (
                <option key={it.id} value={it.id}>
                  {it.label}
                </option>
              ))}
            </select>
          </label>
          <div className="mt-2 flex gap-1.5">
            {(["approve", "reject"] as const).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDecision(d)}
                aria-pressed={decision === d}
                className={
                  "rounded-md border px-3 py-1.5 text-[13px] " +
                  (decision === d
                    ? "border-attention bg-attention text-on-attention"
                    : "border-border bg-surface text-ink-2 hover:text-ink")
                }
              >
                {d}
              </button>
            ))}
          </div>
          <label className="mt-2 block">
            <span className="mono text-[11px] uppercase tracking-[0.04em] text-muted">
              type the item id to confirm
            </span>
            <input
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder={item || "item id"}
              className="mono mt-1 block w-full rounded-md border border-border bg-surface px-3 py-2 text-[13px] text-ink placeholder:text-muted"
            />
          </label>
          <button
            type="button"
            onClick={submit}
            disabled={!ready || busy}
            className="mt-3 w-full rounded-md bg-attention px-4 py-2 text-[13px] font-medium text-on-attention hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy ? "Deciding…" : decision === "approve" ? "Approve" : "Reject"}
          </button>
        </>
      )}
      <GateResult result={result} error={error} />
    </div>
  );
}

function RitualGate() {
  const [which, setWhich] = useState<RitualWhich>("saturday");
  const [run, setRun] = useState(true);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ToolResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const payload = ritualPayload(typed, which, run);
  const ready = payload.approved === true;
  const token = which === "saturday" ? "SATURDAY" : "TUESDAY";

  const submit = async () => {
    if (!ready) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const r = await fetch("/api/memory/ritual", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = await r.json();
      if (!r.ok) setError(j?.error ?? "ritual failed");
      else setResult(j);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-lg border border-border bg-surface p-5">
      <h3 className="text-[15px] font-semibold tracking-[-0.01em] text-ink">Ritual</h3>
      <p className="mt-1 text-[12px] text-muted">
        The weekly reset. Gated: type the day you are running.
      </p>
      <div className="mt-3 flex gap-1.5">
        {(["saturday", "tuesday"] as const).map((w) => (
          <button
            key={w}
            type="button"
            onClick={() => setWhich(w)}
            aria-pressed={which === w}
            className={
              "rounded-md border px-3 py-1.5 text-[13px] " +
              (which === w
                ? "border-attention bg-attention text-on-attention"
                : "border-border bg-surface text-ink-2 hover:text-ink")
            }
          >
            {w}
          </button>
        ))}
      </div>
      <label className="mt-3 flex items-center gap-2 text-[13px] text-ink-2">
        <input type="checkbox" checked={run} onChange={(e) => setRun(e.target.checked)} />
        run (execute, not just plan)
      </label>
      <label className="mt-2 block">
        <span className="mono text-[11px] uppercase tracking-[0.04em] text-muted">
          type {token} to confirm
        </span>
        <input
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          placeholder={token}
          className="mono mt-1 block w-full rounded-md border border-border bg-surface px-3 py-2 text-[13px] text-ink placeholder:text-muted"
        />
      </label>
      <button
        type="button"
        onClick={submit}
        disabled={!ready || busy}
        className="mt-3 w-full rounded-md bg-attention px-4 py-2 text-[13px] font-medium text-on-attention hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {busy ? "Running…" : "Run ritual"}
      </button>
      <GateResult result={result} error={error} />
    </div>
  );
}

export function MemoryConsole({
  lessons,
  index,
  approvals,
}: {
  lessons: string;
  index: string;
  approvals: Approvals | null;
}) {
  const gates = (approvals?.gates ?? []) as { path: string }[];
  const items: GateItem[] = [
    ...gates.map((g) => ({ id: g.path, label: g.path })),
    { id: "lessons", label: "lessons — promote (3lm promote --min 70)" },
  ];
  const l = approvals?.lessons ?? null;

  return (
    <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px]">
      {/* lessons + index */}
      <div className="flex flex-col gap-6">
        <section aria-labelledby="lessons">
          <h2 id="lessons" className="text-[15px] font-semibold tracking-[-0.01em] text-ink">
            Lessons (staged)
          </h2>
          <p className="mt-1 text-[12px] text-muted">
            Where the framework writes contradiction notes — a planted contradiction in the sample vault
            is visible here.
          </p>
          <pre className="mono mt-3 max-h-[52vh] overflow-auto whitespace-pre-wrap rounded-lg border border-border bg-surface p-5 text-[12px] leading-relaxed text-ink">
            {lessons || "(no lessons)"}
          </pre>
        </section>

        <section aria-labelledby="index">
          <h2 id="index" className="text-[15px] font-semibold tracking-[-0.01em] text-ink">
            Index
          </h2>
          <p className="mt-1 text-[12px] text-muted">
            The active memory files as the framework indexes them. Semantic/procedural{" "}
            <span className="font-medium text-ink">contents</span> aren&apos;t on the mcp v1 read surface —
            the index names them; the console doesn&apos;t read those files directly.
          </p>
          <pre className="mono mt-3 max-h-[40vh] overflow-auto whitespace-pre-wrap rounded-lg border border-border bg-surface p-5 text-[12px] leading-relaxed text-ink">
            {index || "(no index)"}
          </pre>
        </section>

        <section aria-labelledby="ultra">
          <h2 id="ultra" className="text-[15px] font-semibold tracking-[-0.01em] text-ink">
            Ultra
          </h2>
          <div className="mt-2 flex items-center gap-2 text-[13px] text-ink-2">
            <span className="dot dot-muted" />
            graph · insight · projection · shell · fleet — not installed
          </div>
        </section>
      </div>

      {/* gates + pulse */}
      <div className="flex flex-col gap-6">
        <section aria-labelledby="pulse">
          <h2 id="pulse" className="text-[15px] font-semibold tracking-[-0.01em] text-ink">
            Memory pulse
          </h2>
          <dl className="mt-3 space-y-1.5 text-[13px] text-ink-2">
            <div className="flex justify-between gap-4">
              <dt>staged lessons</dt>
              <dd className="num">{l ? l.pool : "—"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>ready to promote</dt>
              <dd className="num">{l ? l.ready : "—"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>borderline</dt>
              <dd className="num">{l ? l.borderline : "—"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>B-Bombs</dt>
              <dd className="num">{approvals?.bBombs ? approvals.bBombs.count : "—"}</dd>
            </div>
          </dl>
        </section>

        <PromoteGate />
        <ApproveGate items={items} />
        <RitualGate />
      </div>
    </div>
  );
}
