# ai-suplex-ui — the UI surfaces of AI-Suplex

Three surfaces, one seam. Every folder here is a **window** over the vault: none of them
holds memory, framework logic, or its own scheduler.

| Path | Surface | Consumes | Status |
|---|---|---|---|
| `777/lean-webui/` | **Workflow Console** — the product | `mcp v1` (stdio) | 🚧 to build |
| `777/aionui/` | AionUI extension — demo / first touch | `mcp v1` (AionUI client) | ✅ built (v0) |
| `ultra/webui/` | Ultra web surface | `mcp v1` + Ultra capabilities | ⬜ stub |

## The boundary

- **The vault is the source of truth; MCP is the seam; a UI is a window.**
- No framework code · no memory · no fork. The server is `ai-suplex-harness`.
- `777/` is free; `ultra/` is paid. **The tree is the edition boundary.**

## Specs (in the vault)

| What | Where |
|---|---|
| The lean UI | `Projects/Lean UI — Design Spec.md` |
| The seam | `AI-Suplex Kick-start/Spec — MCP Contract (mcp v1).md` |
| The AionUI extension | `Projects/PRD — AI-Suplex 777 Harness UI Extension (OMP).md` |

## Run

- `777/aionui/` — install this folder as the AionUI extension (demo only; its MCP paths are local).
- `777/lean-webui/` — not scaffolded yet. Read the spec first.
- `ultra/webui/` — not built. Do not start here.

---

*Config + app surfaces only. The framework writes the vault; the harness shells out; the UI renders.*
