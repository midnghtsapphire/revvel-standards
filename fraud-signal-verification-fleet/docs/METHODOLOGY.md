# Methodology

## Question reframing
"Is it fraud?" is not answerable by any system from a single partisan document.
We reframe to three answerable questions per claim:
1. Is it **substantiated** (primary record)?
2. Is it **unsubstantiated** (asserted, thin sourcing)?
3. Is it **unknowable** from public sources?

## Step 1 — Decompose
A source is shredded into atomic, individually checkable claims. "An 87-page
report alleges fraud" is not one claim; it is dozens, each with its own sourcing.

## Step 2 — Adversarial sourcing
Five agents work the claim from different sides, including a dedicated red-team
(`agent-counter`) whose only job is the innocent explanation. Evidence is
collected FOR and AGAINST. Contradictions are kept, not smoothed away.

## Step 3 — Calibrated scoring
Tier cap + provenance discount + corroboration/contradiction + stage ceiling.
See CONFIDENCE_FRAMEWORK.md. Deterministic; the same inputs always score the same.

## Step 4 — Judge & publish
The judge writes verdict *language* and a case integrity number, then publishes
to the live ledger. The judge cannot upgrade a band the scorer set.

## Refusal doctrine
The system will not, under any prompt, output that a named living person
committed fraud or a crime. It reports evidence. Adjudication belongs to courts.

## Calibration honesty
- Confidence is a function of **source quality and legal stage**, not vibes.
- Absence of evidence is reported as absence, never as confirmation.
- A single source — however loud — cannot exceed its tier/stage caps.
