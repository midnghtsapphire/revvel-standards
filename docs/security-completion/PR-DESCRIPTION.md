## WR Link

Audrey's authorized lifecycle-completion task, 2026-11-15. Existing owned work: `agent-completion-20261115`, ref `feat/agent-completion-20261115`. No new WR or auto-close link is invented.

## WR Class

Infrastructure / governance / security.

## Priority

P1 — stop abandoned owned WR/PR work and false completion.

## Output Type

Internal-script-automation and technical-documentation.

## Domain

Agent-system, ci-cd, monitoring, product-pipeline.

## Summary

Extend the existing PR Lifecycle with durable ownership records, an executable authenticated-gh session-start/resume CLI, bounded leases/attempts, tested completion-proof gates and deduplicated stale/empty-work alerts. Agents resume existing work, repair inherited failures, test, ship and record the outcome rather than creating replacements. No universal external-service hook or live deployment is claimed.

## Issue Context

Owner-authorized task: agent work must persist outside chat memory and finish product ID → tested deliverable → deployment/release → outcome. Existing lifecycle entry points only logged PR/check state and the PR lookup was first-page only.

## Background & Motivation

The call chain in START_HERE_CALL_CHAIN.md and monitoring/fallback standards already own execution timing. This change adds durable state/proof to that chain, not another scheduler or paid fallback.

## Scope

Only lifecycle implementation/workflow, a small shared metadata client pagination addition, AGENTS.md append, ownership schema/tests/journal, and scoped docs/blueprint. No CircleCI, guard, security-fleet, Trivy, product, billing, credential, scheduled job or new-task change. All existing retired/commented workflow blocks remain visible. **Draft; Audrey alone reviews/merges.**

## Changes

- `scripts/ci/agent-session-start.js`: executable CLI; existing gh auth, fully paginated PRs/comments, default-branch/local journal, prioritized continuation queue, safe separate arguments, narrow ANSI-SGR decoding, no PR command evaluation.
- `scripts/ci/lib/ownership.js`: schema/proof validation, append snapshot resolution, stable identity/task bindings, WR-to-existing-PR attachment, lease/attempt limits, blockers, terminal completion.
- `scripts/ci/lib/ownership-lifecycle.js`: fresh trusted metadata gate, stale/empty detection, deduplicated ownership sticky alert, existing needs-action metadata, no automatic merge/close.
- `scripts/ci/pr-lifecycle.js`: existing PR/check modes call the validator; additive on-demand ownership-scan mode.
- `scripts/ci/lib/mini-github.js`: optional page parameter, original first-page signature preserved in comments.
- `.github/workflows/pr-lifecycle.yml`: verified full-SHA checkout pin, trusted default branch, no persisted checkout token, retire PR-candidate execution path in place while retaining Windows metadata-only runner.
- `schemas/ownership-record.schema.json`: machine-readable ownership contract without altering the existing CUDA agent schema.
- `tests/ownership-completion.test.js`: pure mocked gh/API tests for leases, budgets, proof, ownership forgery, pagination, SGR and trust boundary.
- `AGENTS.md`: append binding session/auth-start command requirement; authority ordering not rewritten.
- `wr/agents/ownership.jsonl`: durable owned-task state and explicit release blocker, not fake deployment proof.
- `docs/security-completion/OWNERSHIP.md` and adjacent input/receipt docs: exact commands, complete plan, activation vs blockers, honest evidence.
- `workflows/security-completion/README.md` / `trigger-blueprint.json`: registered blueprint pointing existing lifecycle/monitor, draft/not deployed and per-service integration inventory.

## Research Findings (Tiered)

### A1 — Proven (>95%)

Focused local mocked suite passes; checkout v7 commit resolved through GitHub API as `3d3c42e5aac5ba805825da76410c181273ba90b1`; current lifecycle source had first-page-only PR lookup. Sources and commands: docs/security-completion/OWNERSHIP.md.

### A2 — Established (80–95%)

Existing agent standards/call chain require testable delivery and metadata provenance. Repository ownership/monitoring instructions and code were read before implementation.

### B2 — Emerging (60–80%)

N/A — no unverified external capability is used as an active integration.

### B3 — Speculative (<60%)

Inactive bounded Manus review-continuation proposal only; no usable API key in parent runtime and no paid/new-task dispatch implemented.

## Approach

