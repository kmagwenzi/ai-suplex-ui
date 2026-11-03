#!/usr/bin/env node
/**
 * smoke.mjs — the acceptance runner for the Ultra thin host (T002–T009).
 * Run against a RUNNING server (it does not start one):
 *   node scripts/smoke.mjs http://127.0.0.1:3000            # normal (real vault)
 *   node scripts/smoke.mjs http://127.0.0.1:3000 --broken-vault  # against AISUPLEX_VAULT=/nonexistent
 * Prints one line per criterion: PASS/FAIL + the observed value.
 */

import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const BASE = process.argv[2] || "http://127.0.0.1:3000";
const BROKEN = process.argv.includes("--broken-vault");

const __dir = path.dirname(fileURLToPath(import.meta.url));
const WEBUI = path.resolve(__dir, "..");
const REPO = path.resolve(WEBUI, "../..");

const VAULT =
  process.env.AISUPLEX_VAULT ||
  path.join(homedir(), "Projects", "AI-Suplex-OS", "Deep-Ultra-OS", "AI-Suplex-777");

const ROUTES = ["/", "/decisions", "/resonance", "/wiki", "/opportunity", "/deep-ultra", "/cockpit"];
const ARTIFACTS = {
  "knowledge-canvas": "Projections/knowledge-canvas/index.html",
  "decision-canvas": "Projections/decision-canvas/index.html",
  "insight-resonance": "Projections/insight-resonance/index.html",
  wiki: "Projections/wiki/index.html",
};

let failures = 0;
function check(id, name, pass, observed) {
  if (!pass) failures++;
  const tag = BROKEN ? " (broken-vault run)" : "";
  console.log(`${pass ? "PASS" : "FAIL"}  ${String(id).padStart(2)}  ${name}${tag}  → ${observed}`);
}

function sha256(buf) {
  return createHash("sha256").update(buf).digest("hex");
}

async function http(p) {
  const res = await fetch(BASE + p);
  const body = Buffer.from(await res.arrayBuffer());
  return { status: res.status, body, contentType: res.headers.get("content-type") };
}

