import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";
import { enrichObject } from "./object";
import { objectModel, throwingModel, hangingModel } from "./mock-model";
import { clearEnrichmentEnv } from "./test-env";

const schema = z.object({ name: z.string(), age: z.number() });

beforeEach(clearEnrichmentEnv);

test("no key → null (fail closed), no throw", async () => {
  assert.equal(await enrichObject({ schema, prompt: "hi" }), null);
});

test("with a model, returns the parsed object", async () => {
  const result = await enrichObject({
    schema,
    prompt: "hi",
    model: objectModel({ name: "kuda", age: 30 }),
  });
  assert.deepEqual(result, { name: "kuda", age: 30 });
});

test("provider error → null", async () => {
  const result = await enrichObject({ schema, prompt: "hi", model: throwingModel() });
  assert.equal(result, null);
});

test("schema mismatch → null (parse failure fails closed)", async () => {
  const result = await enrichObject({
    schema,
    prompt: "hi",
    model: objectModel({ name: 123, age: "not-a-number" }),
  });
  assert.equal(result, null);
});

test("timeout → null", async () => {
  const result = await enrichObject({
    schema,
    prompt: "hi",
    model: hangingModel(),
    timeoutMs: 50,
  });
  assert.equal(result, null);
});
