# Standard: Comment, Don't Delete — Agent Audit Trail

**Standard ID:** RVS-AGENT-001  
**Status:** ACTIVE  
**Author:** Audrey Evans (@midnghtsapphire)  
**Created:** 2026-05-06  
**Last updated:** 2026-05-06  
**Applies to:** All Revvel repos — all agents (OpenHands, Copilot, SWE-agent, Cursor, any LLM-powered tool)

---

## The Rule

**Agents MUST NOT delete code. They MUST comment it out.**

Every removal, replacement, or disabling of existing code by any agent or human contributor must be preserved in-place as a structured comment block. This is non-negotiable across all Revvel repositories.

---

## Why

Agents — especially OpenHands — have a pattern of commenting out or deleting code silently to get a build to pass or a test to merge. Without a record, this creates:

- Lost context on why something was tried
- No way to know which tool failed and why
- No audit trail for debugging regressions
- No metrics on agent reliability by tool/model
- No signal for when to jump in manually

Commented-out code with a structured header turns every agent action into a **reviewable, queryable audit log** embedded directly in the codebase.

---

## Required Comment Format

Every commented-out block must include a structured header. Templates by language:

### TypeScript / JavaScript

```typescript
// ============================================================
// REVVEL-DISABLED
// Author:      <agent-name or github-username>
// Date:        YYYY-MM-DD
// WR / Issue:  #<issue-number> (link if available)
// Tool:        <OpenHands | Copilot | SWE-agent | Cursor | Human>
// Model:       <claude-3.7-sonnet | gpt-5.2 | deepseek-v3.2 | etc>
// Reason:      <why this was disabled — be specific>
// Status:      <FAILED | BYPASSED | REPLACED | PENDING-REVIEW>
// Replaced by: <what replaced it, or "nothing yet">
// ============================================================
// <original code here, indented one level>
// ============================================================
```

### Python

```python
# ============================================================
# REVVEL-DISABLED
# Author:      <agent-name or github-username>
# Date:        YYYY-MM-DD
# WR / Issue:  #<issue-number>
# Tool:        <OpenHands | Copilot | SWE-agent | Cursor | Human>
# Model:       <model-name>
# Reason:      <specific reason>
# Status:      <FAILED | BYPASSED | REPLACED | PENDING-REVIEW>
# Replaced by: <replacement or "nothing yet">
# ============================================================
# <original code>
# ============================================================
```

### CSS / SCSS

```css
/* ============================================================
   REVVEL-DISABLED
   Author:      <agent or username>
   Date:        YYYY-MM-DD
   WR / Issue:  #<number>
   Tool:        <tool>
   Model:       <model>
   Reason:      <reason>
   Status:      <FAILED | BYPASSED | REPLACED | PENDING-REVIEW>
   Replaced by: <replacement or "nothing yet">
   ============================================================
   <original css>
   ============================================================ */
```

### YAML / GitHub Actions

```yaml
# ============================================================
# REVVEL-DISABLED
# Author:      <agent or username>
# Date:        YYYY-MM-DD
# WR / Issue:  #<number>
# Tool:        <tool>
# Model:       <model>
# Reason:      <reason>
# Status:      <FAILED | BYPASSED | REPLACED | PENDING-REVIEW>
# Replaced by: <replacement or "nothing yet">
# ============================================================
# <original yaml lines>
# ============================================================
```

### JSON (use a `_disabled` key wrapper — JSON has no comments)

```json
{
  "_REVVEL_DISABLED": {
    "author": "<agent or username>",
    "date": "YYYY-MM-DD",
    "wr_issue": "#<number>",
    "tool": "<tool>",
    "model": "<model>",
    "reason": "<reason>",
    "status": "FAILED | BYPASSED | REPLACED | PENDING-REVIEW",
    "replaced_by": "<replacement or null>",
    "original": { }
  }
}
```

---

## Status Values

