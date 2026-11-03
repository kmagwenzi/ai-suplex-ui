import { Panel } from "@/components/panel";
import { SurfaceHeader } from "@/components/surface-header";

export const dynamic = "force-dynamic";

export default function CockpitPage() {
  return (
    <div className="flex min-h-full flex-col">
      <SurfaceHeader
        title="AS MC cockpit"
        description="The local ops surface — approvals inbox, active tasklists, vault log."
      />
      <div className="flex flex-1 items-center justify-center p-6">
        <Panel tone="gate" title="AS MC cockpit — locked">
          Wired in T010. A local-only (<code className="font-mono text-[13px]">127.0.0.1</code>),
          file-first ops surface. Not available in this build.
        </Panel>
      </div>
    </div>
  );
}
