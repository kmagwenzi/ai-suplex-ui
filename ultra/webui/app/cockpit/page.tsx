import { CockpitStage } from "@/components/cockpit-stage";
import { FirstRun } from "@/components/first-run";
import { Panel } from "@/components/panel";
import { loadCockpit } from "@/lib/shell/cockpit";
import { buildCockpitView, parseScope } from "@/lib/shell/cockpit-room";
import { getTier } from "@/lib/shell/surfaces";
import { configuredVaultPath } from "@/lib/shell/vault";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * The AS MC cockpit — rank 0: the operator the other four surfaces run on.
 *
 * It reads the vault through the cockpit data layer and never writes. The view model is
 * composed on the server (pure, tested in node) and handed to the stage, so the browser
 * gets numbers, not a second copy of the tools.
 */
export default async function CockpitPage({
  searchParams,
}: {
  searchParams: Promise<{ scope?: string | string[] }>;
}) {
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

  const view = buildCockpitView(data);
  const initialScope = parseScope((await searchParams).scope);

  return (
    <div className="flex min-h-full flex-col">
      {view.firstRun ? (
        <FirstRun surface="cockpit" />
      ) : (
        <CockpitStage view={view} initialScope={initialScope} />
      )}
      <div className="px-6 py-7 sm:px-9">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
          <p className="max-w-[62ch] text-[13px] leading-6 text-ink-2">
            {view.firstRun ? (
              <>
                Nothing above was read — the vault is empty. The three commands fill it, and every panel
                then states a number it read rather than a number it assumed.
              </>
            ) : (
              <>
                Every read above comes from the vault itself — operator state from{" "}
                <code className="font-mono text-[12px]">Tools/asmc.js status</code>, the rhythm from{" "}
                <code className="font-mono text-[12px]">crontab -l</code>,{" "}
                <code className="font-mono text-[12px]">Tools/ritual.js</code> and the vault's own Hermes
                job list, the inbox from the approvals tool, the two memory files verbatim. Nothing here
                writes, approves or archives.
              </>
            )}
          </p>
          <p className="max-w-[42ch] truncate font-mono text-[11px] text-muted" title={data.vault}>
            {data.vault}
          </p>
        </div>
      </div>
    </div>
  );
}
