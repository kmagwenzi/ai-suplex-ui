import {
  ARTIFACT_ALLOWLIST,
  configuredVaultPath,
  resolveVault,
} from "@/lib/shell/vault";
import { getTier } from "@/lib/shell/surfaces";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const vault = resolveVault();
  return Response.json({
    ok: vault !== null,
    tier: getTier(),
    vault,
    vaultConfigured: configuredVaultPath(),
    surfaces: Object.keys(ARTIFACT_ALLOWLIST),
  });
}
