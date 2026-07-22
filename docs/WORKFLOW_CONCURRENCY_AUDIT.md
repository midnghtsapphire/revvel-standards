# Workflow Concurrency Audit

**Generated:** 2026-05-03  
**Purpose:** Identify workflows missing concurrency controls to prevent workflow stampedes

---

## Summary

- **Total workflows:** 77
- **With concurrency control:** 27
- **Missing concurrency control:** 50
- **Coverage:** 35%

---

## Workflows WITHOUT Concurrency Control

### `arsc-labels.yml`

**Name:** ARSC Labels  
**Triggers:** workflow_dispatch,issues,pull_request  
**PR-triggered:** Yes  
**Recommended Priority:** P1

**Recommended Fix:**
```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.event.pull_request.number || github.ref }}
  cancel-in-progress: true  # or false for P0 workflows
```

---

### `auto-error-handler.yml`

**Name:** Auto-Error Handler & Self-Healing  
**Triggers:** workflow_dispatch,workflow_call  
**PR-triggered:** No  
**Recommended Priority:** P2

**Recommended Fix:**
```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.event.pull_request.number || github.ref }}
  cancel-in-progress: true  # or false for P0 workflows
```

---

### `auto-merge.yml`

**Name:** Auto-Merge on Approval  
**Triggers:** pull_request  
**PR-triggered:** Yes  
**Recommended Priority:** P2

**Recommended Fix:**
```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.event.pull_request.number || github.ref }}
  cancel-in-progress: true  # or false for P0 workflows
```

---

### `close-linked-issue.yml`

**Name:** Close Linked Issue on PR Merge  
**Triggers:** pull_request  
**PR-triggered:** Yes  
**Recommended Priority:** P2

**Recommended Fix:**
```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.event.pull_request.number || github.ref }}
  cancel-in-progress: true  # or false for P0 workflows
```

---

### `commit-queue-monitor.yml`

**Name:** Commit Queue Monitor  
**Triggers:** schedule,workflow_dispatch  
**PR-triggered:** No  
**Recommended Priority:** P2

**Recommended Fix:**
```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.event.pull_request.number || github.ref }}
  cancel-in-progress: true  # or false for P0 workflows
```

---

### `compliance-check.yml`

**Name:** Compliance Check  
**Triggers:** schedule,workflow_dispatch,push  
**PR-triggered:** No  
**Recommended Priority:** P2

**Recommended Fix:**
```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.event.pull_request.number || github.ref }}
  cancel-in-progress: true  # or false for P0 workflows
```

---

### `compliance-watcher.yml`

**Name:** compliance-watcher  
**Triggers:** schedule,workflow_dispatch  
**PR-triggered:** No  
**Recommended Priority:** P2

**Recommended Fix:**
```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.event.pull_request.number || github.ref }}
  cancel-in-progress: true  # or false for P0 workflows
```

---

### `create-issue-branch.yml`

**Name:** Create Issue Branch  
**Triggers:** issues,issue_comment,pull_request  
**PR-triggered:** Yes  
**Recommended Priority:** P2

**Recommended Fix:**
```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.event.pull_request.number || github.ref }}
  cancel-in-progress: true  # or false for P0 workflows
```

---

### `credential-gatekeeper.yml`

**Name:** Credential Gatekeeper  
**Triggers:** issues,workflow_dispatch  
**PR-triggered:** No  
**Recommended Priority:** P0

**Recommended Fix:**
```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.event.pull_request.number || github.ref }}
  cancel-in-progress: true  # or false for P0 workflows
```

---

### `daily-wr-summary.yml`

**Name:** Daily WR & PR Summary  
**Triggers:** schedule,workflow_dispatch  
**PR-triggered:** No  
**Recommended Priority:** P2

**Recommended Fix:**
```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.event.pull_request.number || github.ref }}
  cancel-in-progress: true  # or false for P0 workflows
```

---

### `deploy-oaudrey.yml`

