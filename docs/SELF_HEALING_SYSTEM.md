# Self-Healing System Overview

**Last Updated:** 2026-06-15
**Status:** 🟢 Active

---

## What is the Self-Healing System

The self-healing system is an automated infrastructure that detects failures, stuck issues, and broken workflows — then automatically attempts to fix them without human intervention.

### Key Principles

1. **Detect** problems automatically (no human reporting needed)
2. **Diagnose** root causes
3. **Remediate** using pre-defined healing actions
4. **Escalate** to humans only when automation cannot fix it

---

## Architecture Overview

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                           SELF-HEALING ECOSYSTEM                           │
└─────────────────────────────────────────────────────────────────────────────┘

  ┌──────────────────────┐      ┌──────────────────────┐
  │   DETECTION LAYER    │      │    HEALING LAYER     │
  ├──────────────────────┤      ├──────────────────────┤
  │                      │      │                      │
  │  stuck-wr-detector   │──────│  self-healing.yml    │
  │  stuck-label-watchdog │      │  (main healer)       │
  │  stuck-check-watchdog │      │                      │
  │  stuck-label-auto     │      │  wr-pr-creation.yml  │
  │                      │      │                      │
  └──────────┬───────────┘      └──────────┬───────────┘
             │                             │
             │    ┌────────────────────────┘
             │    │
             ▼    ▼
  ┌──────────────────────────────────────────────────────┐
  │                  ESCALATION LAYER                     │
  ├──────────────────────────────────────────────────────┤
  │                                                      │
  │  auto-reset-stuck-issues.yml  (NEW - 30m cron)     │
  │         ↓                                           │
  │  reset-self-heal-issue.yml    (manual trigger)       │
  │         ↓                                           │
  │  openrouter-assignee.yml      (orchestrator)        │
  │         ↓                                           │
  │  Ralph Loop                 (self-healing agent)    │
  │         ↓                                           │
  │  If failed: agent-fallback.yml                       │
  │         ↓                                           │
  │  If still failed: needs-human label                 │
  │                                                      │
  └──────────────────────────────────────────────────────┘
```

---

## Detection Layer

These workflows **detect** problems:

### `stuck-wr-detector.yml`

| Property | Value |
|----------|-------|
| **Trigger** | Cron (1h) + Issue events |
| **Detects** | Work Requests without PRs after extended time |
| **Action** | Creates tracking issue, dispatches wr-pr-creation.yml |

### `stuck-label-watchdog.yml`

| Property | Value |
|----------|-------|
| **Trigger** | Cron (1h) |
| **Detects** | Issues stuck in any label for >24h |
| **Action** | Posts warning, escalates priority |

### `stuck-check-watchdog.yml`

| Property | Value |
|----------|-------|
| **Trigger** | Cron (30m) |
| **Detects** | Issues stuck in `wr:checking` for >2h |
| **Action** | Labels with `wr:check-failed`, re-triggers |

### `stuck-label-automation.yml`

| Property | Value |
|----------|-------|
| **Trigger** | Cron (30m) |
| **Detects** | Label-progression violations |
| **Action** | Auto-advances labels, posts comments |

---

## Healing Layer

These workflows **attempt to fix** problems:

### `self-healing.yml` (Main Healer)

| Property | Value |
|----------|-------|
| **Trigger** | Cron (4h) |
| **Checks** | Failed actions, stuck issues, missing workflows |
| **Heals** | Re-runs failed workflows, labels stuck issues |
| **Threshold** | >3 failed actions in 24h, >5 stuck issues |
| **Also runs** | `update-main` job (always, even when system is healthy) |

### `self-healing.yml` — `update-main` job

| Property | Value |
|----------|-------|
| **Purpose** | Advance approved + green PRs into `main` automatically |
| **Trigger** | Part of `self-healing.yml` (4h cron + manual dispatch) |
| **Eligibility criteria** | Non-draft, approved, CI green, no `won't-merge`, not conflicted |
| **Action** | Adds `auto-merge` label → `auto-merge.yml` squash-merges |
| **Skips** | Drafts, `won't-merge` PRs, conflicted branches, unapproved PRs |
| **Playbook** | `docs/playbooks/branch-update-guide.md` (§5) |
| **Manual processes** | `docs/playbooks/wr-manual-processes.md` (§14) |

### `wr-pr-creation.yml`

| Property | Value |
|----------|-------|
| **Trigger** | workflow_dispatch, issues |
| **Action** | Creates PR from WR template |
| **Retry** | Up to 3 attempts before escalation |

---

## Escalation Layer

When detection + healing fails, these **orchestrate human intervention**:

### `auto-reset-stuck-issues.yml` ⭐ NEW

| Property | Value |
|----------|-------|
| **Trigger** | Cron (30m) |
| **Detects** | Issues stuck in `triage:new` > 1h |
| **Target Labels** | `auto-fix`, `ralph-loop`, `wr-stuck`, `auto-error` |
| **Action** | Removes/re-adds labels, posts comment, triggers assignee |
| **Use Case** | Auto-recovery without manual intervention |

