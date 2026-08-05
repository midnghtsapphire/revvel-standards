# Changelog

All notable changes to this project. Policy, scope, and audit-format changes must appear here with a
link to their ADR.

## [0.1.0] — 2026-08-03

### Added
- Domain models: `ActionProposal`, `PolicyDecision`, `AuditEvent`, `Evidence`, `Plan`, `Inventory`,
  `ConnectorStatus` with generated JSON Schemas in `schemas/` (ADR 0001).
- Policy engine: 0-100 confidence scoring plus `allow | propose | require_approval | deny`
  dispositions, ordered rules R000-R100, three autonomy modes with `review_everything` as default
  (ADRs 0002, 0003).
- Append-only JSONL audit log with SHA-256 hash chaining, canonical-timestamp normalization,
  redaction of content/secret-like keys, chain verification, and a tamper-evidence demo (ADRs 0004, 0006).
- Identity allowlist with separated permission verbs (`read`, `suggest`, `write`, `delete`,
  `unsubscribe`); non-allowlisted identities and ungranted permissions are denied at R020/R021 (ADR 0008).
- `email_cleanup` skill: deterministic categorization plus label, archive, unsubscribe-proposal and
  Trash-proposal generation with per-signal evidence; protected categories never archived or trashed.
- Ten connector skeletons with least-privilege scopes, approval gates, rollback statements and honest
  availability: Gmail, Google Calendar, Google Drive, Dropbox, Box, GitHub, Windows local companion,
  mobile companion contract, n8n, OpenRouter (ADRs 0005, 0007).
- CLI (`doctor`, `identities`, `connectors`, `inventory`, `plan`, `dry-run`, `apply`-blocked,
  `verify-audit`, `demo`) and an optional FastAPI read/plan surface with no apply endpoint.
- Configuration examples (policy, identities, storage, connectors), synthetic fixtures, scripts
  (bootstrap, demo, schema export, chain verification, tamper demo), Makefile, and a 54-test suite.
- Documentation set: architecture, security, policy, connectors, operations, runtime capability
  boundary, inventory/consolidation, implementation backlog, skills manifest, API notes, MCP registry
  example, nine ADRs, eight runbooks, and the handbook PDF in `docs/deliverables/`.

### Security
- `apply()` unimplemented across all connectors and refused by the planner, CLI and API.
- Hard denials: `github.repos.delete`, `local.fs.delete`, `mobile.device.read_arbitrary`,
  `openrouter.chat.completion_raw_content`.
- `REVVEL_VAR_DIR` isolates test/throwaway artifacts from the repository audit tree.

### Changed
- Connector sample state: `google_drive` `requires_reauthorization` → `connected` (authorization
  succeeded; recorded as ready-to-revalidate, folder allowlist still empty), and `box`
  `requires_connection` → `disabled_by_user` (operator dismissed authorization; the fleet must never
  retrigger it, reconnect is operator-initiated only). All statuses remain samples requiring runtime
  revalidation (ADR 0009).

### Known limitations
See [docs/IMPLEMENTATION_BACKLOG.md](docs/IMPLEMENTATION_BACKLOG.md) — no live adapters, no signing,
no companion binaries, no API authentication, manual approval queue, single operator.