**Name:** Deploy oAudrey Hub → DigitalOcean App Platform  
**Triggers:** push,workflow_dispatch  
**PR-triggered:** No  
**Recommended Priority:** P2

**Recommended Fix:**
```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.event.pull_request.number || github.ref }}
  cancel-in-progress: true  # or false for P0 workflows
```

---

### `doppler-secrets-sync.yml`

**Name:** Doppler Secrets Sync  
**Triggers:** workflow_dispatch  
**PR-triggered:** No  
**Recommended Priority:** P2

**Recommended Fix:**
```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.event.pull_request.number || github.ref }}
  cancel-in-progress: true  # or false for P0 workflows
```

---

### `durability-mirror.yml`

**Name:** durability-mirror  
**Triggers:** schedule,workflow_dispatch  
**PR-triggered:** No  
**Recommended Priority:** P2

**Recommended Fix:**
```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.event.pull_request.number || github.ref }}
  cancel-in-progress: true  # or false for P0 workflows
```

---

### `eeat-trust-cron.yml`

**Name:** eeat-trust-cron  
**Triggers:** schedule,workflow_dispatch  
**PR-triggered:** No  
**Recommended Priority:** P2

**Recommended Fix:**
```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.event.pull_request.number || github.ref }}
  cancel-in-progress: true  # or false for P0 workflows
```

---

### `gatekeeper-registry-drift.yml`

**Name:** Gatekeeper — Registry Drift Check  
**Triggers:** schedule,workflow_dispatch  
**PR-triggered:** No  
**Recommended Priority:** P2

**Recommended Fix:**
```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.event.pull_request.number || github.ref }}
  cancel-in-progress: true  # or false for P0 workflows
```

---

### `gatekeeper-rotate.yml`

**Name:** Gatekeeper — Secret Rotation Check  
**Triggers:** schedule,workflow_dispatch  
**PR-triggered:** No  
**Recommended Priority:** P2

**Recommended Fix:**
```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.event.pull_request.number || github.ref }}
  cancel-in-progress: true  # or false for P0 workflows
```

---

### `issue-auto-triage.yml`

**Name:** Auto-Triage Issues  
**Triggers:** issues  
**PR-triggered:** No  
**Recommended Priority:** P1

**Recommended Fix:**
```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.event.pull_request.number || github.ref }}
  cancel-in-progress: true  # or false for P0 workflows
```

---

### `mergify-merge-queue-labels-copier.yml`

**Name:** Mergify Merge-Queue Labels Copier  
**Triggers:** pull_request_target  
**PR-triggered:** Yes  
**Recommended Priority:** P1

**Recommended Fix:**
```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.event.pull_request.number || github.ref }}
  cancel-in-progress: true  # or false for P0 workflows
```

---

### `migration-cron.yml`

**Name:** migration-cron  
**Triggers:** schedule,workflow_dispatch  
**PR-triggered:** No  
**Recommended Priority:** P2

**Recommended Fix:**
```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.event.pull_request.number || github.ref }}
  cancel-in-progress: true  # or false for P0 workflows
```

---

### `oaudrey-retro.yml`

**Name:** oAudrey — Post-Deploy Retro & Gap Analysis  
**Triggers:** workflow_run,schedule,workflow_dispatch  
**PR-triggered:** No  
**Recommended Priority:** P2

**Recommended Fix:**
```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.event.pull_request.number || github.ref }}
  cancel-in-progress: true  # or false for P0 workflows
```

---

### `openrouter-coder.yml`

**Name:** OpenRouter Coder  
**Triggers:** issues,workflow_dispatch  
**PR-triggered:** No  
**Recommended Priority:** P2

**Recommended Fix:**
```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.event.pull_request.number || github.ref }}
  cancel-in-progress: true  # or false for P0 workflows
```

---

### `panda-ops.yml`

**Name:** PandaOps AI PR Review  
**Triggers:** pull_request  
**PR-triggered:** Yes  
**Recommended Priority:** P1

**Recommended Fix:**
```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.event.pull_request.number || github.ref }}
  cancel-in-progress: true  # or false for P0 workflows
```

