# WR: Run PR lifecycle labels independently of GitHub Actions

## Issue Context

Audrey requested a FOSS/deterministic workaround for PR lifecycle labeling when GitHub Actions is blocked by billing, plus review of existing repositories, community preferences, simplification, and a complete preservation trail. No issue number or remote draft PR has been created in this session because authenticated GitHub writes are unavailable.

## Scope

Add a standalone lifecycle label reconciler, offline tests, an external-runner runbook and scheduler configuration, repository audit, and source research. Keep existing labels compatible and preserve all existing code. Review `revvel-dark-run` for reuse. Retire only competing lifecycle writers at cutover, retaining original contents with dated notes; preserve unrelated self-healing functions.

## Acceptance Criteria

- [ ] Tests demonstrate deterministic labels, no false ready state on pending/missing CI, managed-label-only mutation, pagination, and explicit errors.
- [ ] A second run against unchanged state performs no label writes.
- [ ] No Actions runner, LLM, badge-comment creation, or automatic merge is required by the replacement.
- [x] Existing workflow contents remain intact during local preparation.
- [ ] External host/token access is verified and the timer is observed working.
- [ ] Draft PR is published for Audrey's review with test receipts and preservation/rollback details.

## Learnings — What & Why

Multiple existing writers and partial CI aggregation can disagree about lifecycle state. Consolidating their responsibility matters more than changing Marketplace Actions. Public clone access does not prove push or deployment access. See `docs/automation/pr-lifecycle-session-2026-11-06.md` for actor/access details and `docs/automation/pr-lifecycle-labels.md` for operational cutover and rollback.
