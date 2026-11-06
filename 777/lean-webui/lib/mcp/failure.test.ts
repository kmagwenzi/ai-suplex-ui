/**
 * failure.test.ts — the WebUI's promise: a dead server is a *named* error, never
 * a blank screen. Two fixture harnesses prove both halves without a real vault:
 *
 *   1. a harness that exits on start  → "could not start the MCP server (<path>)"
 *   2. a harness that dies mid-call   → "… while calling ping"
 */

import { afterEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { getClient } from "./client";
import { callTool } from "./tools";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES = path.resolve(HERE, "..", "..", "test", "fixtures");

interface Internal {
  __suplexMcpClient?: { proc: { kill: (signal?: string) => boolean } | null };
}

function resetClient(): void {
  const g = globalThis as Internal;
  g.__suplexMcpClient?.proc?.kill("SIGKILL");
  delete g.__suplexMcpClient;
  delete process.env.HARNESS_PATH;
}

afterEach(resetClient);

describe("a poisoned server is a named error", () => {
  it("names the path and the reason when the harness dies on start", async () => {
    process.env.HARNESS_PATH = path.join(FIXTURES, "dead-harness.mjs");
    await assert.rejects(
      () => callTool("suplex_status", {}),
      (err: Error) => {
        assert.match(err.message, /could not start the MCP server/);
        assert.match(err.message, /dead-harness\.mjs/);
        return true;
      },
    );
  });

  it("names the call in flight when the server is killed mid-request", async () => {
    process.env.HARNESS_PATH = path.join(FIXTURES, "mute-harness.mjs");
    const client = getClient();
    const inFlight = client.ping();
    await new Promise((resolve) => setTimeout(resolve, 250));
    const internal = client as unknown as { proc: { kill: (s?: string) => boolean } | null };
    internal.proc?.kill("SIGKILL");
    await assert.rejects(inFlight, /while calling ping/);
  });
});
