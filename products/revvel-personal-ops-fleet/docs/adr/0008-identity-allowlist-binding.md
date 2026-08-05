# ADR 0008 — Identity allowlist binding

- Status: Accepted
- Date: 2026-08-03

## Context

Multiple accounts are typically signed in on the same machine and browser. The most likely serious
incident is an agent acting correctly on the *wrong* identity.

## Decision

There is no ambient credential path. Every proposal carries an `identity`, matched against
`config/identities.yaml`, which lists `(identity, provider, allowlisted, permissions[])`.
Non-allowlisted identities are denied at rule R020; permissions not granted to that identity are
denied at R021. Entries with `allowlisted: false` are explicit denials, used to neutralize other
signed-in accounts. The example configuration allowlists `angelreporters@gmail.com` with
`read, suggest, write` and deliberately withholds `delete` and `unsubscribe`.

## Consequences

- Identity errors fail closed and are visible in the audit chain.
- Adding an account is a deliberate config change, reviewable in diff.
- Two independent brakes on delete/unsubscribe: identity grant and policy gate.