---

### `pr-review-status.yml`

**Name:** PR Review Status Automation  
**Triggers:** pull_request,pull_request_review,pull_request_review_comment  
**PR-triggered:** Yes  
**Recommended Priority:** P0

**Recommended Fix:**
```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.event.pull_request.number || github.ref }}
  cancel-in-progress: true  # or false for P0 workflows
```

---

### `priority-router.yml`

**Name:** Priority Router — Issues & PRs  
**Triggers:** issues,pull_request_target,schedule,workflow_dispatch  
**PR-triggered:** Yes  
**Recommended Priority:** P2

**Recommended Fix:**
```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.event.pull_request.number || github.ref }}
  cancel-in-progress: true  # or false for P0 workflows
```

---

### `project-board-sync.yml`

**Name:** Project Board Sync  
**Triggers:** issues,pull_request  
**PR-triggered:** Yes  
**Recommended Priority:** P2

**Recommended Fix:**
```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.event.pull_request.number || github.ref }}
  cancel-in-progress: true  # or false for P0 workflows
```

---

### `proposal-prosecution.yml`

**Name:** Proposal Prosecution  
**Triggers:** issues,workflow_dispatch  
**PR-triggered:** No  
**Recommended Priority:** P2

**Recommended Fix:**
```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.event.pull_request.number || github.ref }}
  cancel-in-progress: true  # or false for P0 workflows
```

---

### `ralph-loop.yml`

**Name:** Ralph Loop — Self-Healing CI  
**Triggers:** check_suite,workflow_run  
**PR-triggered:** No  
**Recommended Priority:** P2

**Recommended Fix:**
```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.event.pull_request.number || github.ref }}
  cancel-in-progress: true  # or false for P0 workflows
```

---

### `ready-for-review.yml`

**Name:** Ready for Review Automation  
**Triggers:** pull_request_target  
**PR-triggered:** Yes  
**Recommended Priority:** P1

**Recommended Fix:**
```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.event.pull_request.number || github.ref }}
  cancel-in-progress: true  # or false for P0 workflows
```

---

### `saml-sso-registration.yml`

**Name:** SAML SSO Registration  
**Triggers:** organization,pull_request  
**PR-triggered:** Yes  
**Recommended Priority:** P2

**Recommended Fix:**
```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.event.pull_request.number || github.ref }}
  cancel-in-progress: true  # or false for P0 workflows
```

---

### `secret-lifecycle.yml`

**Name:** Secret Lifecycle Manager  
**Triggers:** repository_dispatch  
**PR-triggered:** No  
**Recommended Priority:** P2

**Recommended Fix:**
```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.event.pull_request.number || github.ref }}
  cancel-in-progress: true  # or false for P0 workflows
```

---

### `secret-persistence-guard.yml`

**Name:** Secret Persistence Guard  
**Triggers:** schedule,workflow_dispatch,repository_dispatch  
**PR-triggered:** No  
**Recommended Priority:** P2

**Recommended Fix:**
```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.event.pull_request.number || github.ref }}
  cancel-in-progress: true  # or false for P0 workflows
```

---

### `secret-rotation-schedule.yml`

**Name:** Secret Rotation Schedule  
**Triggers:** schedule,workflow_dispatch  
**PR-triggered:** No  
**Recommended Priority:** P2

**Recommended Fix:**
```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.event.pull_request.number || github.ref }}
  cancel-in-progress: true  # or false for P0 workflows
```

---

### `secrets-health-check.yml`

**Name:** Secrets Health Check  
**Triggers:** schedule,workflow_dispatch  
**PR-triggered:** No  
**Recommended Priority:** P2

**Recommended Fix:**
```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.event.pull_request.number || github.ref }}
  cancel-in-progress: true  # or false for P0 workflows
```

---

### `secrets-sentinel.yml`

**Name:** Secrets Sentinel — Daily Auto-Heal  
**Triggers:** schedule,workflow_dispatch  
**PR-triggered:** No  
**Recommended Priority:** P2

