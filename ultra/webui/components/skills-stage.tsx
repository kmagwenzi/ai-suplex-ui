"use client";

import { useEffect, useMemo, useState } from "react";
import { Panel } from "@/components/panel";
import type { Candidate, PromoteRow, PromoteQueue, SkillRecord } from "@/lib/shell/skills";

/**
 * The Skills stage — the same instrument as the two graph scenes.
 *
 * Skills Evolution is the only surface that changes state, so the stage is honest about
 * the seam: it shows what could become a skill, what is waiting on the gate (with the
 * gate's own blockers), and the library that results. Nothing writes. The human runs
 * the command.
 */

type Section<T> = ({ ok: true } & T) | { ok: false; error: string };

type Payload = {
  scan: Section<{ candidates: number; evolved: number; workspaces: { since_days: number; count: number }; rows: Candidate[] }>;
  library: Section<{ skills: SkillRecord[] }>;
  drafts: Section<{ drafts: { name: string; quality: number; status: string }[] }>;
  queue: Section<PromoteQueue>;
};

type State = { status: "loading" } | { status: "error"; message: string } | ({ status: "ok" } & Payload);

type Scope = "candidates" | "queue" | "library";

const SCOPES: { id: Scope; label: string }[] = [
  { id: "candidates", label: "Candidates" },
  { id: "queue", label: "Promotion queue" },
  { id: "library", label: "Library" },
];

function Row({
  active,
  onClick,
  left,
  title,
  right,
}: {
  active: boolean;
  onClick: () => void;
  left: string;
  title: string;
  right?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={
        "flex w-full items-baseline gap-4 border-l py-2.5 pl-3 pr-1 text-left transition-colors " +
        (active
          ? "border-[color:var(--stage-gold-hi)] bg-[rgba(184,134,46,0.06)]"
          : "border-[color:var(--hairline)] hover:border-[color:var(--hairline-strong)]")
      }
    >
      <span className="w-[86px] shrink-0 font-mono text-[10px] uppercase tracking-[0.12em] text-[color:var(--stage-mut)]">
        {left}
      </span>
      <span className={"min-w-0 flex-1 truncate text-[13px] " + (active ? "text-[color:var(--stage-ink)]" : "text-[color:var(--stage-cream)]")}>
        {title}
      </span>
      {right ? <span className="shrink-0 font-mono text-[10px] text-[color:var(--stage-mut)]">{right}</span> : null}
    </button>
  );
}

