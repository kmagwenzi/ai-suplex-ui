import path from "node:path";
import { getClient, harnessPath } from "@/lib/mcp/client";
import { readContext } from "@/lib/mcp/resources";
import type { OperatorBrief } from "@/lib/types";

export const dynamic = "force-dynamic";

const RESOLUTION_ORDER = [
  { source: "AISUPLEX_VAULT", rule: "env var — explicit, wins everywhere" },
  { source: "vault.json", rule: "the harness-local link, written by link.js" },
  { source: "walk-up", rule: "nearest ancestor directory with period.md" },
  { source: "fallback", rule: "the harness repo's co-located default" },
];

const LOOP = [
  { stage: "Plan", command: "AI-Suplex: Tasklist Generation", output: "Tasklists/" },
  { stage: "Context", command: "AI-Suplex: Kickstart", output: "context brief" },
  { stage: "Session Start", command: "AI-Suplex: Session Start", output: "Sessions/Active/Start/" },
  { stage: "Capture", command: "AI-Suplex: Artifact Capture", output: "Artifacts/…" },
  { stage: "Close", command: "AI-Suplex: Session End Report", output: "Sessions/Active/End/" },
  { stage: "Remember", command: "suplex_close", output: "episode + lessons" },
];

export default async function Setup() {
  const harnessDir = path.dirname(harnessPath());
  const sampleVault = path.resolve(process.cwd(), "sample-vault");

  let brief: OperatorBrief | null = null;
  let detectError: string | null = null;
  try {
    brief = await readContext();
  } catch (e) {
    detectError = e instanceof Error ? e.message : String(e);
  }

  const client = getClient();
  const status = client.status();
  let latency: number | null = null;
  try {
    latency = await client.ping();
  } catch {
    /* keep null — the dot turns red */
  }

  const linked = brief !== null;
  const linkCmd = (target: string) => `node ${path.join(harnessDir, "link.js")} ${target}`;

  return (
    <main className="pt-8">
      <h1 className="text-[24px] font-semibold tracking-[-0.02em] text-ink">
        Setup
      </h1>
      <p className="mt-2 max-w-[62ch] text-[13px] text-ink-2">
        First run. The console is read-only on the vault — it detects and
        documents the link, it never writes it. Linking is one harness-local
        command you run once.
      </p>

      {/* detect + connect */}
      <section className="mt-8 rounded-lg border border-border bg-surface p-6" aria-label="Vault and connection">
        <div className="flex items-center gap-2">
          <span className={"dot " + (linked && status.ok ? "dot-ok" : "dot-err")} />
          <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-ink">
            {linked ? "Vault linked" : "No vault linked"}
          </h2>
        </div>

        {linked && brief ? (
          <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-2 text-[13px] sm:grid-cols-2">
            <Row k="vault" v={brief.vault} mono />
            <Row
              k="period"
              v={`${brief.period} · Cycle ${brief.cycle} · Week ${brief.week}`}
            />
            <Row k="contract" v={status.contract ?? "—"} mono />
            <Row k="semver" v={status.semver ?? "—"} mono />
            <Row k="tier" v={status.tier ?? "—"} mono />
            <Row
              k="MCP"
              v={latency !== null ? `${latency}ms round-trip` : "down"}
              mono
            />
          </dl>
        ) : (
          <p className="mono mt-4 break-words text-[12px] text-error">{detectError}</p>
        )}
      </section>

      {/* link */}
      <section className="mt-6 rounded-lg border border-border bg-surface p-6" aria-label="Link the vault">
        <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-ink">
          Link the vault
        </h2>
        <p className="mt-1 max-w-[62ch] text-[13px] text-ink-2">
          Resolution order (the harness checks these, first match wins):
        </p>
        <ul className="mt-3 space-y-1.5 text-[13px] text-ink-2">
          {RESOLUTION_ORDER.map((r, i) => (
            <li key={r.source} className="flex gap-2">
              <span className="mono shrink-0 text-[12px] text-muted">{i + 1}.</span>
              <span>
                <code className="mono text-[12px] text-ink">{r.source}</code>{" "}
                <span className="text-muted">— {r.rule}</span>
              </span>
            </li>
          ))}
        </ul>

        <p className="mt-4 text-[13px] text-ink-2">
          Point this harness checkout at a vault, then verify:
        </p>
        <pre className="mono mt-2 overflow-x-auto rounded-md border border-border bg-surface-2 p-3 text-[12px] text-ink">
          {[
            linkCmd("/path/to/AI-Suplex-777"),
            `node ${path.join(harnessDir, "link.js")} --show`,
            `node ${path.join(harnessDir, "link.js")} --clear   # remove the link`,
          ].join("\n")}
        </pre>
        <p className="mt-2 text-[12px] text-muted">
          The console does not run <code className="mono text-[11px]">link.js</code> — you do,
          once. Reload this page to confirm the link took effect.
        </p>
      </section>

      {/* sample vault offer */}
      <section className="mt-6 rounded-lg border border-border bg-surface p-6" aria-label="Sample vault">
        <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-ink">
          Start from a sample vault
        </h2>
        <p className="mt-1 max-w-[62ch] text-[13px] text-ink-2">
          One realistic week is committed alongside this console — a tasklist, a
          session, artifacts, lessons, and a planted contradiction for the
          memory loop to surface.
        </p>
        <pre className="mono mt-3 overflow-x-auto rounded-md border border-border bg-surface-2 p-3 text-[12px] text-ink">
{linkCmd(sampleVault)}
        </pre>
        <div className="mt-3 text-[13px] text-ink-2">
          <span className="font-medium text-ink">Use the sample vault</span>{" "}
          <span className="text-muted">
            — a data reference: one week + the planted contradiction. Its file
            reads work, but the live pipeline needs the framework's{" "}
            <code className="mono text-[12px]">Tools/</code>, which ship in a real vault.
          </span>
          <br />
          <span className="font-medium text-ink">Use my vault</span>{" "}
          <span className="text-muted">
            — point <code className="mono text-[12px]">link.js</code> at your own checkout; this is the full loop.
          </span>
          <br />
          <span className="font-medium text-ink">New</span>{" "}
          <span className="text-muted">
            — creating a vault is a Sweeper step, not a console step; this screen only links.
          </span>
        </div>
      </section>

      {/* first loop */}
      <section className="mt-6 rounded-lg border border-border bg-surface p-6" aria-label="Run the first loop">
        <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-ink">
          Run the first loop
        </h2>
        <p className="mt-1 max-w-[62ch] text-[13px] text-ink-2">
          Walk the line. Each stage turns <span className="font-medium text-ink">done</span>{" "}
          only when its output file exists — copied is not done.
        </p>
        <ol className="mt-4 divide-y divide-border">
          {LOOP.map((s) => (
            <li key={s.stage} className="flex items-baseline justify-between gap-3 py-2.5">
              <div>
                <div className="text-[13px] font-medium text-ink">{s.stage}</div>
                <div className="mono mt-0.5 text-[12px] text-muted">{s.command}</div>
              </div>
              <div className="mono shrink-0 text-right text-[12px] text-muted">
                {s.output}
              </div>
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}

function Row({ k, v, mono = false }: { k: string; v: string; mono?: boolean }) {
  return (
    <div>
      <dt className="mono text-[11px] uppercase tracking-[0.04em] text-muted">{k}</dt>
      <dd className={mono ? "mono mt-0.5 text-[13px] text-ink" : "mt-0.5 text-[13px] text-ink"}>
        {v}
      </dd>
    </div>
  );
}
