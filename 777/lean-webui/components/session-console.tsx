"use client";

import { useMemo, useState } from "react";
import type { ToolResult } from "@/lib/mcp/tools";

interface ActiveTasklist {
  file: string;
  title: string;
  content: string;
}

interface CapturedItem {
  kind: string;
  path: string;
  title: string;
}

/** Split a tasklist into its `## ` sections — the "phases" of the day. */
function sections(md: string): { heading: string; body: string }[] {
  const parts = md.split(/^## /m);
  const preamble = (parts.shift() ?? "").trim();
  const out: { heading: string; body: string }[] = [];
  if (preamble) out.push({ heading: "Overview", body: preamble });
  for (const p of parts) {
    const nl = p.indexOf("\n");
    const heading = (nl === -1 ? p : p.slice(0, nl)).trim();
    const body = (nl === -1 ? "" : p.slice(nl + 1)).trim();
    if (heading || body) out.push({ heading, body });
  }
  return out;
}

export function SessionConsole({ tasklist }: { tasklist: ActiveTasklist | null }) {
  // ── capture ──────────────────────────────────────────────────────────────
  const [type, setType] = useState<"artifact" | "insight" | "note">("artifact");
  const [focus, setFocus] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [source, setSource] = useState("");
  const [capturing, setCapturing] = useState(false);
  const [captured, setCaptured] = useState<CapturedItem[]>([]);
  const [captureResult, setCaptureResult] = useState<string | null>(null);
  const [captureError, setCaptureError] = useState<string | null>(null);

  // ── close ────────────────────────────────────────────────────────────────
  const [closing, setClosing] = useState<"dry" | "real" | null>(null);
  const [closeOut, setCloseOut] = useState<ToolResult | null>(null);
  const [closeError, setCloseError] = useState<string | null>(null);

  const capture = async () => {
    setCapturing(true);
    setCaptureError(null);
    setCaptureResult(null);
    try {
      const r = await fetch("/api/session/capture", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ type, focus, title, content, source: source || undefined }),
      });
      const j = await r.json();
      if (!r.ok) {
        setCaptureError(j?.error ?? "capture failed");
        return;
      }
      setCaptureResult(`${j.kind} → ${j.path}`);
      setCaptured((prev) => [
        { kind: j.kind ?? "artifact", path: j.path ?? "—", title },
        ...prev,
      ]);
      setTitle("");
      setContent("");
      setSource("");
    } catch (e) {
      setCaptureError(e instanceof Error ? e.message : String(e));
    } finally {
      setCapturing(false);
    }
  };

  const doClose = async (dryRun: boolean) => {
    setClosing(dryRun ? "dry" : "real");
    setCloseError(null);
    setCloseOut(null);
    try {
      const r = await fetch("/api/session/close", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ dryRun }),
      });
      const j = await r.json();
      if (!r.ok) {
        setCloseError(j?.error ?? "close failed");
        return;
      }
      setCloseOut(j);
    } catch (e) {
      setCloseError(e instanceof Error ? e.message : String(e));
    } finally {
      setClosing(null);
    }
  };

  const phases = useMemo(
    () => (tasklist ? sections(tasklist.content) : []),
    [tasklist],
  );

  return (
    <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px]">
      {/* tasklist, read-only */}
      <section aria-labelledby="tasklist">
        <div className="flex items-baseline justify-between">
          <h2 id="tasklist" className="text-[15px] font-semibold tracking-[-0.01em] text-ink">
            {tasklist ? tasklist.title : "Active tasklist"}
          </h2>
          <span className="mono text-[11px] uppercase tracking-[0.04em] text-muted">
            read-only
          </span>
        </div>
        {tasklist ? (
          <div className="mt-3 rounded-lg border border-border bg-surface p-5">
            <div className="mono mb-3 text-[11px] text-muted">{tasklist.file}</div>
            <div className="max-h-[52vh] space-y-4 overflow-auto">
              {phases.map((s) => (
                <div key={s.heading}>
                  <div className="text-[13px] font-medium text-ink">{s.heading}</div>
                  {s.body ? (
                    <pre className="mono mt-1 whitespace-pre-wrap text-[12px] leading-relaxed text-ink-2">
                      {s.body}
                    </pre>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="mt-3 rounded-lg border border-border bg-surface p-5 text-[13px] text-ink-2">
            No active daily tasklist for today. Tasklist editing is out of scope —
            write the plan in your agent, then reload.
          </div>
        )}
        <p className="mt-2 text-[12px] text-muted">
          No ticking — the tasklist is read-only; capture and close are the writes.
        </p>
      </section>

      {/* capture + close */}
      <div className="flex flex-col gap-6">
        <section className="rounded-lg border border-border bg-surface p-5" aria-labelledby="capture">
          <h2 id="capture" className="text-[15px] font-semibold tracking-[-0.01em] text-ink">
            Capture
          </h2>
          <p className="mt-1 text-[12px] text-muted">
            Writes via <code className="mono text-[11px]">suplex_capture</code> — an artifact, insight, or note.
          </p>

          <div className="mt-3 flex gap-1.5">
            {(["artifact", "insight", "note"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                aria-pressed={type === t}
                className={
                  "rounded-md border px-3 py-1.5 text-[13px] " +
                  (type === t
                    ? "border-accent bg-accent text-on-accent"
                    : "border-border bg-surface text-ink-2 hover:text-ink")
                }
              >
                {t}
              </button>
            ))}
          </div>

          <label className="mt-3 block">
            <span className="mono text-[11px] uppercase tracking-[0.04em] text-muted">focus</span>
            <input
              value={focus}
              onChange={(e) => setFocus(e.target.value)}
              placeholder="ai-engineering"
              className="mt-1 block w-full rounded-md border border-border bg-surface px-3 py-2 text-[13px] text-ink placeholder:text-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            />
          </label>
          <label className="mt-2 block">
            <span className="mono text-[11px] uppercase tracking-[0.04em] text-muted">title</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What shipped"
              className="mt-1 block w-full rounded-md border border-border bg-surface px-3 py-2 text-[13px] text-ink placeholder:text-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            />
          </label>
          <label className="mt-2 block">
            <span className="mono text-[11px] uppercase tracking-[0.04em] text-muted">content</span>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={4}
              placeholder="The work, and why it matters"
              className="mt-1 block w-full rounded-md border border-border bg-surface px-3 py-2 text-[13px] text-ink placeholder:text-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            />
          </label>
          <label className="mt-2 block">
            <span className="mono text-[11px] uppercase tracking-[0.04em] text-muted">source (optional)</span>
            <input
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder="chat reference / file path"
              className="mt-1 block w-full rounded-md border border-border bg-surface px-3 py-2 text-[13px] text-ink placeholder:text-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            />
          </label>

          <button
            type="button"
            onClick={capture}
            disabled={capturing || !focus.trim() || !title.trim() || !content.trim()}
            className="mt-4 w-full rounded-md bg-accent px-4 py-2 text-[13px] font-medium text-on-accent hover:bg-accent-ink disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {capturing ? "Capturing…" : "Capture"}
          </button>

          {captureResult ? (
            <div className="mono mt-3 rounded-md border border-border bg-surface-2 px-3 py-2 text-[12px] text-accent-ink">
              {captureResult}
            </div>
          ) : null}
          {captureError ? (
            <div className="mono mt-3 break-words rounded-md border border-border bg-surface-2 px-3 py-2 text-[12px] text-error">
              {captureError}
            </div>
          ) : null}

          {captured.length > 0 ? (
            <div className="mt-4">
              <div className="mono text-[11px] uppercase tracking-[0.04em] text-muted">
                captured this session
              </div>
              <ul className="mt-1.5 space-y-1">
                {captured.map((c, i) => (
                  <li key={i} className="mono text-[12px] text-ink">
                    <span className="text-muted">{c.kind}</span> · {c.title} ·{" "}
                    <span className="text-accent-ink">{c.path}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>

        <section className="rounded-lg border border-border bg-surface p-5" aria-labelledby="close">
          <h2 id="close" className="text-[15px] font-semibold tracking-[-0.01em] text-ink">
            Close
          </h2>
          <p className="mt-1 text-[12px] text-muted">
            <code className="mono text-[11px]">suplex_close</code> runs 3lm learn → index; 3lm end runs only
            when a Session End report from today exists.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => doClose(true)}
              disabled={closing !== null}
              className="rounded-md border border-border bg-surface px-3 py-1.5 text-[13px] text-ink-2 hover:text-ink disabled:opacity-50"
            >
              {closing === "dry" ? "Previewing…" : "Dry-run preview"}
            </button>
            <button
              type="button"
              onClick={() => doClose(false)}
              disabled={closing !== null}
              className="rounded-md bg-accent px-3 py-1.5 text-[13px] font-medium text-on-accent hover:bg-accent-ink disabled:opacity-50"
            >
              {closing === "real" ? "Closing…" : "Close"}
            </button>
          </div>
          {closeError ? (
            <div className="mono mt-3 break-words rounded-md border border-border bg-surface-2 px-3 py-2 text-[12px] text-error">
              {closeError}
            </div>
          ) : null}
          {closeOut ? (
            <pre className="mono mt-3 max-h-[40vh] overflow-auto whitespace-pre-wrap rounded-md border border-border bg-surface-2 p-3 text-[12px] text-ink">
              {closeOut.ok ? "" : `status ${closeOut.status ?? "?"}\n`}
              {closeOut.stdout}
              {closeOut.stderr ? `\n\n${closeOut.stderr}` : ""}
              {!closeOut.stdout && !closeOut.stderr ? "(no output)" : ""}
            </pre>
          ) : null}
        </section>
      </div>
    </div>
  );
}
