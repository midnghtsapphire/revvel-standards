# Architecture

## 1. Purpose

A single control plane that turns messy personal operations (mail, calendar, files, code, existing
automations) into a queue of **scored, policy-gated, reversible proposals** with a tamper-evident
audit trail. The fleet is a planner and a gatekeeper first; execution is the last and smallest part.

## 2. Component model

```text
                 ┌───────────────────────────────────────────────────────────┐
                 │                     CONTROL PLANE                          │
  fixtures /     │                                                            │
  connector  ──▶ │  Skills ──▶ ActionProposal ──▶ Policy Engine ──▶ Plan      │
  metadata       │   (email_cleanup, ...)   │        │  confidence 0-100      │
                 │                          │        │  disposition          │
                 │                     Evidence      │                       │
                 │                          ▼        ▼                       │
                 │              Audit Log (append-only JSONL, SHA-256 chain) │
                 │                          │                                │
                 │        Dry-run simulator ┘   Approval queue (human)        │
                 └───────────┬───────────────────────────┬───────────────────┘
                             │ (skeletons only, no calls) │
        ┌────────────────────┴───────┐        ┌───────────┴─────────────┐
        │ Cloud connectors           │        │ Companions              │
        │ gmail, calendar, drive,    │        │ windows local (allowlist│
        │ dropbox, box, github,      │        │ + outbound only),       │
        │ n8n, openrouter            │        │ mobile (contract only)  │
        └────────────────────────────┘        └─────────────────────────┘
```text

### Modules

| Module | Responsibility | Never does |
| --- | --- | --- |
| `models.py` | Typed domain objects + hashing helpers | Persist or transmit |
| `config.py` | Load policy / identities / storage YAML with restrictive defaults | Read secrets |
| `skills/*` | Turn metadata into proposals with evidence | Execute or fetch |
| `policy.py` | Score 0-100, assign disposition, enforce rule order | Mutate proposals' targets |
| `planner.py` | Orchestrate plan → dry-run → (refused) apply; write audit | Bypass policy |
| `audit.py` | Append-only JSONL, hash chain, redaction, verification | Rewrite history |
| `inventory.py` | Labeled sample connector state + capability matrix | Probe live services |
| `connectors/*` | Declare capabilities, scopes, gates, rollback | Open a socket |
| `cli.py` / `api.py` | Operator surfaces | Expose an apply path |

## 3. Data flow (one run)

1. **Ingest** — a skill receives already-fetched *metadata* (in the MVP: a fixture). Bodies are never
   loaded, so they cannot leak into evidence or logs.
2. **Propose** — the skill emits `ActionProposal` objects. Each carries `capability`, `permission`,
   `identity`, `risk_tier`, `reversibility`, `externally_visible`, `rollback_ref` and `evidence[]`.
   Every proposal defaults to the *unsafe* interpretation (high risk, irreversible, externally
   visible) unless the skill proves otherwise.
3. **Evidence** — each `Evidence` row records connector, opaque `source_ref`, a signal name and a
   SHA-256 `digest` of the redacted observation. Evidence IDs (`ev_*`) are referenced from the audit
   log so a decision can be reconstructed without storing user content.
4. **Score** — `policy.score_confidence` produces 0-100 from evidence count, reversibility,
   external visibility, rollback availability, the skill heuristic, and risk/permission penalties.
5. **Decide** — `policy.evaluate` walks ordered rules R010 → R092 and returns exactly one of
   `allow | propose | require_approval | deny`. A connector-declared gate can then only *tighten*
   the result (rule R100).
6. **Record** — `plan.started`, `fixture.loaded`, `proposal.created`, `policy.decided`,
   `plan.completed` are appended to the chain, each linked by `prev_hash`.
7. **Dry-run** — non-denied items are simulated by the connector skeletons. The report asserts
   `network_calls: 0`.
8. **Approve** — `require_approval` / `propose` items wait for a human. Approvals carry an expiry
   (`approval_ttl_minutes`, default 720).
9. **Apply** — refused in the MVP; the refusal itself is an audit event (`apply.refused`).

## 4. Trust boundaries

| Boundary | Direction | Control |
| --- | --- | --- |
| Control plane ↔ cloud APIs | outbound only | least-privilege scopes, identity allowlist, capability gates |
| Control plane ↔ Windows companion | companion dials out; no inbound port | folder allowlist, local approval prompt, enrollment token in DPAPI |
| Control plane ↔ mobile companion | device-initiated push only | OS permissions + device enrollment + biometric local auth |
| Control plane ↔ n8n | outbound HTTP to a registered workflow allowlist | production triggers are approval-gated |
| Control plane ↔ OpenRouter | outbound, redacted payloads only | raw-content capability is hard-denied |
| Audit store | write-append, read-verify | hash chain + retention ≥ any provider trash window |

## 5. State and storage

- `var/audit/<run_id>.jsonl` — the chain. One file per run, append-only, fsynced per event.
- `var/plans/<plan_id>.json` — serialized `Plan` (proposals + decisions) for approval review.
- `var/inventory/<inventory_id>.json` — labeled sample inventory snapshots.
- No database in the MVP. Files are the source of truth; every object has a JSON Schema in
  `schemas/` (regenerate with `make schemas`).

## 6. Hash chain design

`event_hash = SHA256(event_id, sequence, recorded_at, run_id, phase, event_type, actor, identity,
subject_ref, payload_hash, prev_hash)` over a canonical JSON encoding (sorted keys, normalized UTC
timestamps). `payload_hash = SHA256(canonical(payload))`. The first event links to
`GENESIS_HASH = "0"*64`. `signature` / `signer_key_id` fields exist but are left `null`: the MVP does
not fabricate signatures. Adding an external signer over `event_hash` is a drop-in upgrade
(see [adr/0006-hash-chain-then-signatures.md](adr/0006-hash-chain-then-signatures.md)).

Tamper evidence is demonstrable: `python scripts/tamper_check_demo.py` copies a real log, edits one
payload, and shows verification flipping to `False` with the offending line reported.

## 7. Extension points

- **New skill**: add `skills/<name>.py` emitting proposals; register capabilities on a connector
  manifest; add fixtures and tests. No policy code changes should be needed.
- **New connector**: subclass `BaseConnector`, declare `Capability` rows with scopes/gate/rollback,
  register in `connectors/registry.py`. Unknown capabilities are rejected at plan time, so nothing
  is addressable until declared.
- **Live execution**: implement `apply()` behind an approval token, keep `dry_run()` truthful, and
  add a rollback path *before* the forward path.

## 8. Deliberate omissions

No queue/broker, no multi-user auth, no secret storage, no scheduler, no cloud deployment. These are
tracked in [IMPLEMENTATION_BACKLOG.md](IMPLEMENTATION_BACKLOG.md) rather than half-built here.
