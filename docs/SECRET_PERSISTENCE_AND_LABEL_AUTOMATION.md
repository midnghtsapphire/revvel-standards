# Secret Persistence & Label Automation Solutions

> **Status:** ✅ IMPLEMENTED  
> **Last Updated:** 2026-05-01  
> **Issue:** [WR] Missing-credentials stuck change it

## Problem Statement

The user reported two critical issues:

1. **Secrets disappearing repeatedly** — Credentials stored in GitHub repository secrets were going missing daily
2. **Labels getting stuck** — Labels not progressing autonomously through workflow states, requiring manual intervention

## Root Cause Analysis

### Secrets "Disappearing"

After comprehensive investigation:

- ✅ **NO automated deletion workflows exist** — Analyzed all 58+ workflows, none delete secrets automatically
- ✅ **Secret lifecycle workflow** only triggers on manual `repository_dispatch` events
- ✅ **Secret rotation schedule** rotates but never deletes
- ❌ **Actual issue**: Secrets were likely manually deleted OR never properly synced from Doppler

### Labels "Stuck"

- ⚠️ **No automatic progression** — Labels like `triage:in-progress`, `wr:in-progress`, `credentials-missing` had no time-based auto-progression
- ⚠️ **No stuck detection** — No monitoring for labels that exceed reasonable time thresholds
- ⚠️ **Manual intervention required** — All label state changes required human action

## Solutions Implemented

### 1. Secret Persistence Guard

**File:** `.github/workflows/secret-persistence-guard.yml`

**Features:**

1. **Protection Layer** — Blocks deletion of critical secrets
   - `OPENROUTER_API_KEY`
   - `DOPPLER_TOKEN`
   - `ADMIN_GITHUB_TOKEN`
   - `GITHUB_TOKEN`

2. **Hourly Monitoring** — Checks secret availability every hour
   - Scans 8 critical secrets
   - Generates health check summary
   - Detects missing secrets immediately

3. **Auto-Recovery** — Automatically restores missing secrets
   - Fetches from Doppler if available
   - Syncs to GitHub repo secrets
   - Tracks recovery success/failure

4. **Auto-Escalation** — Creates P0 issues for unrecoverable secrets
   - Includes specific remediation steps
   - Tags with `security`, `needs-human`, `goap`, `priority-p0`
   - Assigns to @midnghtsapphire

**Triggers:**
- Schedule: Every hour (`0 * * * *`)
- Manual: `workflow_dispatch` with force recovery option
- Protection: On `repository_dispatch` with `secret-delete` action

### 2. Stuck Label Detection & Auto-Progression

**File:** `.github/workflows/stuck-label-automation.yml`

**Features:**

1. **Stuck Detection** — Identifies labels exceeding time thresholds:
   - `triage:in-progress` > 24h → auto-classify
   - `wr:in-progress` > 7 days → escalate
   - `credentials-missing` > 48h → recheck
   - `openrouter:instantiating` > 2h → retry or fail
   - `awaiting-approval` > 72h → ping reviewers
   - `blocked` > 5 days → recheck blocker

2. **Auto-Progression** — Automatically moves labels forward:
   - Applies next appropriate label
   - Triggers relevant workflows (e.g., credential-gatekeeper)
   - Posts progress comments
   - Pings relevant people

3. **Escalation** — Escalates items that can't auto-progress:
   - Adds `needs-human` label
   - Increases priority
   - Provides specific next actions

4. **Reporting** — Generates comprehensive summaries:
   - Lists all stuck items
   - Shows age and action taken
   - Tracks progression over time

**Triggers:**
- Schedule: Every 6 hours (`0 */6 * * *`)
- Manual: `workflow_dispatch` with dry-run option

### 3. Enhanced Labels

**File:** `.github/labels.yml`

