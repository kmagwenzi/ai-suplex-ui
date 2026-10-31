import { NextResponse } from "next/server";
import { snapshot } from "@/lib/mcp/telemetry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Per-call telemetry (name · ms · code) + p50/p95, for the `?debug=1` overlay. */
export async function GET() {
  return NextResponse.json(snapshot());
}
