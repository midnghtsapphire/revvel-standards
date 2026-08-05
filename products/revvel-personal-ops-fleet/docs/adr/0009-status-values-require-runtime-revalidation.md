# ADR 0009 — Recorded connector statuses are samples requiring revalidation

- Status: Accepted
- Date: 2026-08-03

## Context

Connector state changes without notice: tokens expire, users dismiss consent screens, scopes get
revoked. Documented state read as truth causes failed or, worse, partially applied runs.

## Decision

Any status recorded in this repository (docs, fixtures, `inventory.SAMPLE_STATUS`) is a clearly
labeled non-secret **sample**. `ConnectorStatus.revalidation_required` is `True` on every row.
Planning against a connector requires the cheapest possible live read to prove the scope. A
`connected` hint never implies write, delete or unsubscribe permission. When the operator dismisses an
authorization, the connector is recorded as `disabled_by_user` and the fleet must **never** retrigger
that authorization — reconnect is operator-initiated only.

## Consequences

- Sample state is useful for planning docs without becoming a false runtime assertion.
- Status transitions are recorded in a change log (see `docs/INVENTORY_AND_CONSOLIDATION.md`) and
  covered by tests.
- Current sample state: Drive authorized (ready to revalidate); Box disabled by user choice.
