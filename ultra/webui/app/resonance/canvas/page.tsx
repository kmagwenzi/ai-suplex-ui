import { CanvasSurface } from "@/components/canvas-surface";

export const dynamic = "force-dynamic";

export default function ResonanceCanvasPage() {
  return (
    <CanvasSurface
      surfaceKey="insight-resonance"
      title="Insight Resonance — canvas"
      description="The full structural projection: hubs, paths, orphans and co-occurrence clusters."
    />
  );
}
