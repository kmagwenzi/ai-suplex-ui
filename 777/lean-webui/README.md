# 777/lean-webui — the Workflow Console

The product surface for AI-Suplex 777: a local-first Next.js app that renders the
**AI-Suplex Workflow** and composes the **AI-Suplex Commands**.

- **Spec:** `Projects/Lean UI — Design Spec.md` (v0.2 — draft for ratification)
- **Consumes:** `mcp v1` over **stdio** only — no direct vault reads, no framework code, no memory
- **Server:** `ai-suplex-harness` (`node server.js`; link a vault with `node link.js`)
- **Status:** not scaffolded yet — W1 is the skeleton + stdio client + the derived pipeline strip

## Three rules that will not bend

1. **The pipeline is the navigation. The commands are the verbs.**
2. **The UI composes and hands off** — it never runs an LLM.
3. **A copied command is not `done`; the output file is.**

Do not start here without the spec.
