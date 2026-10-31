---
name: save-context
description: "AI-Suplex: Save Context — persist the current thread's context to its instance file"
---

# ⚡ AI-Suplex: Save Context

**One line:** summarise the current thread and persist it to its thread-owned context file.

## Trigger

```
AI-Suplex: Save Context
CONTENT
  - Thread: <daily-tasks | project-tasks | random-tasks | realist>

ADDITIONAL: <instructions>
```

The thread is load-bearing — it sets the filename prefix and ownership. Never guess it.

## What the AI does

- Writes the instance's context brief (`Context Kick-start/Active/{prefix}cycle-{X}-week-{Y}-{slug}.md`) with What Was Accomplished · Current State · What the AI Needs to Know Next Session · Quick Links · Next Actions.
- Archives only *this* thread's predecessor; never another thread's file.
- Names terminal states (PUBLISHED · SENT · SUBMITTED · CLAIMED · PAID) — "ready" is not a state.

## Memory loop

None in the command — `suplex_save_context` persists the context; the loop (`suplex_close`) runs only at session end.

*Source: `Prompt Patterns/AI-Suplex Commands/⚡ Command — Save Context.md` · one skill = one command.*
