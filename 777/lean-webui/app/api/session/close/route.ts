import { NextResponse } from "next/server";
import { callTool } from "@/lib/mcp/tools";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Close the loop through `suplex_close`; `dryRun` previews without writing. */
export async function POST(req: Request) {
  let body: { dryRun?: boolean };
  try {
    body = (await req.json()) as { dryRun?: boolean };
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }
  try {
    return NextResponse.json(
      await callTool("suplex_close", { dryRun: body.dryRun === true }),
    );
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
