---
name: tasklist-generation
description: "AI-Suplex: Tasklist Generation — turn raw to-dos into a structured tasklist"
---

# ⚡ AI-Suplex: Tasklist Generation

**One line:** turn a raw to-do list into a structured, time-blocked tasklist.

## Trigger

```
AI-Suplex: Tasklist Generation
CONTENT
  - Raw Content: <task list>

ADDITIONAL: Save to Tasklists/Active/
```

Sources: Raw Content (required) · File Reference (a weekly plan) · Chat Reference (optional).

## What the AI does

- Acts as **Orchestrator** — generates the tasklist with YAML frontmatter, time-blocked sessions, task IDs (T001-H · T002-B …) with roles/durations/nature, success checks, and a task-distribution summary.
- Saves to `Tasklists/Active/` as `YYYY-MM-DD-{mission}-tasklist.md`.
- 15–20 tasks per day — daily tasklists are the execution unit.

## Memory loop

None on generation — the tasklist is indexed by `suplex_index` when the ritual runs.

Skip with `ADDITIONAL: Skip memory loop`.

*Source: `Prompt Patterns/AI-Suplex Commands/⚡ Command — Tasklist Generation.md` · one skill = one command.*
