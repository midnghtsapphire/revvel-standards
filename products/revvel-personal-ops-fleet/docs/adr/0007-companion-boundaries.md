# ADR 0007 — Companion boundaries (Windows and mobile)

- Status: Accepted
- Date: 2026-08-03

## Context

A laptop or phone companion is the most invasive component imaginable. Vague scope here becomes a
remote shell or a surveillance tool by accident.

## Decision

**Windows companion:** outbound-only (never listens on a port), explicit absolute folder allowlist
with forbidden roots (`C:\Windows`, `C:\Program Files`, user profile root), no delete capability
(staging + retention instead), empty command allowlist by default, one-time pairing enrollment with
tokens in DPAPI/Credential Manager, and a local approval prompt for every write.

**Mobile companion:** contract only. Nothing is readable by default. Participation requires an
installed companion app, user-approved OS permissions per data class, and a separate local
authorization (device enrollment + biometric). Device-initiated push only; no server-to-device pull of
user data. `mobile.device.read_arbitrary` is hard-denied and documented so nobody assumes it exists.

## Consequences

- No accidental remote-execution surface.
- Capability expectations stay honest, especially on iOS where background access is heavily limited.
- More friction per action — accepted.
