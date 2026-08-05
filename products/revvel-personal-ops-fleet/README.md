# Revvel Personal Ops Fleet

A **hybrid personal operations agent fleet** control plane, built to Revvel Standards / AgentOps
procedure: every action is a *proposal*, every proposal is *scored*, every decision is *policy-gated*,
and every step is written to an *append-only, SHA-256 hash-chained* audit log.

This repository is an MVP. It is genuinely runnable and it deliberately cannot mutate anything
outside its own `var/` directory.

```text
plan  ->  score (0-100)  ->  policy disposition  ->  dry-run  ->  [human approval]  ->  apply
                                                                                      ^ refused in MVP
```text

## Safety posture (enforced in code, not just prose)

| Invariant | Where it is enforced |
| --- | --- |
| No module performs a network call | `src/revvel_ops/**` — connectors are skeletons; `apply()` raises `NotImplementedError` |
| Default autonomy is `review_everything` | `config/policy.example.yaml`, `PolicyConfig` defaults |
| High-risk / irreversible / externally visible actions always need a human | `policy.py` rules R050, R060, R061 |
| Delete and unsubscribe always need a human | `policy.py` rule R040 + `always_require_approval_permissions` |
| Deletion means Trash, never permanent delete | `skills/email_cleanup.py`, `deny_capabilities` |
| Only allowlisted identities can be targeted | `policy.py` rules R020/R021, `config/identities.example.yaml` |
| Mutating automation requires a rollback reference | `policy.py` rule R070 |
| Audit log is append-only and tamper-evident | `audit.py` (`append` opens `"a"`, `verify_chain` recomputes) |
| `apply` is refused | `planner.apply`, `cli apply`, `POST /v1/apply` → 501 |

## Quickstart

```bash
python -m pip install -e ".[dev]"      # or: make setup
make test                               # 54 unit tests, fully offline
make demo                               # inventory + plan + dry-run + chain verification
```text

CLI (installed as `revvel-ops`, or `python -m revvel_ops.cli`):

```bash
revvel-ops doctor                            # effective config + safety posture
revvel-ops identities                        # identity allowlist and separated permissions
revvel-ops connectors                        # capability matrix: scopes, gates, rollback, availability
revvel-ops inventory --demo                  # labeled SAMPLE connector inventory
revvel-ops plan --mode review_everything     # build a plan from fixtures
revvel-ops dry-run --mode policy_automation  # plan + simulate, zero external calls
revvel-ops verify-audit                      # verify SHA-256 hash chains
revvel-ops apply --plan var/plans/<id>.json  # blocked by design
```text

Optional read/plan HTTP surface (localhost only, no apply endpoint):

```bash
uvicorn revvel_ops.api:app --host 127.0.0.1 --port 8787
```text

## What the demo actually does

Reads `fixtures/gmail_threads.sample.json` (10 synthetic threads, metadata only), categorizes them
(newsletter / notification / receipt / promotion / personal / security / unknown), and emits 23
proposals across four action types — **label**, **archive**, **unsubscribe proposal**, **delete
(Trash) proposal** — then scores and gates each one:

| Autonomy mode | allow | propose | require_approval | deny |
| --- | --- | --- | --- | --- |
| `review_everything` | 0 | 0 | 16 | 7 |
| `safe_automation` | 0 | 16 | 0 | 7 |
| `policy_automation` | 0 | 16 | 0 | 7 |

The 7 denials are the delete and unsubscribe proposals: the example identity is granted
`read, suggest, write` and **not** `delete` or `unsubscribe`, so they are refused at the identity
layer (rule R021) before scoring matters. Note that `allow` is 0 even at confidence 100 — the
connector-declared gate for `gmail.labels.apply` is `propose`, and a connector gate may only tighten
a decision, never loosen it.

## Repository map

```text
src/revvel_ops/
  models.py            ActionProposal, PolicyDecision, AuditEvent, Evidence, Plan, Inventory
  config.py            policy / identities / storage loading (YAML, restrictive defaults)
  policy.py            0-100 confidence scoring + allow|propose|require_approval|deny
  audit.py             append-only JSONL, SHA-256 chaining, redaction, verification
  planner.py           plan -> dry_run -> apply(refused); writes every step to the chain
  inventory.py         labeled sample connector inventory + capability matrix
  cli.py               typer CLI (the primary interface)
  api.py               optional FastAPI read/plan surface
  skills/email_cleanup.py   deterministic categorization + proposal generation
  connectors/          gmail, calendar, gdrive, dropbox, box, github,
                       local_companion, mobile_companion, n8n, openrouter (skeletons)
config/    policy / identities / storage / connectors examples (no secrets)
schemas/   JSON Schema for every persisted object (generated: make schemas)
fixtures/  synthetic sample data only
docs/      architecture, security, policy, connectors, operations, ADRs, runbooks
docs/deliverables/Revvel-Personal-Ops-Fleet-Architecture-and-Operations-Handbook.pdf
```text

## Documentation

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — components, data flow, trust boundaries
- [docs/SECURITY.md](docs/SECURITY.md) — threat model, identity binding, secret handling, redaction
- [docs/POLICY.md](docs/POLICY.md) — autonomy modes, scoring, rule table R000-R100
- [docs/CONNECTORS.md](docs/CONNECTORS.md) — per-connector scopes, gates, rollback, limitations
- [docs/OPERATIONS.md](docs/OPERATIONS.md) — day-2 operations, approval queue, evidence handling
- [docs/INTERNAL_CAPABILITIES_BOUNDARY.md](docs/INTERNAL_CAPABILITIES_BOUNDARY.md) — documented runtime skills vs platform-internal capabilities
- [docs/INVENTORY_AND_CONSOLIDATION.md](docs/INVENTORY_AND_CONSOLIDATION.md) — current sample state and consolidation plan
- [docs/IMPLEMENTATION_BACKLOG.md](docs/IMPLEMENTATION_BACKLOG.md) — sequenced backlog with exit criteria
- [docs/skills/manifest.yaml](docs/skills/manifest.yaml) — capability / skills / integrations manifest
- [docs/adr/](docs/adr/) — architecture decision records
- [docs/runbooks/](docs/runbooks/) — email cleanup, approvals, rollback, incidents, reauthorization
- [AGENTS.md](AGENTS.md) — operating protocol for agents working in this repository

## Non-goals for this MVP

No deployment, no live credentials, no real mailbox processing, no cloud repository creation or
modification, no external mutations of any kind. Connector status values recorded anywhere in this
repository are **non-secret samples and must be revalidated at runtime**.

## License

Internal / unpublished. See [SECURITY.md](SECURITY.md) for reporting and handling rules.
