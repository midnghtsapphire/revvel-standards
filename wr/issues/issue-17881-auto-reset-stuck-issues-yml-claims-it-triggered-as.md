# WR: [WR] auto-reset-stuck-issues.yml claims it triggered assignee but never dispatches

**Issue:** #17881  
**Repository:** [midnghtsapphire/revvel-standards](https://github.com/midnghtsapphire/revvel-standards)  
**Created:** 2026-08-22  
**Research Date:** 2026-08-22  
**Researcher:** Jules (Google) + OpenRouter  
**WR Status:** ✅ Complete

---

## Issue Context

**Summary:** `auto-reset-stuck-issues.yml` posts a success comment that claims it triggered `openrouter-assignee.yml`, but the job never dispatches any child workflow. Same false-success class as #17736, on the batch-reset path.

**Defect:**
In `.github/workflows/auto-reset-stuck-issues.yml` the reset loop:
1. Removes/re-adds `auto-fix`, `ralph-loop`, `scorecard`
2. Posts a comment that includes the line `- Triggered OpenRouter assignee workflow`
3. Never calls `gh workflow run` (or the Actions API) for `openrouter-assignee.yml` or `openrouter-triage.yml`

Label churn does not wake `openrouter-assignee.yml` (no `labeled` trigger). Even if it did, stuck WRs already carry `openrouter` and the default path skips them. So the batch reset is a no-op plus a false-success comment (CLAUDE.md gotcha #6 / RVS-VERIFY-001).

## Background & Motivation

The repository includes a batch script to reset stuck Work Request (WR) issues that have stalled in automation. The existing process claims to restart the triage/assignee workflows by manipulating labels and posting a comment. However, simply modifying labels does not trigger the `openrouter-assignee.yml` workflow, as it lacks a `labeled` trigger. Furthermore, it skips issues that already hold the `openrouter` label. This leaves the batch process providing a false success message—the comment claims child workflows were dispatched, but no automation is actually run. This violates CLAUDE.md Gotcha #6 (exit codes/comments must reflect true state).

## Scope

**In Scope:**
- Updating `.github/workflows/auto-reset-stuck-issues.yml` to explicitly trigger `openrouter-assignee.yml` and `openrouter-triage.yml` using `gh workflow run` or the Actions API for each stuck issue.
- Adjusting the success comment to accurately reflect which dispatches succeeded.
- Applying a `needs-human` label if a dispatch fails.
- Adding a regression test to assert the workflow contains the required API calls.
- Updating documentation in `docs/playbooks/wr-manual-processes.md` (§3) to match this new behavior.

**Out of Scope:**
- Do not rework the single-issue reset path (owned by #17736).

## Approach

1.  **Workflow Modification:** Update the script block in `.github/workflows/auto-reset-stuck-issues.yml`. After resetting the labels, use the `github.rest.actions.createWorkflowDispatch` endpoint (or `gh workflow run` if using a bash shell) to dispatch `openrouter-assignee.yml` and `openrouter-triage.yml`, passing the `issue_number` as input.
2.  **Error Handling & State Update:** Wrap the dispatch in a try/catch or failure check. If successful, append the success note to the comment list. If failed, apply the `needs-human` label and append a failure note.
3.  **Assertion Testing:** Write a new test (e.g., `tests/batch-stuck-issues-dispatch.test.js`) that reads `.github/workflows/auto-reset-stuck-issues.yml` and uses a regex or AST check to confirm `gh workflow run` or `createWorkflowDispatch` is explicitly present in the reset loop.
4.  **Documentation Sync:** Update `docs/playbooks/wr-manual-processes.md` to explain that the batch process actually performs explicit workflow dispatches rather than relying on label triggers.

## Acceptance Criteria

- [ ] Change delivers the described behavior end-to-end (explicit API calls trigger assignee and triage)
- [ ] Tests updated / added where applicable (regex or AST test confirms `gh workflow run` or `createWorkflowDispatch`)
- [ ] Docs updated where applicable (`docs/playbooks/wr-manual-processes.md` §3 synced)
- [ ] No regressions in related workflows
- [ ] Batch script comment accurately records success or failure to dispatch child workflows

## Risks & Mitigations

**Risks:**
- Rate limiting or concurrency issues if there are many stuck issues processed simultaneously via workflow dispatch.
- Overwriting or conflicting with the single-issue reset tool's logic (#17736).

**Mitigations:**
- Stagger API calls if necessary, but typical batch sizes shouldn't exceed rate limits.
- Strictly adhere to the exclusions defined in the scope (leave the single-issue reset alone).

## Competitor & Pricing Intelligence

N/A — This is an internal technical fix.

## Learnings — What & Why

N/A — This is an internal CI/CD fix to correct a false-success state in GitHub Actions workflows. The discrepancy was found during the implementation of #17736. The root cause is a misunderstanding of how GitHub Actions triggers work: label churn does not automatically fire a workflow without a `labeled` event trigger, requiring explicit dispatches to resume execution.
