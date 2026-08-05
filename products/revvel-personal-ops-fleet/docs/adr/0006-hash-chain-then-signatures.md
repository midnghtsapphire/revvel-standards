# ADR 0006 — Hash chaining now, signatures later

- Status: Accepted
- Date: 2026-08-03

## Context

Signed audit records are stronger than hash chains, but signing needs key management, rotation, and a
custody story. Shipping a fake or self-managed key would create false assurance.

## Decision

Ship SHA-256 hash chaining only. Keep `signature` and `signer_key_id` fields on `AuditEvent`, always
`null` in the MVP. When a signer exists, sign `event_hash` and populate both fields; the verifier gains
a signature check without any change to the chain format.

## Consequences

- Integrity today: any in-place edit is detectable.
- Non-repudiation is explicitly *not* claimed yet (backlog 5.1).
- Format stability: adding signatures is additive, not breaking.
