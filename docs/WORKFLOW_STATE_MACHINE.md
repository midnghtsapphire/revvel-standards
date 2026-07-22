# Workflow State Machine — Label Lifecycle & Auto-Progression

## Overview

This document defines the complete state machine for issue and PR labels in the revvel-standards repository. All labels follow defined lifecycle states with automatic progression to prevent items from getting stuck.

## Core Principle: No Stuck States

**Every label must either:**
1. **Progress automatically** to the next state after a timeout
2. **Escalate to human** if automatic progression is impossible
3. **Complete** and reach a terminal state

**No label should remain in a pending/in-progress state indefinitely.**

## State Machine Diagram

```text
┌─────────────────────────────────────────────────────────────┐
│                    ISSUE/PR OPENED                           │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
              ┌────────────────┐
              │  triage:new    │ ← Initial state
              │  Max: 2 hours  │
              └────────┬───────┘
                       │ Auto-trigger triage
                       ▼
         ┌─────────────────────────┐
         │  triage:in-progress     │
         │  Max: 4 hours (was 24h) │
         └────────┬────────────────┘
                  │ Auto-classify or escalate
                  ▼
         ┌─────────────────────┐
         │  triage:classified  │ ← Terminal state
         │  OR                 │
         │  triage:escalated   │
         └─────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│               CREDENTIAL PROVISIONING FLOW                   │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
          ┌──────────────────────┐
          │ credentials-missing   │
          │ Max: 12 hours (was 48h)│
          └────────┬──────────────┘
                   │ Auto-trigger credential gatekeeper
                   ▼
          ┌──────────────────────┐
          │ vault-agent OR       │
          │ agent-hq OR          │
          │ needs-human          │
          │ Max: 6 hours         │
          └────────┬─────────────┘
                   │
                   ▼
          ┌──────────────────────┐
          │ credentials-ready    │ ← Terminal state
          └──────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│               OPENROUTER INSTANTIATION FLOW                  │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
        ┌────────────────────────────┐
        │ openrouter:instantiating   │
        │ Max: 1 hour (was 2h)       │
        └────────┬───────────────────┘
                 │ Retry or fail
                 ▼
        ┌────────────────────────────┐
        │ openrouter:instantiated    │ ← Success terminal
        │ OR                         │
        │ openrouter:instantiation-  │
        │   failed + ralph-loop      │ ← Failure + retry
        └────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    WEEKLY RESEARCH FLOW                      │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
          ┌──────────────────────┐
          │ wr:in-progress       │
          │ Max: 3 days (was 7d) │
          └────────┬─────────────┘
                   │ Escalate to human
                   ▼
          ┌──────────────────────┐
          │ needs-human +        │
          │ priority-p1          │
          └──────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                         PR REVIEW FLOW                       │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
          ┌──────────────────────┐
          │ awaiting-approval    │
          │ Max: 24h (was 72h)   │
          └────────┬─────────────┘
                   │ Ping reviewers
                   ▼
          ┌──────────────────────┐
          │ approved OR          │
          │ changes-requested    │
          └────────┬─────────────┘
                   │
                   ▼
          ┌──────────────────────┐
          │ review-fix:in-       │
          │   progress           │
          │ Max: 6 hours         │
          └────────┬─────────────┘
                   │ Auto-fix or fail
                   ▼
          ┌──────────────────────┐
          │ review-fix:complete  │ ← Success terminal
          │ OR                   │
          │ review-fix:failed +  │
          │   needs-human        │ ← Failure + escalate
          └──────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                       BLOCKED STATE                          │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
          ┌──────────────────────┐
          │ blocked              │
          │ Max: 1 day (was 5d)  │
          └────────┬─────────────┘
                   │ Recheck blocker
                   ▼
          ┌──────────────────────┐
          │ Comment asking for   │
          │ status update        │
          └──────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                  THIRD-PARTY PR FLOW                         │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
          ┌──────────────────────┐
          │ third-party +        │
          │ external-contributor │
          └────────┬─────────────┘
                   │ Add comment explaining
                   │ manual review needed
                   ▼
          ┌──────────────────────┐
          │ Maintainer manually  │
          │ reviews and labels   │
          └──────────────────────┘
```

## Timeout Configuration

### Before (Stuck for Too Long)
- `triage:in-progress`: **24 hours** ❌
- `credentials-missing`: **48 hours** ❌
- `openrouter:instantiating`: **2 hours** ⚠️
- `awaiting-approval`: **72 hours** ❌
- `blocked`: **5 days** ❌
- `wr:in-progress`: **7 days** ❌

### After (Faster Response Times) ✅
- `triage:new`: **2 hours** (new)
- `triage:in-progress`: **4 hours** (reduced from 24h)
- `credentials-missing`: **12 hours** (reduced from 48h)
- `openrouter:instantiating`: **1 hour** (reduced from 2h)
- `awaiting-approval`: **24 hours** (reduced from 72h)
- `blocked`: **1 day** (reduced from 5 days)
- `wr:in-progress`: **3 days** (reduced from 7 days)
- `review-fix:in-progress`: **6 hours** (new)

## Workflows Responsible for State Transitions

| Workflow | Frequency | Responsibility |
|----------|-----------|----------------|
| `stuck-label-automation.yml` | Every 2 hours | Detects and auto-progresses stuck labels |
| `openrouter-triage.yml` | On issue/PR open + hourly sweep | Initial triage and classification |
| `credential-label-router.yml` | On label + hourly sweep | Routes credential provisioning |
| `priority-router.yml` | On events + every 6 hours | Assigns priority labels |
| `ralph-loop.yml` | On CI failure | Self-healing CI failures |
| `ready-for-review.yml` | On PR ready | Triggers code review |

## Auto-Progression Actions

