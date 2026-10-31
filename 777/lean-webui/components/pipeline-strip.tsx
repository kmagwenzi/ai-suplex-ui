import type { DerivedStage } from "@/lib/types";
import { stageGlyph } from "./stage-glyph";

/** The hero: the one thing no other tool shows — where you are in the loop. */
export function PipelineStrip({ stages }: { stages: DerivedStage[] }) {
  return (
    <div className="pipeline-strip" role="list" aria-label="Workflow pipeline">
      {stages.map((s) => (
        <span
          key={s.id}
          role="listitem"
          className={`pipeline-step is-${s.state}`}
          title={s.reason}
        >
          <span className="pipeline-glyph" aria-hidden>
            {stageGlyph(s.state)}
          </span>
          {s.name}
        </span>
      ))}
    </div>
  );
}
