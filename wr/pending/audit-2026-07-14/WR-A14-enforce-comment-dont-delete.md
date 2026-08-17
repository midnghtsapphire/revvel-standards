# [WR] P1 — COMMENT-DONT-DELETE is a standard with no gate: agents can delete freely

## Title
[WR] Enforce COMMENT-DONT-DELETE in CI — block PRs that delete code/files without a REVVEL-DISABLED marker

## Description
**Problem.** standards/COMMENT-DONT-DELETE.md and the REVVEL-DISABLED convention (wr-lint rule 11 validates the marker FORMAT) exist, but NO gate detects DELETION itself. Any agent can remove files or large code blocks in a PR and nothing fires — which is exactly how "an agent took X away" incidents happen (e.g., the Opus-era orchestrator handoff change; the 2026-05-15 remote commit that deleted a product tree/test mid-validation, per learnings.md). The standard is policy without teeth.

**Fix.** New CI check (node:builtin-only script + workflow on pull_request):
(1) Diff base...head; flag any DELETED file and any hunk removing more than N lines (start N=30) of code.
(2) PASS if the deletion is covered: the PR body or the removed region's replacement carries a `REVVEL-DISABLED |` marker per COMMENT-DONT-DELETE §3, OR the PR carries an explicit `deletion-approved` label applied by the owner.
(3) FAIL otherwise with a comment listing each uncovered deletion and the exact marker syntax to fix it.
(4) Exempt generated/lock/state files via an allowlist (package-lock.json, dashboard-data.json, docs/biome/*, wr/memory/*.jsonl etc.) so the gate stays 100% signal (WR-A9 lesson: never train agents to ignore a noisy checker).

**Acceptance.** Test PR deleting a tracked .js file with no marker → check fails with actionable comment. Same PR with REVVEL-DISABLED replacement block or `deletion-approved` label → check passes. Allowlisted generated files → never flagged. Gate registered in branch protection for main.

## Agent learning note
A standard without an enforcement gate is a suggestion. The fleet already learned "fix + vaccine together" (WR-A10); this is the same rule applied to governance: every MUST in standards/ needs a corresponding CI check, or agents under velocity pressure will violate it silently. Files are never deleted — they are commented out with a REVVEL-DISABLED header, or the deletion is explicitly owner-approved. Now the machine enforces what the doc requests.

Assignee: Dragnet | Labels: P1, governance, self-healing, vaccine
