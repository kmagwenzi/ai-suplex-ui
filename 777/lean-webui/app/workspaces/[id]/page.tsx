import Link from "next/link";
import { readConsoleData, readMission, readTasklist } from "@/lib/mcp/resources";
import {
  findInstance,
  matchTasklistsFor,
  tasklistCandidates,
  tasklistProgress,
} from "@/lib/workspace-detail";
import { writerLabel } from "@/lib/workspace-board";
import { workspaceLabel } from "@/lib/workspace";

export const dynamic = "force-dynamic";

/** Read the first existing body for a tasklist basename; null when none reads. */
async function readBody(file: string): Promise<string | null> {
  for (const rel of tasklistCandidates(file)) {
    const text = await readTasklist(rel).catch(() => null);
    if (text) return text;
  }
  return null;
}

const Label = ({ children }: { children: string }) => (
  <dt className="mono inline text-[10px] uppercase tracking-[0.04em] text-muted">
    {children}{" "}
  </dt>
);

/**
 * The workspace deep view — one instance, everything the mcp v1 read surface
 * can honestly show: identity, its tasklists (canonical filename match, full
 * bodies via suplex://tasklist/{file}), and the typed unknowns (sessions and
 * captures are not on the read surface — the view says so, never fakes them).
 * The daily singleton additionally shows the Active Mission Context, whose
 * sole writer it is.
 */
export default async function WorkspaceDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
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

  const instances = data.threads ?? data.brief.instances ?? [];
  const instance = findInstance(instances, id);

  if (!instance) {
    return (
      <main className="pt-10">
        <div className="rounded-lg border border-border bg-surface p-6">
          <h1 className="text-[20px] font-semibold tracking-[-0.01em] text-ink">
            No workspace {id}
          </h1>
          <p className="mt-3 text-[13px] text-ink-2">
            No open instance owns that filename. Workspaces close and archive —
            a closed lane is not on the read surface.
          </p>
          <Link
            href="/workspaces"
            className="mono mt-4 inline-block text-[12px] text-accent-ink hover:underline"
          >
            back to the board
          </Link>
        </div>
      </main>
    );
  }

  const tasklists = matchTasklistsFor(
    instance,
    data.tasklists?.tasklists ?? data.brief.tasklists ?? [],
  );
  const bodies = await Promise.all(
    tasklists.map(async (t) => ({ file: t.file, body: await readBody(t.file) })),
  );
  const mission =
    instance.singleton && instance.thread === "daily-tasks"
      ? await readMission().catch(() => null)
      : null;

  return (
    <main className="pt-8">
      <Link
        href="/workspaces"
        className="mono text-[12px] text-accent-ink hover:underline"
      >
        back to the board
      </Link>

      <header className="mt-4">
        <h1 className="text-[24px] font-semibold tracking-[-0.02em] text-ink">
          {instance.slug ?? workspaceLabel(instance.thread)}
        </h1>
        {instance.mission ? (
          <p className="mt-2 max-w-[68ch] text-[13px] text-ink-2">{instance.mission}</p>
        ) : (
          <p className="mono mt-2 text-[12px] text-muted">no mission on the read surface</p>
        )}
        <dl className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-ink-2">
          <div>
            <Label>lane</Label>
            <dd className="inline">{workspaceLabel(instance.thread)}</dd>
          </div>
          {instance.ref ? (
            <div>
              <Label>ref</Label>
              <dd className="inline">{instance.ref}</dd>
            </div>
          ) : null}
          <div>
            <Label>status</Label>
            <dd className="inline">{instance.status || "open"}</dd>
          </div>
          <div>
            <Label>writer</Label>
            <dd className="inline">{writerLabel(instance.writer)}</dd>
          </div>
          {instance.opened ? (
            <div>
              <Label>opened</Label>
              <dd className="inline">{instance.opened}</dd>
            </div>
          ) : null}
          {typeof instance.ageDays === "number" ? (
            <div>
              <Label>age</Label>
              <dd className="inline">{instance.ageDays.toFixed(1)}d</dd>
            </div>
          ) : null}
          <div>
            <Label>file</Label>
            <dd className="mono inline">{instance.file}</dd>
          </div>
        </dl>
      </header>

      <section className="mt-8" aria-labelledby="ws-tasklists">
        <h2
          id="ws-tasklists"
          className="text-[15px] font-semibold tracking-[-0.01em] text-ink"
        >
          Tasklists
        </h2>
        <p className="mt-1 max-w-[62ch] text-[12px] text-muted">
          Matched by the canonical filename token only — nothing else is claimed.
        </p>
        {tasklists.length === 0 ? (
          <p className="mt-3 rounded-md border border-border bg-surface p-3 text-[13px] text-ink-2">
            No tasklist carries this workspace token in its filename. Singleton
            tasklists do not carry the lane token, so the match stays honestly
            empty until the vault names them.
          </p>
        ) : (
          <ul className="mt-3 space-y-3">
            {tasklists.map((t) => {
              const body = bodies.find((b) => b.file === t.file)?.body ?? null;
              return (
                <li
                  key={t.file}
                  className="rounded-lg border border-border bg-surface p-4"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="font-medium text-ink">{t.title}</span>
                    <span className="mono text-[11px] uppercase tracking-[0.04em] text-accent-ink">
                      {t.status}
                    </span>
                  </div>
                  <div className="mono mt-1 text-[11px] text-muted">
                    {t.file} · {tasklistProgress(t)}
                  </div>
                  {t.next ? (
                    <p className="mt-2 text-[13px] text-ink-2">
                      <span className="mono text-[10px] uppercase tracking-[0.04em] text-muted">
                        next{" "}
                      </span>
                      <span className="mono">{t.next}</span>
                      {t.nextTitle ? ` — ${t.nextTitle}` : ""}
                    </p>
                  ) : null}
                  {body ? (
                    <details className="mt-3">
                      <summary className="mono cursor-pointer text-[12px] text-accent-ink hover:underline">
                        read the tasklist
                      </summary>
                      <pre className="mono mt-2 max-h-[24rem] overflow-auto whitespace-pre-wrap rounded-md border border-border bg-surface-2 p-3 text-[11px] leading-relaxed text-ink-2">
                        {body}
                      </pre>
                    </details>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {mission ? (
        <section className="mt-8" aria-labelledby="ws-mission">
          <h2
            id="ws-mission"
            className="text-[15px] font-semibold tracking-[-0.01em] text-ink"
          >
            Live mission context
          </h2>
          <p className="mt-1 max-w-[62ch] text-[12px] text-muted">
            The Active Mission Context — this singleton lane is its sole writer.
          </p>
          <pre className="mono mt-3 max-h-[24rem] overflow-auto whitespace-pre-wrap rounded-lg border border-border bg-surface p-4 text-[11px] leading-relaxed text-ink-2">
            {mission}
          </pre>
        </section>
      ) : null}

      <section className="mt-8" aria-labelledby="ws-unknown">
        <h2
          id="ws-unknown"
          className="text-[15px] font-semibold tracking-[-0.01em] text-ink"
        >
          Sessions and captures
        </h2>
        <p className="mt-2 max-w-[62ch] rounded-md border border-border bg-surface p-3 text-[13px] text-ink-2">
          Not on the mcp v1 read surface yet — the harness exposes no session or
          capture reads, so this view shows unknown rather than a guess. The
          nearest honest signal is the opened date above.
        </p>
      </section>
    </main>
  );
}
