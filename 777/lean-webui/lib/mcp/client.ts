/**
 * client.ts — one persistent stdio MCP client for the whole app.
 *
 * Spec `§11` and the tasklist's trap list agree on the one thing that makes
 * "MCP is slow and erratic" false: **never spawn per request**. One warm
 * `node <HARNESS_PATH>` process lives for the life of the app; JSON-RPC 2.0 is
 * newline-delimited over stdin/stdout, responses route to their caller through
 * a request map, every call has a 5s timeout, and a dead process is respawned
 * on the next call — a call in flight when it dies gets a named error, and a
 * failed respawn surfaces the error (with the tool/resource name).
 */

import { spawn, type ChildProcess } from "node:child_process";
import path from "node:path";
import { recordCall, lastRecord, type CallRecord } from "./telemetry";

const HARNESS_DEFAULT = path.resolve(
  process.cwd(),
  "..",
  "..",
  "..",
  "ai-suplex-harness",
  "server.js",
);

const CALL_TIMEOUT_MS = 5000;

function harnessPath(): string {
  return process.env.HARNESS_PATH || HARNESS_DEFAULT;
}

interface Pending {
  name: string;
  resolve: (value: unknown) => void;
  reject: (reason: Error) => void;
  timer: NodeJS.Timeout;
  startedAt: number;
}

interface SuplexCapability {
  contract: string;
  semver: string;
  tier: string;
  framework: { name: string; version: string };
  capabilities: string[];
}

export interface ClientStatus {
  ok: boolean;
  contract: string | null;
  tier: string | null;
  last: CallRecord | null;
}

class McpClient {
  private proc: ChildProcess | null = null;
  private nextId = 1;
  private pending = new Map<number, Pending>();
  private buffer = "";
  private initialized = false;
  private capability: SuplexCapability | null = null;
  private lastStderr = "";

  // ── lifecycle ─────────────────────────────────────────────────────────────

  private onExit = (code: number | null, signal: string | null): void => {
    this.proc = null;
    this.initialized = false;
    const why = signal
      ? `signal ${signal}`
      : code === null
        ? "exited"
        : `exit ${code}`;
    for (const [id, p] of this.pending) {
      clearTimeout(p.timer);
      p.reject(new Error(`MCP server ${why} while calling ${p.name}`));
      this.pending.delete(id);
    }
  };

  private onData = (chunk: string): void => {
    this.buffer += chunk;
    let idx: number;
    while ((idx = this.buffer.indexOf("\n")) >= 0) {
      const line = this.buffer.slice(0, idx).trim();
      this.buffer = this.buffer.slice(idx + 1);
      if (!line) continue;
      let msg: { id?: number; error?: { code: number; message: string }; result?: unknown };
      try {
        msg = JSON.parse(line);
      } catch {
        continue;
      }
      if (msg.id === undefined) continue;
      const p = this.pending.get(msg.id);
      if (!p) continue;
      clearTimeout(p.timer);
      this.pending.delete(msg.id);
      const ms = Date.now() - p.startedAt;
      if (msg.error) {
        recordCall(p.name, false, ms, msg.error.code);
        p.reject(new Error(msg.error.message));
      } else {
        recordCall(p.name, true, ms, 0);
        p.resolve(msg.result);
      }
    }
  };

  private async start(): Promise<void> {
    this.proc = spawn(process.execPath, [harnessPath()], {
      stdio: ["pipe", "pipe", "pipe"],
      env: process.env,
    });
    this.proc.stdout!.setEncoding("utf8");
    this.proc.stdout!.on("data", this.onData);
    this.proc.stderr!.setEncoding("utf8");
    this.proc.stderr!.on("data", (d: string) => {
      const trimmed = d.trim();
      if (trimmed) this.lastStderr = trimmed;
    });
    this.proc.on("exit", this.onExit);

    const init = (await this.request("initialize", {
      protocolVersion: "2025-06-18",
      capabilities: {},
      clientInfo: { name: "ai-suplex-ui/777/lean-webui", version: "0.1.0" },
    })) as { capabilities?: { suplex?: SuplexCapability } };

    const suplex = init.capabilities?.suplex;
    if (!suplex || suplex.contract !== "mcp v1" || suplex.tier !== "free") {
      throw new Error(
        `harness is not the free mcp v1 surface (contract=${suplex?.contract ?? "?"}, tier=${suplex?.tier ?? "?"})`,
      );
    }
    this.capability = suplex;
    this.initialized = true;
    this.notify("notifications/initialized", {});
  }

  private async ensureStarted(): Promise<void> {
    if (this.proc && this.initialized) return;
    try {
      await this.start();
    } catch (e) {
      this.proc = null;
      this.initialized = false;
      const detail =
        this.lastStderr || (e instanceof Error ? e.message : String(e));
      throw new Error(
        `could not start the MCP server (${harnessPath()}): ${detail}`,
      );
    }
  }

  // ── protocol ──────────────────────────────────────────────────────────────

  private request(method: string, params: unknown, timeoutMs = CALL_TIMEOUT_MS): Promise<unknown> {
    const id = this.nextId++;
    const startedAt = Date.now();
    const name = callName(method, params);
    return new Promise<unknown>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        recordCall(name, false, Date.now() - startedAt, -32000);
        reject(new Error(`${name} timed out after ${timeoutMs}ms`));
      }, timeoutMs);
      this.pending.set(id, { name, resolve, reject, timer, startedAt });
      this.proc!.stdin!.write(
        JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n",
      );
    });
  }

  private notify(method: string, params: unknown): void {
    this.proc!.stdin!.write(JSON.stringify({ jsonrpc: "2.0", method, params }) + "\n");
  }

  /** A named RPC call; surfaces the tool/resource name on failure. */
  async call(method: string, params: unknown): Promise<unknown> {
    await this.ensureStarted();
    try {
      return await this.request(method, params);
    } catch (e) {
      const name = callName(method, params);
      if (e instanceof Error) {
        throw new Error(`${name}: ${e.message}`);
      }
      throw e;
    }
  }

  async ping(): Promise<number> {
    await this.ensureStarted();
    const t0 = Date.now();
    await this.request("ping", {});
    return Date.now() - t0;
  }

  status(): ClientStatus {
    return {
      ok: this.initialized,
      contract: this.capability?.contract ?? null,
      tier: this.capability?.tier ?? null,
      last: lastRecord(),
    };
  }
}

function callName(method: string, params: unknown): string {
  const obj = typeof params === "object" && params !== null ? params : null;
  if (method === "resources/read" && obj !== null && "uri" in obj) {
    return `resources/read ${String(obj.uri)}`;
  }
  if (
    (method === "tools/call" || method === "prompts/get") &&
    obj !== null &&
    "name" in obj
  ) {
    return `${method} ${String(obj.name)}`;
  }
  return method;
}

declare global {
  // eslint-disable-next-line no-var
  var __suplexMcpClient: McpClient | undefined;
}

export function getClient(): McpClient {
  if (!globalThis.__suplexMcpClient) {
    globalThis.__suplexMcpClient = new McpClient();
  }
  return globalThis.__suplexMcpClient;
}
