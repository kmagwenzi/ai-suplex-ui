import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export type ToolResult =
  | { ok: true; stdout: string }
  | { ok: false; code: number | null; signal: string | null; message: string; stderr?: string };

/**
 * Run `node <args>` inside the vault, no shell, with a hard timeout and a
 * bounded buffer. One action = one tool call; the shell holds no opinion on
 * the output.
 */
export async function runTool(
  args: string[],
  cwd: string,
  timeoutMs: number,
): Promise<ToolResult> {
  return runBin("node", args, cwd, timeoutMs);
}

/**
 * Any binary, same contract as a tool: no shell, a hard timeout, bounded buffers.
 * The cockpit uses this for `crontab -l` — a read, never a write.
 */
export async function runBin(
  file: string,
  args: string[],
  cwd: string,
  timeoutMs: number,
): Promise<ToolResult> {
  try {
    const { stdout } = await execFileAsync(file, args, {
      cwd,
      timeout: timeoutMs,
      maxBuffer: 16 * 1024 * 1024,
    });
    return { ok: true, stdout };
  } catch (err) {
    const e = err as {
      code?: number | string;
      signal?: string | null;
      message?: string;
      stderr?: string;
      killed?: boolean;
    };
    return {
      ok: false,
      code: typeof e.code === "number" ? e.code : null,
      signal: e.signal ?? null,
      message: e.killed ? `timed out after ${timeoutMs}ms` : (e.message ?? "unknown error"),
      stderr: typeof e.stderr === "string" ? e.stderr : undefined,
    };
  }
}

/** Strip ANSI SGR escapes — the Deep Ultra scoreboard is text, not paint. */
export function stripAnsi(input: string): string {
  // Covers CSI SGR (`\x1b[…m`) and the single-char resets/renditions.
  return input.replace(/\x1b\[[0-9;?]*[A-Za-z]/g, "").replace(/\x1b[()][A-Z0-9]/g, "");
}
