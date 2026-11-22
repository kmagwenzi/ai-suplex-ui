"use client";

import { useState } from "react";
import { Panel } from "@/components/panel";
import type { AgeMark, CockpitScope, CockpitView } from "@/lib/shell/cockpit-room";

/**
 * The AS MC cockpit — the instrument's ops scene.
 *
 * Same grammar as the other surfaces: a rail of scopes, a derived answer line, then the
 * read itself. What it deliberately does NOT have is a control: every number here is the
 * vault's, and the cockpit reports. Approving, promoting and archiving stay commands the
 * Hustler runs — the surface would be lying if it offered a button.
 */

const SCOPES: { id: CockpitScope; label: string }[] = [
  { id: "operator", label: "Operator state" },
  { id: "approvals", label: "Approvals inbox" },
  { id: "tasklists", label: "Active tasklists" },
  { id: "vault", label: "Vault" },
];

const MUT = "text-[color:var(--stage-mut)]";
const CREAM = "text-[color:var(--stage-cream)]";
const GOLD = "text-[color:var(--stage-gold-hi)]";

/** where a file's declared status starts: "active", "parked", "complete (…)" */
function statusWord(status: string): string {
  if (/^active/i.test(status)) return "active";
  if (/^parked/i.test(status)) return "parked";
  if (/^complete/i.test(status)) return "closed";
  return status.split(/[\s(]/)[0] || "—";
}

/** Age on a 14-day ladder: the bar is the reading, the number is the proof. */
function AgeBar({ days, frac, stale }: { days: number; frac: number; stale: boolean }) {
  return (
    <span className="flex shrink-0 items-center gap-2">
      <span className="relative block h-[3px] w-16 bg-[rgba(255,255,255,0.09)]" aria-hidden>
        <span
          className="absolute inset-y-0 left-0 block"
          style={{
            width: Math.round(frac * 100) + "%",
            background: stale ? "var(--stage-gold-hi)" : "rgba(241,245,249,0.42)",
          }}
        />
        {/* the 7-day line, drawn where it falls on the 14-day span */}
        <span className="absolute -inset-y-[2px] left-1/2 block w-px bg-[rgba(255,255,255,0.3)]" />
      </span>
      <span
        className={
          "w-9 text-right font-mono text-[10.5px] " +
          (stale ? "text-[color:var(--stage-gold-hi)]" : "text-[color:var(--stage-mut)]")
        }
      >
        {days.toFixed(1)}d
      </span>
    </span>
  );
}

function Stat({ label, value, note }: { label: string; value: string | number; note?: string }) {
  return (
    <div className="min-w-0">
      <div className="micro">{label}</div>
      <div className="mt-1 font-mono text-[16px] leading-6 text-[color:var(--stage-ink)]">{value}</div>
      {note ? (
        <div className="line-clamp-2 font-mono text-[10.5px] leading-4 text-[color:var(--stage-mut)]">{note}</div>
      ) : null}
    </div>
  );
}

function OperatorBody({ view }: { view: CockpitView["operator"] }) {
  return (
    <div>
      {view.stale.length > 0 ? (
        <div className="border border-[rgba(184,134,46,0.4)] bg-[rgba(184,134,46,0.06)] px-4 py-3">
          <div className="micro text-[color:var(--stage-gold-hi)]">Past the line</div>
          <ul className="mt-2 space-y-1">
            {view.stale.map((s) => (
              <li key={s.label} className="text-[12.5px] leading-5 text-[color:var(--stage-cream)]">
                <span className="font-mono text-[11px] text-[color:var(--stage-gold-hi)]">{s.days}d</span>
                {" · " + s.label}
                <span className="text-[color:var(--stage-mut)]"> — {s.fix}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-6 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <span className="micro">Open instances · oldest first</span>
        <span className="micro">bar = 14 days · tick = 7</span>
      </div>

      <ul className="mt-2 border-t border-[color:var(--hairline)]">
        {view.marks.map((m: AgeMark) => (
          <li key={m.key} className="border-b border-[color:var(--hairline)] py-2.5">
            <div className="flex items-baseline justify-between gap-4">
              <span className="min-w-0 truncate font-mono text-[10.5px] leading-5">
                <span className={CREAM}>{m.thread}</span>
                <span className={MUT}> · {m.instance}</span>
              </span>
              <AgeBar days={m.days} frac={m.frac} stale={m.stale} />
            </div>
            <p
              className="mt-0.5 truncate text-[12.5px] leading-5 text-[color:var(--stage-ink)]"
              title={m.mission ?? undefined}
            >
              {m.mission ?? "no mission recorded"}
            </p>
          </li>
        ))}
      </ul>

      <div className="mt-7 grid gap-x-8 gap-y-5 sm:grid-cols-3">
        <Stat
          label="Last shipped"
          value={view.lastShipped ? view.lastShipped.date : "—"}
          note={view.lastShipped?.title ?? "nothing recorded this period"}
        />
        <Stat
          label="Memory pulse"
          value={view.memory ? view.memory.lessons + " lessons" : "—"}
          note={
            view.memory
              ? view.memory.semantic +
                " semantic · " +
                view.memory.procedural +
                " procedural · " +
                view.memory.episodic +
                " episodic"
              : "the tool reported no counts"
          }
        />
        <Stat
          label="This week"
          value={view.weekly.review ? "review written" : "review open"}
          note={view.weekly.lastRitual ? "ritual " + view.weekly.lastRitual : "no ritual logged"}
        />
      </div>
    </div>
  );
}

function ApprovalsBody({ view }: { view: CockpitView["approvals"] }) {
  return (
    <div>
      <div className="grid grid-cols-2 gap-x-8 gap-y-5 sm:grid-cols-4">
        <Stat
          label="Lessons pool"
          value={view.pool}
          note={view.ready + " ready · " + view.borderline + " borderline"}
        />
        <Stat label="At the bar" value={view.ready} note="70 points or more" />
        <Stat label="B-Bombs" value={view.bBombs} note="promotion is human-only" />
        <Stat label="Gates" value={view.gates.length} note={view.gates.length ? "listed below" : "none open"} />
      </div>

      <div className="mt-6 border border-[color:var(--hairline-strong)] px-4 py-3">
        <div className="micro">The gate</div>
        <p className="mt-1.5 max-w-[64ch] text-[12.5px] leading-5 text-[color:var(--stage-mut)]">
          Read-only. The cockpit reports the inbox; it never approves, promotes or archives. Promotion
          stays a command the Hustler runs — no job writes into <span className="font-mono">B-Bombs/</span>.
        </p>
      </div>

      {view.gates.length > 0 ? (
        <ul className="mt-5">
          {view.gates.map((gate) => (
            <li
              key={gate}
              className="border-b border-[color:var(--hairline)] py-2 font-mono text-[11px] leading-5 text-[color:var(--stage-cream)]"
            >
              {gate}
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mt-7">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
          <span className="micro">Ready to promote — the Saturday call</span>
          <span className="micro">{view.readyItems.length} in view</span>
        </div>
        {view.readyItems.length > 0 ? (
          <ul className="mt-2 border-t border-[color:var(--hairline)]">
            {view.readyItems.map((item) => (
              <li key={item.text} className="flex gap-4 border-b border-[color:var(--hairline)] py-2.5">
                <span className="w-7 shrink-0 text-right font-mono text-[11px] leading-5 text-[color:var(--stage-gold-hi)]">
                  {item.score}
                </span>
                <span className="text-[12.5px] leading-5 text-[color:var(--stage-cream)]">{item.text}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-[12.5px] leading-5 text-[color:var(--stage-mut)]">
            No lesson clears the bar. The pool keeps filling.
          </p>
        )}
      </div>
    </div>
  );
}

function TasklistsBody({ view }: { view: CockpitView["tasklists"] }) {
  if (view.rows.length === 0) {
    return <p className="text-[12.5px] leading-5 text-[color:var(--stage-mut)]">No tasklist in the vault carries a task.</p>;
  }
  return (
    <ul className="border-t border-[color:var(--hairline)]">
      {view.rows.map((row) => {
        const pct = row.tasks > 0 ? Math.round((Math.min(row.done, row.tasks) / row.tasks) * 100) : 0;
        const closed = row.done >= row.tasks;
        return (
          <li key={row.file} className="border-b border-[color:var(--hairline)] py-3">
            <div className="flex items-baseline justify-between gap-4">
              <span
                className="min-w-0 truncate text-[13px] leading-5 text-[color:var(--stage-ink)]"
                title={row.title ?? row.file}
              >
                {row.title ?? row.file}
              </span>
              <span
                className={
                  "shrink-0 font-mono text-[10.5px] " +
                  (closed ? "text-[color:var(--stage-gold-hi)]" : "text-[color:var(--stage-mut)]")
                }
              >
                {row.done}/{row.tasks}
              </span>
            </div>
            <span className="mt-2 block h-[2px] w-full bg-[rgba(255,255,255,0.08)]" aria-hidden>
              <span
                className="block h-full"
                style={{
                  width: pct + "%",
                  background: closed ? "var(--stage-gold-hi)" : "rgba(241,245,249,0.5)",
                }}
              />
            </span>
            <div className="mt-1.5 flex items-baseline justify-between gap-4">
              <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.12em] text-[color:var(--stage-mut)]">
                {statusWord(row.status)}
              </span>
              <span className="min-w-0 truncate font-mono text-[10.5px] text-[color:var(--stage-cream)]">
                {row.next ? row.next + " · " + (row.nextTitle ?? "") : "no open task"}
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function VaultBody({ vault }: { vault: CockpitView["vault"] }) {
  const [file, setFile] = useState<"context" | "log">("context");
  const section = file === "context" ? vault.context : vault.log;

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {(
          [
            { id: "context", label: "Memory/vault-context.md" },
            { id: "log", label: "Memory/vault-log.md" },
          ] as const
        ).map((f) => {
          const on = f.id === file;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => setFile(f.id)}
              aria-pressed={on}
              className={
                "border px-2.5 py-1 font-mono text-[10.5px] transition-colors " +
                (on
                  ? "border-[color:var(--stage-gold)] bg-[rgba(184,134,46,0.08)] text-[color:var(--stage-cream)]"
                  : "border-[color:var(--hairline-strong)] text-[color:var(--stage-mut)] hover:text-[color:var(--stage-cream)]")
              }
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {section.ok ? (
        <pre className="mt-3 max-h-[560px] overflow-auto whitespace-pre-wrap break-words border border-[color:var(--hairline)] bg-[color:var(--stage-900)] p-4 font-mono text-[11.5px] leading-5 text-[color:var(--stage-mut)]">
          {section.value.trim() || "(empty)"}
        </pre>
      ) : (
        <div className="mt-3">
          <Panel tone="error" title="That vault file could not be read">
            {section.error}
          </Panel>
        </div>
      )}
    </div>
  );
}

export function CockpitStage({ view, initialScope = "operator" }: { view: CockpitView; initialScope?: CockpitScope }) {
  const [scope, setScope] = useState<CockpitScope>(initialScope);
  const meta = view.scopes.find((s) => s.id === scope) ?? view.scopes[0];

  const section =
    scope === "operator"
      ? view.operator
      : scope === "approvals"
        ? view.approvals
        : scope === "tasklists"
          ? view.tasklists
          : null;

  const answer =
    section?.answer ?? "The vault's own context, verbatim — read here, edited there, never written by this surface.";
  const headline = section?.headline ?? "two files · read-only";

  return (
    <div className="stage min-h-[560px]" data-scene="console">
      <div className="grid gap-8 px-6 py-8 sm:px-9 lg:grid-cols-[236px_minmax(0,1fr)] lg:gap-12 lg:py-10">
        <div className="flex flex-wrap gap-2 lg:hidden">
          {SCOPES.map((s) => {
            const m = view.scopes.find((x) => x.id === s.id);
            const on = s.id === scope;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setScope(s.id)}
                aria-pressed={on}
                className={
                  "flex items-baseline gap-2 border px-2.5 py-1 text-[12px] transition-colors " +
                  (on
                    ? "border-[color:var(--stage-gold)] bg-[rgba(184,134,46,0.08)] text-[color:var(--stage-ink)]"
                    : "border-[color:var(--hairline-strong)] text-[color:var(--stage-mut)]")
                }
              >
                <span>{s.label}</span>
                <span className="font-mono text-[10px]">{m?.count ?? ""}</span>
              </button>
            );
          })}
        </div>

        <aside className="hidden flex-col lg:flex">
          <p className="font-mono text-[11px] leading-5 text-[color:var(--stage-cream)]">{view.identity.date}</p>
          <p className="font-mono text-[10.5px] leading-5 text-[color:var(--stage-mut)]">
            cycle {view.identity.cycle} · week {view.identity.week}
          </p>
          <nav className="mt-6 flex flex-col" aria-label="Cockpit sections">
            {SCOPES.map((s) => {
              const m = view.scopes.find((x) => x.id === s.id);
              const on = s.id === scope;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setScope(s.id)}
                  aria-pressed={on}
                  className={
                    "flex items-baseline justify-between border-l py-1.5 pl-3 pr-2 text-left text-[13px] transition-colors " +
                    (on
                      ? "border-[color:var(--stage-gold)] bg-[rgba(184,134,46,0.07)] text-[color:var(--stage-ink)]"
                      : "border-[color:var(--hairline-strong)] text-[color:var(--stage-mut)] hover:text-[color:var(--stage-ink)]")
                  }
                >
                  <span>{s.label}</span>
                  <span className="ml-2 font-mono text-[10px] text-[color:var(--stage-mut)]">{m?.count ?? ""}</span>
                </button>
              );
            })}
          </nav>
          <div className="mt-6 border-t border-[color:var(--hairline)] pt-3">
            <p className="font-mono text-[10.5px] leading-5 text-[color:var(--stage-mut)]">
              {view.scopes[0].state} · {view.scopes[1].state}
            </p>
            <p className="font-mono text-[10.5px] leading-5 text-[color:var(--stage-mut)]">
              {view.scopes[2].state} · {view.scopes[3].state}
            </p>
          </div>
        </aside>

        <section className="min-w-0">
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-[color:var(--hairline)] pb-3">
            <span className="micro">{meta.label}</span>
            <span className="micro">{headline}</span>
          </div>

          <div className="reveal">
            <div className="micro mb-2 mt-5">Answer</div>
            <p className="display text-[19px] leading-[1.35] text-[color:var(--stage-ink)] sm:text-[22px]">{answer}</p>
          </div>

          <div key={scope} className="reveal mt-6">
            {scope === "operator" ? (
              view.operator.ok ? (
                <OperatorBody view={view.operator} />
              ) : (
                <Panel tone="error" title="Operator state unavailable">
                  {view.operator.error}
                </Panel>
              )
            ) : scope === "approvals" ? (
              view.approvals.ok ? (
                <ApprovalsBody view={view.approvals} />
              ) : (
                <Panel tone="error" title="Approvals inbox unavailable">
                  {view.approvals.error}
                </Panel>
              )
            ) : scope === "tasklists" ? (
              view.tasklists.ok ? (
                <TasklistsBody view={view.tasklists} />
              ) : (
                <Panel tone="error" title="Tasklists unavailable">
                  {view.tasklists.error}
                </Panel>
              )
            ) : (
              <VaultBody vault={view.vault} />
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
