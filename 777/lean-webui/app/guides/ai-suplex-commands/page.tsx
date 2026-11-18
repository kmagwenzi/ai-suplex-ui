import Link from "next/link";
import { CONTRACTS } from "@/lib/command/contracts";
import { COPY_ONLY_COMMANDS, PROMPT_MEMORY_LOOP } from "@/lib/prompts";

export const dynamic = "force-static";

/**
 * /guides/ai-suplex-commands — a viewer for the nine dispatchable commands.
 *
 * Every line comes from lib/command/contracts.ts — the same source the composer
 * renders — so this page cannot drift from what the console actually sends.
 */
/** "session-start" -> "Session Start"; "b-bomb-promotion" -> "B-Bomb Promotion". */
function triggerFromName(name: string): string {
  return name
    .split("-")
    .map((w) => (w.length === 1 ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(" ");
}

export default function CommandsGuide() {
  const names = Object.keys(CONTRACTS);
  return (
    <main className="pt-8">
      <h1 className="text-[24px] font-semibold tracking-[-0.02em] text-ink">
        AI-Suplex Commands
      </h1>
      <p className="mt-2 max-w-[70ch] text-[13px] text-ink-2">
        The verbs. Each command is a trigger, its{" "}
        <span className="mono text-[12px]">CONTENT</span>, and an optional{" "}
        <span className="mono text-[12px]">ADDITIONAL</span>. Compose one at{" "}
        <Link href="/commands" className="text-accent hover:text-accent-ink">
          /commands
        </Link>{" "}
        — the console hands your words to an agent; nothing executes from here.
      </p>

      <nav
        aria-label="Commands"
        className="mt-6 rounded-lg border border-border bg-surface p-4"
      >
        <div className="mono text-[11px] uppercase tracking-[0.04em] text-muted">
          {names.length} dispatchable · {COPY_ONLY_COMMANDS.length} copy-only
        </div>
        <ul className="mt-2 grid gap-x-6 gap-y-1 text-[13px] sm:grid-cols-2">
          {names.map((n) => (
            <li key={n}>
              <a href={"#" + n} className="text-accent hover:text-accent-ink">
                {triggerFromName(CONTRACTS[n].name)}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {names.map((name) => {
        const c = CONTRACTS[name];
        const loop = PROMPT_MEMORY_LOOP[name] ?? null;
        const grouped = c.fields.some((f) => f.section);
        return (
          <section key={name} id={name} className="mt-10 scroll-mt-6">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-[17px] font-semibold tracking-[-0.01em] text-ink">
                {triggerFromName(c.name)}
              </h2>
              <span className="mono text-[11px] uppercase tracking-[0.04em] text-muted">
                {grouped ? "grouped" : "flat"} · memory loop: {loop ?? "none"}
              </span>
            </div>

            <pre className="mono mt-2 rounded-md border border-border bg-surface-2 px-3 py-2 text-[12px] text-ink">
              {"AI-Suplex: " + triggerFromName(c.name)}
            </pre>
            <p className="mt-2 max-w-[70ch] text-[13px] text-ink-2">{c.purpose}</p>

            <table className="mt-3 w-full border-collapse text-left text-[12px]">
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
                      {f.label ? (
                        <span className="mono text-[11px] text-muted"> · {f.label}</span>
                      ) : null}
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
                    <td className="border-b border-border py-1.5 align-top text-ink-2">
                      {f.hint}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <p className="mono mt-2 break-words text-[11px] text-muted">
              additional: {c.additionalHint} · pattern: {c.patternFile}
            </p>
            <p className="mt-2 text-[12px]">
              <Link
                href={"/commands?command=" + name}
                className="text-accent hover:text-accent-ink"
              >
                Compose {triggerFromName(c.name)} →
              </Link>
            </p>
          </section>
        );
      })}

      <section className="mt-10" aria-labelledby="copy-only-guide">
        <h2
          id="copy-only-guide"
          className="text-[17px] font-semibold tracking-[-0.01em] text-ink"
        >
          Copy-only
        </h2>
        <p className="mt-1 max-w-[70ch] text-[12px] text-muted">
          Triggers the vault holds but the console does not dispatch. Copy the
          trigger, run it in your agent.
        </p>
        <ul className="mt-3 divide-y divide-border rounded-lg border border-border bg-surface">
          {COPY_ONLY_COMMANDS.map((c) => (
            <li
              key={c.command}
              className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 px-4 py-2.5"
            >
              <span className="mono text-[12px] text-ink">{c.command}</span>
              <span className="mono text-[11px] text-muted">{c.link}</span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
