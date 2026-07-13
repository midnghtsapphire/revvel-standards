# Needs Action Router — Process Documentation

**Version:** 1.0.0  
**Status:** Active  
**Owner:** @midnghtsapphire  
**Created:** 2026-05-03

---

## Overview

The **Needs Action Router** is a GitHub Actions workflow that automatically routes issues and PRs to the OpenRouter orchestrator when they receive the `needs-action` label. This ensures items requiring immediate attention are picked up by the autonomous agent system without manual intervention.

---

## Purpose

When an item is tagged with `needs-action`, it signals that:
- The item requires immediate processing
- Manual triage has determined action is needed
- The item should be escalated to automated agents

The Needs Action Router immediately:
1. Assigns the item to `@Copilot` (representing the OpenRouter orchestrator)
2. Applies routing labels for automated processing
3. Posts an informative comment explaining the routing
4. Removes the `needs-action` label (routing complete)

---

## How It Works

### Trigger Conditions

The workflow triggers when:
- The `needs-action` label is **applied** to an issue
- The `needs-action` label is **applied** to a pull request
- Manual workflow dispatch (for testing or re-routing)

### Automatic Actions

**Step 1: Validation**
- Verifies the item has the `needs-action` label
- Checks if item already has an assignee (skip assignment if yes)
- Checks if item already has `openrouter` label (skip if yes)

**Step 2: Assignment**
- Assigns the item to `@Copilot` (if not already assigned)
- Note: `@Copilot` is a GitHub user account representing the OpenRouter orchestrator

**Step 3: Label Management**
- Applies routing labels:
  - `openrouter` — First line of sight
  - `auto-fix` — Eligible for automated fixes
  - `copilot` — Tracked by Ralph Loop
  - `role:orchestrator` — Primary role assignment
- Removes `needs-action` label (routing complete)

**Step 4: Notification**
- Posts a routing comment explaining:
  - What triggered the routing
  - What will happen next
  - How to opt out if needed
  - Links to relevant documentation

---

## Label Definitions

### `needs-action`
- **Color:** `#fbca04` (yellow-orange)
- **Description:** "Requires immediate action — auto-route to OpenRouter"
- **Lifecycle:** Applied manually or by automation → Removed after routing
- **Purpose:** Trigger for immediate OpenRouter assignment

### Applied Routing Labels

All routing labels are defined in `.github/labels.yml` and applied automatically:

| Label | Purpose |
|-------|---------|
| `openrouter` | Marks item as routed to OpenRouter orchestrator |
| `auto-fix` | Indicates item is eligible for automated fixes |
| `copilot` | Tracked by the Ralph Loop self-healing workflow |
| `role:orchestrator` | Primary role is orchestrator (not fixer) |

---

## Usage Examples

### Example 1: Manual Escalation

**Scenario:** A human triager reviews an issue and determines it needs immediate action.

**Action:**
```bash
# Using GitHub CLI
gh issue edit 123 --add-label "needs-action"

# Or via GitHub UI
# Click "Labels" → Select "needs-action"
```

**Result:**
- Workflow triggers automatically
- Issue is assigned to `@Copilot`
- Routing labels applied
- Comment posted explaining next steps
- `needs-action` label removed

### Example 2: Automated Escalation

**Scenario:** The stuck-label-automation workflow detects an item stuck in `triage:in-progress` for >4 hours.

**Automation:**
```yaml
# In stuck-label-automation.yml
- name: Escalate stuck triage
  run: |
    gh issue edit $ISSUE_NUMBER --add-label "needs-action"
```

**Result:** Same as Example 1 — immediate routing to OpenRouter

### Example 3: Manual Workflow Dispatch

**Scenario:** Testing the router or re-routing an item.

**Action:**
```bash
# Using GitHub CLI
gh workflow run needs-action-router.yml -f issue_number=123

# Using GitHub Actions UI
# Actions → Needs Action Router → Run workflow
# Enter issue number: 123
```

**Result:** Same routing flow, even if label was already removed

---

## Integration with Other Workflows

### OpenRouter Assignee
- **Relationship:** Complementary workflows
- **OpenRouter Assignee:** Runs hourly cron sweep for *all* unassigned items
- **Needs Action Router:** Immediate response to `needs-action` label
- **Overlap:** Both assign to `@Copilot` and apply routing labels
- **Conflict Prevention:** Both check for existing assignment/labels before acting

### Stuck Label Automation
- **Relationship:** Escalation path
- **Stuck Label Automation:** Detects labels stuck beyond timeout thresholds
- **Needs Action Router:** Processes escalated items
- **Flow:** Stuck item → Add `needs-action` label → Trigger Needs Action Router → Route to OpenRouter

### OpenRouter Triage
- **Relationship:** Sequential processing
- **Needs Action Router:** Routes item to OpenRouter (adds `openrouter` label)
- **OpenRouter Triage:** Triggered by `openrouter` label, analyzes and routes further
- **Flow:** `needs-action` → Assign to OpenRouter → Triage → Specialist agent assignment

### Ralph Loop
- **Relationship:** Self-healing integration
- **Needs Action Router:** Applies `copilot` and `auto-fix` labels
- **Ralph Loop:** Monitors all items with these labels for failures
- **Flow:** If automated fix fails, Ralph Loop escalates with `needs-human` label

---

## Workflow Configuration

### File Location
`.github/workflows/needs-action-router.yml`

### Permissions Required
```yaml
permissions:
  issues: write
  pull-requests: write
  contents: read
```

### Concurrency Control
```yaml
concurrency:
  group: needs-action-router-${{ github.event.issue.number }}
  cancel-in-progress: false
```

Ensures only one routing operation per item runs at a time, preventing race conditions.

### Dry Run Mode

