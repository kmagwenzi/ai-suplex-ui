/**
 * app/api/command-bar/route.ts — the only server-side model call for the ⌘K bar.
 *
 * The key never crosses the wire (PRD V2): this Node route builds the catalogue,
 * maps the intent, and returns FIELDS ONLY. The client composes the command with
 * the shared composer — one composer, two callers (PRD T012d).
 */
import { loadCommands } from "@/lib/shell/commands";
import { mapIntent } from "@/lib/shell/command-intent";
import { configuredVaultPath, resolveVault } from "@/lib/shell/vault";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_INTENT = 500;

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const intent =
    payload && typeof payload === "object" && "intent" in payload ? payload.intent : undefined;

  if (typeof intent !== "string" || intent.trim().length === 0) {
    return Response.json(
      { error: `intent must be a non-empty string (1..${MAX_INTENT} chars)` },
      { status: 400 },
    );
  }
  if (intent.length > MAX_INTENT) {
    return Response.json(
      { error: `intent must be at most ${MAX_INTENT} characters` },
      { status: 400 },
    );
  }

  const vault = resolveVault();
  const catalogue = vault
    ? await loadCommands(vault)
    : { commands: [], skipped: [], error: `vault unavailable (${configuredVaultPath()})` };

  if (catalogue.error) {
    return Response.json({
      mode: "deterministic",
      command: null,
      sourceType: null,
      sourceValue: "",
      additional: "",
      confidence: 0,
      why: `catalogue unavailable — ${catalogue.error}`.slice(0, 200),
    });
  }

  return Response.json(await mapIntent(intent, catalogue.commands));
}
