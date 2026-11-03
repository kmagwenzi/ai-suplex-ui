import { CanvasSurface } from "@/components/canvas-surface";

export const dynamic = "force-dynamic";

export default function ResonancePage() {
  return (
    <CanvasSurface
      surfaceKey="insight-resonance"
      title="Insight Resonance"
      description="Insights that repeat across sessions, surfaced by resonance."
    />
  );
}
