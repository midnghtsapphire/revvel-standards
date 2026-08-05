# WR: NULL_RESULT Schema

**WR ID:** OZ-OS-009
**Parent:** OZ-OS-001
**Type:** feature
**Status:** 🟢 Ready
**Tracks:** OZ-OS-001

## Deliverable
Single file: `oz-os/NULL_RESULT_SCHEMA.md`

## Content Requirements
Define what counts as "searched thoroughly and found nothing." This is the antidote to
placeholder-leakage culture — agents currently fake completion rather than admitting they
found nothing (see PR #14184, research checklist all checked with empty sections).

### Schema

```yaml
---
null_result_id: NR-2026-001
topic: <research topic>
agent: <which agent produced this>
date: 2026-06-01
parent_wr: <WR ID>
confidence_in_absence: 0.0–1.0
---
```

### Required Fields
1. **Queries tried** — exact search strings used, minimum 10
2. **Sources checked** — databases, APIs, repositories, forums consulted
3. **Time spent** — wall-clock time the agent spent researching
4. **Confidence in absence** — 0.0 (barely looked) to 1.0 (exhaustive search)
5. **Adjacent searches** — derived queries attempted after initial queries failed
6. **Reason for null** — one of:
   - `no_evidence_exists` — topic is genuinely unresearched
   - `evidence_contradicts_premise` — the question itself is wrong
   - `access_denied` — sources exist but are paywalled/classified
   - `time_exhausted` — more time would likely yield results
   - `scope_too_narrow` — broadening the query might help

### Anti-Pattern
A NULL_RESULT with fewer than 10 queries tried is not a null result — it is quitting early.
The agent must retry with broader terms before declaring null.

## Key Insight
`NULL_RESULT` is a valid and respected output. Fake completion is not.
An honest "I found nothing after 10 queries" is infinitely more valuable than
a fabricated "here are 5 methods" with hallucinated citations.

## Acceptance
- Schema is complete and machine-parseable
- Required fields are documented with examples
- No raw tokens or bracket-placeholders
- Includes the anti-pattern warning
