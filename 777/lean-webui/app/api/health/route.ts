import { NextResponse } from "next/server";
import { getClient } from "@/lib/mcp/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Live MCP health for the header dot: a real `ping` round-trip, so the dot
 * shows measured latency, not a wish.
 */
export async function GET() {
  const client = getClient();
  try {
    const ms = await client.ping();
    const s = client.status();
    return NextResponse.json({ ok: true, contract: s.contract, tier: s.tier, ms });
  } catch (e) {
    const s = client.status();
    return NextResponse.json({
      ok: false,
      contract: s.contract,
      tier: s.tier,
      error: e instanceof Error ? e.message : String(e),
    });
  }
}