**Recommended Fix:**
```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.event.pull_request.number || github.ref }}
  cancel-in-progress: true  # or false for P0 workflows
```

---

### `ship-status-audit.yml`

**Name:** Ship Status Audit  
**Triggers:** schedule,workflow_dispatch  
**PR-triggered:** No  
**Recommended Priority:** P2

**Recommended Fix:**
```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.event.pull_request.number || github.ref }}
  cancel-in-progress: true  # or false for P0 workflows
```

---

### `stale-branch-cleanup.yml`

**Name:** Stale Branch Cleanup  
**Triggers:** schedule,workflow_dispatch  
**PR-triggered:** No  
**Recommended Priority:** P2

**Recommended Fix:**
```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.event.pull_request.number || github.ref }}
  cancel-in-progress: true  # or false for P0 workflows
```

---

### `stale-docs-check.yml`

**Name:** Stale Docs Check  
**Triggers:** schedule,workflow_dispatch  
**PR-triggered:** No  
**Recommended Priority:** P2

**Recommended Fix:**
```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.event.pull_request.number || github.ref }}
  cancel-in-progress: true  # or false for P0 workflows
```

---

### `stuck-label-automation.yml`

**Name:** Stuck Label Detection & Auto-Progression  
**Triggers:** schedule,workflow_dispatch  
**PR-triggered:** No  
**Recommended Priority:** P2

**Recommended Fix:**
```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.event.pull_request.number || github.ref }}
  cancel-in-progress: true  # or false for P0 workflows
```

---

### `sync-labels.yml`

**Name:** Sync Standard Labels  
**Triggers:** push,workflow_dispatch  
**PR-triggered:** No  
**Recommended Priority:** P2

**Recommended Fix:**
```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.event.pull_request.number || github.ref }}
  cancel-in-progress: true  # or false for P0 workflows
```

---

### `sync-oaudrey-dns.yml`

**Name:** Sync oAudrey DNS records  
**Triggers:** workflow_dispatch,workflow_run,schedule  
**PR-triggered:** No  
**Recommended Priority:** P2

**Recommended Fix:**
```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.event.pull_request.number || github.ref }}
  cancel-in-progress: true  # or false for P0 workflows
```

---

### `template-sync-check.yml`

**Name:** Template Sync Check  
**Triggers:** pull_request,push  
**PR-triggered:** Yes  
**Recommended Priority:** P2

**Recommended Fix:**
```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.event.pull_request.number || github.ref }}
  cancel-in-progress: true  # or false for P0 workflows
```

---

### `test-bito-integration.yml`

**Name:** Test BITO AI Integration  
**Triggers:** push,pull_request,workflow_dispatch  
**PR-triggered:** Yes  
**Recommended Priority:** P1

**Recommended Fix:**
```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.event.pull_request.number || github.ref }}
  cancel-in-progress: true  # or false for P0 workflows
```

---

### `triage-cron.yml`

**Name:** triage-cron  
**Triggers:** schedule,workflow_dispatch  
**PR-triggered:** No  
**Recommended Priority:** P2

**Recommended Fix:**
```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.event.pull_request.number || github.ref }}
  cancel-in-progress: true  # or false for P0 workflows
```

---

### `vine-to-marketplace.yml`

**Name:** Vine → Marketplace Automation  
**Triggers:** schedule,workflow_dispatch  
**PR-triggered:** No  
**Recommended Priority:** P2

**Recommended Fix:**
```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.event.pull_request.number || github.ref }}
  cancel-in-progress: true  # or false for P0 workflows
```

---

### `workflow-health-dashboard.yml`

**Name:** Workflow Health Dashboard  
**Triggers:** schedule,workflow_dispatch  
**PR-triggered:** No  
**Recommended Priority:** P2

**Recommended Fix:**
```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.event.pull_request.number || github.ref }}
  cancel-in-progress: true  # or false for P0 workflows
```

---

### `workflow-monitor.yml`

**Name:** Workflow Monitor (Real-Time)  
**Triggers:** workflow_run,workflow_dispatch  
**PR-triggered:** No  
**Recommended Priority:** P2

