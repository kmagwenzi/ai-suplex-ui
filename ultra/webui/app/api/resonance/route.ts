import { NextResponse } from "next/server";
import { configuredVaultPath, resolveVault } from "@/lib/shell/vault";
import { readResonance } from "@/lib/shell/resonance";

/** GET /api/resonance — the projection's own embedded data, reduced to what the stage shows. */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const vault = resolveVault();
  if (!vault) {
    return NextResponse.json(
      { ok: false, error: "vault unavailable", resolved: configuredVaultPath() },
      { status: 501 },
    );
  }

  const res = await readResonance(vault);
  if (!res.ok) {
    return NextResponse.json({ ok: false, error: res.error }, { status: 500 });
  }

  const { nodes, hubs, orphans, clusters, crossFocus } = res.data;
  const imported = orphans.filter((o) => o.type === "community-skill").length;

  return NextResponse.json(
    {
      ok: true,
      counts: {
        nodes: nodes.length,
        hubs: hubs.length,
        orphans: orphans.length,
        orphansImported: imported,
        clusters: clusters.length,
        crossFocus: crossFocus.length,
      },
      hubs: hubs.slice(0, 12).map((h) => ({ id: h.id, title: h.title, type: h.type, degree: h.degree })),
      orphans: orphans.filter((o) => o.type !== "community-skill").slice(0, 12).map((o) => ({ id: o.id, title: o.title, type: o.type })),
      crossFocus: crossFocus.slice(0, 8).map((c) => ({ label: c.label, size: c.size, focuses: c.focuses })),
    },
    { headers: { "cache-control": "no-store" } },
  );
}
