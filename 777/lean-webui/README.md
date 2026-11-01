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

## Run

```bash
npm install
npm run dev      # or: npm run ui — Node >= 20, no node:sqlite
```

> Fonts (Space Grotesk + IBM Plex Mono) are downloaded and self-hosted by
> `next/font/google` at **build time** — the first `npm run build` needs network.

The console spawns **one** persistent harness process (`node server.js`) and
keeps it warm for the life of the app — never per request. It resolves the
harness by `HARNESS_PATH`, defaulting to `../../../ai-suplex-harness/server.js`
relative to this app. `AISUPLEX_VAULT` is passed straight through; the harness
otherwise uses its own `vault.json` link (`node link.js --show` to check).

## Routes

| Route | Job |
|---|---|
| `/` | **Today** — the pipeline strip, the current stage, the next command, the memory pulse, Ultra named-and-locked |
| `/pipeline` | the ten stages as a readable stack — state · inputs · command · output · gate |
| `/commands` | the catalogue — 7 dispatchable prompts (via `prompts/list` + `prompts/get`) + 6 copy-only, with the composer |
| `/session` | the active day — read-only tasklist + capture + close |
| `/memory` | lessons + index + promote/approve/ritual (each gated) |
| `/setup` | first run — vault detect, `link.js` docs, MCP latency, the sample-vault offer, the first-loop entry |
| `/api/health` | live MCP latency for the header dot |
| `/api/telemetry` | per-call name · ms · exit code + p50/p95 (`?debug=1` overlay) |
| `/api/prompt` | one prompt's verbatim envelope + body (the composer fetches this lazily) |
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
npm test                  # stage-state derivation (tsx + node:test)
npm run build             # Next.js build + the Node 20 preflight
grep -rn "node:sqlite" app lib components scripts || echo "GATE — no sqlite"
grep -rn "vault-index\|/lib/3lm\|knowledge-graph" app lib components || echo "GATE — pure window"
```
