---
name: session-start
description: "AI-Suplex: Session Start — generate a battle-ready session start prompt from a Task ID or tasklist"
---

# ⚡ AI-Suplex: Session Start

**One line:** turn a Task ID or task description into a battle-ready Session Start prompt.

## Trigger

```
AI-Suplex: Session Start
CONTENT
  - Raw Content: <Task ID (e.g. T003-H) or task description>

ADDITIONAL: <instructions>
```

Sources: Raw Content (required) · File Reference (a tasklist) · Chat Reference (optional).

## What the AI does

- Acts as **Architect** — generates the prompt with every required field: Session_Type · Focus · Mission · Expected_Duration · Energy_Level · Tasks with role tags · Success Metrics.
- Saves to `Sessions/Active/Start/` with the session-start naming convention.

## Memory loop

None on generation — the session's memory loop (`3lm end → learn → index`) runs at Session End.

*Source: `Prompt Patterns/📄 Pattern - Session Start Prompt Generation.md` · one skill = one command.*
