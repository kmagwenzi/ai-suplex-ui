import { getTier } from "@/lib/shell/surfaces";
import { configuredVaultPath, resolveVault } from "@/lib/shell/vault";
import { Panel } from "@/components/panel";
import { ResonanceStage } from "@/components/resonance-stage";

export const dynamic = "force-dynamic";

export default function ResonancePage() {
  const tier = getTier();
  if (tier === "free") {
    return (
      <div className="p-6">
        <Panel tone="gate" title="Insight Resonance — Ultra tier required">
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
      <ResonanceStage />
    </div>
  );
}
