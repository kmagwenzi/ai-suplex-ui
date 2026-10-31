import { readConsoleData, type ConsoleData } from "@/lib/mcp/resources";
import { deriveStages } from "@/lib/stages";
import { PipelineList } from "@/components/pipeline-list";
import { DebugOverlay } from "@/components/debug-overlay";

export const dynamic = "force-dynamic";

export default async function Pipeline({
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
        <div className="rounded-lg border border-border bg-surface p-6">
          <h1 className="text-[20px] font-semibold tracking-[-0.01em] text-error">
            The console cannot reach the vault
          </h1>
          <p className="mono mt-3 break-words text-[12px] text-muted">{error}</p>
        </div>
      </main>
    );
  }

  const stages = deriveStages(data.signals);
  const { brief } = data;

  return (
    <main className="pt-8">
      <div className="flex items-baseline justify-between">
        <h1 className="text-[24px] font-semibold tracking-[-0.02em] text-ink">
          Pipeline
        </h1>
        <div className="mono text-[12px] text-muted">
          Cycle {brief.cycle} · Week {brief.week} · {data.today}
        </div>
      </div>

      <p className="mt-2 max-w-[62ch] text-[13px] text-ink-2">
        The workflow is the navigation; the commands are the verbs. Every stage
        reads a resource, names the command that moves it forward, and turns{" "}
        <span className="font-medium text-ink">done</span> only when its output
        file exists — never when a button is pressed.
      </p>

      <section className="mt-8" aria-label="Workflow pipeline">
        <PipelineList stages={stages} />
      </section>

      {debug ? <DebugOverlay /> : null}
    </main>
  );
}
