# API Notes (read/plan surface)

The HTTP API is optional and secondary; the CLI is the primary interface. Generate the machine
schema from the running app (`GET /openapi.json`) — this file explains intent and constraints.

```bash
uvicorn revvel_ops.api:app --host 127.0.0.1 --port 8787
```

## Design constraints

1. **No apply endpoint.** `POST /v1/apply` exists only to return `501` with an explanatory message.
   Execution is out-of-band and human-approved.
2. **Localhost only.** There is no authentication layer yet (backlog 5.3). Binding to a non-loopback
   interface is a misconfiguration.
3. **Idempotent reads.** Every `GET` is safe to repeat; nothing external is touched.
4. **Plans are side-effecting locally only.** `POST /v1/plans` appends audit events and writes local
   files. That is the intended, auditable behavior.

## Endpoints

| Method | Path | Purpose | Notes |
| --- | --- | --- | --- |
| GET | `/healthz` | Liveness + posture | Returns `apply_enabled: false`, `network_calls: 0` |
| GET | `/v1/config` | Effective autonomy mode, thresholds, allowlisted identities | No secrets returned |
| GET | `/v1/connectors` | Connector manifests (capabilities, scopes, gates, rollback) | Mirrors `revvel-ops connectors --json` |
| GET | `/v1/inventory` | Labeled sample inventory | `sample_data: true`, `revalidation_required: true` |
| POST | `/v1/plans` | Build a plan (optionally dry-run) | Body: `skill`, `identity`, `autonomy_mode`, `fixture`, `dry_run` |
| POST | `/v1/apply` | Always `501` | Documents that no execution path exists |
| GET | `/v1/audit/verify` | Verify all audit chains | Returns per-file `ok`, `events`, `errors` |

## Request example

```json
POST /v1/plans
{
  "skill": "email_cleanup",
  "identity": "angelreporters@gmail.com",
  "autonomy_mode": "review_everything",
  "dry_run": true
}
```

Response contains `plan` (proposals + decisions), `counts` per disposition, `audit_file`,
`audit_head` (chain head hash) and, when requested, the `dry_run` report with `network_calls: 0`.

## Error contract

| Status | Meaning |
| --- | --- |
| 400 | Unknown skill, missing identity, or missing fixture |
| 501 | Apply attempted — permanently unimplemented by design |

## Versioning

Paths are `/v1/*`. Persisted objects carry `schema_version` (`1.0.0`). A breaking change to any
persisted object requires a new `schema_version`, regenerated `schemas/*.json`, and a changelog entry.

## Future additions (not implemented)

Approval endpoints (`POST /v1/decisions/{id}/approve`), authentication, webhook delivery to the
mobile companion, and signature verification metadata on audit responses. See
[../IMPLEMENTATION_BACKLOG.md](../IMPLEMENTATION_BACKLOG.md).