### 1. Auto-Classify (`triage:in-progress` → `triage:classified`)
After 4 hours in triage, automatically move to classified state and let the owner handle it.

### 2. Escalate Research (`wr:in-progress` → `needs-human`)
After 3 days in research, escalate to human with priority-p1 label.

### 3. Recheck Credentials (`credentials-missing` → re-trigger gatekeeper)
After 12 hours, re-run the credential gatekeeper to see if credentials are now available.

### 4. Retry Instantiation (`openrouter:instantiating` → `openrouter:instantiation-failed`)
After 1 hour, mark as failed and add ralph-loop label for retry.

### 5. Ping Reviewers (`awaiting-approval` → comment + ping)
After 24 hours, post a comment pinging the requested reviewers.

### 6. Recheck Blocker (`blocked` → comment asking for update)
After 1 day, post a comment asking for status update.

### 7. Retry Review Fix (`review-fix:in-progress` → `review-fix:failed`)
After 6 hours, mark as failed and add needs-human label.

### 8. Trigger Triage (`triage:new` → `triage:in-progress`)
After 2 hours, trigger the openrouter-triage workflow.

## Third-Party PR Handling

**Problem:** Fork PRs were being silently skipped by automation workflows, leaving contributors confused.

**Solution:** 
1. Detect fork PRs in `priority-router.yml`
2. Add `third-party` and `external-contributor` labels for visibility
3. Post informative comment explaining:
   - Why automation is limited (security)
   - What happens next (manual review)
   - Expected timeline (24-48h)

**Labels:**
- `third-party` - PR from forked repository
- `external-contributor` - Contribution from outside the organization

## Label Definitions

### Lifecycle Labels
- `triage:new` - Freshly opened, not yet looked at (max 2h)
- `triage:in-progress` - A triager is actively classifying (max 4h)
- `triage:classified` - Labeled & routed, ready for owner (terminal)
- `triage:escalated` - Escalated beyond default triager (terminal)
- `blocked` - Blocked by external dependency (max 1 day)
- `needs-human` - Requires human intervention (escalation state)

### Automation Labels
- `openrouter:instantiating` - Instantiation in progress (max 1h)
- `openrouter:instantiated` - API key verified, live (terminal)
- `openrouter:instantiation-failed` - Instantiation failed (retry state)
- `credentials-missing` - Missing API keys/secrets (max 12h)
- `credentials-ready` - All credentials provisioned (terminal)
- `review-fix:in-progress` - OpenRouter fixing review feedback (max 6h)
- `review-fix:complete` - All feedback addressed (terminal)
- `review-fix:failed` - Could not auto-fix (escalation state)

### PR Review Labels
- `awaiting-approval` - Awaiting review and approval (max 24h)
- `changes-requested` - Changes requested by reviewers
- `approved` - Approved by reviewers (terminal)

### Priority Labels
- `priority-p0` - Critical priority — drop everything
- `priority-p1` - High priority — next up
- `priority-p2` - Medium priority — normal queue
- `priority-p3` - Low priority — backlog

## Monitoring & Reporting

### Workflow Run Summary
Every `stuck-label-automation.yml` run generates a summary report showing:
- Total stuck items detected
- Breakdown by issue vs PR
- Actions taken for each stuck item

### GitHub Issues Dashboard
Query for stuck items: `is:open label:"triage:in-progress" OR label:"credentials-missing" OR label:"blocked" OR label:"openrouter:instantiating"`

## Best Practices

### For Developers
1. **Don't remove automation labels manually** - Let workflows manage state transitions
2. **Add context comments** when marking as `blocked` - Explain what's blocking
3. **Remove `blocked` label** as soon as blocker is resolved
4. **Use `no-triage` label** to skip automation if needed

### For Maintainers
1. **Monitor the stuck-label-automation runs** - Review the summary report
2. **Act on `needs-human` labels quickly** - These are escalations
3. **Review third-party PRs within 24h** - They're waiting for manual labels
4. **Update this document** when adding new state transitions

## Troubleshooting

### Issue stuck in triage for hours
- **Check:** Is `no-triage` label present? (Automation skips these)
- **Check:** Did the openrouter-triage workflow fail? (Check Actions tab)
- **Fix:** Manually trigger `openrouter-triage.yml` workflow

### Credentials still missing after 12 hours
- **Check:** Is Doppler configured? (See `docs/SECRETS_MANAGEMENT.md`)
- **Check:** Did credential-label-router workflow run? (Check Actions tab)
- **Fix:** Manually add secrets to GitHub Actions or Doppler

### PR waiting for review too long
- **Check:** Are reviewers actually assigned?
- **Check:** Is PR in draft mode? (Draft PRs skip automation)
- **Fix:** Manually request review or mark as ready for review

### Fork PR not getting triaged
- **Expected:** Fork PRs require manual review for security reasons
- **Fix:** Maintainer should manually add priority and routing labels

## Related Documentation

- `docs/AGENTS.md` - Universal agent instructions and autonomy mandate
- `docs/SECRETS_MANAGEMENT.md` - Credential provisioning process
- `.github/workflows/stuck-label-automation.yml` - Main auto-progression workflow
- `.github/workflows/credential-label-router.yml` - Credential routing workflow
- `.github/workflows/priority-router.yml` - Priority assignment workflow
- `.github/labels.yml` - Canonical label definitions

## Change Log

### 2026-05-03 - Reduced Timeouts & Added Third-Party Detection
- Reduced all timeout thresholds by 50-80% for faster response
- Added `triage:new` auto-progression (new pattern)
- Added `review-fix:in-progress` auto-progression (new pattern)
- Added third-party PR detection and feedback
- Increased `stuck-label-automation.yml` frequency from 6h to 2h
- Reduced credential escalation from 24h to 6h
- Updated this documentation to reflect new state machine
