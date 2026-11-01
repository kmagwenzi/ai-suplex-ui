import { readApprovals, readMemoryIndex, readMemoryLessons } from "@/lib/mcp/resources";
import { MemoryConsole } from "@/components/memory-console";
import { DebugOverlay } from "@/components/debug-overlay";

export const dynamic = "force-dynamic";

export default async function Memory({
  searchParams,
}: {
  searchParams: Promise<{ debug?: string }>;
}) {
  const debug = (await searchParams).debug === "1";

  let error: string | null = null;
  let lessons = "";
  let index = "";
  try {
    [lessons, index] = await Promise.all([readMemoryLessons(), readMemoryIndex()]);
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }
  // the approval inbox is secondary — a slow/failed approvals read degrades to null.
  const approvals = await readApprovals().catch(() => null);

  if (error) {
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

  return (
    <main className="pt-8">
      <h1 className="text-[24px] font-semibold tracking-[-0.02em] text-ink">
        Memory
      </h1>
      <p className="mt-2 max-w-[62ch] text-[13px] text-ink-2">
        The loop, made visible. Lessons and the index are the framework&apos;s words, rendered
        verbatim; promote is a gated, typed-confirm act. A write you can&apos;t name is a
        write you didn&apos;t intend.
      </p>

      <MemoryConsole lessons={lessons} index={index} approvals={approvals} />

      {debug ? <DebugOverlay /> : null}
    </main>
  );
}