export function SkillsStage() {
  const [state, setState] = useState<State>({ status: "loading" });
  const [scope, setScope] = useState<Scope>("candidates");
  const [picked, setPicked] = useState<number>(0);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/skills");
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          if (active) setState({ status: "error", message: body?.error ?? `the skills route answered ${res.status}` });
          return;
        }
        const data = (await res.json()) as Payload;
        if (active) setState({ status: "ok", ...data });
      } catch (err) {
        if (active) setState({ status: "error", message: (err as Error).message });
      }
    })();
    return () => { active = false; };
  }, []);

  const scan = state.status === "ok" && state.scan.ok ? state.scan : null;
  const all = scan ? scan.rows : [];
  const candidates = useMemo(
    () => all.filter((r) => r.kind === "procedural" && !r.evolved && r.steps > 0),
    [all],
  );
  const queueRows = state.status === "ok" && state.queue.ok ? state.queue.rows : [];
  const skills = state.status === "ok" && state.library.ok ? state.library.skills : [];

  const pickedCandidate = scope === "candidates" ? candidates[picked] : undefined;
  const pickedQueue = scope === "queue" ? queueRows[picked] : undefined;
  const pickedSkill = scope === "library" ? skills[picked] : undefined;

  const count = scope === "candidates" ? candidates.length : scope === "queue" ? queueRows.length : skills.length;

  return (
    <div className="stage min-h-[560px]" data-scene="skills">
      <div className="grid gap-8 px-6 py-8 sm:px-9 lg:grid-cols-[228px_minmax(0,1fr)] lg:gap-12 lg:py-10">
        {/* mobile: the three scopes as chips — the rail costs a screen of scroll */}
        <div className="flex flex-wrap gap-2 lg:hidden">
          {SCOPES.map((s) => {
            const on = s.id === scope;
            const n = s.id === "candidates" ? candidates.length : s.id === "queue" ? queueRows.length : skills.length;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => { setScope(s.id); setPicked(0); }}
                aria-pressed={on}
                className={
                  "flex items-baseline gap-2 border px-2.5 py-1 text-[12px] transition-colors " +
                  (on
                    ? "border-[color:var(--stage-gold)] bg-[rgba(184,134,46,0.08)] text-[color:var(--stage-ink)]"
                    : "border-[color:var(--hairline-strong)] text-[color:var(--stage-mut)]")
                }
              >
                <span>{s.label}</span>
                <span className="font-mono text-[10px]">{n}</span>
              </button>
            );
          })}
        </div>

        <aside className="hidden flex-col lg:flex">
          <div className="micro mb-2">Scope</div>
          {SCOPES.map((s) => {
            const on = s.id === scope;
            const n = s.id === "candidates" ? candidates.length : s.id === "queue" ? queueRows.length : skills.length;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => { setScope(s.id); setPicked(0); }}
                aria-pressed={on}
                className={
                  "flex items-baseline justify-between border-l py-1.5 pl-3 pr-2 text-left text-[13px] transition-colors " +
                  (on
                    ? "border-[color:var(--stage-gold)] bg-[rgba(184,134,46,0.07)] text-[color:var(--stage-ink)]"
                    : "border-[color:var(--hairline-strong)] text-[color:var(--stage-mut)] hover:text-[color:var(--stage-ink)]")
                }
              >
                <span>{s.label}</span>
                <span className="font-mono text-[10px] text-[color:var(--stage-mut)]">{n}</span>
              </button>
            );
          })}
        </aside>

        <section className="min-w-0">
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 border-b border-[color:var(--hairline)] pb-3">
            <span className="micro">Skills evolution</span>
            <span className="micro flex items-center gap-5">
              {scan ? <span>{scan.candidates} rows · {scan.evolved} evolved</span> : null}
              <span>{count} in view</span>
            </span>
          </div>

          {state.status === "loading" ? (
            <div className="py-24 text-center"><span className="micro">Reading the library…</span></div>
          ) : state.status === "error" ? (
            <div className="pt-6"><Panel tone="error" title="The skills route did not answer">{state.message}</Panel></div>
          ) : (
            <div className="grid gap-8 pt-5 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-12">
              <div className="reveal min-w-0">
                {scope === "candidates" ? (
                  candidates.length === 0 ? (
                    <p className="text-[13px] text-[color:var(--stage-mut)]">Every workflow with steps already has a skill.</p>
                  ) : (
                    candidates.map((c, i) => (
                      <Row
                        key={c.id}
                        active={i === picked}
                        onClick={() => setPicked(i)}
                        left={`${String(c.steps).padStart(2, "0")} steps`}
                        title={c.title}
                        right={c.evolved ? "evolved" : undefined}
                      />
                    ))
                  )
                ) : scope === "queue" ? (
                  queueRows.length === 0 ? (
                    <p className="text-[13px] text-[color:var(--stage-mut)]">The queue is empty — no draft is waiting on a decision.</p>
                  ) : (
                    queueRows.map((q, i) => (
                      <Row
                        key={q.id}
                        active={i === picked}
                        onClick={() => setPicked(i)}
                        left={`q ${q.quality}`}
                        title={q.name}
                        right={q.blockers.length ? `${q.blockers.length} blocked` : "clear"}
                      />
                    ))
                  )
                ) : skills.length === 0 ? (
                  <p className="text-[13px] text-[color:var(--stage-mut)]">No curated skills found.</p>
                ) : (
                  skills.map((s, i) => (
                    <Row
                      key={s.name}
                      active={i === picked}
                      onClick={() => setPicked(i)}
                      left={`q ${s.quality.toFixed(2)}`}
                      title={s.name}
                      right={`v${s.version}`}
                    />
                  ))
                )}
              </div>

              <div className="reveal-late min-w-0">
                <div className="micro mb-2">Detail</div>

                {pickedCandidate ? (
                  <div className="border-t border-[color:var(--hairline)] pt-3">
                    <p className="text-[13px] leading-5 text-[color:var(--stage-ink)]">{pickedCandidate.title}</p>
                    <p className="mt-2 text-[12px] leading-5 text-[color:var(--stage-mut)]">{pickedCandidate.purpose}</p>
                    <code className="mt-3 block break-all border border-[color:var(--hairline-strong)] px-2 py-1.5 font-mono text-[10.5px] leading-4 text-[color:var(--stage-cream)]">
                      node Tools/skill-generate.js --from Memory/procedural/{pickedCandidate.id}.md
                    </code>
                    <p className="mt-2 text-[11px] leading-4 text-[color:var(--stage-mut)]">
                      Nothing promotes itself — the draft lands in <span className="font-mono">Skills/_drafts/</span> and waits for you.
                    </p>
                  </div>
                ) : null}

                {pickedQueue ? (
                  <div className="border-t border-[color:var(--hairline)] pt-3">
                    <p className="text-[13px] leading-5 text-[color:var(--stage-ink)]">{pickedQueue.name}</p>
                    <p className="mt-1 font-mono text-[10.5px] text-[color:var(--stage-mut)]">
                      target {pickedQueue.target} · {pickedQueue.steps} steps
                    </p>
                    {pickedQueue.blockers.length ? (
                      <ul className="mt-2">
                        {pickedQueue.blockers.map((b) => (
                          <li key={b} className="border-t border-[color:var(--hairline)] py-1.5 text-[12px] leading-5 text-[color:var(--stage-cream)]">
                            {b}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-2 text-[12px] leading-5 text-[color:var(--stage-gold-hi)]">
                        Clear to promote — run <span className="font-mono">Tools/skill-promote.js</span>.
                      </p>
                    )}
                  </div>
                ) : null}

                {pickedSkill ? (
                  <div className="border-t border-[color:var(--hairline)] pt-3">
                    <p className="text-[13px] leading-5 text-[color:var(--stage-ink)]">{pickedSkill.name}</p>
                    <p className="mt-2 font-mono text-[11px] leading-5 text-[color:var(--stage-mut)]">
                      {pickedSkill.role} · {pickedSkill.status} · v{pickedSkill.version}
                    </p>
                    <p className="mt-1 font-mono text-[11px] leading-5 text-[color:var(--stage-mut)]">
                      uses {pickedSkill.usesTools.join(", ") || "—"}
                    </p>
                  </div>
                ) : null}

                {!pickedCandidate && !pickedQueue && !pickedSkill ? (
                  <p className="text-[12px] text-[color:var(--stage-mut)]">Pick a row.</p>
                ) : null}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
