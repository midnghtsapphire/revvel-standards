# Pitch — Fraud-Signal Verification Fleet

## The problem
Allegations now travel as "87-page reports" and viral posts. The instinct is to
build a "fraud detector" that confirms them. That doesn't detect fraud — it
launders one source's accusation into a verdict, baking in confirmation bias.

## The insight
You cannot measure fraud from a single partisan document. You CAN measure
*evidentiary strength*: how well-sourced, how corroborated, how far along the
legal track a claim is — and where it is simply unknowable.

## The product
A research swarm that decomposes a claim, hunts primary sources for and against
(including a dedicated red-team), and scores each claim on a calibrated scale
that is **double-capped** by source quality and adjudication stage. Fraud/guilt
verdicts on named people are hard-refused. Output: a live evidence ledger.

## Why it's trustworthy
- Deterministic scorer; every number traces to a source and a rule.
- Provenance-aware: a document obtained > a claim repeated.
- Cannot drift from "alleged" to "convicted" — the math forbids it.
- Refuses to do the one thing a court must do.

## Differentiation
Not a "truth machine." A **calibrated uncertainty engine** with an auditable
trail and a refusal doctrine. The honesty is the feature.

## Status
v0.1 shipped: scorer, fleet, judge, master prompt, live dashboard, seed case,
CI. Next: live retrieval + human review + calibration backtest.

## Ask
Greenlight v0.2 (live retrieval + review queue). One engineer, 3 iterations.
