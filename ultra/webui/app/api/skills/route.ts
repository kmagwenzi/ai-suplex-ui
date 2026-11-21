import { NextResponse } from "next/server";
import { configuredVaultPath, resolveVault } from "@/lib/shell/vault";
import { listDrafts, listSkills, promoteQueue, scanCandidates } from "@/lib/shell/skills";

/**
 * GET /api/skills — everything the Skills stage renders, in one read.
 *
 * Each section reports its own failure instead of failing the page: a missing draft
 * directory is a fact, not an outage.
 */
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

  const [scan, library, drafts, queue] = await Promise.all([
    scanCandidates(vault),
    listSkills(vault),
    listDrafts(vault),
    promoteQueue(vault),
  ]);

  return NextResponse.json(
    {
      ok: true,
      scan: scan.ok ? { ok: true, ...scan.data } : { ok: false, error: scan.error },
      library: library.ok ? { ok: true, skills: library.data } : { ok: false, error: library.error },
      drafts: drafts.ok ? { ok: true, drafts: drafts.data } : { ok: false, error: drafts.error },
      queue: queue.ok ? { ok: true, ...queue.data } : { ok: false, error: queue.error },
    },
    { headers: { "cache-control": "no-store" } },
  );
}
