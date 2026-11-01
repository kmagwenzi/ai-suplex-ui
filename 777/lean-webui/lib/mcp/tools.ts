/**
 * tools.ts — the write tools as typed calls. The UI is a caller: every write
 * goes through `tools/call`, never a direct file write. Return shapes are the
 * harness's own (tools.js) — `text(object)` serialises to JSON over the wire.
 */

import { getClient } from "./client";

export interface ToolResult {
  ok: boolean;
  kind?: string;
  path?: string;
  status?: number;
  stdout?: string;
  stderr?: string;
  decision?: string;
  item?: string;
  executed?: string | null;
}

function parseToolResult(result: unknown, name: string): ToolResult {
  if (
    typeof result !== "object" ||
    result === null ||
    !("content" in result) ||
    !Array.isArray(result.content) ||
    result.content.length === 0
  ) {
    throw new Error(`tools/call ${name} returned no content`);
  }
  const first = result.content[0] as { text?: unknown } | null;
  const text =
    first && typeof first === "object" && "text" in first
      ? String(first.text)
      : "";
  try {
    return JSON.parse(text) as ToolResult;
  } catch {
    return { ok: true, stdout: text };
  }
}

export async function callTool(name: string, args: unknown): Promise<ToolResult> {
  return parseToolResult(
    await getClient().call("tools/call", { name, arguments: args }),
    name,
  );
}

export interface CaptureInput {
  type: "artifact" | "insight" | "note";
  focus: string;
  title: string;
  content: string;
  source?: string;
}
