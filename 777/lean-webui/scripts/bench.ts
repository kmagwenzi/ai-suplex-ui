/**
 * bench.ts — the §11 budget check, measured against the live harness (T024).
 *
 * One warm stdio server, then N calls per read and per tool. Prints p50/p95 and
 * exits non-zero when a budget is missed, so "MCP is slow" becomes a number
 * instead of an opinion.
 *
 *   npm run bench            # 20 reads per resource, 5 per tool
 *   npm run bench -- 50      # more samples
 */

import { getClient } from "../lib/mcp/client";
import {
  readApprovals,
  readContext,
  readMemoryIndex,
  readMemoryLessons,
  readMission,
  readTasklists,
  readThreads,
} from "../lib/mcp/resources";
import { listPrompts } from "../lib/mcp/prompts";
import { callTool } from "../lib/mcp/tools";

const SAMPLES = Number(process.argv[2] ?? 20);

const BUDGETS = {
  resource: 150,
  tool: 2000,
  prompt: 100,
};

function pct(values: number[], q: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  if (sorted.length === 0) return 0;
  const i = Math.ceil(q * sorted.length) - 1;
  return Math.round(sorted[Math.max(0, i)] * 10) / 10;
}

async function time<T>(fn: () => Promise<T>, runs: number): Promise<{ ms: number[]; p50: number; p95: number }> {
  const ms: number[] = [];
  for (let i = 0; i < runs; i++) {
    const t0 = performance.now();
    await fn();
    ms.push(performance.now() - t0);
  }
  return { ms, p50: pct(ms, 0.5), p95: pct(ms, 0.95) };
}

const READS: Array<[string, () => Promise<unknown>]> = [
  ["suplex://context", readContext],
  ["suplex://tasklists", readTasklists],
  ["suplex://threads", readThreads],
  ["suplex://approvals", readApprovals],
  ["suplex://mission", readMission],
  ["suplex://memory/index", readMemoryIndex],
  ["suplex://memory/lessons", readMemoryLessons],
  ["prompts/list", listPrompts],
];

async function main(): Promise<void> {
  // cold start: the first call spawns the child
  const coldStart = performance.now();
  await getClient().call("ping", {});
  const startMs = Math.round(performance.now() - coldStart);

  console.log(`\nlean-webui bench — ${SAMPLES} samples per read, 5 per tool\n`);
  console.log(`server start (cold): ${startMs} ms  (budget < 1500 ms)`);
  console.log("");
  console.log("read                        p50      p95   budget");
  console.log("-".repeat(58));

  let worstResource = 0;
  let worstPrompt = 0;
  for (const [name, fn] of READS) {
    const t = await time(fn, SAMPLES);
    const budget = name === "prompts/list" ? BUDGETS.prompt : BUDGETS.resource;
    if (name === "prompts/list") worstPrompt = Math.max(worstPrompt, t.p95);
    else worstResource = Math.max(worstResource, t.p95);
    const flag = t.p95 > budget ? "  ✗" : "";
    console.log(
      `${name.padEnd(26)} ${String(t.p50).padStart(6)}  ${String(t.p95).padStart(6)}   < ${budget}${flag}`,
    );
  }

  console.log("");
  console.log("tool                        p50      p95   budget");
  console.log("-".repeat(58));
  let worstTool = 0;
  for (const name of ["suplex_status", "suplex_tasklist_next"]) {
    const t = await time(() => callTool(name, {}), 5);
    worstTool = Math.max(worstTool, t.p95);
    const flag = t.p95 > BUDGETS.tool ? "  ✗" : "";
    console.log(`${name.padEnd(26)} ${String(t.p50).padStart(6)}  ${String(t.p95).padStart(6)}   < ${BUDGETS.tool}${flag}`);
  }

  const internal = getClient() as unknown as { proc: { kill: (s?: string) => boolean } | null };
  internal.proc?.kill("SIGKILL");

  const failures = [
    startMs >= 1500 ? `server start ${startMs}ms >= 1500ms` : null,
    worstResource >= BUDGETS.resource ? `resource p95 ${worstResource}ms >= ${BUDGETS.resource}ms` : null,
    worstPrompt >= BUDGETS.prompt ? `prompt p95 ${worstPrompt}ms >= ${BUDGETS.prompt}ms` : null,
    worstTool >= BUDGETS.tool ? `tool p95 ${worstTool}ms >= ${BUDGETS.tool}ms` : null,
  ].filter(Boolean);

  console.log("");
  if (failures.length > 0) {
    console.error(`FAIL — ${failures.join(" · ")}`);
    process.exit(1);
  }
  console.log("PASS — every §11 budget holds.");
}

main().catch((error) => {
  console.error("bench failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
