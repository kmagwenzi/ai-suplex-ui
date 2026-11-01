import { NextResponse } from "next/server";
import { callTool } from "@/lib/mcp/tools";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Record a Hustler decision through `suplex_approve` (reject is a safe no-op). */
export async function POST(req: Request) {
  let body: { item?: string; decision?: string; note?: string };
  try {
    body = (await req.json()) as { item?: string; decision?: string; note?: string };
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }
  if (!body.item || (body.decision !== "approve" && body.decision !== "reject")) {
    return NextResponse.json(
      { error: "item and decision (approve | reject) are required" },
      { status: 400 },
    );
  }
  try {
    return NextResponse.json(
      await callTool("suplex_approve", {
        item: body.item,
        decision: body.decision,
        note: body.note,
      }),
    );
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
