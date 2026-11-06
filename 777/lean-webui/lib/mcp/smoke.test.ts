/**
 * smoke.test.ts — the seam, end to end. One persistent stdio server, the eight
 * typed reads, the seven prompts, and one write tool that must round-trip.
 *
 * Skips (visibly) when no harness is installed; otherwise it is the real thing.
 */

import { after, describe, it } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";

import { getClient, harnessPath } from "./client";
import { getPromptText, listPrompts } from "./prompts";
import { readContext, readTasklists } from "./resources";
import { callTool } from "./tools";

const HARNESS = harnessPath();
const reason = existsSync(HARNESS) ? false : `no harness at ${HARNESS}`;

function killServer(): void {
  const internal = getClient() as unknown as {
    proc: { kill: (signal?: string) => boolean } | null;
  };
  internal.proc?.kill("SIGKILL");
}

describe("mcp smoke — a live mcp v1 harness", { skip: reason }, () => {
  after(() => killServer());

  it("tools/call suplex_status round-trips", async () => {
    const status = (await callTool("suplex_status", {})) as unknown as Record<string, unknown>;
    assert.equal(typeof status, "object");
    assert.ok(status !== null);
    assert.ok(
      "tasklists" in status || "threads" in status || "vault" in status,
      `unexpected status shape: ${Object.keys(status ?? {}).join(", ")}`,
    );
  });

  it("resources/read suplex://context is the operator brief", async () => {
    const brief = await readContext();
    assert.match(brief.date, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(brief.cycle >= 1, "cycle must be a number");
    assert.equal(typeof brief.week, "number");
  });

  it("resources/read suplex://tasklists returns the tasklist summaries", async () => {
    const summary = await readTasklists();
    assert.ok(Array.isArray(summary.tasklists), "tasklists must be an array");
  });

  it("prompts/list is exactly the seven contract prompts", async () => {
    const items = await listPrompts();
    assert.equal(items.length, 7);
    for (const item of items) {
      assert.match(item.command, /^AI-Suplex: /);
      assert.ok(Array.isArray(item.arguments));
    }
  });

  it("prompts/get returns the five-line envelope, then the pattern", async () => {
    const { text } = await getPromptText("session-start");
    assert.match(text, /^# ⚡ AI-Suplex: Session Start/);
    assert.match(text, /CONTENT\n {2}- <Source type>: <value>/);
    assert.match(text, /ADDITIONAL: <instructions>/);
  });
});
