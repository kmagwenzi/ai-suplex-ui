---
name: weekly-review
description: "AI-Suplex: Weekly Review — generate the strategic weekly review"
---

# ⚡ AI-Suplex: Weekly Review

**One line:** turn a week of sessions into a strategic compass for the next week.

## Trigger

```
AI-Suplex: Weekly Review
CONTENT
  - Cycle Number: <n>
  - Week Number: <n>

ADDITIONAL: Save to Reviews/<Period>/Weekly/Cycle <n>/Week <n>/
```

Sources: Cycle + Week (required) · Strategic Context · Data References · Raw Notes (optional).

## What the AI does

- Acts as **Orchestrator** — generates the review: executive summary · key achievements · lessons learned · blockers · progress by focus · recommendations · next week's focus areas.
- Saves to `Reviews/<Period>/Weekly/Cycle <n>/Week <n>/Week <n> Review.md`.
- Run it every Saturday (the weekly ritual).

## Memory loop

`suplex_promote` (Hustler-gated: `approved: true`) → `suplex_index`.

*Source: `Prompt Patterns/📄 Pattern - Weekly Review Generation.md` · one skill = one command.*
