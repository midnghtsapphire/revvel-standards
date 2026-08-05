# ADR 0005 — Connectors declare least-privilege contracts

- Status: Accepted
- Date: 2026-08-03

## Context

Connector integrations tend to request broad scopes once and keep them forever, and documentation
tends to overstate what is actually reachable through a given host platform.

## Decision

Each connector declares `Capability` rows with a permission verb, minimum provider scopes, risk tier,
reversibility, external visibility, approval gate, rollback statement and honest availability
(`available | partial | planned | unavailable`). Unknown capabilities are rejected at plan time. A
connector gate may only *tighten* a policy decision (rule R100). Permission verbs are separated:
`read`, `suggest`, `write`, `delete`, `unsubscribe`.

## Consequences

- The capability matrix is the single source of truth (`revvel-ops connectors`).
- Gmail is documented as partially reachable rather than fully available — no over-claiming.
- New integrations require writing the rollback before the forward path.
