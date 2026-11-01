import { readConsoleData, readTasklist } from "@/lib/mcp/resources";
import { isDailyTasklist } from "@/lib/stages";
import { SessionConsole } from "@/components/session-console";
import { DebugOverlay } from "@/components/debug-overlay";

export const dynamic = "force-dynamic";

export default async function Session({
  searchParams,
}: {
  searchParams: Promise<{ debug?: string }>;
}) {
  const debug = (await searchParams).debug === "1";

  const data = await readConsoleData();

  if (!data.brief || !data.signals) {
    return (
      <main className="pt-10">
        <div className="rounded-lg border border-border bg-surface p-6">
          <h1 className="text-[20px] font-semibold tracking-[-0.01em] text-error">
            The console cannot reach the vault
          </h1>
          <p className="mt-2 text-[14px] text-ink-2">
            The MCP server is down. Nothing was cached, so nothing renders.
          </p>
          <p className="mono mt-3 break-words text-[12px] text-muted">
            {data.failed.length ? data.failed.join(" · ") : "suplex://context unavailable"}
          </p>
        </div>
      </main>
    );
  }

  const list = data.tasklists?.tasklists ?? data.brief.tasklists ?? [];
  const active = list.find(
    (t) => t.status === "active" && isDailyTasklist(t.file),
  );

  let tasklist: { file: string; title: string; content: string } | null = null;
  if (active) {
    try {
      tasklist = {
        file: active.file,
        title: active.title || active.file,
        content: await readTasklist(active.file),
      };
    } catch {
      tasklist = null; // a missing/unreadable tasklist degrades to the empty state
    }
  }

  return (
    <main className="pt-8">
      <h1 className="text-[24px] font-semibold tracking-[-0.02em] text-ink">
        Session
      </h1>
      <p className="mt-2 max-w-[62ch] text-[13px] text-ink-2">
        The active day, and the two writes that close it: capture what the work
        produced, then close the loop. Every write goes through the framework —
        the console never touches the vault directly.
      </p>

      <SessionConsole tasklist={tasklist} />

      {debug ? <DebugOverlay /> : null}
    </main>
  );
}
