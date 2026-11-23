import test from "node:test";
import assert from "node:assert/strict";
import { LINK_KINDS, linkFor, obsidianHref, vaultNameFromPath, withoutExtension } from "./links";

/**
 * R2's invariant, asserted: a row without a link is a bug. These tests pin the URI shape so a
 * link that looks right but resolves nowhere fails here rather than in a reader's browser.
 */

const VAULT = "/home/kmagwenzi/Projects/AI-Suplex-OS/Deep-Ultra-OS/AI-Suplex-777";

test("the vault name is the folder name, never the whole path", () => {
  assert.equal(vaultNameFromPath(VAULT), "AI-Suplex-777");
  assert.equal(vaultNameFromPath(VAULT + "/"), "AI-Suplex-777");
  assert.equal(vaultNameFromPath(null), "");
  assert.equal(vaultNameFromPath(""), "");
});

test("an href encodes the query value and drops the extension", () => {
  const href = obsidianHref("AI-Suplex-777", "AI-Suplex Kick-start/Context Kick-start/Active/daily-tasks.md");
  assert.ok(href.startsWith("obsidian://open?vault=AI-Suplex-777&file="));
  assert.ok(!href.includes(".md"), "the extension is dropped: " + href);
  assert.ok(href.includes("%20"), "spaces are encoded: " + href);
  assert.ok(!href.includes("/Context Kick-start"), "no raw spaces survive: " + href);
});

test("an instance resolves into the Active folder", () => {
  const link = linkFor("instance", "daily-tasks.md", VAULT);
  assert.ok(link);
  assert.equal(link!.path, "AI-Suplex Kick-start/Context Kick-start/Active/daily-tasks");
  assert.ok(link!.href.includes(encodeURIComponent(link!.path)));
});

test("a tasklist keeps its bare name — open and archived ones share no folder", () => {
  const link = linkFor("tasklist", "2026-11-22-project-tasks-ultra-refinement-tasklist.md", VAULT);
  assert.ok(link);
  assert.equal(link!.path, "2026-11-22-project-tasks-ultra-refinement-tasklist");
});

test("a row that names a fixed file ignores the row's own text", () => {
  assert.equal(linkFor("receipt", "anything.md", VAULT)!.path, "Memory/ritual-log");
  assert.equal(linkFor("hermes", null, VAULT)!.path, "Tools/cron/hermes-jobs");
});

test("a path is used as given, not re-homed", () => {
  const rel = "Artifacts/2026-2027/Cycle 3/Week 5/2026-11-23-0800-ultra-day-one.md";
  const link = linkFor("artifact", rel, VAULT);
  assert.equal(link!.path, withoutExtension(rel));
});

test("every link kind resolves — a new kind cannot ship bare", () => {
  const sample: Record<string, string> = {
    instance: "x.md",
    tasklist: "y.md",
    receipt: "ignored.md",
    hermes: "ignored.md",
    artifact: "Artifacts/a/b/c.md",
    review: "Week 5 Review.md",
  };
  for (const kind of LINK_KINDS) {
    const link = linkFor(kind, sample[kind], VAULT);
    assert.ok(link, kind + " produced no link");
    assert.ok(link!.href.startsWith("obsidian://open?"), kind + " produced a non-obsidian href");
    assert.equal(link!.kind, kind);
  }
});

test("no vault, no link — a row never points at a guess", () => {
  assert.equal(linkFor("instance", "daily-tasks.md", null), null);
  assert.equal(linkFor("instance", "daily-tasks.md", ""), null);
  assert.equal(linkFor("instance", null, VAULT), null);
});
