import { getTier } from "@/lib/shell/surfaces";
import { configuredVaultPath, resolveVault } from "@/lib/shell/vault";
import { Panel } from "@/components/panel";
import { SkillsStage } from "@/components/skills-stage";

export const dynamic = "force-dynamic";

/**
 * Skills Evolution — a scene of the instrument, not a table.
 *
 * Three scopes: what could become a skill, what is waiting on the gate, and what exists.
 * Read-only by design; the promotion stays a command the human runs.
 */
export default function SkillsPage() {
  const tier = getTier();
  if (tier === "free") {
    return (
      <div className="p-6">
        <Panel tone="gate" title="Skills Evolution — Ultra tier required">
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
      <SkillsStage />
    </div>
  );
}
