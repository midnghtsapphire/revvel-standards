# Shared wire and package interfaces

Version **1.0.0**. Executable shapes: `schemas/owned-execution/contract.schema.json`;
Python import: `owned_execution_contracts`. These are contracts for the four
implementation lanes, not a claim that these endpoints are deployed.

## Transport and authentication

Owned origin base: `/v1`. TLS outside loopback; bearer authentication on every
route including governance fetch (bootstrap identity has read/ack only). HTTP
identity comes from validated credentials, never caller-supplied actor/tenant
headers. Verify issuer, audience, signature, exp/nbf and DB session revocation;
worker identities use scoped short-lived tokens/mTLS. Tokens reference DB grants,
not a baked-in inventory. MCP uses the same service methods/auth context via
authenticated HTTP or local stdio bound to an explicit identity. CLI uses those
same methods, not privileged direct SQL shortcuts.

Bearer JWT claims are `iss`, `sub`, `aud="bitchslapper-control"`, `exp`, `nbf`,
`jti` (DB session ID), `tenant_id` and `workspace_ids` (array of IDs). Lifetime is
at most 15 minutes; validate an explicit configured RS256/EdDSA algorithm and
pinned issuer keys, never `none`, token-provided key URLs or algorithm inference.
DB session hash/expiry/revocation, principal status, memberships and grants must
still match. Token workspace claims can narrow DB membership, never create it.
Transport-authenticated worker identity maps to `worker_id` by a DB registration;
Claim/Receipt `identity` is the original job/admission identity, not permission
for a worker to impersonate that visitor. Control verifies the authenticated
worker owns the live claim. Lease tokens are random 32+ bytes; store hashes only.

Every effectful request includes `contract_version`, `tenant_id`, `workspace_id`,
`idempotency_key` and `expected_revision`. Authenticated principal membership
must match the tenant/workspace; body IDs do not grant access. Writes reject stale
revisions with 409. Replay of same key + canonical body hash returns original
result; same key + different body returns 409. Limits: 1 MiB request, bounded
pagination (1..100), bounded artifact bytes, DB quotas and rate limiting. Unknown
fields/types fail schema validation. Failure codes: 400 invalid, 401 identity,
403 scope/governance/action denied, 404 absent or inaccessible, 409 stale/replay
conflict, 423 revoked/draining, 429 capacity + Retry-After, 503 DB/provider unavailable.
No unavailable service returns fabricated success.

All responses carry `contract_version`, `request_id` and DB `revision` where
applicable. Errors carry `{code, message, retryable, request_id}` with redacted
details. JSON wire data is interchange, never a runtime snapshot file.

## Control methods shared by HTTP / MCP / CLI

Path parameters are tenant/workspace-authorized DB IDs. `Context` below means
the common request fields above. Input/output property sets are normative;
`contract.schema.json` defines cross-lane objects. MCP tool names are literal.

| HTTP | MCP tool / CLI subcommand | Input beyond Context | Result / permission |
| --- | --- | --- | --- |
| GET `/v1/governance/active?workspace_id=...` | `governance_get` / `governance get` | none | active version, bundle SHA-256, exact contents/source commit; bootstrap read |
| POST `/v1/governance/ack` | `governance_ack` / `governance ack` | `governance_version`, `governance_sha256` | ack ID/time for authenticated agent; no effectful grant |
| POST `/v1/admissions` | `admission_request` / `admission request` | governance version/hash, `resource_id`, `allowed_paths`, `allowed_actions`, `expires_at` | admission ID with exact scopes after policy checks; operator grants capabilities separately |
| POST `/v1/resources` | `resource_register` / `resource register` | `kind`, `name`, `source_ref`, `source_sha256`, capability rows, optional `secret_ref` | disabled resource ID/revision; `inventory:write` |
| GET `/v1/resources?kind=...&cursor=...` | `resource_list` / `resource list` | bounded filters | tenant-scoped inventory, next cursor; `inventory:read` |
| POST `/v1/resources/{id}/switch` | `resource_switch` / `resource switch` | `enabled` 0/1, `running_action` drain/revoke, `reason` | new policy revision, audit ID, affected lease count; `policy:write` |
| POST `/v1/policy/mode` | `execution_mode_set` / `policy mode` | `mode` LOCAL_ONLY/AUTHORIZED, `running_action`, `reason` | audited tenant policy revision; `policy:write` |
| POST `/v1/jobs` | `job_submit` / `job submit` | `Job` (schema) | job ID/status/revision; `jobs:submit` |
| GET `/v1/jobs/{id}` | `job_get` / `job get` | none | durable status, attempts, receipts/artifacts; `jobs:read` |
| POST `/v1/jobs/claim` | `job_claim` / `worker claim` | `worker_id`, `capability`, `lease_seconds` 1..300 | `Claim` or 204; `jobs:claim`, valid admission required |
| POST `/v1/jobs/{id}/heartbeat` | `job_heartbeat` / `worker heartbeat` | `lease_token`, `fence`, `progress` bounded string | lease expiry/policy revision or 423 revoke; worker scoped to claim |
| POST `/v1/jobs/{id}/receipt` | `receipt_append` / `worker receipt` | `Receipt` | receipt ID/status; completion CAS requires live matching fence |
| POST `/v1/jobs/{id}/transition` | `job_transition` / `job transition` | `from_status`, `to_status`, `reason`, optional `label_id` | DB transition + outbox IDs; `jobs:transition` |
| POST `/v1/patches/check` | `patch_check` / `patch check` | `PatchSubmission` | pass or findings + baseline hash; `patch:submit`, no direct write |
| POST `/v1/connectors/pair` | `connector_pair` / `connector pair` | device public key, nonce proof, explicit `allowed_actions`, roots, expiry | pairing ID; owner authorization + device confirmation, workers own implementation |
| POST `/v1/connectors/{id}/revoke` | `connector_revoke` / `connector revoke` | `reason` | revision + revoke audit; owner/control operator only |
| POST `/v1/imports` | `inventory_import` / `inventory import` | `source_system`, `source_key`, commit/hash, target resource and verified assertion | import ID, inserted/unchanged; value/control scoped importer |
| POST `/v1/evaluations` | `tool_evaluation_record` / `tool evaluate` | resource/capability, `alternative_resource_id` or honest `gap`, evidence refs, measured/observed/marketing, nullable verified price/date | evaluation ID; `evaluations:write`, no procurement effects |
| POST `/v1/artifacts` | `artifact_record` / `artifact record` | job ID, kind, owned URI, digest, size, source/provenance | artifact ID, outbox record if requested; tenant scoped |

