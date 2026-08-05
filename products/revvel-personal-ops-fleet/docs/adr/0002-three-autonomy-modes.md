# ADR 0002 — Three autonomy modes

- Status: Accepted
- Date: 2026-08-03

## Context

A single "autonomous / not autonomous" switch is too coarse: it forces either constant review fatigue
or unbounded risk.

## Decision

Support exactly three modes: `review_everything` (default), `safe_automation` (explicit capability
allowlist, reversible and internal-only), `policy_automation` (threshold-driven). Modes may only act
on proposals that already passed every hard rule; they never widen identity, risk, reversibility,
external-visibility or rollback requirements.

## Consequences

- A clear escalation ladder: prove a capability in review mode, then allowlist it, then consider
  thresholds.
- `safe_automation` is intentionally boring: its allowlist should stay small.
- Four modes would blur; two would be unusable.
