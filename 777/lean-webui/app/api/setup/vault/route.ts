import { NextResponse } from "next/server";
import { checkVault, readConfig, writeConfig } from "@/lib/config";
import { getClient } from "@/lib/mcp/client";
import { readContext } from "@/lib/mcp/resources";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Current vault setting + what the harness actually resolves. */
export async function GET() {
  const cfg = readConfig();
  const brief = await readContext().catch(() => null);
  return NextResponse.json({
    configured: cfg.vaultPath ?? null,
    env: process.env.AISUPLEX_VAULT ?? null,
    resolved: brief?.vault ?? null,
    cycle: brief?.cycle ?? null,
    week: brief?.week ?? null,
  });
}

/** Set the vault: validate, persist, restart the harness. */
export async function POST(req: Request) {
  let body: { path?: string };
  try {
    body = (await req.json()) as { path?: string };
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const candidate = String(body.path ?? "").trim();
  const check = checkVault(candidate);
  if (!check.ok) {
    return NextResponse.json({ error: check.reason }, { status: 400 });
  }

  const abs = candidate.replace(/^~(?=\/)/, process.env.HOME ?? "~");
  writeConfig({ vaultPath: abs });
  // the child keeps its old env until restarted
  getClient().restart();

  // the restart kills the old child; the first read can race it — retry once.
  let brief = await readContext().catch(() => null);
  if (!brief) {
    await new Promise((r) => setTimeout(r, 250));
    brief = await readContext().catch(() => null);
  }
  return NextResponse.json({
    ok: true,
    configured: abs,
    resolved: brief?.vault ?? null,
    cycle: brief?.cycle ?? null,
    week: brief?.week ?? null,
  });
}
