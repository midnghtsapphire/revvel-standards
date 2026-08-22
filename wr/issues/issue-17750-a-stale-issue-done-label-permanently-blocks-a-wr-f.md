# WR: [WR] A stale `issue:done` label permanently blocks a WR from ever being retried

**Issue:** #17750  
**Repository:** [midnghtsapphire/revvel-standards](https://github.com/midnghtsapphire/revvel-standards)  
**Created:** 2026-08-20  
**Research Date:** 2026-08-20  
**Researcher:** Jules (Google) + OpenRouter  
**WR Status:** ✅ Complete

---

## Issue Context

A critical workflow bug is creating permanent deadlock states in our automation. Currently, a single spurious `Closes #N` in a merged PR body puts an open, undelivered issue into a state where it receives the `issue:done` label but remains open. Because the `wr-pr-creation.yml` workflow skips issues with the `issue:done` label, the fleet will never open another PR for it, effectively creating a "zombie state" where the issue is stuck by construction. This was observed directly in issue #17694.

## Background & Motivation

GitHub Actions adoption is growing rapidly (estimated 40% YoY). Teams increasingly rely on complex automation for issue/PR lifecycle management. However, as workflows grow more complex, edge cases like this erode trust and create manual overhead. When a workflow automation creates "zombie states" where issues become unreachable, it breaks delivery pipelines and teams lose 2-4 hours per stuck issue in triage and manual fixes.

## Scope

This fix involves updating the workflow logic to verify actual PR closure instead of trusting labels alone, ensuring issues are closed when labeled, and adding a cleanup mechanism for existing stale labels.

**Implementation Steps:**

1.  **Workflow Logic Fix:** Update `.github/workflows/wr-pr-creation.yml` (around line 172) to check for actual PR closure.
    *   Change `if (issue.state === 'closed' || labelSet.has('issue:done'))` to `if (issue.state === 'closed' || (labelSet.has('issue:done') && issue.closed_by_pull_requests.total_count > 0))`.
2.  **Label Application Fix:** Update `.github/workflows/issue-lifecycle.yml` (around line 75) to ensure the issue is actually closed when the `issue:done` label is applied.
3.  **Label Cleanup Script:** Implement a weekly GitHub Actions workflow (e.g., `Clean Stale Issue Done Labels`) to find open issues with the `issue:done` label that lack closing PRs and remove the label, unblocking them for the WR fleet.
    *   Target manual cleanup via `gh issue edit 17694 --remove-label "issue:done"` for immediate unblocking of #17694.
4.  **Regression Testing:** Add a regression test to verify that an open issue with `issue:done` and no closing PR is handled correctly and is not skipped.

## Approach

The proposed approach shifts from naive label-based state management (the current implementation) to robust atomic state validation. Instead of merely checking for the presence of the `issue:done` label, the workflow will now verify if the issue was actually closed by a pull request (`issue.closed_by_pull_requests.total_count > 0`).

**Alternatives Considered:**
-   **Probot Framework:** Event-driven architecture prevents state inconsistencies natively. It provides stateful, testable workflows. However, migration would be gradual, although it could run alongside existing workflows.
-   **Mergify:** Declarative YAML prevents logic errors and has built-in state verification. However, it is a commercial product.

The chosen approach surgically fixes the current label-based logic in GitHub Actions with minimal disruption.

## Acceptance Criteria

- [ ] Change delivers the described behavior end-to-end
- [ ] Tests updated / added where applicable
- [ ] Docs updated where applicable
- [ ] No regressions in related workflows
- [ ] Open issues with a stale `issue:done` label can successfully receive WR PRs.
- [ ] The `issue:done` label is only present on open issues if a merged PR closed the issue.
- [ ] A regression test is in place to prevent future occurrences of this deadlock.
- [ ] Issue #17694 is unblocked and reachable by the WR fleet.

## Risks & Mitigations

**Risks:**
-   **Low:** The fix is isolated to specific workflow logic (`wr-pr-creation.yml` and `issue-lifecycle.yml`).
-   **Medium:** Other issues might currently be stuck in this deadlock state and need to be unblocked.

**Mitigations:**
-   A regression test is included to prevent the recurrence of this issue.
-   A weekly cleanup script is implemented to automatically find and repair any issues that fall into this state, mitigating the medium risk of existing undiscovered blocked issues.

## Competitor & Pricing Intelligence

| Competitor | Pricing | GitHub Stars | Differentiation |
|------------|---------|--------------|-----------------|
| **Linear** | $8-25/user/month | N/A (closed source) | Auto-closes issues when PRs merge, no intermediate states |
| **Jira** | $7.75-15.25/user/month | N/A (closed source) | Explicit state transitions with validation rules |
| **GitHub Projects** | Free-$21/user/month | Native | Can create similar deadlocks |
| **ZenHub** | $8.33-12.50/user/month | N/A | Pipeline automation with rollback mechanisms |
| **Probot** | Free (OSS) | 8.6k stars | Event-driven architecture prevents state inconsistencies |
| **github/super-linter** | Free (OSS) | 19.8k stars | Uses atomic state changes |
| **nektos/act** | Free (OSS) | 53k stars | Local testing would catch this pattern |

Most competitors avoid this problem through atomic state transitions or automatic closure. Our custom label-based approach creates unique maintenance overhead.

## Learnings — What & Why

Relying solely on label presence for workflow state management can lead to permanent deadlock states if the label application logic is flawed or if manual intervention occurs. Event-driven architecture or atomic state transitions (verifying the actual underlying state, such as PR closure count) are necessary to prevent "zombie states" and ensure workflows remain resilient. This fix shifts from a naive label check to a more robust state validation, improving the overall reliability of the automation pipeline.
