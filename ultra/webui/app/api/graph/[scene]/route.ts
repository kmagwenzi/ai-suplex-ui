import { NextResponse } from "next/server";
import { runTool } from "@/lib/shell/exec";
import { configuredVaultPath, resolveVault } from "@/lib/shell/vault";

/**
 * GET /api/graph/<scene> — the vault's knowledge graph, in the showcase contract.
 *
 * The scene is an allowlist key, never a path or a free argument handed to the tool.
 * Nothing is cached: the graph on screen is the graph on disk, run per request.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SCENES = new Set(["knowledge-graph", "opportunities"]);

export async function GET(
  _request: Request,
  ctx: { params: Promise<{ scene: string }> },
) {
  const { scene } = await ctx.params;

  if (!SCENES.has(scene)) {
    return NextResponse.json(
      { ok: false, error: `unknown scene "${scene}"`, scenes: Array.from(SCENES) },
      { status: 404 },
    );
  }

  const vault = resolveVault();
  if (!vault) {
    return NextResponse.json(
      { ok: false, error: "vault unavailable", resolved: configuredVaultPath() },
      { status: 501 },
    );
  }

  const result = await runTool(
    ["Tools/export-graph.js", "--scene", scene, "--cap", "60"],
    vault,
    30_000,
  );

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.message, scene }, { status: 500 });
  }

  return new NextResponse(result.stdout, {
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}
