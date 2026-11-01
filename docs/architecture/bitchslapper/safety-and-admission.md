# Admission, identity and effect boundaries

## Bootstrap without a circular governance grant

1. An owned-host administrator applies the checksum-recorded shared migration
   using a dedicated migrator DB identity. No service starts with schema-owner
   credentials. MySQL must enforce CHECK/FK constraints and use binary ID collation.
2. Locally authenticated owner bootstrap (OS identity/socket or short-lived
   one-use secret from the authorized secret manager, never logged) creates tenant,
   workspace, owner membership and a pinned governance bundle. No public
   self-registration endpoint can create an owner or reset an existing bootstrap.
   Record the bootstrap event; issue short-lived scoped identity credentials.
3. Bundle **exact bytes** of root + applicable nested governance from the pinned
   revvel-standards commit. Hash canonical length-prefixed `(path, bytes)` pairs
   sorted by UTF-8 path; record commit, SHA-256, version and exact contents in
   `oe_governance_versions`. Never modify original documents to make a visitor pass.
4. Register visitors **disabled**, with no effectful grants. Their authenticated
   identity can only read the active bundle and acknowledge the exact hash/version.
   Acknowledgment is a receipt of delivery/assent, **not proof of understanding**.
5. The admission transaction checks authenticated membership, active version/hash,
   exact ack, explicit owner/operator grants and a pinned clean source baseline.
   It writes `oe_admissions` and relational path/action scopes. Only then issue
   expiring effectful capabilities. No service method may trust an ack field
   submitted by an agent: load ack and policy from the DB.
6. Changing active governance invalidates old admissions on the next claim,
   heartbeat, dispatch and patch application, even if a token has not expired.
   Revoke or drain outstanding work explicitly, log the result and require a new
   acknowledgment. No prompt, label or force-success flag bypasses the DB check.

Role boundaries: migrator has DDL only for migration execution; control service
has tenant-scoped repository DML; importer has inventory/evaluation calls only;
projection dispatcher has outbox claims only; workers/visitors have **no DB
credentials**. API principals have DB grants and memberships, not SQL superuser
roles. MySQL has no automatic PostgreSQL-like RLS: parameterize every query with
tenant ID, enforce composite tenant/workspace FKs and test cross-tenant denial.
Do not implement tenant security solely as an ORM convention. For untrusted SaaS
tenants require per-tenant DB/schema credentials or a verified repository boundary
and tenant-isolation test suite before claiming production isolation.

## Restricted workspaces and preservation

Visitors receive a read-only baseline mount, an isolated writable overlay limited
to admitted paths, no host socket, no production credentials and default-denied
network. A patch artifact is the only output consumed by privileged code. A
visitor cannot push its own workspace directly into the privileged checkout.
The trusted submit/check/apply boundary reconstructs before-images from the pinned
baseline and digest-checked patch, resolves real paths without following symlinks,
and rejects traversal, symlinks, submodules, mode changes, binaries and file
deletions by default. No caller-controlled `before` text or `symlink=false` flag
is trusted. TOCTOU-safe application requires an immutable baseline and no-follow
file opens; the shared pure validator alone is **not** a sandbox or patch applier.

`validate_patch` conservatively requires every nonblank original line in order,
either literally retained or retained as a recognized commented line. Retirement
requires full in-place `REVVEL-DISABLED` date, agent/model, reason, WR/session ref,
replacement and restoration metadata. It rejects wholesale replacement and
deletion, even if a label says allow-destroy. Strict JSON retirement-by-comment is
rejected; use a separate additive migration/file, retaining the original bytes.
Semantic review and language-aware checks remain necessary: retaining text does
not prove equivalent behavior or absence of malicious additions. Unsupported
retirement forms are denied for explicit review, not auto-approved.

## LOCAL_ONLY is an egress policy, not a price guess

MySQL tenant mode defaults to LOCAL_ONLY. Every dispatch re-reads mode, enabled
switches, grants, health TTL, capability, budget/quota and capacity. Select enabled
healthy unpaid **local/owned** routes (LM Studio and Ollama importable), deny paid
and unknown-billing routes. External free tiers need explicit fresh entitlement
and overage denial, and are not admitted in strict LOCAL_ONLY. AUTHORIZED does not
mean universal spend permission: separate DB action/provider grants, secret
authorization and budget enforcement still apply. Environment cloud switches may
only tighten these constraints. `REVVEL_LLM_ALLOW_CLOUD=1` cannot override LOCAL_ONLY.

Enforce via network namespaces/owned egress gateway with per-claim allowlisted
destinations, not just an adapter boolean. Validate configured endpoints at
registration, resolve/pin destinations, reject metadata/loopback/link-local SSRF
except explicitly registered local model endpoints, and deny redirects to new
destinations. No caller-supplied arbitrary URL or shell/provider command runs.
Chargeable API keys are not injected in LOCAL_ONLY sandboxes. A mode change kills
new paid dispatch even for draining leases. Existing requests may incur costs;
record and reconcile them honestly. Unavailable capabilities keep durable jobs
blocked/queued with a reason and resume only after an audited policy/provider
change; do not report local parity or fake success.

## Capacity and permissioned devices

Admission/claim checks tenant queue/running caps, per-resource concurrency, route
health and worker capability. Bounded retries (1..10), leases (1..300 seconds),
fencing and capacity reservation happen atomically in MySQL; exhausted work goes
to dead_letter. No claim or heartbeat can extend a revoked fence. A 200-worker
deployment requires measured claim-contention, queue latency, failure recovery
and tenant-isolation evidence; this contract does not supply those measurements.

Workers own connector code and outbound-only device sessions. Pairing requires
owner authorization plus device challenge/public-key proof and confirmation,
expiry, explicit action/root scopes and a revocable DB record. Default no file,
screen, microphone, phone, shell or clipboard access. Read and write scopes are
distinct; every command rechecks pairing and live job fence. A stolen challenge
cannot create a pair or widen scopes. Audit commands/results without copying
personal data unnecessarily. This VM never stands in for Audrey's phone/desktop.

## Legacy BNAT coexistence (not a fabricated imprint)

The parent and architecture specialist's named imprint returned `known=false`,
`imprinted=false`: the default static BIOME feed lists only sentinel, homeostat,
medic and sheaf. `consistency_check --epsilon 1e-9` passed with energy 0. Preserve
that implementation and its feed. Never impersonate one of those workers, relax
epsilon or label the named imprint successful. The new authenticated DB
ack/admission path is an explicit addition for visiting agents, independently
tested; it does not assert the legacy imprint happened or replace geometric
consistency checks. Integration records both facts separately.