All resource kinds (agent, skill, tool, provider, engine, connector), capabilities,
routes, grants, schedules, labels and job intent mappings are DB rows. Labels keep
their original names on import, including manual operation; they are intent,
not authorization. Unknown intent is blocked, never a default paid runner.

## Worker / provider / review / value interfaces

`ControlClient` is a lane-owned HTTP client around the endpoints above; workers
do not share DB credentials or bypass admission by importing control internals.
The Python shared package defines immutable `Identity`, `Provider`, `Policy`,
`Admission`, `Claim`, `Artifact`, `Receipt`, `DispatchDecision` and protocols:

```python
class ProviderAdapter(Protocol):
    def execute(self, claim: Claim, payload: Mapping[str, object]) -> Receipt: ...

class WorkerControl(Protocol):
    def claim(self, worker_id: str, capability: str, lease_seconds: int) -> Claim | None: ...
    def heartbeat(self, claim: Claim) -> Claim: ...
    def complete(self, claim: Claim, receipt: Receipt) -> str: ...
```

`owned_workers` selects only policy-approved providers from current DB/API rows.
Adapter selection keys are DB `adapter_key` values mapped to installed trusted
code entry points, not arbitrary import strings/URLs executed from job payloads.
Action allowlists must exist at both DB-grant and executor boundary. Required
model capabilities include modality/context/embedding versus chat; healthy means
recent successful probe within DB-configured TTL, never merely HTTP reachable.

`bitchslapper_review` consumes a fenced claim (`review`, `graph`, `prosecute`,
`wr.compose`, `pr.compose` are intent examples, not a hardcoded registry) and
returns a Receipt with owned artifact refs for findings, graph/tree/map, WR and
PR draft. Each artifact has SHA-256, size, producing job, source commit and
attribution. Git/PR publication is a separately authorized outbox action; an
artifact alone is not proof of a published PR. Octopus API bridge must not
double-schedule claims or place control tables in its PostgreSQL database.

`tool_value` reads/imports canonical inventory via control methods, records
capability-level comparisons/evidence/dated prices and prepares renewal decisions.
Unpaid/FOSS alternative IDs or explicit gaps are required for paid capabilities.
Free-tier eligibility is a fresh assertion with quota/expiry and overage denial,
not a permanent zero-cost model name. SaaS automation claims and 200-worker
capacity remain goals until measured. Self-hosted excludes SaaS markup, not
hardware/energy/operator costs. No tool evaluation triggers cancellations.

## Claim and side-effect transaction

Control locks the tenant policy row first, then candidate job and resource rows
in stable ID order. Use READ COMMITTED, `SELECT ... FOR UPDATE SKIP LOCKED` and
UTC DB time. Check capacity, enabled switches, health TTL, tenant/workspace,
grants, active governance ack/admission, manual-mode release and required
capabilities **inside the transaction**. Reserve capacity + increment attempt
and monotonic fence + set expiring hashed lease token + insert transition/audit
atomically. Return only after commit. Cap retries; exponential backoff with
jitter and next-attempt time in DB; terminal exhaustion is dead_letter, not lost.

Every heartbeat/dispatch/side-effect gateway rechecks current DB revision,
governance, mode and lease. A provider selected before a policy change is not
permission to dispatch after it. Resource disabling blocks the next claim.
`drain` lets existing claims finish within their lease, but no new capabilities
are granted. `revoke` increments fences and denies heartbeats/commits immediately;
send cancellation and sandbox kill where supported. Already-sent external work
cannot be unsent: record `revocation_pending` and reconcile actual costs/results.
LOCAL_ONLY denies new paid egress even on a draining claim.

Use transactional outbox for label/git/artifact projections, unique effect keys
and replayable acknowledgments. At-least-once delivery is not exactly-once
execution: third-party APIs without idempotency require reconciliation before
retry. Never repeat a charge/action blindly after a crash. Persist all transition
from/to states and source intent. Manual mode requires an operator release
transition; deleting a GitHub label is neither cancellation nor authorization.
