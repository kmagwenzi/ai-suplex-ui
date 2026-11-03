import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { mapIntent, matchCommand } from "./command-intent";
import type { CommandDef } from "./commands";
import { objectModel, throwingModel } from "@/lib/enrich/mock-model";
import { clearEnrichmentEnv } from "@/lib/enrich/test-env";

function command(name: string, summary = ""): CommandDef {
  return {
    name,
    command: `AI-Suplex: ${name}`,
    role: "Builder",
    patternFile: "",
    file: `Prompt Patterns/AI-Suplex Commands/⚡ Command — ${name}.md`,
    summary,
  };
}

const COMMANDS = [
  command("Kickstart"),
  command("Artifact Capture (YouTube)"),
  command("Artifact Capture (Scratch Pad)"),
  command("Save Context"),
  command("Session End Report"),
  command("Deep Ultra Mode (Arcade)"),
  command("Deep Ultra Mode (Operative)"),
];

beforeEach(clearEnrichmentEnv);

test("name tokens pick the command; the matcher never invents fields", () => {
  const result = matchCommand("kickstart the project lane", COMMANDS);
  assert.equal(result.command, "Kickstart");
  assert.equal(result.mode, "deterministic");
  assert.equal(result.sourceType, null);
  assert.equal(result.sourceValue, "");
  assert.equal(result.additional, "");
  assert.equal(result.confidence, 0.25); // 3 points / 12
});

test("a phrase match adds +5 and confidence is capped at 1", () => {
  const result = matchCommand("deep ultra mode arcade", COMMANDS);
  assert.equal(result.command, "Deep Ultra Mode (Arcade)");
  assert.equal(result.confidence, 1); // phrase +4 tokens = 17 → capped at 1
});

test("equal scores break alphabetically by name, never randomly", () => {
  const result = matchCommand("operative", COMMANDS);
  assert.equal(result.command, "Deep Ultra Mode (Operative)");

  const tie = matchCommand("one", [command("Beta One"), command("Alpha One")]);
  assert.equal(tie.command, "Alpha One");
});

test("a summary token scores +1", () => {
  const result = matchCommand("resonance", [
    command("Kickstart", "loads context"),
    command("Save Context", "writes resonance across sessions"),
  ]);
  assert.equal(result.command, "Save Context");
  assert.equal(result.confidence, 0.08); // 1 / 12
});

test("no match → null at confidence 0, with a catalogue hint", () => {
  const result = matchCommand("xyzzy plugh", COMMANDS);
  assert.equal(result.command, null);
  assert.equal(result.confidence, 0);
  assert.match(result.why, /no match/);
});

test("stopwords alone match nothing", () => {
  assert.equal(matchCommand("the a an of to for", COMMANDS).command, null);
});

test("no key → the deterministic matcher, still a command", async () => {
  const result = await mapIntent("kickstart the lane", COMMANDS);
  assert.equal(result.mode, "deterministic");
  assert.equal(result.command, "Kickstart");
});

test("an empty catalogue returns the no-match result without calling a model", async () => {
  const result = await mapIntent("kickstart", [], {
    model: throwingModel(),
  });
  assert.equal(result.command, null);
  assert.equal(result.mode, "deterministic");
});

test("a model result is passed through unchanged", async () => {
  const result = await mapIntent("capture the cockpit build as an artifact", COMMANDS, {
    model: objectModel({
      command: "Artifact Capture (Scratch Pad)",
      sourceType: "chat-reference",
      sourceValue: "the T010 cockpit build",
      additional: "save to Artifacts/2026-2027/Cycle 3/Week 3/",
      confidence: 0.92,
      why: "closest artifact-capture variant",
    }),
  });
  assert.deepEqual(result, {
    mode: "ai",
    command: "Artifact Capture (Scratch Pad)",
    sourceType: "chat-reference",
    sourceValue: "the T010 cockpit build",
    additional: "save to Artifacts/2026-2027/Cycle 3/Week 3/",
    confidence: 0.92,
    why: "closest artifact-capture variant",
  });
});

test("a provider error falls back to the matcher", async () => {
  const result = await mapIntent("kickstart the lane", COMMANDS, {
    model: throwingModel(),
  });
  assert.equal(result.mode, "deterministic");
  assert.equal(result.command, "Kickstart");
});

test("a schema mismatch (unknown command) falls back to the matcher", async () => {
  const result = await mapIntent("kickstart the lane", COMMANDS, {
    model: objectModel({
      command: "Not A Command",
      sourceType: null,
      sourceValue: "",
      additional: "",
      confidence: 0.9,
      why: "invented",
    }),
  });
  assert.equal(result.mode, "deterministic");
  assert.equal(result.command, "Kickstart");
});
