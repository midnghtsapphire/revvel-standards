# WR: [WR] auto-reset-stuck-issues.yml claims it triggered assignee but never dispatches - #17883

**Issue:** #17936  
**Repository:** [midnghtsapphire/revvel-standards](https://github.com/midnghtsapphire/revvel-standards)  
**Created:** 2026-08-24  
**Research Date:** 2026-08-24  
**Researcher:** Jules (Google) + OpenRouter  
**WR Status:** ✅ Complete

---

## Scope

- Investigate why `auto-reset-stuck-issues.yml` fails to successfully dispatch `openrouter-assignee.yml` and `openrouter-triage.yml` despite logging "Triggered openrouter-assignee.yml".
- Identify the root cause (e.g., API response swallowing, permission issues, invalid inputs, or branch requirements).
- Propose and implement a fix to ensure dispatches execute properly or fail loudly.
- Ensure no infinite loops are introduced during auto-recovery.

## Approach

- The current `createWorkflowDispatch` call is wrapped in a `try...catch` block that logs a success message if the `await` does not throw. However, the GitHub REST API might return a 204 No Content without actually triggering the workflow if the target workflow file is not found on the specified `ref`, or if the `ref` itself does not exist in the way expected (e.g., `context.ref` inside a scheduled run might be `refs/heads/main`, which should work, but needs verification).
- Additionally, we need to inspect the input parameters. `issue_number` is passed as a string which is correct. The workflows `openrouter-assignee.yml` and `openrouter-triage.yml` define `issue_number` as an input in `workflow_dispatch`.
- The likely issue is that `openrouter-assignee.yml` and `openrouter-triage.yml` use `concurrency` groups that might cause the new dispatch to be cancelled or queued indefinitely, or the API call needs to be audited for silent failures.
- The fix will involve refining the `catch` block or validating the response status from `createWorkflowDispatch` and ensuring the `ref` parameter explicitly targets `main` or the correct default branch if `context.ref` is problematic during cron runs.

## Acceptance Criteria

- [ ] The `auto-reset-stuck-issues.yml` script correctly triggers the recovery workflows or logs the exact reason for failure (e.g., 404, 422).
- [ ] Target workflows (`openrouter-assignee.yml` and `openrouter-triage.yml`) are verified to accept the dispatch payloads without silent drops.
- [ ] Tests updated / added where applicable.
- [ ] Docs updated where applicable.
- [ ] No regressions in related workflows.

## Risks & Mitigations

- **Risk:** Auto-recovery mechanisms can easily fall into infinite loops if the reset condition is met repeatedly by the recovery actions themselves.
  - **Mitigation:** The workflow adds a `needs-human` label if dispatch fails, breaking the loop. We must ensure this fail-safe remains intact and that successful dispatches clear the stuck state properly.
- **Risk:** Modifying workflow files can break the cron sweep entirely.
  - **Mitigation:** Use dry-run testing or isolated manual triggers to verify the fix before merging.

## Competitor & Pricing Intelligence

N/A — This is an internal technical fix

## Learnings — What & Why

GitHub Actions `createWorkflowDispatch` API can sometimes appear to succeed (returning a 204 status without throwing an error in Octokit) while silently failing to run the workflow if the provided `ref` doesn't contain the workflow file, or if there are subtle input schema mismatches. Logging the explicit resolution of `context.ref` and validating the inputs passed versus what the target workflow expects is crucial for debugging inter-workflow communication.

<!--
Guidance: agents completing other WR types should fill this in themselves once
done — capture what was learned and _why_ it matters, not just what changed.
For follow-up-generated WRs this section is populated automatically by the
Follow-up Checkbox Router with the original follow-up text, a link to the
source PR/issue, and (if applicable) a note that this is a chained follow-up.
-->
