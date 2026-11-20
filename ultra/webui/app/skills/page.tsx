import { getTier } from "@/lib/shell/surfaces";
import { configuredVaultPath, resolveVault } from "@/lib/shell/vault";
import { Panel } from "@/components/panel";
import { SurfaceHeader } from "@/components/surface-header";
import { listDrafts, listSkills, scanCandidates } from "@/lib/shell/skills";

export const dynamic = "force-dynamic";

/**
 * Skills Evolution — the assisted, gated half of the loop.
 *
 * The surface proposes (what Memory/procedural holds that Skills/ does not yet carry)
 * and shows what already exists. It never promotes: the command is printed for the
 * human to run, because a promotion is a decision, not a click.
 */
export default async function SkillsPage() {
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

  const [scan, library, drafts] = await Promise.all([
    scanCandidates(vault),
    listSkills(vault),
    listDrafts(vault),
  ]);

  const candidates = scan.ok ? scan.data.rows : [];
  const procedural = candidates.filter((c) => c.kind === "procedural");
  const open = procedural.filter((c) => !c.evolved && c.steps > 0);
  // Recent closed workspaces: the newer raw material. Skills Evolution was built before
  // workspaces existed, so these were invisible to it — a narrative to review, not a draft.
  const recent = candidates
    .filter((c) => c.kind === "workspace")
    .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));

  return (
    <div className="flex min-h-full flex-col">
      <SurfaceHeader
        title="Skills Evolution"
        description="What the vault has learned to repeat — and which workflows are ready to become skills."
      />

      <p className="mx-5 mt-4 border-l-2 border-attention pl-3 text-[13px] text-ink-2 sm:mx-8">
        Read-only. This surface <strong className="font-semibold text-ink">proposes</strong>; it never
        promotes. Run the command and the human gate stays where it belongs.
      </p>

      {/* ── the candidates ─────────────────────────────────────────────── */}
      <section aria-labelledby="candidates-h" className="mt-4 border-b border-border">
        <header className="flex flex-wrap items-baseline gap-x-4 gap-y-1 px-5 py-3 sm:px-8">
          <h2 id="candidates-h" className="text-xs font-semibold uppercase tracking-wide text-muted">
            Candidates
          </h2>
          <span className="font-mono text-[12px] text-ink-2">
            {scan.ok ? `${procedural.length} workflows · ${scan.data.evolved} already evolved` : "unavailable"}
          </span>
        </header>

        {!scan.ok ? (
          <Panel tone="error" title="The scan did not answer">
            <code className="font-mono text-[13px]">node Tools/skill-generate.js --scan --json</code> —{" "}
            {scan.error}
          </Panel>
        ) : open.length === 0 ? (
          <Panel tone="empty" title="Nothing left to evolve">
            Every workflow with steps already has a skill.
          </Panel>
        ) : (
          <ul className="px-5 pb-4 sm:px-8">
            {open.map((c) => (
              <li key={c.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-t border-border py-2 first:border-t-0">
                <span className="font-mono text-[12px] text-muted">{String(c.steps).padStart(2, "0")} steps</span>
                <span className="text-[13px] text-ink">{c.title}</span>
                <code className="ml-auto font-mono text-[11px] text-ink-2">
                  node Tools/skill-generate.js --from Memory/procedural/{c.id}.md
                </code>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── recent workspaces ──────────────────────────────────────────── */}
      <section aria-labelledby="workspaces-h" className="border-b border-border">
        <header className="flex flex-wrap items-baseline gap-x-4 gap-y-1 px-5 py-3 sm:px-8">
          <h2 id="workspaces-h" className="text-xs font-semibold uppercase tracking-wide text-muted">
            Recent workspaces
          </h2>
          <span className="font-mono text-[12px] text-ink-2">
            {scan.ok
              ? `${recent.length} in the last ${scan.data.workspaces.since_days} days`
              : "unavailable"}
          </span>
        </header>

        {!scan.ok ? (
          <Panel tone="error" title="The workspace scan did not answer">
            {scan.error}
          </Panel>
        ) : recent.length === 0 ? (
          <Panel tone="empty" title="No recent workspaces">
            Nothing closed in the window — the last week produced no narrative to mine.
          </Panel>
        ) : (
          <ul className="px-5 pb-4 sm:px-8">
            {recent.map((w) => (
              <li
                key={w.id}
                className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-t border-border py-2 first:border-t-0"
              >
                <span className="font-mono text-[12px] text-muted">{w.date}</span>
                <span className="font-mono text-[11px] text-muted">{w.age_days}d old</span>
                <span className="text-[13px] text-ink">{w.title}</span>
                {w.thread ? (
                  <span className="ml-auto font-mono text-[11px] text-ink-2">{w.thread}</span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── the library ────────────────────────────────────────────────── */}
      <section aria-labelledby="library-h" className="border-b border-border">
        <header className="flex flex-wrap items-baseline gap-x-4 gap-y-1 px-5 py-3 sm:px-8">
          <h2 id="library-h" className="text-xs font-semibold uppercase tracking-wide text-muted">
            Library
          </h2>
          <span className="font-mono text-[12px] text-ink-2">
            {library.ok ? `${library.data.length} skills` : "unavailable"}
          </span>
        </header>

        {!library.ok ? (
          <Panel tone="error" title="The library could not be read">
            {library.error}
          </Panel>
        ) : (
          <ul className="px-5 pb-4 sm:px-8">
            {library.data.map((s) => (
              <li key={s.name} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-t border-border py-2 first:border-t-0">
                <span className="font-mono text-[12px] text-ink-2">v{s.version}</span>
                <span className="text-[13px] text-ink">{s.name}</span>
                <span className="font-mono text-[11px] text-muted">{s.role}</span>
                <span className="ml-auto font-mono text-[12px] text-ink-2">q {s.quality.toFixed(2)}</span>
                <span className="font-mono text-[11px] uppercase tracking-wide text-muted">{s.status}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── the drafts ─────────────────────────────────────────────────── */}
      <section aria-labelledby="drafts-h" className="pb-8">
        <header className="flex flex-wrap items-baseline gap-x-4 gap-y-1 px-5 py-3 sm:px-8">
          <h2 id="drafts-h" className="text-xs font-semibold uppercase tracking-wide text-muted">
            Drafts
          </h2>
          <span className="font-mono text-[12px] text-ink-2">
            {drafts.ok ? `${drafts.data.length} waiting` : "unavailable"}
          </span>
        </header>

        {!drafts.ok ? (
          <Panel tone="error" title="The drafts could not be read">
            {drafts.error}
          </Panel>
        ) : drafts.data.length === 0 ? (
          <Panel tone="empty" title="No drafts yet">
            A draft lands in <code className="font-mono text-[12px]">Skills/_drafts/</code> when a
            candidate is generated. Nothing promotes itself.
          </Panel>
        ) : (
          <ul className="px-5 pb-4 sm:px-8">
            {drafts.data.map((d) => (
              <li key={d.name} className="flex flex-wrap items-baseline gap-x-3 border-t border-border py-2 first:border-t-0">
                <span className="text-[13px] text-ink">{d.name}</span>
                <span className="ml-auto font-mono text-[12px] text-ink-2">q {d.quality.toFixed(2)}</span>
                <span className="font-mono text-[11px] uppercase tracking-wide text-attention">{d.status}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
