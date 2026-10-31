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

The console spawns **one** persistent harness process (`node server.js`) and
keeps it warm for the life of the app — never per request. It resolves the
harness by `HARNESS_PATH`, defaulting to `../../../ai-suplex-harness/server.js`
relative to this app. `AISUPLEX_VAULT` is passed straight through; the harness
otherwise uses its own `vault.json` link (`node link.js --show` to check).

## Routes (W1)

| Route | Job |
|---|---|
| `/` | **Today** — the pipeline strip, the current stage, the next command, the memory pulse, Ultra named-and-locked |
| `/pipeline` | the ten stages as a readable stack — state · inputs · command · output · gate |
| `/api/health` | live MCP latency for the header dot |
| `/api/telemetry` | per-call name · ms · exit code + p50/p95 (`?debug=1` overlay) |

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
npm test                  # stage-state derivation (Vitest)
npm run build             # Next.js build + the Node 20 preflight
grep -rn "node:sqlite" app lib components scripts || echo "GATE — no sqlite"
grep -rn "vault-index\|/lib/3lm\|knowledge-graph" app lib components || echo "GATE — pure window"
```
