# CREDENTIAL_AUDIT_SYSTEM (DEPRECATED)

> **⚠️ DEPRECATED — 2026-05-06**
>
> This document has been **consolidated into [`GATEKEEPER.md`](./GATEKEEPER.md)**.
>
> All credential tracking, rotation, drift detection, and provisioning workflows
> are now managed under a single authoritative standard.

## Why this was deprecated

`GATEKEEPER.md` already handles the full credential lifecycle:

- Rotation policy and cadence
- Drift detection across environments
- Provisioning and de-provisioning workflows
- Audit trail and reporting

Maintaining a separate `CREDENTIAL_AUDIT_SYSTEM` document created duplication
and risked the two specs drifting out of sync.

## Where to find credential information now

| Concern | New Location |
| --- | --- |
| Standard / policy | [`standards/GATEKEEPER.md`](./GATEKEEPER.md) |
| Automation workflow | [`.github/workflows/credential-gatekeeper.yml`](../.github/workflows/credential-gatekeeper.yml) |
| Registry / inventory | [`docs/_MASTER_INVENTORY.md`](../docs/_MASTER_INVENTORY.md) |

## Migration notes

- Any links pointing to `CREDENTIAL_AUDIT_SYSTEM.md` should be updated to
  `GATEKEEPER.md`.
- This stub is retained only to preserve historical inbound links and will be
  removed in a future cleanup pass.

---

**Status:** Deprecated
**Superseded by:** `standards/GATEKEEPER.md`
**Deprecated on:** 2026-05-06
**Author:** Claude (openhands)
