/**
 * prompts.ts — the 7 `mcp v1` prompts as typed reads, via `prompts/list` and
 * `prompts/get`. The prompt text is the harness's own envelope + the verbatim
 * pattern body; the UI renders it and never paraphrases (Spec — MCP Contract §4).
 */

import { getClient } from "./client";
import type { PromptListItem } from "../prompts";

export interface PromptText {
  description: string;
  text: string;
}

function asList(result: unknown): PromptListItem[] {
  if (
    typeof result !== "object" ||
    result === null ||
    !("prompts" in result) ||
    !Array.isArray(result.prompts)
  ) {
    throw new Error("prompts/list returned no prompts");
  }
  return result.prompts as PromptListItem[];
}

export async function listPrompts(): Promise<PromptListItem[]> {
  return asList(await getClient().call("prompts/list", {}));
}

export async function getPromptText(name: string): Promise<PromptText> {
  const result = await getClient().call("prompts/get", { name, arguments: {} });
  if (
    typeof result !== "object" ||
    result === null ||
    !("messages" in result) ||
    !Array.isArray(result.messages) ||
    result.messages.length === 0
  ) {
    throw new Error(`prompts/get ${name} returned no messages`);
  }
  const first = result.messages[0] as {
    content?: { text?: unknown };
  };
  const text = first?.content?.text;
  if (typeof text !== "string") {
    throw new Error(`prompts/get ${name} content is malformed`);
  }
  return {
    description:
      "description" in result ? String(result.description) : "",
    text,
  };
}
