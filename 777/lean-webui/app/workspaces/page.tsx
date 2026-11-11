import { readConsoleData } from "@/lib/mcp/resources";
import { WorkspacesBoard } from "@/components/workspaces-board";
import { DebugOverlay } from "@/components/debug-overlay";

export const dynamic = "force-dynamic";

export default async function Workspaces({
  searchParams,
}: {
  searchParams: Promise<{ debug?: string }>;
}) {
  const debug = (await searchParams).debug === "1";

  const data = await readConsoleData();

  if (!data.brief) {
    return (
      <main className="pt-10">
        <div className="rounded-lg border border-border bg-surface p-6">
          <h1 className="text-[20px] font-semibold tracking-[-0.01em] text-error">
            The console cannot reach the vault
          </h1>
          <p className="mono mt-3 break-words text-[12px] text-muted">
            {data.failed.length ? data.failed.join(" · ") : "suplex://context unavailable"}
          </p>
        </div>
      </main>
    );
  }

  const brief = data.brief;
  const instances = data.threads ?? brief.instances ?? [];

  return (
    <main className="pt-8">
      <div className="flex items-baseline justify-between">
        <h1 className="text-[24px] font-semibold tracking-[-0.02em] text-ink">
          Workspaces
        </h1>
        <div className="mono text-[12px] text-muted">
          Cycle {brief.cycle} · Week {brief.week} · {data.today}
        </div>
      </div>

      <p className="mt-2 max-w-[62ch] text-[13px] text-ink-2">
        A workspace is the client-facing name for a thread instance — one lane,
        one brief, one writer. The board is read-only; its actions hand off to
        the composer.
      </p>

      <section className="mt-8" aria-label="Workspaces">
        <WorkspacesBoard instances={instances} />
      </section>

      {debug ? <DebugOverlay /> : null}
    </main>
  );
}
