# ADR 0003 — Confidence score is separate from disposition

- Status: Accepted
- Date: 2026-08-03

## Context

A tempting design maps a single score directly to execution. That lets a confident-but-dangerous
action through, and it makes the score carry safety weight it cannot bear.

## Decision

`score_confidence` returns 0-100 with an itemized reason list. `evaluate` computes the disposition
from ordered rules, using confidence only inside threshold rules (R081/R082, R090-R092). Hard rules
(deny list, identity, delete/unsubscribe, externally visible, irreversible, high risk, missing
rollback) ignore the score entirely.

## Consequences

- Confidence is a *communication* device for reviewers, not an authorization device.
- Demonstrable in the MVP: `gmail.labels.apply` scores 100 and still resolves to `propose` because
  its connector gate is `propose`.
- Scoring weights can be tuned without weakening safety.