**Recommended Fix:**
```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.event.pull_request.number || github.ref }}
  cancel-in-progress: true  # or false for P0 workflows
```

---

## Workflows WITH Concurrency Control ✅

### `agent-fallback.yml`

**Name:** Agent Fallback Handler  
**Concurrency Group:** `N/A`  
**Cancel in Progress:** N/A

---

### `ai-ci-failure-helper.yml`

**Name:** AI CI Failure Helper  
**Concurrency Group:** `ai-ci-failure-helper-${{ github.event.inputs.workflow_run_id || github.run_id }}`  
**Cancel in Progress:** false

---

### `ai-pr-review-openrouter.yml`

**Name:** AI PR Review (OpenRouter)  
**Concurrency Group:** `ai-pr-review-openrouter-${{ github.event.pull_request.number || github.ref }}`  
**Cancel in Progress:** true

---

### `ai-weekly-changelog.yml`

**Name:** AI Weekly Changelog  
**Concurrency Group:** `ai-weekly-changelog-${{ github.ref }}`  
**Cancel in Progress:** false

---

### `amplitude-events.yml`

**Name:** Amplitude — Repo Event Telemetry  
**Concurrency Group:** `amplitude-events-${{ github.event_name }}-${{ github.event.issue.number || github.event.pull_request.number || github.event.release.id || github.run_id }}`  
**Cancel in Progress:** false

---

### `amplitude-to-notion.yml`

**Name:** Amplitude → Notion Agent  
**Concurrency Group:** `amplitude-to-notion-${{ github.event_name }}`  
**Cancel in Progress:** false

---

### `bito-ai.yml`

**Name:** BITO AI — Code Review  
**Concurrency Group:** `bito-ai-${{ github.event.pull_request.number || github.run_id }}`  
**Cancel in Progress:** true

---

### `credential-label-router.yml`

**Name:** Credential Label Router  
**Concurrency Group:** `credential-router-${{ github.event.issue.number || github.event.inputs.issue_number }}`  
**Cancel in Progress:** false

---

### `deployment-health-check.yml`

**Name:** Deployment Health Check  
**Concurrency Group:** `deployment-health-check`  
**Cancel in Progress:** false

---

### `flow-chart-sync.yml`

**Name:** Flow Chart Sync  
**Concurrency Group:** `flow-chart-sync-${{ github.ref }}`  
**Cancel in Progress:** true

---

### `fork-audit-bot.yml`

**Name:** Fork-Audit Bot  
**Concurrency Group:** `fork-audit-bot`  
**Cancel in Progress:** false

---

### `jules-feedback.yml`

**Name:** Send Feedback to Jules  
**Concurrency Group:** `jules-feedback-${{ github.event.pull_request.number }}-${{ github.event.review.id }}`  
**Cancel in Progress:** false

---

### `jules-invoke.yml`

**Name:** Jules Invoke  
**Concurrency Group:** `jules-invoke-${{ github.event.issue.number || github.run_id }}`  
**Cancel in Progress:** false

---

### `jules-pr-comment.yml`

**Name:** Jules PR Comment  
**Concurrency Group:** `jules-pr-comment-${{ github.event.pull_request.number || github.event.inputs.pr_number }}`  
**Cancel in Progress:** true

---

### `jules-pr-reviewer.yml`

**Name:** Jules PR Reviewer  
**Concurrency Group:** `jules-review-${{ github.event.pull_request.number || github.ref }}`  
**Cancel in Progress:** true

---

### `mabl.yml`

**Name:** mabl Automated Tests  
**Concurrency Group:** `mabl-${{ github.ref }}`  
**Cancel in Progress:** true

---

### `match-labels.yml`

**Name:** Match Labels  
**Concurrency Group:** `match-labels-${{ github.event.pull_request.number }}`  
**Cancel in Progress:** true

---

### `noimosai.yml`

