import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { stripFrontmatter } from "./markdown";

describe("stripFrontmatter", () => {
  it("drops a leading YAML block", () => {
    const md = "---\ntype: tasklist\ntitle: X\n---\n\n# X\n\nBody";
    assert.equal(stripFrontmatter(md), "# X\n\nBody");
  });

  it("leaves markdown without frontmatter alone", () => {
    assert.equal(stripFrontmatter("# X\n\nBody"), "# X\n\nBody");
  });

  it("only strips the FIRST block, never a mid-document one", () => {
    const md = "# X\n\n---\nnot: frontmatter\n---";
    assert.equal(stripFrontmatter(md), md);
  });

  it("survives CRLF and a BOM", () => {
    assert.equal(stripFrontmatter("\uFEFF---\r\na: 1\r\n---\r\nBody"), "Body");
  });
});
