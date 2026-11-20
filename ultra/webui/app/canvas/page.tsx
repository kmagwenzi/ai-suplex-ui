import { CanvasSurface } from "@/components/canvas-surface";

export const dynamic = "force-dynamic";

export default function CanvasPage() {
  return (
    <CanvasSurface
      surfaceKey="knowledge-canvas"
      title="Knowledge Canvas"
      description="The vault's knowledge graph, projected as a self-contained canvas."
    />
  );
}
