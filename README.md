# AI-Suplex × AionUI — MCP registration

Register the AI-Suplex MCP server (`Tools/mcp/server.js`) in AionUI over **stdio**.

## 1 · Get the resolved config

```bash
node Tools/mcp/aionui/configure.js
```

It prints the `mcpServers` JSON with **this vault's** absolute path. No side effects.

## 2 · Register in AionUI

**Settings → MCP → Add server**

| Field | Value |
|---|---|
| Name | `ai-suplex` |
| Command | `node` |
| Args | `<vault>/Tools/mcp/server.js` |
| Transport | `stdio` |
| Env | `AISUPLEX_VAULT=<vault>` (explicit; required when the harness runs from its own repo) |

Or import the printed `mcpServers` JSON through AionUI's unified MCP management.
AionUI injects the server into whichever agent you run (built-in · Claude Code · Hermes · …).

## 3 · Verify

- AionUI lists **8 resources**, **9 tools**, **7 prompts**.
- Open `suplex://context` — the operator brief.
- Call `suplex_status` — the vault state.

## What the server exposes

| Kind | Items |
|---|---|
| **Resources (8)** | `suplex://context` · `mission` · `threads` · `tasklists` · `tasklist/{path}` · `memory/index` · `memory/lessons` · `approvals` |
| **Tools (9)** | `suplex_status` · `suplex_tasklist_next` · `suplex_capture` · `suplex_save_context` · `suplex_close` · `suplex_index` · `suplex_promote` · `suplex_approve` · `suplex_ritual` |
| **Prompts (7)** | `session-start` · `session-end-report` · `artifact-capture` · `save-context` · `tasklist-generation` · `weekly-review` · `b-bomb-promotion` |

## The boundary

The server is a **window** (`Spec — MCP Contract (mcp v1)` §7–§8):

- the **framework** is the only writer;
- the **UI** never writes a file directly (two declared file-writes are the exception, and they are guarded);
- **`3lm sync` is not on the surface** (the UI is not a committer);
- the **Hustler gate** is `approved: true` on promote / approve / ritual.

## Optional: the assistant

`assistant.md` is an AionUI **custom-assistant** definition (Settings → Assistants → Create).
It teaches the agent to use the MCP tools and respect the gate.

## Optional: a skin

AionUI supports custom CSS. Keep any theme in `ai-suplex-ui/theme.css`; it is cosmetic and
never carries framework code (the UI is config, not a fork).

## Extraction

This folder is the seed for **`ai-suplex-ui`**: it contains config + docs only, and depends on
`mcp v1` — never on framework code.
