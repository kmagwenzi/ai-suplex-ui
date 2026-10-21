---
name: session-end-report
description: "AI-Suplex: Session End Report — generate the report and run the memory loop"
---

# ⚡ AI-Suplex: Session End Report

**One line:** close a session with a formatted report and push its lessons to memory.

## Trigger

```
AI-Suplex: Session End Report
CONTENT
  - Raw Content: Session completed. Rating 5/5. 8 artifacts.

ADDITIONAL: Run 3lm end → learn → index
```

Sources: Raw Content (rating, artifact count) · Chat Reference (the session summary).

## What the AI does

- Extracts session metadata and generates the report with full frontmatter (session_id · focus · cycle · week · duration · energy · productivity · insights · blockers · next_actions).
- Saves to `Sessions/Active/End/`.
- Runs the memory loop and saves the context brief so the next session starts clean.

## Memory loop

`suplex_close` — `3lm learn → index` (runs `3lm end` only when a Session End report exists).

Skip with `ADDITIONAL: Skip memory loop`.

*Source: `Prompt Patterns/AI-Suplex Commands/⚡ Command — Session End Report.md` · one skill = one command.*
