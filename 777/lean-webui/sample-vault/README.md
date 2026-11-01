# Sample vault — one realistic week

A committed data fixture for the Lean WebUI first-run proof. Link it with:

```bash
node /path/to/ai-suplex-harness/link.js /path/to/ai-suplex-ui/777/lean-webui/sample-vault
node /path/to/ai-suplex-harness/link.js --show   # verify
```

## What is here

| Path | Purpose |
|---|---|
| `period.md` + `contract.json` | the link markers — `link.js` requires both |
| `Tasklists/` | one weekly + two daily tasklists |
| `Sessions/Active/Start/` · `End/` | a session start + a session end report |
| `Artifacts/…` · `Insights/…` | the week's captures |
| `Memory/lessons.md` · `index.md` | staged lessons + the index |
| `Context Kick-start/Active/` | two open instances (`threads`) |
| `AI-Suplex Kick-start/Context Kick-start/Active Mission Context.md` | the mission |

## The planted contradiction

`Memory/lessons.md` carries one candidate that claims *"plan the week once in a
single weekly tasklist"* — which contradicts the governing semantic truth in
`Memory/index.md` (*"daily tasklists are the execution unit"*). It exists so
`3lm revise` has a real contradiction to surface on the memory loop.

## A note on Tools

This vault is **data only**. The harness's computed resources shell out to
`Tools/asmc.js`, `Tools/3lm.js` and `Tools/approvals.js`, which live in the real
vault and are intentionally **not** copied here (the window stays MCP-only, and
the UI repo carries no framework code). To run the console's *computed* reads
against this sample, point it at the real vault, or copy `Tools/` in yourself.
The *file* reads (`tasklist/{path}`, `memory/index`, `memory/lessons`, `mission`)
work against this sample as-is.
