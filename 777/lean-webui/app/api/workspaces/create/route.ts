import { NextResponse } from "next/server";
import { callTool } from "@/lib/mcp/tools";
import { validateCreate } from "@/lib/workspace-create-form";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Open a workspace through `suplex_workspace_create` (contract 1.2.0).
 * The console composes and validates; the vault writes. No direct fs here.
 */
export async function POST(req: Request) {
  let body: {
    thread?: string;
    slug?: string;
    title?: string;
    mission?: string;
    focus?: string;
    tasks?: string[] | string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const draft = {
    thread: String(body.thread || ""),
    slug: String(body.slug || "").trim().toLowerCase(),
    title: String(body.title || ""),
    mission: String(body.mission || ""),
  };
  const problem = validateCreate(draft);
  if (problem) {
    return NextResponse.json({ error: problem }, { status: 400 });
  }

  try {
    const result = await callTool("suplex_workspace_create", {
      thread: draft.thread,
      slug: draft.slug,
      title: draft.title,
      mission: draft.mission,
      focus: typeof body.focus === "string" ? body.focus : "digital-products",
      tasks: Array.isArray(body.tasks) ? body.tasks : [],
    });
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