| Status | Meaning |
|---|---|
| `FAILED` | Agent tried this, it didn't work — specific error in Reason |
| `BYPASSED` | Commented out to unblock a merge, needs proper fix |
| `REPLACED` | Superseded by the code immediately below/above this block |
| `PENDING-REVIEW` | Human needs to evaluate before deciding to keep or delete |

---

## Real Example

Before (what OpenHands was doing — silent removal):

```typescript
// (nothing — the original auth middleware just vanished)
export const authenticate = async (req, res, next) => {
  // new simplified version
  next();
};
```

After (what this standard requires):

```typescript
// ============================================================
// REVVEL-DISABLED
// Author:      openhands-agent
// Date:        2026-05-06
// WR / Issue:  #4821
// Tool:        OpenHands
// Model:       claude-3.7-sonnet
// Reason:      JWT verify was throwing "invalid signature" on all requests.
//              Root cause unknown. Commented out to unblock PR merge.
//              Full auth bypassed — NOT SAFE FOR PRODUCTION.
// Status:      BYPASSED
// Replaced by: Passthrough stub below — needs real fix
// ============================================================
// export const authenticate = async (req, res, next) => {
//   const token = req.headers.authorization?.split(' ')[1];
//   if (!token) return res.status(401).json({ error: 'No token' });
//   const payload = jwt.verify(token, process.env.JWT_SECRET);
//   req.user = payload;
//   next();
// };
// ============================================================

// STUB — replace with fixed auth above after root cause found
export const authenticate = async (req, res, next) => {
  next();
};
```

Now you know: what broke, which agent did it, which model, which WR, and that production auth is bypassed.

---

## Enforcement

### Pre-commit hook (local)

Add to `.pre-commit-config.yaml`:

```yaml
- repo: local
  hooks:
    - id: revvel-no-silent-delete
      name: Check for REVVEL-DISABLED headers on commented blocks
      language: python
      entry: python scripts/check-revvel-disabled.py
      types: [text]
      exclude: '^(node_modules|dist|build|\.git)/'
```

### PR review check (GitHub Actions)

See `standards/audit-trail-check.yml` — the workflow scans the PR diff for large comment blocks missing a `REVVEL-DISABLED` header and posts a warning comment.

### Agent instruction injection

Add to `.openhands/microagent/repo.md` and to any Cursor rules / Copilot instructions file:

```
CRITICAL: Never delete existing code. If you must disable, comment it out with a
REVVEL-DISABLED header block. Include: your agent name, date, WR/issue number,
your model name, specific reason it was disabled, and status (FAILED/BYPASSED/REPLACED).
See standards/COMMENT-DONT-DELETE.md for the required format.
```

---

## Metrics This Enables

Because every disabled block has a structured header, you can now query the codebase as a database:

```bash
# How many things did OpenHands bypass this month?
grep -r 'Tool:.*OpenHands' . | grep 'Status:.*BYPASSED' | wc -l

# What did claude-3.7-sonnet fail at?
grep -r 'Model:.*claude-3.7-sonnet' . -A5 | grep 'Reason:'

# Everything still pending human review
grep -r 'Status:.*PENDING-REVIEW' . --include='*.ts' -l

# Full audit trail for a specific WR
grep -r 'WR / Issue:.*#4821' . -A20
```

This gives you agent performance metrics, failure pattern analysis, and a full audit trail — all from `grep`.

---

## Cleanup

Disabled blocks are **not permanent**. Once the issue is resolved:

1. If the fix is confirmed working → delete the `REVVEL-DISABLED` block entirely
2. If the disabled code is permanently replaced → delete the block, note in PR description
3. If still unresolved after 30 days → flag as `PENDING-REVIEW` and open a new WR

**Never leave a `BYPASSED` block in production without a follow-up WR tracking the real fix.**

---

## Related Standards

- `standards/AGENT-ROUTING.md` — which agent gets which task
- `standards/WR-TEMPLATE.md` — work request format
- `AGENT-DEPLOY-ONEFILE_Guardrails.md` — agent guardrails (root-level)
- `.openhands/microagent/repo.md` — OpenHands-specific instructions