Append journal snapshots and owner-authored PR records, discover owned open/unfinished closed PR work, validate receipt structure and enforce bounded transitions. PR text is data only. Preserve original PR prose, original workflow comments and owner-review governance. Distributed comment leases are advisory: competing revisions fail closed, and service wrappers must serialize owner/task transitions.

## Artifact Checklist

- [x] Executable implementation and focused tests.
- [x] Ownership contract, runbook and registered machine-readable blueprint.
- [x] Existing lifecycle metadata alert/gate extension.
- [ ] Live workflow deployment/run receipt — pending owner merge/runner proof.
- [ ] External service session-hook receipts — each service operator must wire its wrapper.
- Skills/MCP/OpenAPI/PDF: N/A; no service endpoint, LLM call or user-facing product created.

## Validation

### Test Evidence

`node --test tests/ownership-completion.test.js tests/pr-lifecycle.test.js tests/workflow-yaml-validation.test.js tests/agent-monitor.test.js tests/agent-fallback-no-empty-issues.test.js`: **45 passed, zero failed**, plus the existing lifecycle script's internal 34 passing assertion cases. Scoped markdownlint: zero issues. Lifecycle YAML parsed; `git diff --check` clean. No network/secret/paid provider calls in tests. No live receipt URL fetched.

### Regression Check

Existing lifecycle/monitor/fallback tests included. Shared client page argument is backward compatible. Existing CUDA schema, delivery/monitor schedules and CircleCI remain unchanged. No database migration.

## Risks & Mitigations

| Risk | Status | Mitigation Applied |
| --- | --- | --- |
| Untrusted PR code executes with write token | Addressed | Candidate execution path retired; trusted default checkout, pinned action; metadata only |
| False live/test/release claims | Addressed structurally; owner proof review remains required | Nonempty receipts, full commit binding, explicit recorded-vs-requested verification; no claim that structure proves live availability |
| Duplicate/concurrent claims | Bounded advisory lease, not distributed CAS | Conflicting revisions fail closed; external wrappers serialize each task |
| Auth/billing/schema retry loops | Addressed | Stop once; bounded attempts; explicit resolution receipt before manual resume |
| Account-wide GitHub Actions trouble | External blocker | Local/CircleCI-compatible tests; no billing changes or fake green run |
| Four existing visiting-agent scanner findings | Out-of-scope inherited blocker | Untouched oaudrey-home affiliate findings routed to guard specialist/Audrey; no baseline suppression |

## Estimated Effort

One bounded specialist session; actual implementation/test receipts recorded in OWNERSHIP.md and commits.

## Checkpoint Status (if checkpoint-gated)

N/A — no new checkpoint Grid or independent task created.

## Self-Healing Log

Missing locked test dependencies resolved with `npm ci --ignore-scripts --no-audit --no-fund`, without lockfile changes. A mutable test fixture was isolated and regression passed. Actual gh output coloring handled by narrowly stripping only ANSI SGR; malformed JSON/other controls still fail. Inherited visiting-agent scanner product findings are recorded with owner and next action, not deleted.

## Learnings — What & Why

PR creation/merge is not deployment, and a stopped agent is not completed ownership. Persist exact next action and proof instead of chat memory. External service hooks are integration-specific; repository instructions alone do not install them.

## Checklist (Hard Gates)

- [x] Conventional title; scoped commit paths; no secrets, new schedules, paid calls, new task dispatch or agent merge.
- [x] Existing code/comments preserved; original PR body retained by additive discovery index.
- [x] Tested implementation, contract, commands and blueprint are durable in this branch.
- [ ] Deployed/released outcome — explicitly blocked pending owner review and real runner/service receipts.
- [ ] Repository-wide visiting-agent scanner — four inherited findings in untouched product; owner/guard resolution required.
- Root ledger/changelog/library updates: N/A to this tight assigned slice; lifecycle plan/journal/PR receipts carry provenance, and the parent owns the private umbrella tracker.

## Deferred Items (if any)

Only external activation: Audrey merges; runner/service operators provide real integration receipts. Manus review continuation remains inactive for missing usable API credential/paid authorization. No stub endpoint or automatic paid task was added.

## Review Notes for Owner

Please review the proof/lease semantics and trusted workflow boundary. This is a tested deliverable in a draft PR, not a claim that it is already live. No owner billing change or new scheduler is needed by this implementation. Owner merge remains required.
