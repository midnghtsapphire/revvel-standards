# Self-Healing Standards Protocol

**Version:** 1.0.0  
**Date:** 2026-05-06  
**Status:** Active  
**Owner:** Audrey Evans (MIDNGHTSAPPHIRE)

---

## 1. Why This Exists

Standards must self-heal. Every time we fix a problem, update a workflow, or discover a better way, we document it **in the standards themselves**. This keeps the system transparent and continuously improving.

---

## 2. The Protocol

### 2.1 When You Make a Change to a Workflow or Standard

For ANY change to a `.yml` workflow or `.md` standard file:

| Field | Required | Example |
|-------|----------|---------|
| **Who** | ✅ | Audrey Evans (midnghtsapphire) |
| **When** | ✅ | 2026-05-06 |
| **Why** | ✅ | Removed false positive check for torrents/pirate bay - legitimate content in docs |
| **What** | ✅ | Removed only torrent/pirate bay check, preserving all other checks |
| **What Worked** | If applicable | Check passed after removal |
| **Notes** | Optional | Any follow-up needed |

### 2.2 Document in the File Header

At the TOP of every modified workflow or standard file:

```yaml
# ═══════════════════════════════════════════════════════════════════════════════════════
# WORKFLOW_NAME or STANDARD_NAME
# Who: [username]
# When: YYYY-MM-DD
# Why: [reason]
# What: [change]
# What Worked: [result] (optional)
# Notes: [follow-up] (optional)
# ═══════════════════════════════════════════════════════════════════════════════════════
```

### 2.3 Document in Git Commit

```
fix(workflow-name): [one-line summary]

- Who: [username]
- When: YYYY-MM-DD
- Why: [reason]
- What: [change]
- What Worked: [result] (optional)
```

---

## 3. Examples

### Example 1: Anti-Scaffolding Fix

```yaml
# ═══════════════════════════════════════════════════════════════════════════════════════
# ANTI-SCAFFOLDING ENFORCER
# Who: Audrey Evans (midnghtsapphire)
# When: 2026-05-06
# Why: Removed false positive check for torrents/pirate bay - legitimate content in docs
# What: Removed only torrent/pirate bay check, preserving all other checks
# NOTE: Workflow kept active - only removed one false positive pattern
# ═══════════════════════════════════════════════════════════════════════════════════════
```

### Example 2: New Integration

```yaml
# ═══════════════════════════════════════════════════════════════════════════════════════
# FIGMA TO PDF EXPORT WORKFLOW
# Who: Claude (openhands agent)
# When: 2026-05-06
# Why: Needed Figma-to-PDF capability for client deliverables
# What: Created new workflow using Figma CLI + REST API
# What Worked: Successfully exports designs to PDF
# Notes: Requires FIGMA_API_KEY secret in repo
# ═══════════════════════════════════════════════════════════════════════════════════════
```

### Example 3: Standard Update

```yaml
# CODE REVIEW STANDARD
# Version: 2.0.0
# Who: Audrey Evans
# When: 2026-05-06
# Why: Bito AI is now primary reviewer - previous PandaOps deprecated
# What: Updated primary to Bito AI, fallbacks to OpenRouter models
# What Worked: All PRs now reviewed by Bito within minutes
# ═══════════════════════════════════════════════════════════════════════════════════════
```

---

## 4. What NOT To Do

- ❌ Never delete a workflow - comment it out with documentation
- ❌ Never delete a standard - mark deprecated instead
- ❌ Never make undocumented changes
- ❌ Never remove Who/When/Why from headers
- ❌ Never skip commit messages with proper attribution

---

## 5. Standards to Always Keep Updated

| Standard | When to Update |
|----------|----------------|
| `.github/workflows/*.yml` | Any workflow change |
| `AGENTS.md` | New skills, tools, or processes |
| `standards/code-review.md` | New code review tools |
| `CREDENTIAL_AUDIT_SYSTEM.md` | New credentials or rotation |
| `AUTOMATED_PRODUCT_PIPELINE.md` | New output types or deployment |
| `standards/*.md` | Any integration or process change |

---

## 6. Self-Healing Triggers

The system auto-updates when:

1. **Workflow Fix Applied** → Document in header + commit message
2. **New Skill Added** → Update AGENTS.md + skill README
3. **Integration Changed** → Update relevant standard
4. **Process Improved** → Update process documentation
5. **Issue Fixed** → Document solution in relevant standard

---

## 7A. Failure Notification Protocol

> **Added:** 2026-05-06  
> **Who:** Claude (openhands)  
> **Why:** Account for every failure with notification, not block

### 7A.1 When Things Fail

When a workflow, automation, or process **fails but shouldn't block**:

| Scenario | Action | Notification |
|----------|--------|--------------|
| Non-critical check fails | Continue anyway | Notify in PR comment |
| Required credential missing | Continue with fallback | Label `credentials-missing` |
| Optional workflow fails | Skip, don't block | Log failure, proceed |
| Automation timeout | Retry with backoff | Alert to channel |

### 7A.2 Notification Rules

✅ **DO:**
- Alert failures to appropriate channel (Slack, PR comment, etc.)
- Include context: what failed, why, what tried
- Add `credentials-missing` or `fix-me` label
- Log in running conversation

❌ **DON'T:**
- Block the entire PR/issue just because one check fails
- Stop everything for optional dependencies
- Leave failures unacknowledged

### 7A.3 Example: Credential Missing

```yaml
# Before blocking:
if [ -z "$OPENROUTER_API_KEY" ]; then
  echo "⚠️ OPENROUTER_API_KEY not set - using fallback"
  # Continue with alternative, don't block
fi

# Notify (not block):
gh issue comment $ISSUE_NUMBER --body "⚠️ Missing OPENROUTER_API_KEY - proceeding with fallback"
```

### 7A.4 Comment-Out vs Delete (Always Comment-Out)

When disabling a workflow or check:

1. **Comment it out** with full documentation header
2. **Never delete** - always preserve for history

```yaml
# ═══════════════════════════════════════════════════════════════════════════════════════
# DISABLED WORKFLOW: OLD_CHECK
# Who: [username]
# When: YYYY-MM-DD
# Why: [reason for disabling]
# What: [what was disabled]
# Alternative: [what now runs instead]
# NOTE: Keeping for history - do not delete
# ═══════════════════════════════════════════════════════════════════════════════════════

# name: Old Check (commented out - see header)
# on: [pull_request]
```

---

## 7B. Notification Channels

| Failure Type | Channel | Priority |
|--------------|---------|----------|
| Credential missing | PR comment + `credentials-missing` label | Medium |
| Workflow timeout | PR comment + retry | Low |
| Required check fails | PR comment + block | High |
| Optional check fails | PR comment only | Low |
| Security issue | All channels + `security` label | Critical |

---

## 7C. Auto-Close Completed Issues

> **Added:** 2026-05-06  
> **Who:** Claude (openhands)  
> **Why:** Issues marked "completed" but left open should auto-close

When an issue body or label contains "completed": auto-close.

## 8. Verification

All changes should:
- Have Who/When/Why in file header
- Have proper commit message
- Pass all required checks
- Be transparent to team members

---

## 9. Related

- `AGENTS.md` - Agent instructions and skills
- `.github/ISSUE_TEMPLATE/00-work-request.md` - WR process
- `docs/agent-stack/AGENT_STACK_SETUP.md` - Agent stack setup