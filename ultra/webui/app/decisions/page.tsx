import { CanvasSurface } from "@/components/canvas-surface";

export const dynamic = "force-dynamic";

export default function DecisionsPage() {
  return (
    <CanvasSurface
      surfaceKey="decision-canvas"
      title="decision-canvas"
      description="Open decisions and their evidence, as a deterministic canvas."
    />
  );
}
