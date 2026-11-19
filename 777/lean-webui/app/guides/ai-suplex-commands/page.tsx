import Link from "next/link";
import { CopyButton } from "@/components/copy-button";
import { CONTRACTS } from "@/lib/command/contracts";
import { readCommands, type CommandDoc } from "@/lib/mcp/resources";
import { COPY_ONLY_COMMANDS, PROMPT_MEMORY_LOOP } from "@/lib/prompts";

export const dynamic = "force-dynamic";

/** "Session End Report" -> "session-end-report" — how a doc finds its contract. */
function slug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * /guides/ai-suplex-commands — a viewer for the ⚡ Command documents.
 *
 * The upper half is structured (the CONTENT contract the composer renders); the
 * lower half is the documents themselves, read from
 * Prompt Patterns/AI-Suplex Commands/ over suplex://commands. Nothing is
 * re-authored here: if the vault's doc changes, this page changes.
 */
export default async function CommandsGuide() {
  let docs: CommandDoc[] = [];
  let failed: string | null = null;
  try {
    docs = await readCommands();
  } catch (e) {
    failed = e instanceof Error ? e.message : String(e);
  }

  const names = Object.keys(CONTRACTS);

  return (
    <main className="pt-8">
      <h1 className="text-[24px] font-semibold tracking-[-0.02em] text-ink">
        AI-Suplex Commands
      </h1>
      <p className="mt-2 max-w-[70ch] text-[13px] text-ink-2">
        The verbs. The nine below are dispatchable — the console composes their{" "}
        <span className="mono text-[12px]">CONTENT</span> from fields and hands the
        words to an agent. Under them sit every{" "}
        <span className="mono text-[12px]">⚡ Command</span> document in the vault,
        read live from{" "}
        <span className="mono text-[12px]">Prompt Patterns/AI-Suplex Commands/</span>.
      </p>

      <nav aria-label="Sections" className="mt-6 rounded-lg border border-border bg-surface p-4">
        <div className="mono text-[11px] uppercase tracking-[0.04em] text-muted">
          {names.length} dispatchable · {docs.length || "—"} command documents
        </div>
        <ul className="mt-2 grid gap-x-6 gap-y-1 text-[13px] sm:grid-cols-2">
          {names.map((n) => (
            <li key={n}>
              <a href={"#c-" + n} className="text-accent hover:text-accent-ink">
                {CONTRACTS[n].name}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <h2 className="mt-10 text-[17px] font-semibold tracking-[-0.01em] text-ink">
        Dispatching — what each command takes
      </h2>

      {names.map((name) => {
        const c = CONTRACTS[name];
        const loop = PROMPT_MEMORY_LOOP[name] ?? null;
        return (
          <section key={name} id={"c-" + name} className="mt-8 scroll-mt-6">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-[15px] font-semibold tracking-[-0.01em] text-ink">
                {c.name}
              </h3>
              <span className="mono text-[11px] uppercase tracking-[0.04em] text-muted">
                memory loop: {loop ?? "none"}
              </span>
            </div>
            <p className="mt-1 max-w-[70ch] text-[13px] text-ink-2">{c.purpose}</p>
            <table className="mt-2 w-full border-collapse text-left text-[12px]">
              <thead>
                <tr className="text-muted">
                  <th className="border-b border-border py-1 pr-3 font-normal">field</th>
                  <th className="border-b border-border py-1 pr-3 font-normal">required</th>
                  <th className="border-b border-border py-1 pr-3 font-normal">placeholder</th>
                  <th className="border-b border-border py-1 font-normal">what belongs there</th>
                </tr>
              </thead>
              <tbody>
                {c.fields.map((f) => (
                  <tr key={f.key}>
                    <td className="border-b border-border py-1.5 pr-3 align-top">
                      <span className="mono text-[12px] text-ink">{f.key}</span>
                      {f.section ? (
                        <div className="mono text-[10px] uppercase text-muted">{f.section}</div>
                      ) : null}
                    </td>
                    <td className="border-b border-border py-1.5 pr-3 align-top text-ink-2">
                      {f.required ? "yes" : "optional"}
                    </td>
                    <td className="mono border-b border-border py-1.5 pr-3 align-top text-[11px] text-muted">
                      {f.placeholder}
                    </td>
                    <td className="border-b border-border py-1.5 align-top text-ink-2">{f.hint}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mono mt-1.5 break-words text-[11px] text-muted">
              additional: {c.additionalHint} · pattern: {c.patternFile}
            </p>
            <p className="mt-1.5 text-[12px]">
              <Link href={"/commands?command=" + name} className="text-accent hover:text-accent-ink">
                Compose {c.name} →
              </Link>
            </p>
          </section>
        );
      })}

      <h2 className="mt-12 text-[17px] font-semibold tracking-[-0.01em] text-ink">
        The command documents
      </h2>

      {failed ? (
        <p className="mt-2 max-w-[70ch] rounded-md border border-border bg-surface p-3 text-[13px] text-ink-2">
          The documents could not be read: <span className="mono text-[12px]">{failed}</span>
        </p>
      ) : (
        <p className="mt-1 max-w-[70ch] text-[12px] text-muted">
          Read live from the vault — {docs.length} documents. Open one to see exactly
          what the agent is told; copy it verbatim if you would rather paste it
          yourself.
        </p>
      )}

      <div className="mt-4 space-y-2">
        {docs.map((d) => {
          const contract = CONTRACTS[slug(d.trigger)];
          return (
            <details key={d.file} className="rounded-lg border border-border bg-surface p-4">
              <summary className="cursor-pointer">
                <span className="text-[14px] font-medium text-ink">{d.trigger}</span>
                {contract ? (
                  <span className="mono ml-2 text-[10px] uppercase tracking-[0.04em] text-accent">
                    dispatchable
                  </span>
                ) : (
                  <span className="mono ml-2 text-[10px] uppercase tracking-[0.04em] text-muted">
                    copy-only
                  </span>
                )}
                <span className="mono mt-1 block text-[11px] text-muted">{d.file}</span>
              </summary>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
                <span className="mono text-[11px] text-muted">
                  the whole file, verbatim — frontmatter included
                </span>
                <CopyButton
                  text={d.body}
                  label="Copy document"
                  what="The document"
                  srLabel={"Copy the " + d.trigger + " document"}
                />
              </div>
              <pre className="mono mt-2 max-h-[28rem] overflow-auto whitespace-pre-wrap rounded-md border border-border bg-surface-2 p-3 text-[11px] leading-relaxed text-ink-2">
                {d.body}
              </pre>
            </details>
          );
        })}
      </div>

      <section className="mt-12" aria-labelledby="copy-only-guide">
        <h2 id="copy-only-guide" className="text-[17px] font-semibold tracking-[-0.01em] text-ink">
          Copy-only, listed by the console
        </h2>
        <p className="mt-1 max-w-[70ch] text-[12px] text-muted">
          These have no content contract, so the console cannot compose them —
          copy the trigger and your agent loads the pattern from the vault path.
        </p>
        <ul className="mt-3 divide-y divide-border rounded-lg border border-border bg-surface">
          {COPY_ONLY_COMMANDS.map((c) => (
            <li
              key={c.command}
              className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-2 px-4 py-2.5"
            >
              <span className="mono text-[12px] text-ink">{c.command}</span>
              <span className="flex min-w-0 flex-wrap items-baseline justify-end gap-x-3 gap-y-2">
                <span className="mono break-all text-[11px] text-muted">{c.link}</span>
                <CopyButton
                  text={c.trigger}
                  label="Copy trigger"
                  what="The trigger"
                  srLabel={"Copy the trigger for " + c.command}
                />
              </span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
