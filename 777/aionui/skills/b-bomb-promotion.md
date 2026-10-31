---
name: b-bomb-promotion
description: "AI-Suplex: B-Bomb Promotion — promote an artifact to a polished B-Bomb"
---

# ⚡ AI-Suplex: B-Bomb Promotion

**One line:** promote a work-in-progress artifact into a polished, product-ready B-Bomb.

## Trigger

```
AI-Suplex: B-Bomb Promotion
CONTENT
  - Raw Content: <artifact content>

ADDITIONAL: Save to B-Bombs/<Period>/Cycle X/Week Y/
```

Sources: Raw Content (required) · File Reference (the artifact) · Chat Reference (optional).

## What the AI does

- Acts as **Builder** — generates the B-Bomb with frontmatter (focus · cycle · week · product_potential · innovation_quotient) and the Product Overview · Product Potential · Strategic Insights · Technical Implementation · Business Impact sections.
- Saves to `B-Bombs/<Period>/Cycle X/Week Y/`.

## Memory loop

`3lm add-lessons --source b-bomb --ref <id>` → `suplex_index` (routes ≤3 lessons to `Memory/lessons.md`).

Skip with `ADDITIONAL: Skip memory loop`.

*Source: `Prompt Patterns/📄 Pattern - B-Bomb Promotion.md` · one skill = one command.*
