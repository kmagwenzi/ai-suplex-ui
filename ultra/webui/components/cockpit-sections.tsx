import { Panel } from "@/components/panel";
import type {
  Approvals,
  CockpitData,
  OperatorStatus,
  Section,
  TasklistRow,
} from "@/lib/shell/cockpit";

/** One failure shape for every cockpit section: the panel names the command it tried. */
function SectionError({ title, section }: { title: string; section: Section<unknown> }) {
  if (section.ok) return null;
  return (
    <Panel tone="error" title={title}>
      <p>{section.error}</p>
      {section.command ? (
        <p className="mt-2 font-mono text-[12px] text-muted">
          {section.command}
          {typeof section.exitCode === "number" ? ` · exit ${section.exitCode}` : ""}
        </p>
      ) : null}
    </Panel>
  );
}

function Stale({ days }: { days: number }) {
  const stale = days > 7;
  return (
    <span
      className={`font-mono text-[12px] ${stale ? "text-attention" : "text-muted"}`}
      title={stale ? "Stale — close it (Save Context → archive, dated)" : "Fresh"}
    >
      {days.toFixed(1)}d
    </span>
  );
}

export function OperatorPanel({ section }: { section: Section<OperatorStatus> }) {
  if (!section.ok) return <SectionError title="Operator state unavailable" section={section} />;
  const s = section.value;

  return (
    <section aria-labelledby="operator-h" className="border-b border-border">
      <header className="flex flex-wrap items-baseline gap-x-4 gap-y-1 px-5 py-3 sm:px-8">
        <h2 id="operator-h" className="text-xs font-semibold uppercase tracking-wide text-muted">
          Operator state
        </h2>
        <span className="font-mono text-[12px] text-ink-2">
          cycle {s.cycle} · week {s.week} · {s.date}
        </span>
        <span className="font-mono text-[12px] text-ink-2">
          <span className="text-ink">{s.open}</span> instances open
        </span>
        <span
          className={`font-mono text-[12px] ${s.ok ? "text-muted" : "text-attention"}`}
        >
          {s.ok ? "guard clean" : `${s.stale.length} stale`}
        </span>
      </header>

      {s.stale.length > 0 ? (
        <ul className="mx-5 mb-3 space-y-1 border-l-2 border-attention pl-3 sm:mx-8">
          {s.stale.map((row) => (
            <li key={row.label} className="text-[13px] text-ink-2">
              <span className="font-mono text-[12px] text-attention">{row.days}d</span>{" "}
              {row.label} — {row.fix}
            </li>
          ))}
        </ul>
      ) : null}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-t border-border text-left text-[13px]">
          <thead>
            <tr className="text-[11px] uppercase tracking-wide text-muted">
              <th scope="col" className="px-5 py-2 font-medium sm:px-8">Thread</th>
              <th scope="col" className="px-3 py-2 font-medium">Instance</th>
              <th scope="col" className="px-3 py-2 font-medium">Mission</th>
              <th scope="col" className="px-3 py-2 text-right font-medium">Age</th>
            </tr>
          </thead>
          <tbody>
            {s.instances.map((row) => (
              <tr key={row.file} className="border-t border-border">
                <td className="px-5 py-2 font-mono text-[12px] text-ink-2 sm:px-8">{row.thread}</td>
                <td className="px-3 py-2 font-mono text-[12px] text-ink">
                  {row.singleton ? "singleton" : `${row.ref} · ${row.slug}`}
                </td>
                <td className="max-w-[520px] px-3 py-2 text-ink-2">{row.mission ?? "—"}</td>
                <td className="px-3 py-2 text-right">
                  <Stale days={row.ageDays} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function ApprovalsPanel({ section }: { section: Section<Approvals> }) {
  if (!section.ok) return <SectionError title="Approvals inbox unavailable" section={section} />;
  const a = section.value;

  return (
    <section aria-labelledby="approvals-h" className="border-b border-border">
      <header className="flex flex-wrap items-baseline gap-x-4 gap-y-1 px-5 py-3 sm:px-8">
        <h2 id="approvals-h" className="text-xs font-semibold uppercase tracking-wide text-muted">
          Approvals inbox
        </h2>
        <span className={`font-mono text-[12px] ${a.pending ? "text-attention" : "text-muted"}`}>
          {a.pending ? "decisions pending" : "nothing pending"}
        </span>
        <span className="font-mono text-[12px] text-ink-2">
          gates {a.gates.length} · b-bombs {a.bBombs.count}
        </span>
      </header>

      {/* The gate is the product: this surface reports, the Hustler decides. */}
      <p className="mx-5 mb-3 border-l-2 border-attention pl-3 text-[13px] text-ink-2 sm:mx-8">
        Read-only. The cockpit reports the inbox; it <strong className="font-semibold text-ink">never</strong>{" "}
        approves, promotes or archives. Promotion stays human — no job writes into{" "}
        <code className="font-mono text-[12px]">B-Bombs/</code>.
      </p>

      <div className="grid gap-x-8 gap-y-3 px-5 pb-4 sm:grid-cols-3 sm:px-8">
        <div>
          <div className="font-mono text-[11px] uppercase tracking-wide text-muted">Lessons pool</div>
          <div className="font-mono text-[16px] text-ink">{a.lessons.pool}</div>
          <div className="font-mono text-[11px] text-muted">
            {a.lessons.ready} ready · {a.lessons.borderline} borderline
          </div>
        </div>
        <div>
          <div className="font-mono text-[11px] uppercase tracking-wide text-muted">B-Bombs</div>
          <div className="font-mono text-[16px] text-ink">{a.bBombs.count}</div>
          <div className="font-mono text-[11px] text-muted">promotion is human-only</div>
        </div>
        <div>
          <div className="font-mono text-[11px] uppercase tracking-wide text-muted">Generated</div>
          <div className="font-mono text-[13px] text-ink-2">{new Date(a.generated).toLocaleString()}</div>
        </div>
      </div>

      {a.gates.length > 0 ? (
        <ul className="mx-5 mb-4 space-y-1 border-l-2 border-attention pl-3 sm:mx-8">
          {a.gates.map((gate, i) => (
            <li key={i} className="font-mono text-[12px] text-ink-2">
              {typeof gate === "string" ? gate : JSON.stringify(gate)}
            </li>
          ))}
        </ul>
      ) : null}

      {a.lessons.readyItems.length > 0 ? (
        <div className="overflow-hidden">
          <h3 className="px-5 pb-1 font-mono text-[11px] uppercase tracking-wide text-muted sm:px-8">
            Ready to promote (≥70) — the Saturday call
          </h3>
          <ul className="max-h-64 overflow-y-auto border-t border-border">
            {a.lessons.readyItems.map((item, i) => (
              <li
                key={i}
                className="flex gap-3 border-b border-border px-5 py-2 text-[13px] text-ink-2 sm:px-8"
              >
                <span className="w-8 shrink-0 font-mono text-[12px] text-attention">{item.score}</span>
                <span>{item.text}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

export function TasklistsPanel({
  tasklists,
  error,
}: {
  tasklists: TasklistRow[];
  error?: Section<unknown>;
}) {
  if (error && !error.ok) return <SectionError title="Tasklists unavailable" section={error} />;

  return (
    <section aria-labelledby="tasklists-h" className="border-b border-border">
      <header className="flex flex-wrap items-baseline gap-x-4 px-5 py-3 sm:px-8">
        <h2 id="tasklists-h" className="text-xs font-semibold uppercase tracking-wide text-muted">
          Active tasklists
        </h2>
        <span className="font-mono text-[12px] text-ink-2">{tasklists.length}</span>
      </header>
      <div className="max-h-80 overflow-y-auto border-t border-border">
        <table className="w-full min-w-[640px] border-collapse text-left text-[13px]">
          <thead className="sticky top-0 bg-surface">
            <tr className="text-[11px] uppercase tracking-wide text-muted">
              <th scope="col" className="px-5 py-2 font-medium sm:px-8">Tasklist</th>
              <th scope="col" className="px-3 py-2 font-medium">Progress</th>
              <th scope="col" className="px-3 py-2 font-medium">Next</th>
            </tr>
          </thead>
          <tbody>
            {tasklists.map((row) => (
              <tr key={row.file} className="border-t border-border">
                <td className="px-5 py-2 sm:px-8">
                  <div className="text-ink">{row.title ?? row.file}</div>
                  <div className="font-mono text-[11px] text-muted">{row.file}</div>
                </td>
                <td className="px-3 py-2 font-mono text-[12px] text-ink-2">
                  {row.done}/{row.tasks}
                </td>
                <td className="px-3 py-2 font-mono text-[12px] text-ink-2">
                  {row.next ? `${row.next} · ${row.nextTitle ?? ""}` : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function VaultPanel({
  context,
  log,
}: {
  context: Section<string>;
  log: Section<string>;
}) {
  const block = (title: string, section: Section<string>, id: string) => (
    <div className="min-w-0">
      <h3 id={id} className="font-mono text-[11px] uppercase tracking-wide text-muted">
        {title}
      </h3>
      {section.ok ? (
        <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap break-words border border-border bg-surface-2 p-3 font-mono text-[12px] leading-relaxed text-ink-2">
          {section.value.trim() || "(empty)"}
        </pre>
      ) : (
        <div className="mt-2 border border-border bg-surface-2 p-3 text-[13px] text-muted">
          {section.error}
          {section.command ? (
            <div className="mt-1 font-mono text-[11px]">{section.command}</div>
          ) : null}
        </div>
      )}
    </div>
  );

  return (
    <section aria-labelledby="vault-h" className="px-5 py-4 sm:px-8">
      <h2 id="vault-h" className="text-xs font-semibold uppercase tracking-wide text-muted">
        Vault
      </h2>
      <div className="mt-3 grid gap-6 lg:grid-cols-2">
        {block("vault-context.md", context, "ctx-h")}
        {block("vault-log.md", log, "log-h")}
      </div>
    </section>
  );
}

export function CockpitBody({ data }: { data: CockpitData }) {
  const tasklists: TasklistRow[] = data.status.ok ? data.status.value.tasklists : [];
  return (
    <div className="flex h-full flex-col">
      <OperatorPanel section={data.status} />
      <ApprovalsPanel section={data.approvals} />
      <TasklistsPanel tasklists={tasklists} error={data.status} />
      <VaultPanel context={data.vaultContext} log={data.vaultLog} />
    </div>
  );
}