Test the workflow without making changes:
```bash
gh workflow run needs-action-router.yml \
  -f issue_number=123 \
  -f dry_run=true
```

Dry run mode will:
- Log what would be changed
- Not assign, label, or comment
- Generate summary showing planned actions

---

## Monitoring & Debugging

### Check Workflow Runs
```bash
# List recent runs
gh run list --workflow=needs-action-router.yml --limit 10

# View specific run
gh run view <run-id> --log
```

### Common Issues

**Issue:** Label applied but workflow didn't trigger
- **Check:** Workflow file syntax: `yamllint needs-action-router.yml`
- **Check:** GitHub Actions enabled in repo settings
- **Check:** Permissions configured correctly

**Issue:** Workflow triggered but assignment failed
- **Cause:** `@Copilot` user doesn't exist or lacks permissions
- **Solution:** Verify `@Copilot` account exists and is a repo collaborator

**Issue:** Routing labels not applied
- **Cause:** Labels don't exist in the repository
- **Solution:** Run `sync-labels.yml` to create all labels from `.github/labels.yml`

**Issue:** Duplicate routing comments
- **Cause:** Workflow ran multiple times
- **Mitigation:** Workflow checks for existing comment before posting
- **If it happens:** Safe to ignore, duplicate detection should prevent this

---

## Opting Out of Automated Routing

If an item should **not** be processed by OpenRouter after receiving `needs-action`:

**Before routing completes:**
Remove the `needs-action` label immediately:
```bash
gh issue edit 123 --remove-label "needs-action"
```

**After routing completes:**
Remove the `openrouter` label:
```bash
gh issue edit 123 --remove-label "openrouter"
```

This will:
- Prevent OpenRouter triage from processing the item
- Stop the Ralph Loop from monitoring it
- Require manual processing instead

---

## Success Metrics

### Routing Effectiveness
- **Response time:** Time from `needs-action` applied to routing complete
- **Target:** < 2 minutes
- **Actual:** Typically 30-60 seconds

### Coverage
- **Percentage of items routed within 5 minutes:** Target 100%
- **Percentage requiring manual intervention:** Target < 5%

### Reliability
- **Workflow success rate:** Target > 99%
- **Duplicate routing rate:** Target < 1%

---

## Related Workflows

| Workflow | File | Purpose |
|----------|------|---------|
| OpenRouter Assignee | `openrouter-assignee.yml` | Hourly cron sweep for all unassigned items |
| OpenRouter Triage | `openrouter-triage.yml` | Analyzes and routes to specialist agents |
| Stuck Label Automation | `stuck-label-automation.yml` | Detects stuck labels and escalates |
| Ralph Loop | `ralph-loop.yml` | Self-healing for PR CI failures |
| Priority Router | `priority-router.yml` | Assigns priority labels |

---

## Related Documentation

- **OpenRouter Assignee Process:** [`docs/OPENROUTER_ASSIGNEE_PROCESS.md`](./OPENROUTER_ASSIGNEE_PROCESS.md)
- **Workflow State Machine:** [`docs/WORKFLOW_STATE_MACHINE.md`](./WORKFLOW_STATE_MACHINE.md)
- **Automation Routing Policy:** [`docs/OPENROUTER_TRIAGE_PROCESS.md`](./OPENROUTER_TRIAGE_PROCESS.md)
- **OpenRouter Swarms Skill:** [`skills/openrouter-swarms/SKILL.md`](../skills/openrouter-swarms/SKILL.md)
- **Agent Rules:** [`docs/AGENTS.md`](./AGENTS.md)

---

## Testing

### Manual Test

1. **Create test issue:**
   ```bash
   gh issue create \
     --title "Test: Needs Action Router" \
     --body "Testing automatic routing on needs-action label" \
     --label "test"
   ```

2. **Apply needs-action label:**
   ```bash
   gh issue edit <issue-number> --add-label "needs-action"
   ```

3. **Verify routing:**
   - Check issue is assigned to `@Copilot`
   - Verify routing labels applied
   - Confirm `needs-action` label removed
   - Check routing comment posted

4. **Clean up:**
   ```bash
   gh issue close <issue-number>
   ```

### Automated Test

Add to CI pipeline:
```yaml
- name: Test needs-action router
  run: |
    ISSUE=$(gh issue create --title "Test" --body "Test" --label "test" --json number -q .number)
    gh issue edit $ISSUE --add-label "needs-action"
    sleep 60  # Wait for workflow
    ASSIGNEES=$(gh issue view $ISSUE --json assignees -q '.assignees[].login')
    [[ "$ASSIGNEES" == *"Copilot"* ]] || exit 1
    gh issue close $ISSUE
```

---

## Changelog

### 2026-05-03 — v1.0.0
- Initial implementation of Needs Action Router workflow
- Created `.github/workflows/needs-action-router.yml`
- Added `needs-action` label to `.github/labels.yml`
- Documented process in this file
- Integrated with OpenRouter assignee and triage workflows

---

## Future Enhancements

### Planned Features
- [ ] Priority-based routing (P0 items get immediate attention)
- [ ] Skill-specific routing (route to Jules/Codex/49Agents based on item type)
- [ ] Metrics dashboard (routing performance, success rate, time to action)
- [ ] Slack/Discord notifications when high-priority items are routed
- [ ] Auto-retry if initial routing fails

### Under Consideration
- [ ] Smart routing based on issue content (ML classification)
- [ ] Load balancing across multiple OpenRouter instances
- [ ] Time-based routing (after-hours items queued for next business day)
- [ ] Bidirectional sync with external project management tools

---

**Document Status:** ✅ Complete  
**Workflow Status:** 🟢 Active  
**Last Updated:** 2026-05-03
