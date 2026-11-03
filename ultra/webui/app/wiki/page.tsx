import { artifactMeta, configuredVaultPath, resolveVault } from "@/lib/shell/vault";
import { getTier } from "@/lib/shell/surfaces";
import { wikiSourceRoots } from "@/lib/shell/wiki-sources";
import { Panel } from "@/components/panel";
import { SurfaceHeader } from "@/components/surface-header";
import { ArtifactFrame } from "@/components/artifact-frame";
import { CopyPathButton } from "@/components/copy-path";

export const dynamic = "force-dynamic";

export default async function WikiPage() {
  const tier = getTier();
  if (tier === "free") {
    return (
      <div className="p-6">
        <Panel tone="gate" title="Living Wiki — Ultra tier required">
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

  const meta = await artifactMeta("wiki", vault);
  if (!meta.ok) {
    return (
      <div className="p-6">
        <Panel tone="error" title="Living Wiki — artifact unavailable">
          <code className="font-mono text-[13px]">{meta.path}</code> could not be read.
        </Panel>
      </div>
    );
  }

  const sources = wikiSourceRoots(vault);

  return (
    <div className="flex h-full flex-col">
      <SurfaceHeader
        title="Living Wiki"
        description="The living wiki, embedded as-is with its markdown sources."
        meta={meta}
      />

      {/* source rail — hand off to the editor, never render markdown here */}
      <section aria-label="Wiki sources" className="shrink-0 border-b border-border px-5 py-3 sm:px-8">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">Sources</h2>
        <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-2">
          {sources.map((s) => (
            <li key={s.label} className="flex items-center gap-2 text-[13px]">
              <a
                href={`obsidian://open?path=${encodeURIComponent(s.absolute)}`}
                className="font-mono text-ink-2 underline-offset-2 hover:text-ink hover:underline"
              >
                {s.label}
              </a>
              <span className="text-muted">{s.count} md</span>
              <CopyPathButton path={s.absolute} />
            </li>
          ))}
        </ul>
      </section>

      <div className="flex min-h-0 flex-1 flex-col">
        <ArtifactFrame surface="wiki" title="Living Wiki" artifactPath={meta.path} />
      </div>
    </div>
  );
}
