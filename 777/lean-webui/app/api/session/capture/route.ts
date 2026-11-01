import { NextResponse } from "next/server";
import { callTool, type CaptureInput } from "@/lib/mcp/tools";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Write one artifact / insight / note through `suplex_capture`. */
export async function POST(req: Request) {
  let body: CaptureInput;
  try {
    body = (await req.json()) as CaptureInput;
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }
  if (!body.type || !body.focus || !body.title || !body.content) {
    return NextResponse.json(
      { error: "type, focus, title, and content are required" },
      { status: 400 },
    );
  }
  try {
    return NextResponse.json(await callTool("suplex_capture", body));
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
