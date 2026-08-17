---
name: claim-decomposition
description: Break a source document into atomic, individually checkable claims with candidate adjudication stage. Use before scoring any raw source.
---

# Claim Decomposition

Turn prose into a list of atomic claims the fleet can verify one at a time.

## Procedure
1. Read the source. Strip rhetoric; keep assertions of fact.
2. Split compound sentences — one verifiable proposition per claim.
3. For each claim record: `text`, `who/what`, candidate `stage`
   (unknowable|alleged|investigated|charged|guilty_plea|settled_no_admission|convicted),
   and the `source_id` it came from. Distinguish a **guilty plea** (admission of guilt,
   high ceiling) from a **no-admission civil settlement** (`settled_no_admission`, lower
   ceiling) — a settlement is not an admission and must not score like a plea.
4. Tag any claim that asserts a named person is GUILTY / committed fraud →
   mark for the REFUSAL gate (it will score 0).
5. Never merge two people's acts into one claim.

## Output
A JSON array matching data/seed schema: {id, text, stage, supporting[], notes}.

## Anti-patterns
- "The 87-page report proves fraud" → NOT one claim. Decompose into the report's
  individual factual assertions, each independently sourced.
- Treating a headline as a claim — headlines are not evidence.
