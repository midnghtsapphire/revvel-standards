# agent-approval-check (merge-side gate)

Owner-approved 2026-11-04. Workflow: `.github/workflows/agent-approval-check.yml`.
Upstream: `anthropics/claude-code-action/agent-approval-check@846d5d8993b09aeea48c5cdde44b7c68f0ba24bc` (MIT), pinned by full SHA.

## What it does
Any PR with agent-authored commits/author (TRUSTED_BOTS list from `trusted-bot-auto-approve.yml` + Claude identities)
needs **1** human approval from a write-access user: native Approve, or a `/approve <head-sha>` comment.
Bot approvals never count. Posts commit status `agent-approval-check` + one sticky comment. No issues, labels, or dispatch.

## Approval binding (default: single-use, exact args)
An approval is bound to the exact head SHA. Any new push makes it stale; a fresh `/approve <new-sha>` is needed.
Reuse exceptions are NOT enabled here (a lookup-table design is under discussion separately).

## pull_request_target safety
No checkout, no PR code executed; only pinned action + pinned pip versions (`httpx==0.28.1`, `pyyaml==6.0.3`, `tenacity==9.1.4`).
Protect `.github/workflows/` via CODEOWNERS/branch protection, or anyone who can push workflows can spoof the status.

## Manual run
- Actions UI: *Agent Approval Check* → *Run workflow* → `pr_number`.
- CLI: `scripts/agent-approval-check-manual.sh <pr>` (dispatch) or `... <pr> --local` (runs the pinned script with your gh auth).

## Owner steps after merge
Add `agent-approval-check` as a required status check on `main`.
