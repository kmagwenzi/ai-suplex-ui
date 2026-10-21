# AI-Suplex 777 Harness UI — AionUI extension

**One line:** install once and the AI-Suplex 777 harness is *on* — the MCP server, the skin, the 7 commands as skills, and the operator assistant.

## What it is

One AionUI extension (`aion-extension.json`) that contributes four surfaces:

| Contribution | What |
|---|---|
| `mcpServers` | the `ai-suplex` harness MCP server — **mcp v1**: 8 resources · 9 tools · 7 prompts |
| `themes` | the **AI-Suplex 777** mission-control skin (dark base, one accent) |
| `skills` | the 7 AI-Suplex Commands, one skill per command |
| `assistants` | the **AI-Suplex Operator** assistant (all 7 skills enabled) |

## Install

1. AionUI → **Extensions → Import** → select this folder (or the packaged extension).
2. Confirm the import registers the server, theme, skills, and assistant.

## Verify

| Check | Where | Expect |
|---|---|---|
| Server connected | Settings → MCP | `ai-suplex` · status `connected` |
| Theme applied | Settings → Appearance | **AI-Suplex 777** — the dark skin |
| 7 skills | Skills list | session-start · session-end-report · artifact-capture · save-context · tasklist-generation · weekly-review · b-bomb-promotion |
| Operator | Assistants | **AI-Suplex Operator** · 7 skills enabled |

The server handshake (stdlib JSON-RPC): `initialize` → `ai-suplex-harness 1.0.0` · `resources/list` → 7 (+1 template) · `tools/list` → 9 · `prompts/list` → 7.

## Paths — edit before install

`contributes/mcp-servers.json` carries **machine-specific absolute paths**:

- `transport.args[0]` → the harness server (`…/ai-suplex-harness/server.js`)
- `transport.env.AISUPLEX_VAULT` → the vault (`…/Deep-Ultra-OS/AI-Suplex-777`)

Point both at your own paths. The server resolves the vault from `AISUPLEX_VAULT` (then by walking up to `period.md`).

## Honest limits

- **Config + docs only** — no framework code, no fork of AionUI, no native database dependency.
- **The chat widget is out of scope** — a command-palette widget is an upstream AionUI feature request; the commands-as-skills + the operator assistant are the native surface.
- **Ultra is not included** — this is the free 777 harness; the paid Ultra faculties ship separately.

*777 records; Ultra reasons.*
