import { readConsoleData } from "@/lib/mcp/resources";
import { listPrompts } from "@/lib/mcp/prompts";
import {
  buildCard,
  COPY_ONLY_COMMANDS,
  type PrefillInput,
  type PromptCard,
} from "@/lib/prompts";
import { CommandCatalogue } from "@/components/command-catalogue";
import { DebugOverlay } from "@/components/debug-overlay";

export const dynamic = "force-dynamic";

export default async function Commands({
  searchParams,
}: {
  searchParams: Promise<{ debug?: string }>;
}) {
  const debug = (await searchParams).debug === "1";

  let error: string | null = null;
  let cards: PromptCard[] | null = null;
  let prefill: PrefillInput | null = null;

  try {
    const data = await readConsoleData();
    if (!data.brief) {
      throw new Error(
        data.failed.length
          ? data.failed.join(" · ")
          : "suplex://context unavailable",
      );
    }
    // T034: `prompts/list` only. The seven pattern bodies are no longer read on
    // page load — the memory-loop label is declared metadata, pinned by a test.
    const items = await listPrompts();
    cards = items.map((item) => buildCard(item));
    prefill = {
      cycle: data.brief.cycle,
      week: data.brief.week,
      tasklists: data.tasklists?.tasklists ?? data.brief.tasklists ?? [],
      threads:
        data.threads && data.threads.length
          ? data.threads
          : data.brief.instances ?? [],
    };
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }

  if (error || !cards || !prefill) {
    return (
      <main className="pt-10">
        <div className="rounded-lg border border-border bg-surface p-6">
          <h1 className="text-[20px] font-semibold tracking-[-0.01em] text-error">
            The console cannot reach the vault
          </h1>
          <p className="mt-2 text-[14px] text-ink-2">
            The MCP server is down. Nothing was cached, so nothing renders.
          </p>
          <p className="mono mt-3 break-words text-[12px] text-muted">{error}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="pt-8">
      <h1 className="text-[24px] font-semibold tracking-[-0.02em] text-ink">
        Commands
      </h1>
      <p className="mt-2 max-w-[62ch] text-[13px] text-ink-2">
        The verbs. Seven dispatchable prompts, listed live from{" "}
        <code className="mono text-[12px]">prompts/list</code> and composed from
        the fields you fill — <span className="font-medium text-ink">never a
        pattern document, never re-authored here</span>. The rest are listed
        honestly as <span className="font-medium text-ink">copy-only</span>.
      </p>

      <CommandCatalogue
        cards={cards}
        prefill={prefill}
        copyOnly={COPY_ONLY_COMMANDS}
      />

      {debug ? <DebugOverlay /> : null}
    </main>
  );
}
