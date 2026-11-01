import { NextResponse } from "next/server";
import { callTool } from "@/lib/mcp/tools";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Run the weekly ritual through `suplex_ritual`. Hustler-gated: the UI sends
 * `approved: true` only after the user types SATURDAY / TUESDAY.
 */
export async function POST(req: Request) {
  let body: {
    which?: string;
    run?: boolean;
    tier?: string;
    approved?: boolean;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }
  if (body.approved !== true) {
    return NextResponse.json(
      { error: "ritual is gated — type the day (SATURDAY / TUESDAY) to confirm" },
      { status: 400 },
    );
  }
  if (body.which !== "saturday" && body.which !== "tuesday") {
    return NextResponse.json(
      { error: "which must be saturday or tuesday" },
      { status: 400 },
    );
  }
  try {
    return NextResponse.json(
      await callTool("suplex_ritual", {
        which: body.which,
        run: body.run === true,
        tier: body.tier,
        approved: true,
      }),
    );
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
