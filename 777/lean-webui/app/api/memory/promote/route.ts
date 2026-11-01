import { NextResponse } from "next/server";
import { callTool } from "@/lib/mcp/tools";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Promote lessons through `suplex_promote`. Hustler-gated: the UI sends
 * `approved: true` only after the user types PROMOTE; this route rejects it
 * otherwise, and the harness enforces the same rule.
 */
export async function POST(req: Request) {
  let body: { min?: number; approved?: boolean };
  try {
    body = (await req.json()) as { min?: number; approved?: boolean };
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }
  if (body.approved !== true) {
    return NextResponse.json(
      { error: "promote is gated — type PROMOTE to confirm" },
      { status: 400 },
    );
  }
  try {
    return NextResponse.json(
      await callTool("suplex_promote", { min: body.min, approved: true }),
    );
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
