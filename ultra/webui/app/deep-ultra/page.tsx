import { getTier } from "@/lib/shell/surfaces";
import { configuredVaultPath, resolveVault } from "@/lib/shell/vault";
import { Panel } from "@/components/panel";
import { SurfaceHeader } from "@/components/surface-header";
import { DeepUltraView } from "@/components/deep-ultra-view";

export const dynamic = "force-dynamic";

export default function DeepUltraPage() {
  const tier = getTier();
  if (tier === "free") {
    return (
      <div className="p-6">
        <Panel tone="gate" title="Deep Ultra — Ultra tier required">
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

  return (
    <div className="flex min-h-full flex-col">
      <SurfaceHeader
        title="Deep Ultra"
        description="The Deep Ultra scoreboard, rendered verbatim from the tool."
      />
      <div className="min-h-0 flex-1">
        <DeepUltraView />
      </div>
    </div>
  );
}
