import { test } from "node:test";
import assert from "node:assert/strict";
import { SOURCE_LABEL, baseTemplate, composeCommand } from "./compose";

/**
 * Goldens are written literally — never computed by the function under test.
 * Byte identity is the whole point of T012, so a "fix" that reflows a value or
 * drops a placeholder must fail here.
 */

const NAME = "Artifact Capture (Scratch Pad)";
const BASE = baseTemplate(NAME);

test("baseTemplate is the five-line AGENTS.md envelope", () => {
  assert.equal(
    BASE,
    "AI-Suplex: Artifact Capture (Scratch Pad)\n" +
      "CONTENT\n" +
      "  - <Source type>: <value>\n" +
      "\n" +
      "ADDITIONAL: <instructions>",
  );
});

test("SOURCE_LABEL strings are exact — a typo breaks byte identity", () => {
  assert.deepEqual(SOURCE_LABEL, {
    "vault-file": "File Reference",
    raw: "Raw Content",
    "chat-reference": "Chat Reference",
  });
});

test("vault-file source renders File Reference", () => {
  assert.equal(
    composeCommand(
      BASE,
      { type: "vault-file", value: "Sessions/Active/End/2026-11-03.md" },
      "",
    ),
    "AI-Suplex: Artifact Capture (Scratch Pad)\n" +
      "CONTENT\n" +
      "  - File Reference: Sessions/Active/End/2026-11-03.md\n" +
      "\n" +
      "ADDITIONAL: <instructions>",
  );
});

test("raw source renders Raw Content", () => {
  assert.equal(
    composeCommand(BASE, { type: "raw", value: "Session completed. Rating 5/5." }, ""),
    "AI-Suplex: Artifact Capture (Scratch Pad)\n" +
      "CONTENT\n" +
      "  - Raw Content: Session completed. Rating 5/5.\n" +
      "\n" +
      "ADDITIONAL: <instructions>",
  );
});

test("chat-reference source renders Chat Reference", () => {
  assert.equal(
    composeCommand(BASE, { type: "chat-reference", value: "the T010 cockpit build" }, "Skip memory loop"),
    "AI-Suplex: Artifact Capture (Scratch Pad)\n" +
      "CONTENT\n" +
      "  - Chat Reference: the T010 cockpit build\n" +
      "\n" +
      "ADDITIONAL: Skip memory loop",
  );
});

test("source type with an empty value leaves the placeholder", () => {
  assert.equal(
    composeCommand(BASE, { type: "raw", value: "   " }, ""),
    BASE,
  );
});

test("a null source type leaves the placeholder even when a value is present", () => {
  assert.equal(
    composeCommand(BASE, { type: null, value: "orphan value" }, ""),
    BASE,
  );
});

test("empty additional leaves the placeholder", () => {
  assert.equal(
    composeCommand(BASE, { type: null, value: "" }, "\n\t "),
    BASE,
  );
});

test("both fields set fill both placeholders", () => {
  assert.equal(
    composeCommand(
      BASE,
      { type: "chat-reference", value: "the T010 cockpit build" },
      "save to Artifacts/2026-2027/Cycle 3/Week 3/",
    ),
    "AI-Suplex: Artifact Capture (Scratch Pad)\n" +
      "CONTENT\n" +
      "  - Chat Reference: the T010 cockpit build\n" +
      "\n" +
      "ADDITIONAL: save to Artifacts/2026-2027/Cycle 3/Week 3/",
  );
});

test("both empty keeps both placeholders", () => {
  assert.equal(composeCommand(BASE, { type: null, value: "" }, ""), BASE);
});

test("leading and trailing whitespace is trimmed, not reflowed", () => {
  assert.equal(
    composeCommand(BASE, { type: "raw", value: "   a  b   " }, "  x  "),
    "AI-Suplex: Artifact Capture (Scratch Pad)\n" +
      "CONTENT\n" +
      "  - Raw Content: a  b\n" +
      "\n" +
      "ADDITIONAL: x",
  );
});

test("a newline in the value is preserved (never reflowed)", () => {
  assert.equal(
    composeCommand(BASE, { type: "raw", value: "line one\nline two" }, ""),
    "AI-Suplex: Artifact Capture (Scratch Pad)\n" +
      "CONTENT\n" +
      "  - Raw Content: line one\nline two\n" +
      "\n" +
      "ADDITIONAL: <instructions>",
  );
});

test("a newline in additional is preserved", () => {
  assert.equal(
    composeCommand(BASE, { type: null, value: "" }, "first\nsecond"),
    "AI-Suplex: Artifact Capture (Scratch Pad)\n" +
      "CONTENT\n" +
      "  - <Source type>: <value>\n" +
      "\n" +
      "ADDITIONAL: first\nsecond",
  );
});

test("composing twice is idempotent — the same fields yield the same bytes", () => {
  const source = { type: "chat-reference" as const, value: "the T010 cockpit build" };
  assert.equal(
    composeCommand(BASE, source, "save to Artifacts/"),
    composeCommand(BASE, source, "save to Artifacts/"),
  );
});
