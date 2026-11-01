import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { confirmGate, promotePayload, ritualPayload } from "./gates";

describe("confirmGate", () => {
  it("matches exactly, case-sensitive", () => {
    assert.equal(confirmGate("PROMOTE", "PROMOTE"), true);
    assert.equal(confirmGate("promote", "PROMOTE"), false);
    assert.equal(confirmGate("PROMOT", "PROMOTE"), false);
    assert.equal(confirmGate(" PROMOTE ", "PROMOTE"), true);
    assert.equal(confirmGate("", "PROMOTE"), false);
  });
});

describe("promotePayload — the gate never leaks approved:true", () => {
  it("sets approved only on the exact word", () => {
    const yes = promotePayload("PROMOTE", 70);
    assert.deepEqual(yes, { approved: true, min: 70 });

    assert.deepEqual(promotePayload("promote", 70), { approved: false });
    assert.deepEqual(promotePayload("PROMOTE!", 70), { approved: false });
    assert.deepEqual(promotePayload("", 70), { approved: false });
    assert.deepEqual(promotePayload("PROMOTE", 55), { approved: true, min: 55 });
  });
});

describe("ritualPayload — the token is the day you name", () => {
  it("accepts SATURDAY only for a saturday ritual", () => {
    assert.deepEqual(ritualPayload("SATURDAY", "saturday", true), {
      approved: true,
      which: "saturday",
      run: true,
    });
    assert.deepEqual(ritualPayload("TUESDAY", "saturday", true), { approved: false });
    assert.deepEqual(ritualPayload("SATURDAY", "tuesday", false), { approved: false });
  });

  it("accepts TUESDAY only for a tuesday ritual", () => {
    assert.deepEqual(ritualPayload("TUESDAY", "tuesday", false), {
      approved: true,
      which: "tuesday",
      run: false,
    });
  });
});
