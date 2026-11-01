---
type: artifact
date: 2026-10-27
cycle: 3
week: 1
focus: ai-engineering
status: SUBMITTED
---

# Paynow webhook — tested end-to-end

**Terminal state:** SUBMITTED.

**What:** Hit the Paynow webhook callback from a local tunnel and confirmed the
signature check + the DB write in one round trip.

**Why it matters:** the webhook was the unproven seam in the payment flow; this
is the proof it works against the real gateway.