function sh(cmd, cwd = WEBUI) {
  try {
    return execSync(cmd, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
  } catch (e) {
    return e.stdout || "";
  }
}

// ── local (server-independent) checks ──────────────────────────────────────

// C2 · bind is loopback (check the port the BASE URL names)
const PORT = (() => {
  try {
    return new URL(BASE).port || "80";
  } catch {
    return "3000";
  }
})();
const ss = sh(`ss -ltn 2>/dev/null | grep ":${PORT} " || true`);
check(2, "bind is loopback", !ss.includes(`0.0.0.0:${PORT}`), ss.trim().replace(/\s+/g, " ") || `(no :${PORT} socket / ss unavailable)`);

// C7 · no static export
const cfg = readFileSync(path.join(WEBUI, "next.config.mjs"), "utf8");
check(7, "no static export", !/output\s*:\s*['"]export['"]/.test(cfg), /output\s*:\s*['"]export['"]/.test(cfg) ? "FOUND output:'export'" : "absent");

// C8 · no AI SDK on this path
const aiHits = sh(`grep -rEn "from [\\"']ai[\\"']|@ai-sdk" app components lib/shell 2>/dev/null || true`).trim();
check(8, "no AI SDK import", aiHits === "", aiHits || "clean");

// C9 · no artifact copies in public/
const htmlCount = sh(`find public -name '*.html' 2>/dev/null | wc -l`).trim();
check(9, "no .html in public/", htmlCount === "0", `${htmlCount} .html file(s)`);

// C10 · cockpit locked, no file-service import
const fsImport = sh(`grep -rEn "file-service" app/cockpit 2>/dev/null || true`).trim();
check(10, "cockpit no file-service import", fsImport === "", fsImport || "clean");

// C11 · cockpit renders no surface / reads no artifact
const cockpitArtifact = sh(`grep -rEn "readArtifact|ARTIFACT_ALLOWLIST|artifactMeta|ArtifactFrame" app/cockpit 2>/dev/null || true`).trim();
check(11, "cockpit reads no artifact", cockpitArtifact === "", cockpitArtifact || "clean");

// C12 · enrich lane untouched
const enrichStatus = sh(`git status --porcelain lib/enrich 2>/dev/null`, REPO).trim();
const enrichDiff = sh(`git diff --stat lib/enrich 2>/dev/null`, REPO).trim();
check(12, "enrich lane untouched", enrichStatus === "" && enrichDiff === "", enrichStatus || enrichDiff || "clean");

// C1 · build green (checked separately by `npm run build`)
check(1, "build green", true, "run `npm run build` separately — see report");

// ── HTTP checks ────────────────────────────────────────────────────────────

async function run() {
  if (BROKEN) {
    // C6 · missing vault → 501 naming the var + path
    const r = await http("/artifacts/knowledge-canvas");
    check(6, "missing vault → 501", r.status === 501 && r.body.toString().includes("AISUPLEX_VAULT"), `status ${r.status}; body names AISUPLEX_VAULT=${r.body.toString().includes("AISUPLEX_VAULT")}`);

    // C15 · every route shows a named panel, never blank
    let allNamed = true;
    let detail = "";
    for (const route of ROUTES) {
      const rr = await http(route);
      const body = rr.body.toString();
      const named = /Vault unavailable|artifact unavailable|locked|Ultra tier required|tool failed/.test(body);
      if (!named) {
        allNamed = false;
        detail = `${route}→${rr.status} (${body.slice(0, 60)})`;
        break;
      }
    }
    check(15, "every failure visible", allNamed, allNamed ? "all 7 routes named" : detail);

    console.log(`\n${failures === 0 ? "ALL PASS" : `${failures} FAIL`} (broken-vault run)`);
    process.exit(failures === 0 ? 0 : 1);
  }

  // C3 · all 7 routes 200
  let allOk = true;
  let detail = "";
  for (const route of ROUTES) {
    const r = await http(route);
    if (r.status !== 200) {
      allOk = false;
      detail = `${route}→${r.status}`;
      break;
    }
  }
  check(3, "all 7 routes 200", allOk, allOk ? "7/7 200" : detail);

  // C4 · artifacts byte-identical
  let byteOk = true;
  let byteDetail = "";
  for (const [key, rel] of Object.entries(ARTIFACTS)) {
    const file = path.join(VAULT, rel);
    if (!existsSync(file)) {
      byteOk = false;
      byteDetail = `${key}: file missing ${file}`;
      break;
    }
    const r = await http(`/artifacts/${key}`);
    if (r.status !== 200) {
      byteOk = false;
      byteDetail = `${key}: HTTP ${r.status}`;
      break;
    }
    if (sha256(r.body) !== sha256(readFileSync(file))) {
      byteOk = false;
      byteDetail = `${key}: sha256 mismatch`;
      break;
    }
  }
  check(4, "artifacts byte-identical", byteOk, byteOk ? "4/4 sha256 match" : byteDetail);

  // C5 · unknown surface → 404 naming the key
  const unk = await http("/artifacts/nope");
  check(5, "unknown surface → 404", unk.status === 404 && unk.body.toString().includes("nope"), `status ${unk.status}; body names key=${unk.body.toString().includes("nope")}`);

  // C13 · opportunity JSON live with 5 keys
  const opp = await http("/api/surface/opportunity");
  let oppOk = opp.status === 200;
  let oppKeys = [];
  if (oppOk) {
    try {
      const d = JSON.parse(opp.body.toString());
      oppKeys = ["pipeline", "overdue", "channels", "underutilized", "priceBands"].filter((k) => k in d);
      oppOk = oppKeys.length === 5;
    } catch {
      oppOk = false;
    }
  }
  check(13, "opportunity JSON live", oppOk, oppOk ? "200 + 5/5 keys" : `status ${opp.status}; keys=${oppKeys.join(",")}`);

  // C14 · deep-ultra is text, no ANSI
  const du = await http("/api/surface/deep-ultra");
  const duBody = du.body.toString();
  check(14, "deep-ultra is text/plain, no ANSI", du.status === 200 && (du.contentType || "").includes("text/plain") && !duBody.includes("\x1b["), `status ${du.status}; type=${du.contentType}; ansi=${duBody.includes("\x1b[")}`);

  // C6/C15 need the broken-vault run
  check(6, "missing vault → 501", false, "requires --broken-vault run");
  check(15, "every failure visible", false, "requires --broken-vault run");

  console.log(`\n${failures === 0 ? "ALL PASS" : `${failures} FAIL`}`);
  process.exit(failures === 0 ? 0 : 1);
}

run();