**Name:** NoimosAI — Autonomous Marketing  
**Concurrency Group:** `noimosai-${{ github.event_name }}-${{ github.event.issue.number || github.run_id }}`  
**Cancel in Progress:** false

---

### `openrouter-instantiation-check.yml`

**Name:** OpenRouter Instantiation Check  
**Concurrency Group:** `openrouter-instantiation-check`  
**Cancel in Progress:** false

---

### `openrouter-triage.yml`

**Name:** OpenRouter Triage  
**Concurrency Group:** `openrouter-triage-${{ github.event_name }}-${{ github.event.issue.number || github.event.pull_request.number || github.run_id }}`  
**Cancel in Progress:** false

---

### `pr-review-request-handler.yml`

**Name:** PR Review Request Handler  
**Concurrency Group:** `pr-review-request-handler-${{ github.event.pull_request.number }}`  
**Cancel in Progress:** true

---

### `proof-of-life.yml`

**Name:** Proof of Life — app-review revvel-standards-run  
**Concurrency Group:** `proof-of-life-${{ github.event.inputs.target_issue || 'log-only' }}`  
**Cancel in Progress:** false

---

### `recurse-ml.yml`

**Name:** RecurseML — Autonomous Code Review  
**Concurrency Group:** `recurse-ml-${{ github.ref }}`  
**Cancel in Progress:** true

---

### `research-module.yml`

**Name:** AI Research Module  
**Concurrency Group:** `research-module-${{ github.run_id }}`  
**Cancel in Progress:** false

---

### `run-human-testing-api.yml`

**Name:** Human Testing API  
**Concurrency Group:** `human-testing-api-${{ github.run_id }}`  
**Cancel in Progress:** false

---

### `static.yml`

**Name:** Deploy static content to Pages  
**Concurrency Group:** `"pages"`  
**Cancel in Progress:** false

---

### `weekly-research.yml`

**Name:** Weekly Research (WR) Automation  
**Concurrency Group:** `weekly-research-${{ github.event.issue.number || github.event.inputs.issue_number }}`  
**Cancel in Progress:** false

---

## Recommendations

### 1. Add Concurrency to PR-Triggered Workflows (High Priority)

All workflows triggered by PR events should have concurrency controls to prevent:
- Multiple runs for the same PR (e.g., rapid commits)
- Resource exhaustion
- API rate limiting

**Standard pattern for PR workflows:**
```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.event.pull_request.number || github.ref }}
  cancel-in-progress: true
```

### 2. Priority-Based Concurrency Strategy

#### P0 Workflows (Critical - Must Complete)
- **cancel-in-progress: false** (let existing run finish)
- Security checks, credential validation, compliance
- Examples: `credential-gatekeeper.yml`, `secret-persistence-guard.yml`

#### P1 Workflows (Important - Can Cancel)
- **cancel-in-progress: true** (cancel old, run new)
- AI reviews, label management, triage
- Examples: `ai-pr-review-openrouter.yml`, `bito-ai.yml`

#### P2 Workflows (Optional - Async)
- **cancel-in-progress: true** (always use latest)
- Analytics, reporting, monitoring
- Examples: `amplitude-events.yml`, `panda-ops.yml`

### 3. Scheduled Workflows

For cron-triggered workflows:
```yaml
concurrency:
  group: ${{ github.workflow }}
  cancel-in-progress: false  # let runs complete
```

### 4. Singleton Workflows

For workflows that should only have one instance running at a time:
```yaml
concurrency:
  group: ${{ github.workflow }}
  cancel-in-progress: true  # ensure only latest runs
```

---

## Implementation Plan

1. **Phase 1 (Week 1):** Add concurrency to all PR-triggered workflows
2. **Phase 2 (Week 2):** Add concurrency to scheduled workflows
3. **Phase 3 (Week 3):** Review and optimize concurrency groups
4. **Phase 4 (Week 4):** Monitor and adjust based on metrics

---

**Generated by:** `scripts/audit-workflow-concurrency.sh`  
**Report Location:** `docs/WORKFLOW_CONCURRENCY_AUDIT.md`