### `reset-self-heal-issue.yml` ⭐ NEW

| Property | Value |
|----------|-------|
| **Trigger** | workflow_dispatch (manual) |
| **Input** | Issue number |
| **Action** | Full reset cycle + OpenRouter trigger |
| **Use Case** | Manual recovery for specific stuck issues |

### `openrouter-assignee.yml`

| Property | Value |
|----------|-------|
| **Trigger** | Cron (1h) + Issues + PRs |
| **Action** | Routes to OpenRouter orchestrator |
| **Labels** | `openrouter`, `copilot`, `role:orchestrator` |

### `agent-fallback.yml`

| Property | Value |
|----------|-------|
| **Trigger** | Label `agent-fallback` |
| **Fallback Chain** | OpenHands → Cursor → OpenRouter |
| **Action** | Attempts fix with each agent in sequence |

---

## Ralph Loop (The Self-Healing Agent)

The **Ralph Loop** is the core self-healing agent that:

1. Receives issues via `openrouter-assignee.yml`
2. Analyzes the problem
3. Attempts fixes
4. Tracks attempts via `scorecard` label
5. Escalates after 3 failed attempts

### Ralph Loop Labels

| Label | Purpose |
|-------|---------|
| `auto-fix` | Identifies self-healing issue |
| `ralph-loop` | Managed by Ralph Loop |
| `scorecard` | Trust/tracking metrics |
| `needs-human` | Escalation required |

---

## Flow Examples

### Example 1: WR Stuck (Auto-Resolution)

```text
1. WR issue created, research runs, PR not created
2. stuck-wr-detector.yml fires (1h cron)
3. Detects: no PR for 4h
4. Dispatches wr-pr-creation.yml
5. wr-pr-creation.yml succeeds
6. ✅ PR created, issue resolved
```

### Example 2: WR Stuck (Manual Reset)

```text
1. WR stuck, tried 3 times, no PR
2. stuck-wr-detector.yml creates #14647
3. auto-reset-stuck-issues.yml fires (30m cron)
4. Finds #14647 stuck > 1h
5. Resets labels, posts comment
6. openrouter-assignee.yml picks up
7. Ralph Loop analyzes → finds bug in template
8. Fixes template, re-runs
9. ✅ PR created
```

### Example 3: Human Escalation

```text
1. WR stuck, automation cannot fix
2. Ralph Loop: 3 attempts failed
3. Labels: `needs-human`, `wr-stuck`
4. Human reviews
5. Human: finds missing OPENROUTER_API_KEY
6. Human fixes secret
7. Reset via reset-self-heal-issue.yml
8. Ralph Loop succeeds
9. ✅ Resolved
```

---

## Quick Reference

### Auto-Reset (No Human Needed)

```bash
# Any stuck issue - automatic
gh workflow run auto-reset-stuck-issues.yml \
  --repo midnghtsapphire/revvel-standards
```

### Manual Reset (Specific Issue)

```bash
# Specific stuck issue
gh workflow run reset-self-heal-issue.yml \
  --field issue_number=14632 \
  --repo midnghtsapphire/revvel-standards
```

### Force Re-Run Wr-Pr-Creation

```bash
# Directly trigger PR creation
gh workflow run wr-pr-creation.yml \
  --field issue_number=14592 \
  --repo midnghtsapphire/revvel-standards
```

---

## Monitoring

### Check System Health

```bash
# View recent self-healing runs
gh run list --workflow=self-healing.yml --limit 5

# View stuck issues
gh issue list --label wr-stuck --state open

# View Ralph Loop activity
gh issue list --label ralph-loop --state open
```

### Debug a Specific Issue

```bash
# View issue timeline
gh issue view 14592 --timeline

# View workflow runs for issue
gh run list --workflow=wr-pr-creation.yml --limit 10
```

---

## Related Documentation

| Document | Description |
|----------|-------------|
| `skills/ralph-loop/SKILL.md` | Ralph Loop agent instructions |
| `skills/openrouter-swarms/SKILL.md` | OpenRouter orchestrator |
| `docs/AUTOMATION_AND_AUTOHEAL_STANDARD.md` | Auto-heal standards |
| `.github/workflows/stuck-wr-detector.yml` | WR stuck detection |
| `docs/playbooks/wr-novice-playbook.md` | End-to-end WR guide for novice users |
| `docs/playbooks/wr-manual-processes.md` | Every manual process with caveats |
| `docs/playbooks/branch-update-guide.md` | Pros/cons of updating branches from main |

---

## Contributing

To add new healing actions:

1. Add detection logic to detection layer
2. Add healing steps to healing layer
3. Update escalation thresholds in Ralph Loop
4. Document in this file
5. Add tests in `tests/self-healing.test.js`

---

**Last Updated:** 2026-06-15  
**Maintained By:** Self-Healing Team (automated)
