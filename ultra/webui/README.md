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
node scripts/smoke.mjs                                  # normal (:3100)
node scripts/smoke.mjs http://127.0.0.1:3101 --broken-vault  # after AISUPLEX_VAULT=/nonexistent
```

## Write scope

This lane owns `app/**`, `components/**`, `lib/shell/**`, `scripts/**`,
`styles/**` (inline in `globals.css`) and the root config files. `lib/enrich/**`
is the AI SDK lane (imports land at T012). The vault is read-only.

## Brand

The logo is a **file to copy**, never a shape to redraw:
`public/brand/logo.svg` ← `/home/kmagwenzi/Projects/ai-suplex-labs/assets/img/logo.svg`
(byte-identical; sha256 must match). `logo.png` is the favicon.

## Theme

The shell ships **light ⇄ dark** (`localStorage.suplex-theme`, first visit follows
`prefers-color-scheme`, no flash on reload). The toggle styles **the shell only** — the
embedded artifacts carry their own look and follow the OS preference, so a shell theme
change does not re-theme a canvas. That is deliberate: the artifact is the artifact.
