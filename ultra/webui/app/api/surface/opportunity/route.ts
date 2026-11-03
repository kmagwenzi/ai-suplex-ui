import { configuredVaultPath, resolveVault } from "@/lib/shell/vault";
import { runTool } from "@/lib/shell/exec";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COMMAND = "node Tools/opportunity.js --json";

export async function GET() {
  const vault = resolveVault();
  if (!vault) {
    return Response.json(
      { error: "vault unavailable", resolvedPath: configuredVaultPath() },
      { status: 501 },
    );
  }

  const result = await runTool(["Tools/opportunity.js", "--json"], vault, 20000);
  if (!result.ok) {
    return Response.json(
      {
        error: "opportunity tool failed",
        command: COMMAND,
        exitCode: result.code,
        signal: result.signal,
        message: result.message,
      },
      { status: 502 },
    );
  }

  try {
    return Response.json(JSON.parse(result.stdout));
  } catch (err) {
    return Response.json(
      {
        error: "invalid JSON from opportunity tool",
        command: COMMAND,
        message: (err as Error).message,
      },
      { status: 502 },
    );
  }
}
