# ADR 0001 — Proposal-first architecture

- Status: Accepted
- Date: 2026-08-03
- Owner: primary_operator

## Context

Personal operations touch irreversible surfaces (mail, sharing, subscriptions, repos). Agents that
execute directly produce damage that is discovered late and cannot be reconstructed.

## Decision

Skills never execute. They emit `ActionProposal` objects carrying capability, permission verb,
identity, risk tier, reversibility, external visibility, rollback reference and evidence. Execution is
a separate, human-gated phase. `apply()` is unimplemented in the MVP and refuses with an audit event.

## Consequences

- Every action is reviewable and explainable before it exists in the world.
- Adding a skill cannot introduce a new execution path.
- Cost: two-phase latency and a review burden — accepted deliberately.

## Alternatives rejected

Direct execution with post-hoc logging (damage precedes the log); confirmation prompts only (no
durable record, no scoring, no rollback contract).
