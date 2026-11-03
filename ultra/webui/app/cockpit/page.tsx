import { Panel } from "@/components/panel";
import { SurfaceHeader } from "@/components/surface-header";
import { CockpitBody } from "@/components/cockpit-sections";
import { loadCockpit } from "@/lib/shell/cockpit";
import { getTier } from "@/lib/shell/surfaces";
import { configuredVaultPath } from "@/lib/shell/vault";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * The AS MC cockpit — the ops pane, deliberately separate from the intelligence
 * surfaces. File-first and local-only: it reads the vault through the cockpit data
 * layer and never writes. Approvals are shown, never taken.
 */
export default async function CockpitPage() {
  const tier = getTier();
  if (tier === "free") {
    return (
      <div className="p-6">
        <Panel tone="gate" title="AS MC cockpit — Ultra tier required">
          Set <code className="font-mono text-[13px]">AISUPLEX_TIER=ultra</code> to view this surface.
        </Panel>
      </div>
    );
  }

  const data = await loadCockpit();

  if (!data.vault) {
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
    <div className="flex h-full flex-col">
      <SurfaceHeader
        title="AS MC cockpit"
        description="The local ops surface — read-first. The cockpit reports; the Hustler decides."
      />
      <div className="min-h-0 flex-1 overflow-y-auto">
        <CockpitBody data={data} />
      </div>
    </div>
  );
}
