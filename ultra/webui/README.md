# AI-Suplex Ultra — thin host

A local thin host over the six deterministic AI-Suplex surfaces + the AS MC
cockpit. It **embeds** the projections; it never re-renders them and never
issues a network request to display them.

## Run

```bash
cd ultra/webui
cp .env.example .env          # or export AISUPLEX_VAULT / AISUPLEX_TIER
npm install
npm run dev                   # binds http://127.0.0.1:3100
```

`AISUPLEX_VAULT` defaults to `~/Projects/AI-Suplex-OS/Deep-Ultra-OS/AI-Suplex-777`.
`AISUPLEX_TIER` is `ultra` (default) or `free` — a capability flag, never a license.

> **Port 3100, not 3000** — the 777 `lean-webui` lane holds 3000. Ultra owns 3100; set
> `PORT` to override.

## The seam (5 lines)

The four HTML surfaces mount over a **read-only, allowlisted passthrough route**
(`app/artifacts/[surface]/route.ts`, Node runtime, `no-store`, byte-identical) —
a browser cannot iframe a `file://` artifact from an `http://127.0.0.1` page.
A surface key is an allowlist token, never a path segment (traversal impossible
by construction). Opportunity Mapper and Deep Ultra run their tools server-side
and render the output verbatim.

## Acceptance

```bash
npm run build
npm test                                               # composer goldens · catalogue · matcher
node scripts/smoke.mjs                                  # normal (:3100)
node scripts/smoke.mjs http://127.0.0.1:3101 --broken-vault  # after AISUPLEX_VAULT=/nonexistent
node scripts/smoke.mjs http://127.0.0.1:3102 --free-tier     # after AISUPLEX_TIER=free
```

## Command bar (⌘K)

Press **⌘K / Ctrl-K** anywhere in the shell. Type an intent; the bar maps it to **one
command and three fields**, composes the command with the deterministic composer
(`lib/shell/compose.ts`, ported verbatim from the 777 composer), and offers **Copy**.

- **Fields, not prose.** The model returns `{command, sourceType, sourceValue, additional}`.
  The composer owns the bytes; nothing is streamed and nothing is chat.
- **No key = no dead end.** Without `AISUPLEX_MODEL_PROVIDER` + `AISUPLEX_MODEL_ID` + a
  provider key, a deterministic matcher picks the command and the bar labels the result
  `deterministic`. Removing the key changes depth, never structure.
- **Copy, not Dispatch.** No dispatcher ships here. Copy is the action, and nothing in
  the bar marks a stage done.
- **Free tier.** `AISUPLEX_TIER=free` opens the palette to a named gate; no request fires.
- **File-first catalogue.** The 17 `Prompt Patterns/AI-Suplex Commands/` files are read at
  render and handed to the palette, so it still browses when the API route is unreachable.
- **Editable.** Every mapped field (source type/value, additional) is editable and the
  composed block re-renders per keystroke; the operator can always override the model.

## Write scope

This lane owns `app/**`, `components/**`, `lib/shell/**`, `scripts/**`,
`styles/**` (inline in `globals.css`) and the root config files. `lib/enrich/**`
is the AI SDK lane — this lane **imports** it (the ⌘K route) and never edits it.
The vault is read-only.

## Brand

The logo is a **file to copy**, never a shape to redraw:
`public/brand/logo.svg` ← `/home/kmagwenzi/Projects/ai-suplex-labs/assets/img/logo.svg`
(byte-identical; sha256 must match). `logo.png` is the favicon.

## Theme

The shell ships **light ⇄ dark** (`localStorage.suplex-theme`, first visit follows
`prefers-color-scheme`, no flash on reload). The toggle styles **the shell only** — the
embedded artifacts carry their own look and follow the OS preference, so a shell theme
change does not re-theme a canvas. That is deliberate: the artifact is the artifact.