**Added Labels:**
- `auto-error` — Automatically created error reports
- `needs-fix` — Identified issues needing fixes
- `goap-escalation` — Escalated to GOAP
- `urgent` — Urgent issues
- `credentials-missing` — Credentials not provisioned
- `credentials-ready` — Credentials provisioned
- `ready-to-implement` — Ready for implementation

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│                 Secret Persistence Guard                  │
│                                                           │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────┐ │
│  │  Protected  │  │   Monitor    │  │  Auto-Recovery  │ │
│  │   Secrets   │→│   (Hourly)   │→│  from Doppler   │ │
│  └─────────────┘  └──────────────┘  └─────────────────┘ │
│         │                │                    │           │
│         ▼                ▼                    ▼           │
│  Block deletion   Detect missing    Sync to GitHub       │
│         │                │                    │           │
│         └────────────────┴────────────────────┘           │
│                          │                                │
│                          ▼                                │
│                 ┌──────────────────┐                      │
│                 │   Escalation     │                      │
│                 │  (P0 Issue)      │                      │
│                 └──────────────────┘                      │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│          Stuck Label Auto-Progression System              │
│                                                           │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────┐ │
│  │   Detect    │  │   Action     │  │    Progress     │ │
│  │   Stuck     │→│  Decision    │→│    Labels       │ │
│  │   Labels    │  │   Engine     │  │   Forward       │ │
│  └─────────────┘  └──────────────┘  └─────────────────┘ │
│         │                │                    │           │
│         ▼                ▼                    ▼           │
│  Scan timeline    Determine action    Apply new label    │
│  Find aged        Based on pattern    Trigger workflows   │
│  labels           Auto vs escalate    Post comments       │
│         │                │                    │           │
│         └────────────────┴────────────────────┘           │
│                          │                                │
│                          ▼                                │
│                 ┌──────────────────┐                      │
│                 │  Report Summary  │                      │
│                 │  (Dashboard)     │                      │
│                 └──────────────────┘                      │
└──────────────────────────────────────────────────────────┘
```

## Usage

### Protecting Additional Secrets

Edit `.github/workflows/secret-persistence-guard.yml`:

```yaml
PROTECTED_SECRETS=(
  "OPENROUTER_API_KEY"
  "DOPPLER_TOKEN"
  "ADMIN_GITHUB_TOKEN"
  "GITHUB_TOKEN"
  "YOUR_NEW_SECRET"  # Add here
)
```

### Adding New Stuck Label Patterns

Edit `.github/workflows/stuck-label-automation.yml`:

```javascript
const STUCK_PATTERNS = [
  // ... existing patterns ...
  {
    label: 'your-label',
    max_age_ms: 48 * MS_PER_HOUR,  // 48 hours
    next_action: 'your-action',
    next_label: 'next-label-name',
    description: 'Description of stuck state'
  },
];
```

Then implement the action in the switch statement:

```javascript
case 'your-action':
  comment_body += `Your action description...\n\n`;
  // Perform action
  break;
```

### Manual Triggers

**Check secrets immediately:**
```bash
gh workflow run secret-persistence-guard.yml
```

**Force secret recovery:**
```bash
gh workflow run secret-persistence-guard.yml -f force_recovery=true
```

**Dry-run stuck label detection:**
```bash
gh workflow run stuck-label-automation.yml -f dry_run=true
```

## Monitoring

### Secret Health

Check hourly reports in Actions → Secret Persistence Guard:
- ✅ All secrets present
- ⚠️ N secrets missing (auto-recovery attempted)
- ❌ Recovery failed (issue created)

### Stuck Labels

Check 6-hourly reports in Actions → Stuck Label Automation:
- Count of stuck issues/PRs
- Actions taken on each
- Progression success rate

### Escalation Issues

Monitor for auto-created issues:
- `🚨 Secrets Missing: Manual Recovery Required`
- `🚨 Blocked Protected Secret Deletion`
- Comments on stuck items with progression actions

## Prevention Strategies

### For Secrets

1. **Never delete critical secrets manually** — Use the protection workflow
2. **Always use Doppler as source of truth** — Sync from Doppler to GitHub
3. **Monitor hourly reports** — Review Secret Persistence Guard runs
4. **Test recovery** — Periodically run manual recovery to ensure it works

### For Labels

1. **Set realistic time thresholds** — Adjust in stuck-label-automation.yml
2. **Review stuck reports** — Check every 6 hours for patterns
3. **Add automation** — Create workflows that auto-progress labels
4. **Document label lifecycle** — Update docs/WEEKLY_RESEARCH_PROCESS.md

## Future Enhancements

### Secrets
- [ ] Multi-vault support (Vault, AWS Secrets Manager, Azure Key Vault)
- [ ] Secret usage tracking (which workflows use which secrets)
- [ ] Automated secret rotation with zero-downtime
- [ ] Secret dependency graph (which secrets depend on others)

### Labels
- [ ] Machine learning for optimal time thresholds
- [ ] Predictive stuck detection (detect before threshold)
- [ ] Cross-repo label synchronization
- [ ] Label lifecycle visualization dashboard

## Troubleshooting

### Secret Persistence Guard Issues

**Issue:** Auto-recovery fails with "401 Unauthorized"
- **Solution:** Check `DOPPLER_TOKEN` is valid and has read access

**Issue:** Can't sync to GitHub with "403 Forbidden"
- **Solution:** Ensure `ADMIN_GITHUB_TOKEN` has `secrets: write` permission

**Issue:** Protected secret deletion still succeeds
- **Solution:** Workflow runs AFTER deletion event; check if secret is in PROTECTED_SECRETS list

### Stuck Label Automation Issues

**Issue:** Labels not progressing despite being stuck
- **Solution:** Check workflow is enabled and running every 6 hours

**Issue:** Too many false positives
- **Solution:** Increase time thresholds in STUCK_PATTERNS

**Issue:** Auto-progression fails
- **Solution:** Check permissions (workflow needs `issues: write` and `pull-requests: write`)

## References

- [AGENTS.md](../AGENTS.md) — Autonomy protocol and self-healing requirements
- [SECRETS_MANAGEMENT.md](../docs/SECRETS_MANAGEMENT.md) — Secret inventory and Doppler integration
- [WEEKLY_RESEARCH_PROCESS.md](../docs/WEEKLY_RESEARCH_PROCESS.md) — WR label lifecycle
- [PR_REVIEW_STATUS_AUTOMATION.md](../docs/PR_REVIEW_STATUS_AUTOMATION.md) — PR label automation

---

**Implementation Date:** 2026-05-01  
**Implemented By:** @copilot  
**Issue:** #[issue-number]  
**Status:** ✅ Active and Monitoring
