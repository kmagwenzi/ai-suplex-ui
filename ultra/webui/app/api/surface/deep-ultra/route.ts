import { configuredVaultPath, resolveVault } from "@/lib/shell/vault";
import { runTool, stripAnsi } from "@/lib/shell/exec";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COMMAND = "node Tools/deep-ultra.js latest --dry";

export async function GET() {
  const vault = resolveVault();
  if (!vault) {
    return Response.json(
      { error: "vault unavailable", resolvedPath: configuredVaultPath() },
      { status: 501 },
    );
  }

  const result = await runTool(["Tools/deep-ultra.js", "latest", "--dry"], vault, 20000);
  if (!result.ok) {
    return Response.json(
      {
        error: "deep-ultra tool failed",
        command: COMMAND,
        exitCode: result.code,
        signal: result.signal,
        message: result.message,
      },
      { status: 502 },
    );
  }

  // The tool is the surface: render its ANSI-stripped text verbatim.
  return new Response(stripAnsi(result.stdout), {
    status: 200,
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}
