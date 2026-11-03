#!/usr/bin/env node
/**
 * smoke.mjs — the acceptance runner for the Ultra thin host (T002–T009).
 * Run against a RUNNING server (it does not start one):
 *   node scripts/smoke.mjs                                 # normal (real vault, :3100)
 *   node scripts/smoke.mjs http://127.0.0.1:3101 --broken-vault  # against AISUPLEX_VAULT=/nonexistent
 * Prints one line per criterion: PASS/FAIL + the observed value.
 */

import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const BASE = process.argv[2] || `http://127.0.0.1:${process.env.PORT || 3100}`;
const BROKEN = process.argv.includes("--broken-vault");
const FREE = process.argv.includes("--free-tier");

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
function skip(id, name, note) {
  console.log(`SKIP  ${String(id).padStart(2)}  ${name}  → ${note}`);
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
const ss = sh(`ss -ltn 2>/dev/null | grep ":${PORT} " || true`).trim();
// A missing socket is a FAIL, not a pass: this runner tests a server that must be up.
const listening = ss.length > 0;
const wildcard = ss.includes(`0.0.0.0:${PORT}`) || ss.includes(`[::]:${PORT}`);
check(
  2,
  "bind is loopback",
  listening && !wildcard,
  listening
    ? ss.replace(/\s+/g, " ")
    : `nothing listening on :${PORT} — start the server first`,
);

// C7 · no static export
const cfg = readFileSync(path.join(WEBUI, "next.config.mjs"), "utf8");
check(7, "no static export", !/output\s*:\s*['"]export['"]/.test(cfg), /output\s*:\s*['"]export['"]/.test(cfg) ? "FOUND output:'export'" : "absent");

// C8 · no AI SDK on this path
const aiHits = sh(`grep -rEn "from [\\"']ai[\\"']|@ai-sdk" app components lib/shell 2>/dev/null || true`).trim();
check(8, "no AI SDK import", aiHits === "", aiHits || "clean");

// C9 · no artifact copies in public/
const htmlCount = sh(`find public -name '*.html' 2>/dev/null | wc -l`).trim();
check(9, "no .html in public/", htmlCount === "0", `${htmlCount} .html file(s)`);

// C10 · the cockpit is file-first: it reads the vault through asm-cockpit/lib/file-service.mjs
// and pulls in no database, no daemon and no bridge. (Pre-T010 this asserted the route was
// locked and imported nothing; T010 is the task that wires it — the criterion follows the task.)
const seamWired = sh(`grep -l "file-service" lib/shell/cockpit.ts 2>/dev/null || true`).trim() !== "";
const cockpitUsesSeam = sh(`grep -c "loadCockpit" app/cockpit/page.tsx 2>/dev/null || true`).trim() !== "0";
// Real imports only: prose that *mentions* a database is not a database.
const dbHits = sh(
  `grep -rEn "PrismaClient|new Pool\\(|createServer\\(|from ['\"]pg['\"]|postgres://" app/cockpit lib/shell/cockpit.ts components/cockpit-sections.tsx 2>/dev/null || true`,
).trim();
check(
  10,
  "cockpit is file-first (file-service, no db/daemon)",
  seamWired && cockpitUsesSeam && dbHits === "",
  dbHits || `file-service wired · page uses loadCockpit · no db/daemon imports`,
);

// C11 · cockpit ≠ intelligence: the ops route renders no artifact and no surface frame
const cockpitArtifact = sh(`grep -rEn "readArtifact|ARTIFACT_ALLOWLIST|artifactMeta|ArtifactFrame|iframe" app/cockpit components/cockpit-sections.tsx 2>/dev/null || true`).trim();
check(11, "cockpit reads no artifact", cockpitArtifact === "", cockpitArtifact || "clean");

// C12 · enrich lane untouched
const enrichStatus = sh(`git status --porcelain lib/enrich 2>/dev/null`, REPO).trim();
const enrichDiff = sh(`git diff --stat lib/enrich 2>/dev/null`, REPO).trim();
check(12, "enrich lane untouched", enrichStatus === "" && enrichDiff === "", enrichStatus || enrichDiff || "clean");

// C24 · no chat, no streaming — the bar renders a command, not a reply
const chatHits = sh(
  `grep -rEn "useChat|useCompletion|streamText|ReadableStream" app components 2>/dev/null || true`,
).trim();
check(24, "no chat / no streaming", chatHits === "", chatHits || "clean");

// C25 · the key never crosses the wire. The only enrichObject caller is the
// server-side intent mapper (imported by the route), never a page or component.
const keyHits = sh(`grep -rEn "API_KEY|apiKey" app components 2>/dev/null || true`).trim();
const enrichCallers = sh(`grep -rlE "enrichObject\\(" app components lib/shell 2>/dev/null || true`)
  .trim()
  .split("\n")
  .filter(Boolean)
  .sort()
  .join(",");
check(
  25,
  "enrichment is server-side only",
  keyHits === "" && enrichCallers === "lib/shell/command-intent.ts",
  keyHits || `enrichObject callers: ${enrichCallers || "none"}`,
);

// C26 · copied ≠ done: exactly one fetch, to the mapping route; no write path
const fetchCount = sh(`grep -c "fetch(" components/command-bar.tsx 2>/dev/null || true`).trim();
const fetchTarget = sh(`grep -c 'fetch("/api/command-bar"' components/command-bar.tsx 2>/dev/null || true`).trim();
const writeHits = sh(
  `grep -rEn "writeFile|unlink|approve" components/command-bar.tsx 2>/dev/null || true`,
).trim();
check(
  26,
  "copied ≠ done (one fetch, no write path)",
  fetchCount === "1" && fetchTarget === "1" && writeHits === "",
  `fetches=${fetchCount} target=${fetchTarget} writes=${writeHits || "none"}`,
);

// C1 · a build artifact exists. Green-ness is `npm run build`'s own exit code — this
// script cannot re-prove it, so it checks the thing it *can* see and says so.
const buildIdPath = path.join(WEBUI, ".next", "BUILD_ID");
const built = existsSync(buildIdPath);
check(
  1,
  "build artifact present",
  built,
  built
    ? `.next/BUILD_ID ${readFileSync(buildIdPath, "utf8").trim().slice(0, 12)}…`
    : "no .next/BUILD_ID — run npm run build",
);

// ── HTTP checks ────────────────────────────────────────────────────────────

async function run() {
  if (FREE) {
    let allGated = true;
    let leaked = false;
    let detail = "";
    for (const route of ROUTES) {
      const r = await http(route);
      const body = r.body.toString();
      if (r.status !== 200 || !body.includes("Ultra tier required")) {
        allGated = false;
        detail = `${route}→${r.status} (no tier gate)`;
        break;
      }
      if (body.includes("Artifact Capture (Scratch Pad)")) leaked = true;
    }
    check(
      27,
      "free tier gated · no catalogue leak",
      allGated && !leaked,
      allGated
        ? leaked
          ? "catalogue names leaked into the free shell"
          : "7/7 routes gated · catalogue absent"
        : detail,
    );
    console.log(`\n${failures === 0 ? "ALL PASS" : `${failures} FAIL`} (free-tier run)`);
    process.exit(failures === 0 ? 0 : 1);
  }

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

  // C20 · the ⌘K trigger is chrome on every route (keyboard pass is visual)
  let triggerOk = true;
  let triggerDetail = "";
  for (const route of ROUTES) {
    const body = (await http(route)).body.toString();
    if (!body.includes('aria-haspopup="dialog"') || !body.includes("⌘K")) {
      triggerOk = false;
      triggerDetail = `${route} carries no ⌘K trigger`;
      break;
    }
  }
  check(20, "⌘K trigger on all 7 routes", triggerOk, triggerOk ? "7/7 routes carry the trigger" : triggerDetail);

  // C21 · byte identity — the shipped composer, run for real
  const probeDir = mkdtempSync(path.join(tmpdir(), "ultra-compose-"));
  const probeFile = path.join(probeDir, "probe.ts");
  writeFileSync(
    probeFile,
    `import { baseTemplate, composeCommand } from ${JSON.stringify(path.join(WEBUI, "lib/shell/compose.ts"))};\n` +
      `process.stdout.write(composeCommand(baseTemplate("Kickstart"), { type: "raw", value: "field one" }, "extra"));\n`,
  );
  const composed = sh(`./node_modules/.bin/tsx ${JSON.stringify(probeFile)}`);
  rmSync(probeDir, { recursive: true, force: true });
  const EXPECTED =
    "AI-Suplex: Kickstart\nCONTENT\n  - Raw Content: field one\n\nADDITIONAL: extra";
  check(
    21,
    "byte-identity (shared composer)",
    composed === EXPECTED,
    composed === EXPECTED ? "golden string matches the shipped composer" : JSON.stringify(composed.slice(0, 90)),
  );

  // C22/C23 · the route maps fields; no key → still a command
  const intentResponse = await fetch(BASE + "/api/command-bar", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ intent: "kickstart the lane" }),
  });
  let mapping = null;
  try {
    mapping = await intentResponse.json();
  } catch {
    mapping = null;
  }
  check(
    22,
    "route returns fields only",
    intentResponse.status === 200 && mapping !== null && !("rendered" in mapping),
    `status ${intentResponse.status}; rendered=${mapping ? "rendered" in mapping : "no body"}`,
  );
  if (process.env.AISUPLEX_MODEL_PROVIDER) {
    skip(23, "no key → deterministic", "a provider is configured in this shell");
  } else {
    check(
      23,
      "no key → deterministic, still a command",
      mapping?.mode === "deterministic" && typeof mapping?.command === "string",
      `mode=${mapping?.mode ?? "—"}; command=${mapping?.command ?? "—"}`,
    );
  }

  // C28 · bad input fails loudly, naming the field
  const postJson = (body) =>
    fetch(BASE + "/api/command-bar", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  const empty = await postJson({ intent: "" });
  const long = await postJson({ intent: "x".repeat(501) });
  const emptyBody = await empty.text();
  check(
    28,
    "failure is visible (400 names intent)",
    empty.status === 400 && long.status === 400 && emptyBody.includes("intent"),
    `${empty.status}/${long.status}; names intent=${emptyBody.includes("intent")}`,
  );

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

  // C11b · the ops route serves no artifact frame and names its three sections
  const cockpit = await http("/cockpit");
  const cockpitBody = cockpit.body.toString();
  const cockpitOk =
    cockpit.status === 200 &&
    !cockpitBody.includes("/artifacts/") &&
    /Operator state/.test(cockpitBody) &&
    /Approvals inbox/.test(cockpitBody) &&
    /Active tasklists/.test(cockpitBody);
  check(
    11,
    "cockpit reads no artifact",
    cockpitOk,
    cockpitOk
      ? "no /artifacts/ · operator + approvals + tasklists present"
      : `status ${cockpit.status}; artifact-ref=${cockpitBody.includes("/artifacts/")}`,
  );

  // C6/C15 need the broken-vault run
  skip(6, "missing vault → 501", "requires --broken-vault run");
  skip(15, "every failure visible", "requires --broken-vault run");

  console.log(`\n${failures === 0 ? "ALL PASS" : `${failures} FAIL`}`);
  process.exit(failures === 0 ? 0 : 1);
}

run();
