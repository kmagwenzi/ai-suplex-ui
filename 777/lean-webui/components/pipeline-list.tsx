import type { DerivedStage, Executor } from "@/lib/types";
import { EXECUTOR_GLYPH } from "@/lib/stages";
import { stageGlyph, stateTextClass } from "./stage-glyph";

const EXECUTOR_LABEL: Record<Executor, string> = {
  agent: "agent",
  deterministic: "deterministic",
  human: "human",
  "agent+tool": "agent + tool",
  "tool+human": "tool + human",
};

/** The whole assembly line as a readable vertical stack (spec §5 /pipeline). */
export function PipelineList({ stages }: { stages: DerivedStage[] }) {
  return (
    <div role="list" aria-label="Workflow pipeline">
      {stages.map((s) => (
        <div key={s.id} role="listitem" className="stage-row">
          <div className="stage-state">
            <span
              className={`pipeline-glyph ${stateTextClass(s.state)}`}
              aria-hidden
            >
              {stageGlyph(s.state)}
            </span>
          </div>
          <div className="stage-body">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <span className="stage-name">{s.name}</span>
              <span className="mono text-[11px] uppercase tracking-[0.04em] text-muted">
                {EXECUTOR_GLYPH[s.executor]} {EXECUTOR_LABEL[s.executor]}
              </span>
              {s.gate ? (
                <span className="mono text-[11px] uppercase tracking-[0.04em] text-attention">
                  gate: {s.gate}
                </span>
              ) : null}
            </div>
            <div className="stage-reason">{s.reason}</div>

            <dl className="stage-meta">
              <div className="stage-meta-item">
                <dt>command</dt>
                <dd>{s.command}</dd>
              </div>
              {s.inputs.length > 0 ? (
                <div className="stage-meta-item">
                  <dt>reads</dt>
                  <dd className="mono text-[12px]">{s.inputs.join(" · ")}</dd>
                </div>
              ) : null}
              <div className="stage-meta-item">
                <dt>output</dt>
                <dd className="mono text-[12px]">{s.output}</dd>
              </div>
            </dl>
          </div>
        </div>
      ))}
    </div>
  );
}
