---
name: artifact-capture
description: "AI-Suplex: Artifact Capture — capture work-in-progress as an artifact and route lessons to memory"
---

# ⚡ AI-Suplex: Artifact Capture

**One line:** capture chat, a file, or raw content as a structured artifact — and route its lessons to memory.

## Trigger

```
AI-Suplex: Artifact Capture
CONTENT
  - Raw Content: <work-in-progress — code, notes, diagrams>

ADDITIONAL: Save to Artifacts/<Period>/Cycle X/Week Y/
```

Sources: Raw Content · File Reference · Chat Reference (at least one).

## What the AI does

- Acts as **Builder** — generates the artifact with frontmatter (focus · cycle · week · key insights · next actions) and all template sections.
- Saves to `Artifacts/<Period>/Cycle X/Week Y/` with the `YYYY-MM-DD-HHMM-{mission}-{focus}.md` naming.

## Memory loop

`suplex_capture` — writes the artifact and routes ≤3 lessons to `Memory/lessons.md`.

Skip with `ADDITIONAL: Skip memory loop`.

*Source: `Prompt Patterns/📄 Pattern - Artifact Capture.md` · one skill = one command.*
