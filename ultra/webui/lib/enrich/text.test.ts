import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { enrichText } from "./text";
import { textModel, throwingModel, hangingModel } from "./mock-model";
import { clearEnrichmentEnv } from "./test-env";

beforeEach(clearEnrichmentEnv);

test("no key → null (fail closed), no throw", async () => {
  assert.equal(await enrichText({ prompt: "hi" }), null);
});

test("with a model, returns the prose text", async () => {
  const result = await enrichText({ prompt: "hi", model: textModel("hello prose") });
  assert.equal(result, "hello prose");
});

test("provider error → null", async () => {
  assert.equal(await enrichText({ prompt: "hi", model: throwingModel() }), null);
});

test("timeout → null", async () => {
  assert.equal(await enrichText({ prompt: "hi", model: hangingModel(), timeoutMs: 50 }), null);
});
