import { NextResponse } from "next/server";
import {
  ARTIFACT_ALLOWLIST,
  configuredVaultPath,
  isSurfaceKey,
  readArtifact,
  resolveVault,
  VAULT_ENV,
} from "@/lib/shell/vault";

export const runtime = "nodejs"; // fs requires the Node runtime
export const dynamic = "force-dynamic"; // never prerender

const VALID_KEYS = Object.keys(ARTIFACT_ALLOWLIST).join(", ");

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ surface: string }> },
) {
  const { surface } = await params;

  // `surface` is an allowlist key, never a path segment. Unknown → 404.
  if (!isSurfaceKey(surface)) {
    return new NextResponse(
      `Unknown surface "${surface}". Valid surfaces: ${VALID_KEYS}.`,
      {
        status: 404,
        headers: { "content-type": "text/plain; charset=utf-8" },
      },
    );
  }

  const vault = resolveVault();
  if (!vault) {
    return new NextResponse(
      `Vault unavailable: ${VAULT_ENV} is unset or unreadable (resolved: ${configuredVaultPath()}).`,
      {
        status: 501,
        headers: { "content-type": "text/plain; charset=utf-8" },
      },
    );
  }

  const read = await readArtifact(surface, vault);
  if (!read.ok) {
    return new NextResponse(`Artifact read failed: ${read.path} — ${read.message}.`, {
      status: 500,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  // The file bytes, unmodified. No transform, no injection, no rewriting.
  // (Uint8Array<ArrayBufferLike> is a valid BodyInit at runtime; the cast only
  // bridges @types/node's generic vs the DOM BodyInit union.)
  return new NextResponse(read.bytes as unknown as BodyInit, {
    status: 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
      "content-length": String(read.bytes.length),
    },
  });
}
