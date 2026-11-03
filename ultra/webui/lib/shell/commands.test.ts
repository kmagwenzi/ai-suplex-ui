import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { COMMANDS_DIR, clearCommandCache, loadCommands } from "./commands";
import { configuredVaultPath } from "./vault";

const NAMES = [
  "Artifact Capture",
  "Artifact Capture (Markdown)",
  "Artifact Capture (Scratch Pad)",
  "Artifact Capture (YouTube)",
  "Artifact Capture (file)",
  "B-Bomb Hunt",
  "Deep Ultra Mode (Arcade)",
  "Deep Ultra Mode (Operative)",
  "Deep Ultra Mode (Pro)",
  "Gauntlet",
  "Kickstart",
  "Note Capture",
  "Outreach Capture",
  "Save Context",
  "Session End Report",
  "Tasklist Generation",
  "Weekly Ritual",
];

function commandFile(name: string): string {
  return `---\ntype: ai-suplex-command\ncommand: "${name}"\nrole: "Builder"\ndate: 2026-11-03\n---\n\n# ⚡ AI-Suplex: ${name} — Command\n`;
}

/** A throwaway vault holding only the command catalogue. */
function fixture(files: Record<string, string>): string {
  const root = mkdtempSync(path.join(tmpdir(), "ultra-commands-"));
  const dir = path.join(root, COMMANDS_DIR);
  mkdirSync(dir, { recursive: true });
  for (const [file, content] of Object.entries(files)) {
    writeFileSync(path.join(dir, file), content);
  }
  return root;
}

function catalogueVault(): string {
  const files: Record<string, string> = {};
  for (const name of NAMES) files[`⚡ Command — ${name}.md`] = commandFile(name);
  return fixture(files);
}

test("parses 17 command files, none skipped, sorted by name", async () => {
  const { commands, skipped, error } = await loadCommands(catalogueVault());
  assert.equal(error, undefined);
  assert.equal(skipped.length, 0);
  assert.equal(commands.length, 17);
  assert.deepEqual(
    commands.map((command) => command.name),
    [...NAMES].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0)),
  );
  assert.equal(commands[0].command, `AI-Suplex: ${commands[0].name}`);
  assert.ok(commands[0].file.startsWith("Prompt Patterns/AI-Suplex Commands/⚡ Command — "));
});

test("a file with no name is skipped and reported, never invented", async () => {
  const vault = fixture({
    "⚡ Command — Kickstart.md": commandFile("Kickstart"),
    "⚡ Command — Broken.md": "---\ntype: ai-suplex-command\nrole: Builder\n---\n\n# no name\n",
    "⚡ Command — Empty.md": "",
  });
  const { commands, skipped } = await loadCommands(vault);
  assert.deepEqual(commands.map((command) => command.name), ["Kickstart"]);
  assert.deepEqual(skipped.sort(), ["⚡ Command — Broken.md", "⚡ Command — Empty.md"]);
});

test("non-command markdown in the folder is ignored, not reported", async () => {
  const vault = fixture({
    "⚡ Command — Kickstart.md": commandFile("Kickstart"),
    "README.md": "# not a command\n",
    "⚡ Command — notes.txt": "ignored",
  });
  const { commands, skipped } = await loadCommands(vault);
  assert.equal(commands.length, 1);
  assert.deepEqual(skipped, []);
});

test("the legacy `pattern:` field is accepted when `command:` is absent", async () => {
  const vault = fixture({
    "⚡ Command — YouTube.md":
      '---\ntype: ai-suplex-command\npattern: Artifact Capture (YouTube)\nrole: Builder\n---\n\n# ⚡ AI-Suplex: Artifact Capture (YouTube) — Executable\n\nOne line → transcript → notes.\n',
  });
  const { commands } = await loadCommands(vault);
  assert.deepEqual(commands.map((command) => command.name), ["Artifact Capture (YouTube)"]);
  assert.equal(commands[0].patternFile, "");
});

test("the summary is the first prose line under the heading", async () => {
  const vault = fixture({
    "⚡ Command — Kickstart.md":
      "---\ncommand: Kickstart\nrole: Builder\n---\n\n# ⚡ AI-Suplex: Kickstart — Command\n\nLoad the instance context first. Then report.\n\n## More\n\nignored\n",
  });
  const { commands } = await loadCommands(vault);
  assert.equal(commands[0].summary, "Load the instance context first.");
});

test("a heading-only command yields an empty summary (no invention)", async () => {
  const vault = fixture({
    "⚡ Command — Kickstart.md":
      "---\ncommand: Kickstart\nrole: Builder\n---\n\n# ⚡ AI-Suplex: Kickstart — Command\n\n## 🎯 Trigger\n\n```\nAI-Suplex: Kickstart\n```\n",
  });
  const { commands } = await loadCommands(vault);
  assert.equal(commands[0].summary, "AI-Suplex: Kickstart");
});

test("loads are stable across a cache clear", async () => {
  const vault = catalogueVault();
  const first = await loadCommands(vault);
  clearCommandCache();
  const second = await loadCommands(vault);
  assert.deepEqual(
    first.commands.map((command) => command.name),
    second.commands.map((command) => command.name),
  );
});

test("a missing directory returns [] plus an error message, never throws", async () => {
  const { commands, skipped, error } = await loadCommands(
    path.join(tmpdir(), "ultra-commands-does-not-exist"),
  );
  assert.deepEqual(commands, []);
  assert.deepEqual(skipped, []);
  assert.ok(error?.includes("cannot read"));
});

test("the real vault catalogue parses with nothing skipped", async (t) => {
  const vault = configuredVaultPath();
  if (!existsSync(path.join(vault, COMMANDS_DIR))) {
    t.skip(`no vault catalogue at ${vault}`);
    return;
  }
  const { commands, skipped, error } = await loadCommands(vault);
  assert.equal(error, undefined);
  assert.deepEqual(skipped, []);
  assert.equal(commands.length, 17);
  assert.ok(commands.every((command) => command.command === `AI-Suplex: ${command.name}`));
});
