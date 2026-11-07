# 777/lean-webui — the Workflow Console

The product surface for AI-Suplex 777: a local-first Next.js console that
renders the **AI-Suplex Workflow** and surfaces the **AI-Suplex Commands**,
consuming **`mcp v1` over stdio only**.

- **Spec:** `Projects/Lean UI — Design Spec.md` (v0.2)
- **Server:** `ai-suplex-harness` — a window over a vault, `node server.js`
- **Consumes:** `mcp v1` (8 resources · 9 tools · 7 prompts) — **no direct
  vault reads, no framework code, no memory of its own**

## Three rules that will not bend

1. **The pipeline is the navigation. The commands are the verbs.** No screen
   exists outside a stage; the strip is the hero.
2. **The UI composes and hands off** — it never runs an LLM. It shows the
   command; it does not pretend to execute it.
3. **A copied command is not `done`; the output file is.** A stage flips only
   when the vault holds its output — never when a button is pressed.

## Install and run

```bash
# 1 · Node 20 or newer — the preflight stops the build otherwise
node --version

# 2 · one command
npm install
npm run ui          # → http://localhost:3000

# 3 · first run: open /setup, point it at your vault, run the loop
```

**The one command is `npm run ui`.** There is no published `npx` path yet — this
package is `private` until launch, so `npx` would resolve to nothing. When the
777 edition ships, `npx ai-suplex-ui` becomes the entry; until then, clone and run.

**The harness.** The console spawns **one** persistent `node server.js` and keeps
it warm for the life of the app — never per request. It resolves it by
`HARNESS_PATH`, defaulting to `../../../ai-suplex-harness/server.js` relative to
this app. If that is not where yours lives:

```bash
HARNESS_PATH=/absolute/path/to/ai-suplex-harness/server.js npm run ui
```

`AISUPLEX_VAULT` is passed straight through; the harness otherwise uses its own
`vault.json` link (`node link.js --show` to check). A missing harness is a
**named** error on screen, never a blank page — and `npm run ui` warns before
the first render.

> Fonts (Space Grotesk + IBM Plex Mono) are downloaded and self-hosted by
> `next/font/google` at **build time** — the first `npm run build` needs network.

## Measure it

```bash
npm run bench        # 20 samples per read, 5 per tool — enforces the §11 budgets
npm run bench -- 50  # more samples
```

The bench exits non-zero when a budget is missed, so "MCP is slow" is a number,
not an opinion. Measured 2026-11-07 (Node 22, warm server):

| Read | p95 | Budget |
|---|---|---|
| `suplex://context` | 100 ms | < 150 |
| `suplex://tasklists` | 106 ms | < 150 |
| `suplex://threads` | 99 ms | < 150 |
| `suplex://approvals` | **314 ms** | < 150 ✗ |
| `suplex://mission` · `memory/index` · `memory/lessons` | 1–7 ms | < 150 |
| `prompts/list` | 1 ms | < 100 |
| tool `suplex_status` / `suplex_tasklist_next` | 120 / 138 ms | < 2 s |

**`suplex://approvals` is the one breach** — 314 ms because the harness shells
`3lm approvals --json`, which scores 477 lessons on every call. It is a
harness cost, not an app cost; the fix is a short-lived cache (or a `--fast`
path) inside `ai-suplex-harness`, not a second implementation of memory here.

### Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| "could not start the MCP server" | `HARNESS_PATH` wrong or harness not installed | set `HARNESS_PATH` to the absolute `server.js` |
| Every component unhydrated, `__webpack_modules__[moduleId] is not a function` | `next build` ran while `next dev` held `.next` | stop dev, `rm -rf .next`, restart — **never build under a live dev server** |
| Port in use | another dev server | `npm run ui -- -p 3007` |

## Routes

| Route | Job |
|---|---|
| `/` | **Today** — the pipeline strip, the current stage, the next command, the memory pulse, Ultra named-and-locked |
| `/pipeline` | the ten stages as a readable stack — state · inputs · command · output · gate |
| `/commands` | the catalogue — 7 dispatchable prompts (via `prompts/list`) + 14 copy-only, with the field-driven composer |
| `/session` | the active day — read-only tasklist + capture + close |
| `/memory` | lessons + index + promote/approve/ritual (each gated) |
| `/setup` | first run — vault detect, `link.js` docs, MCP latency, the sample-vault offer, the first-loop entry |
| `/api/health` | live MCP latency for the header dot |
| `/api/telemetry` | per-call name · ms · exit code + p50/p95 (`?debug=1` overlay) |
| `/api/session/capture` · `/api/session/close` | POST — `suplex_capture` · `suplex_close` |
| `/api/memory/promote` · `/api/memory/approve` · `/api/memory/ritual` | POST — the gated writes |

## Writes are gated

`suplex_promote` and `suplex_ritual` throw unless `approved === true`; the UI
sends that flag only after the user types the confirmation (`PROMOTE`, the
item id, or `SATURDAY`/`TUESDAY`). No gate fires from a single click —
`lib/gates.ts` is the pure, tested source of that coupling.

## Sample vault

`sample-vault/` is a committed, documented fixture — one realistic week
(Cycle 3 · Week 1) that passes the `link.js` marker check (`period.md` +
`contract.json`). It ships tasklists, a session, artifacts, lessons with a
**planted contradiction**, and two open instances. See `sample-vault/README.md`.
It is **data only** — the framework's `Tools/` scripts stay in the real vault,
never in this repo.

## Architecture

- **One persistent stdio server.** The reason "MCP is slow" is ever true is a
  per-request spawn — this client never does that.
- **No cache as truth.** Every read revalidates from the server; the UI holds
  no model it trusts over the next read.
- **State is derived, never stored.** "Where am I" is a pure function
  (`lib/stages.ts`) over the resources — `done` / `current` / `blocked` /
  `skipped` — with unit tests for the `copied ≠ done` rule.
- **Failure is shown, not smoothed.** Kill the server and the UI names the
  failing tool/resource; it never renders a blank screen.

## Verify

```bash
npm test                  # 74 tests — stage state · gates · envelope · contracts · catalogue · contract subset · MCP smoke · failed server
npm run build             # Next.js build + the Node 20 preflight
npm run bench             # §11 budgets, enforced
grep -rn "node:sqlite" app lib components --include='*.ts' --include='*.tsx' || echo "GATE — no sqlite"
grep -rE 'readFile|readdir|node:fs' app lib components --include='*.ts' --include='*.tsx' --exclude='*.test.ts' && echo "FAIL — file reads in the UI" || echo "GATE — MCP-only"
```
