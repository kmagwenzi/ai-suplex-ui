import { readConsoleData, type ConsoleData } from "@/lib/mcp/resources";
import { deriveStages, EXECUTOR_GLYPH } from "@/lib/stages";
import { PipelineStrip } from "@/components/pipeline-strip";
import { DebugOverlay } from "@/components/debug-overlay";

export const dynamic = "force-dynamic";

export default async function Today({
  searchParams,
}: {
  searchParams: Promise<{ debug?: string }>;
}) {
  const debug = (await searchParams).debug === "1";

  let data: ConsoleData | null = null;
  let error: string | null = null;
  try {
    data = await readConsoleData();
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }

  if (error || !data) {
    return (
      <main className="pt-10">
        <Panel>
          <h1 className="text-[20px] font-semibold tracking-[-0.01em] text-error">
            The console cannot reach the vault
          </h1>
          <p className="mt-2 text-[14px] text-ink-2">
            The MCP server is down. Nothing was cached, so nothing renders.
          </p>
          <p className="mono mt-3 break-words text-[12px] text-muted">{error}</p>
          <p className="mt-3 text-[13px] text-muted">
            Start it with{" "}
            <code className="mono text-[12px] text-ink">
              node ../../../ai-suplex-harness/server.js
            </code>{" "}
            (or set <code className="mono text-[12px] text-ink">HARNESS_PATH</code>)
            and reload.
          </p>
        </Panel>
      </main>
    );
  }

  const stages = deriveStages(data.signals);
  const current = stages.find((s) => s.state === "current") ?? stages[0];
  const { brief, approvals } = data;
  const lessons = approvals?.lessons;

  return (
    <main className="pt-8">
      <div className="flex items-baseline justify-between">
        <h1 className="text-[24px] font-semibold tracking-[-0.02em] text-ink">
          Today
        </h1>
        <div className="mono text-[12px] text-muted">
          Cycle {brief.cycle} · Week {brief.week} · {data.today}
        </div>
      </div>

      {/* the hero — where you are in the loop */}
      <section className="mt-5" aria-label="Pipeline">
        <PipelineStrip stages={stages} />
      </section>

      <div className="mt-8 grid gap-6 sm:grid-cols-[1fr_320px]">
        {/* current stage + next command */}
        <div>
          <section aria-labelledby="current-stage">
            <div className="mono text-[11px] uppercase tracking-[0.04em] text-muted">
              current stage
            </div>
            <div className="mt-1 text-[20px] font-semibold tracking-[-0.01em] text-ink">
              {current.name}
            </div>
            <div className="mt-1 text-[13px] text-ink-2">{current.reason}</div>
          </section>

          <section className="mt-7" aria-labelledby="next-command">
            <div className="mono text-[11px] uppercase tracking-[0.04em] text-muted">
              next command
            </div>
            <div className="mt-2 rounded-lg border border-border bg-surface px-4 py-3">
              <div className="flex items-baseline justify-between gap-3">
                <div className="text-[15px] font-medium tracking-[-0.01em] text-ink">
                  {current.command}
                </div>
                <span className="mono shrink-0 text-[12px] text-muted">
                  {EXECUTOR_GLYPH[current.executor]}
                </span>
              </div>
              <div className="mt-1 text-[12px] text-muted">
                Composing and dispatch arrive in the next slice — for now this
                is the verb, read live from the vault.
              </div>
            </div>
          </section>
        </div>

        {/* memory pulse + last shipped + Ultra */}
        <div className="flex flex-col gap-6">
          <section aria-labelledby="memory-pulse">
            <div
              id="memory-pulse"
              className="mono text-[11px] uppercase tracking-[0.04em] text-muted"
            >
              memory pulse
            </div>
            <dl className="mt-2 space-y-1.5 text-[13px] text-ink-2">
              <Row
                k="staged lessons"
                v={lessons ? String(lessons.pool) : "—"}
              />
              <Row
                k="ready to promote"
                v={lessons ? String(lessons.ready) : "—"}
              />
              <Row
                k="borderline"
                v={lessons ? String(lessons.borderline) : "—"}
              />
              <Row
                k="B-Bombs"
                v={approvals?.bBombs ? String(approvals.bBombs.count) : "—"}
              />
            </dl>
          </section>

          <section aria-labelledby="last-shipped">
            <div
              id="last-shipped"
              className="mono text-[11px] uppercase tracking-[0.04em] text-muted"
            >
              last shipped
            </div>
            <div className="mt-2 text-[13px] text-ink-2">
              <span className="text-muted">—</span> terminal outward acts (SENT ·
              SUBMITTED · CLAIMED · PAID) are not on the{" "}
              <code className="mono text-[12px]">mcp v1</code> read surface yet.
            </div>
          </section>

          <section aria-labelledby="ultra">
            <div
              id="ultra"
              className="mono text-[11px] uppercase tracking-[0.04em] text-muted"
            >
              Ultra
            </div>
            <div className="mt-2 flex items-center gap-2 text-[13px] text-ink-2">
              <span className="dot dot-muted" />
              graph · insight · shell · fleet — not installed
            </div>
          </section>
        </div>
      </div>

      {debug ? <DebugOverlay /> : null}
    </main>
  );
}

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-6">{children}</div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-ink-2">{k}</dt>
      <dd className="num text-ink">{v}</dd>
    </div>
  );
}
