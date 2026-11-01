import { NextResponse } from "next/server";
import { getPromptText } from "@/lib/mcp/prompts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Lazy prompt body for the composer: `GET /api/prompt?name=session-start`.
 * Returns the harness envelope + verbatim pattern, never a re-authored copy.
 */
export async function GET(req: Request) {
  const name = new URL(req.url).searchParams.get("name");
  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  try {
    const { description, text } = await getPromptText(name);
    return NextResponse.json({ name, description, text });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
