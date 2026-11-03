import type { ReactNode } from "react";
import { artifactMeta, configuredVaultPath, resolveVault, type SurfaceKey } from "@/lib/shell/vault";
import { getTier } from "@/lib/shell/surfaces";
import { Panel } from "@/components/panel";
import { SurfaceHeader } from "@/components/surface-header";
import { ArtifactFrame } from "@/components/artifact-frame";

/**
 * Shared guard for the embedded canvas surfaces: tier gate → vault gate →
 * artifact gate, then the header + frame. Fails closed at every step.
 */
export async function CanvasSurface({
  surfaceKey,
  title,
  description,
  children,
}: {
  surfaceKey: SurfaceKey;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  const tier = getTier();
  if (tier === "free") {
    return (
      <div className="p-6">
        <Panel tone="gate" title={`${title} — Ultra tier required`}>
          Set <code className="font-mono text-[13px]">AISUPLEX_TIER=ultra</code> to view this surface.
        </Panel>
      </div>
    );
  }

  const vault = resolveVault();
  if (!vault) {
    return (
      <div className="p-6">
        <Panel tone="error" title="Vault unavailable">
          <code className="font-mono text-[13px]">AISUPLEX_VAULT</code> is unset or unreadable
          (resolved: <code className="font-mono text-[13px]">{configuredVaultPath()}</code>).
        </Panel>
      </div>
    );
  }

  const meta = await artifactMeta(surfaceKey, vault);
  if (!meta.ok) {
    return (
      <div className="p-6">
        <Panel tone="error" title={`${title} — artifact unavailable`}>
          <code className="font-mono text-[13px]">{meta.path}</code> could not be read.
        </Panel>
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-col">
      <SurfaceHeader title={title} description={description} meta={meta} />
      <div className="min-h-0 flex-1">
        {children ?? <ArtifactFrame surface={surfaceKey} title={title} artifactPath={meta.path} />}
      </div>
    </div>
  );
}
