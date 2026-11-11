"use client";

import Link from "next/link";
import { useState } from "react";
import type { Instance } from "@/lib/types";
import { groupByWorkspaceType, writerLabel } from "@/lib/workspace-board";
import { workspaceLabel } from "@/lib/workspace";

/** A workspace's human name: the client label for a singleton, else its slug. */
function instanceName(i: Instance): string {
  if (i.singleton) return workspaceLabel(i.thread);
  return i.slug ?? i.ref ?? i.thread;
}

/**
 * The /workspaces board — the four workspace types, grouped, with open/closed
 * filter. Read-only: the actions deep-link to the composer (Option A). It reads
 * nothing itself — the server page passes suplex://threads in as props.
 */
export function WorkspacesBoard({ instances }: { instances: Instance[] }) {
  const [showClosed, setShowClosed] = useState(false);
  const groups = groupByWorkspaceType(instances);

  const visible = (list: Instance[]) =>
    showClosed ? list : list.filter((i) => i.status !== "closed");

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href="/commands?command=define-workspace"
          className="rounded-md bg-accent px-3 py-1.5 text-[13px] font-medium text-on-accent hover:bg-accent-ink"
        >
          Define Workspace
        </Link>
        <Link
          href="/commands?command=kickstart-workspace"
          className="rounded-md border border-border bg-surface px-3 py-1.5 text-[13px] text-ink-2 hover:text-ink"
        >
          Kickstart Workspace
        </Link>
        <button
          type="button"
          onClick={() => setShowClosed((v) => !v)}
          aria-pressed={showClosed}
          className="ml-auto rounded-md border border-border bg-surface px-3 py-1.5 text-[13px] text-ink-2 hover:text-ink"
        >
          {showClosed ? "Hide closed" : "Show closed"}
        </button>
      </div>

      <div className="mt-6 grid gap-4">
        {groups.map((g) => {
          const rows = visible(g.instances);
          return (
            <section
              key={g.lane}
              className="rounded-lg border border-border bg-surface p-5"
              aria-labelledby={`ws-${g.lane}`}
            >
              <div className="flex items-baseline justify-between">
                <h2
                  id={`ws-${g.lane}`}
                  className="text-[15px] font-semibold tracking-[-0.01em] text-ink"
                >
                  {g.label}
                </h2>
                <span className="mono text-[11px] uppercase tracking-[0.04em] text-muted">
                  {rows.length} {rows.length === 1 ? "workspace" : "workspaces"}
                </span>
              </div>

              {rows.length === 0 ? (
                <p className="mt-3 text-[13px] text-ink-2">
                  — no {showClosed ? "" : "open "}workspaces —
                </p>
              ) : (
                <ul className="mt-3 space-y-3">
                  {rows.map((i) => (
                    <li
                      key={i.file}
                      className="rounded-md border border-border bg-surface-2 p-3"
                    >
                      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                        <span className="font-medium text-ink">{instanceName(i)}</span>
                        <span
                          className={
                            "mono text-[10px] uppercase tracking-[0.04em] " +
                            (i.status === "closed" ? "text-muted" : "text-accent-ink")
                          }
                        >
                          {i.status || "open"}
                        </span>
                        {i.singleton ? (
                          <span className="mono text-[11px] text-muted">singleton</span>
                        ) : null}
                      </div>
                      <div className="mono mt-1 text-[11px] text-muted">{i.file}</div>
                      <dl className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-ink-2">
                        <div>
                          <dt className="mono inline text-[10px] uppercase tracking-[0.04em] text-muted">
                            writer{" "}
                          </dt>
                          <dd className="inline">{writerLabel(i.writer)}</dd>
                        </div>
                        {i.agent ? (
                          <div>
                            <dt className="mono inline text-[10px] uppercase tracking-[0.04em] text-muted">
                              agent{" "}
                            </dt>
                            <dd className="inline">{i.agent}</dd>
                          </div>
                        ) : null}
                        {i.opened ? (
                          <div>
                            <dt className="mono inline text-[10px] uppercase tracking-[0.04em] text-muted">
                              opened{" "}
                            </dt>
                            <dd className="inline">{i.opened}</dd>
                          </div>
                        ) : null}
                        {typeof i.ageDays === "number" ? (
                          <div>
                            <dt className="mono inline text-[10px] uppercase tracking-[0.04em] text-muted">
                              age{" "}
                            </dt>
                            <dd className="inline">{i.ageDays}d</dd>
                          </div>
                        ) : null}
                      </dl>
                      {i.mission ? (
                        <p className="mt-2 text-[13px] text-ink-2">{i.mission}</p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
