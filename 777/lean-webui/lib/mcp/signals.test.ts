import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildSignals } from "./resources";
import type { OperatorBrief } from "../types";

function brief(overrides: Partial<OperatorBrief> = {}): OperatorBrief {
  return {
    vault: "/v",
    date: "2026-11-17",
    period: "2026-2027",
    cycle: 3,
    week: 5,
    open: 0,
    instances: [],
    tasklists: [],
    ...overrides,
  };
}

const activity = {
  date: "2026-11-17",
  sessionStart: true,
  sessionEnd: true,
  sessionOpen: true,
  latestStart: "2026-11-17-1505-a.md",
  latestEnd: "2026-11-17-1200-b.md",
  artifacts: 2,
  episodes: 0,
};

describe("buildSignals — activity, when the vault reports it", () => {
  it("maps start, artifacts and episodes", () => {
    const s = buildSignals(brief({ activity }), brief(), []);
    assert.equal(s.sessionStartToday, true);
    assert.equal(s.artifactToday, true);
    assert.equal(s.episodeToday, false);
  });

  it("treats an open session as not-closed (endReportToday false)", () => {
    const s = buildSignals(brief({ activity }), brief(), []);
    assert.equal(s.endReportToday, false);
  });

  it("counts a later end as closed", () => {
    const s = buildSignals(
      brief({ activity: { ...activity, sessionOpen: false } }),
      brief(),
      [],
    );
    assert.equal(s.endReportToday, true);
  });

  it("leaves every signal null when the vault reports no activity", () => {
    const s = buildSignals(brief(), brief(), []);
    assert.equal(s.sessionStartToday, null);
    assert.equal(s.artifactToday, null);
    assert.equal(s.endReportToday, null);
    assert.equal(s.episodeToday, null);
  });
});
