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
| `CODE_REVIEW_STANDARD.md` | New code review tools |
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

---

## 10. Known Failure Modes & Auto-Remediations (Runbook)

> **Added:** 2026-06-17 · **Who:** Claude (controller-auditor pass) · **Why:**
> Capture "what to do if it happens again" for the recurring failures fixed in
> the WR/PR pipeline audit, so the next occurrence auto-recovers or is surfaced
> with an exact fix instead of silently breaking CI.

### 10.1 Invalid workflow YAML breaks repo-wide `Workflow Lint`

- **Symptom:** `Workflow Lint` (and CircleCI lint) fail on *every* PR, often
  pointing at a file the PR never touched. Root cause is almost always a
  `github-script` body whose multi-line template literal was written
  **flush-left (column 1)**, terminating the `script: |` block scalar.
- **Auto-detection:** `scripts/check-workflow-yaml.js` runs inside the daily
  **Repo Self-Healer** (`checkWorkflowHealth()`); on any invalid file it files a
  deduped `[SELF-HEAL] Invalid workflow YAML…` issue (label `auto-error`,
  `needs-human`, `ci`) listing each file + parse error. Also runnable as a CI
  gate: `node scripts/check-workflow-yaml.js` (exit 1 if any invalid).
- **Fix:** keep github-script bodies indented inside the block; build multi-line
  strings as an indented array joined with `\n`:
  ```js
  body: [
    `## Title`,
    ``,
    `**Field:** ${value}`,
  ].join('\n')
  ```
  Never write template-literal continuation lines at column 0.

### 10.2 WR PRs stuck because generated docs ship raw `{TOKEN}`s

- **Symptom:** `[WR]` PRs from `wr-pr-creation.yml` sit with `review:stuck`;
  `wr-lint` reports "unsubstituted generator token `{STARS}` / `{OPEN_ISSUES}` /
  …" or "product section in a bug WR".
- **Auto-remediation:** `wr-pr-creation.yml` substitutes the template's real
  tokens, then catch-alls any remaining `{TOKEN}` → `N/A`, and classifies
  fix/bug titles to `WR_TEMPLATE_BASIC.md`. The canonical generator
  `wr/scripts/generate-wr.sh` does the same and lint-gates its own output.
- **Fix if it recurs:** ensure any new template token is either added to the
  substitution map or covered by the `re.sub(r"\{[A-Z_]+\}", …)` catch-all, and
  that fix/bug WRs use the BASIC template. Re-run the generator via
  `workflow_dispatch` to refresh already-open WR PRs.

### 10.3 Auto-generated `[FAILURE]` issue spam

- **Symptom:** Thousands of duplicate `[FAILURE] <workflow> failed` issues.
- **Auto-remediation:** failure-issue creators (e.g. `workflow-monitor.yml`)
  dedup on title prefix; `agent-audit-logger.yml` no longer commits to `main`
  on every event. Bulk cleanup: run the **Bulk Close Failure Spam** workflow
  (dry-run first) or close issues labeled `workflow-failure`+`auto-fix` with a
  `[FAILURE]` title authored by a bot.
- **Fix if it recurs:** confirm the creating workflow checks for an existing
  open issue before `issues.create`, and that any hourly cron has backoff.

### 10.4 `semgrep` ERROR gate fails on `detect-child-process` (command injection)

- **Symptom:** the repo-wide **`semgrep`** check fails on every PR. The blocking
  gate in `.github/workflows/semgrep.yml` runs
  `semgrep scan --config=p/secrets --config=p/security-audit --severity=ERROR --error`,
  so any ERROR-severity finding from those packs fails the job. The usual culprit
  is `javascript.lang.security.detect-child-process` — "Detected calls to
  child_process from a function argument `X`".
- **Why it triggers:** the rule flags **any** `child_process` call whose argument
  is not a string literal — even shell-free `execFileSync`/`spawnSync` with argv
  arrays. So it fires on both genuinely-unsafe shell interpolation *and* already-safe
  calls.
- **Fix (remove the real risk first):**
  1. Never build a shell command by interpolating variables
     (`execSync(\`curl "${url}"\`)`). Use `execFileSync`/`spawnSync` with an
     **argv array** and no shell: `execFileSync('curl', ['-sL', url, '--max-time', '30'])`.
  2. Pass secrets via **stdin** (`{ input: value }`), never `echo "$value" | …`,
     so they never appear on a command line.
  3. **Validate** any value used as an argument name/identifier
     (e.g. secret name `^[A-Za-z_][A-Za-z0-9_]*$`).
  4. For a call that is now shell-free and reviewed but still flagged, add a
     **scoped** suppression on the line (or the line above) with a justification:
     `// nosemgrep: javascript.lang.security.detect-child-process.detect-child-process -- arg array (no shell); inputs validated`.
     Never blanket-suppress without first removing the shell.
- **Reference:** the 2026-06-17 hardening of `scripts/auto-credential-fetcher.js`,
  `scripts/openrouter-triage.js`, and `scripts/credential-autonomy-agent.js`.

### 10.5 "Invalid workflow file" — startup_failure (0s, no jobs)

- **Symptom:** a workflow run shows **Failure, duration 0s, no jobs**, often with
  `event: push` even when the file has no `push` trigger. That is GitHub's
  signature for rejecting a workflow at parse/validation time — it fails on
  **every push** and is invisible to plain YAML linting (the file is valid YAML
  but invalid against the Actions schema).
- **Most common cause:** the **`workflow_run`** event is declared **without the
  required `workflows:` list**. Other causes: bad `on:`/expression syntax, an
  invalid `needs:`/`if:` expression.
- **Auto-detection (real fix):** `scripts/check-workflow-yaml.js` now performs an
  Actions-**schema** check (not just YAML validity), starting with
  `workflow_run`-without-`workflows`. It runs in **two** places from one source
  of truth:
  - **Prevention** — wired into the CI **Workflow Lint** job
    (`ci-error-prevention.yml`), so a new invalid file is blocked at PR time.
  - **Detection** — the daily **Repo Self-Healer** (`checkWorkflowHealth()`)
    files a deduped `[SELF-HEAL] Invalid workflow YAML` issue with the fix.
- **Fix:** add `workflows: [<workflow names>]` under `workflow_run`, or — if the
  trigger is redundant (e.g. `check_suite: completed` already covers it) —
  comment out the trigger with a documented header (§2.2 / §7A.4).
- **Reference:** the 2026-06-17 repair of `.github/workflows/pr-check-status.yml`.

### 10.6 Reprocess PR status labels during self-heal

- **Why:** the PR State Orchestrator sets `status:*` labels from events. If an
  event is missed or a label workflow was broken (e.g. the `pr-check-status` /
  `workflow_run` outages above), PRs can keep stale or contradictory labels
  (the classic `status:ready-to-merge` + stuck combo).
- **Real fix:** `self-heal-repo.js` `reprocessPRLabels()` re-derives every open
  PR's state from scratch each run — draft → review decisions → CI check-runs —
  and converges the `status:*` labels, mirroring the orchestrator's
  `resync-all-prs` rules. Crucially it only keeps `status:ready-to-merge` when a
  PR is **both approved and passing**, so the contradiction self-corrects.
- **Requires:** `checks: read` on the self-healer token and
  `scripts/check-workflow-yaml.js` in its sparse-checkout (both added 2026-06-17).