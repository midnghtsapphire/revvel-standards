# Skill: Ralph Loop — Self-Healing Error Recovery

**Skill Name:** `ralph-loop`
**Version:** 1.0.0
**Date:** April 15, 2026
**Status:** Beta
**Category:** DevOps & Automation
**LLM:** Claude Sonnet 4 (primary)
**Type:** Ephemeral — triggers on CI failure, loops until resolved or escalated
**Persona:** None (automated loop)

---

## Purpose

The **Ralph Loop** is an automated self-healing pattern: when a CI check, test, or PR merge fails, Ralph immediately triggers `@copilot` via a comment and blocks the merge. If the error persists after the fix attempt, Ralph calls again — and again — until the PR is auto-merged or escalated to a human.

**Issue reference:** GitHub Issue #31 — *"Need a trigger or action to occur that when there is an error it generates a comment to @copilot won't merge errors need fix. And if the error is still there next round then gets called again...and again until it automerges."*

Named after the loop pattern: **R**etry → **A**nalyze → **L**og → **P**atch → re-c**H**eck.

---

## What This Skill Does

| Task | Description |
|---|---|
| **Error detection** | Watches CI checks, PR status, and merge gates for failures |
| **Copilot trigger** | Posts a `@copilot` comment with the error details on failure |
| **Merge block** | Adds `won't-merge` label to prevent merge while error exists |
| **Loop retry** | Re-triggers on every subsequent commit push until error is resolved |
| **Auto-merge** | Removes `won't-merge` label and approves merge once all checks pass |
| **Escalation** | After `max_retries`, escalates to human with `needs-human` label |

---

## Trigger Keywords

```text
ralph loop, self-healing, auto-fix, won't merge, merge blocked,
ci failed, check failed, error loop, auto retry, copilot fix,
fix and retry, error recovery, loop until fixed
```

---

## The Ralph Loop Workflow

```text
CI check fails on PR
│
├─→ Ralph creates comment: "@copilot [error details] — please fix"
│   Ralph adds label: "won't-merge" + "auto-fix"
│   Ralph assigns: @copilot
│
├─→ @copilot makes fix commit
│
├─→ CI runs again
│   ├── PASS → Ralph removes "won't-merge", approves merge → AUTO-MERGE ✅
│   └── FAIL → Loop count +1
│               ├── Under max_retries → Go back to Ralph comment step
│               └── Over max_retries → Add "needs-human" label, notify owner
```

---

## GitHub Actions Implementation

Add this workflow to any repository to enable the Ralph Loop:

```yaml
# .github/workflows/ralph-loop.yml
name: Ralph Loop — Self-Healing CI

on:
  check_suite:
    types: [completed]
  pull_request:
    types: [opened, synchronize, reopened]
  workflow_run:
    workflows: ["*"]
    types: [completed]

jobs:
  ralph-loop:
    runs-on: ubuntu-latest
    if: |
      github.event.check_suite.conclusion == 'failure' ||
      github.event.workflow_run.conclusion == 'failure'
    permissions:
      pull-requests: write
      issues: write
      contents: read

    steps:
      - name: Get failing PR
        id: get-pr
        uses: actions/github-script@v8
        with:
          script: |
            const prs = await github.rest.pulls.list({
              owner: context.repo.owner,
              repo: context.repo.repo,
              state: 'open',
              head: context.payload.check_suite?.head_sha || 
                    context.payload.workflow_run?.head_sha
            });
            return prs.data[0]?.number || null;

      - name: Check retry count
        id: retry-count
        if: steps.get-pr.outputs.result != 'null'
        uses: actions/github-script@v8
        with:
          script: |
            const pr_number = ${{ steps.get-pr.outputs.result }};
            const comments = await github.rest.issues.listComments({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: pr_number
            });
            const ralph_comments = comments.data.filter(c => 
              c.body.includes('🔄 Ralph Loop')
            );
            return ralph_comments.length;

      - name: Trigger Copilot fix (Ralph comment)
        if: |
          steps.get-pr.outputs.result != 'null' &&
          steps.retry-count.outputs.result < 5
        uses: actions/github-script@v8
        with:
          script: |
            const pr_number = ${{ steps.get-pr.outputs.result }};
            const retry = ${{ steps.retry-count.outputs.result }};
            const conclusion = context.payload.check_suite?.conclusion || 
                              context.payload.workflow_run?.conclusion;
            const workflow = context.payload.check_suite?.app?.name || 
                            context.payload.workflow_run?.name || 'CI';

            // Post @copilot trigger comment
            await github.rest.issues.createComment({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: pr_number,
              body: `🔄 **Ralph Loop** — Attempt ${retry + 1}/5\n\n` +
                    `@copilot The \`${workflow}\` check failed with status: \`${conclusion}\`.\n\n` +
                    `Please analyze the failure, make the minimum change required to fix it, ` +
                    `and push a commit. Do **not** merge until all checks pass.\n\n` +
                    `> ⛔ This PR is blocked from merging until all CI checks pass.`
            });

            // Add blocking labels
            await github.rest.issues.addLabels({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: pr_number,
              labels: ["won't-merge", "auto-fix", "copilot"]
            });

      - name: Escalate to human (max retries exceeded)
        if: |
          steps.get-pr.outputs.result != 'null' &&
          steps.retry-count.outputs.result >= 5
        uses: actions/github-script@v8
        with:
          script: |
            const pr_number = ${{ steps.get-pr.outputs.result }};
            await github.rest.issues.createComment({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: pr_number,
              body: `⚠️ **Ralph Loop — Escalation Required**\n\n` +
                    `This PR has failed 5 consecutive auto-fix attempts. ` +
                    `Human review is required.\n\n` +
                    `@midnghtsapphire Please review this PR manually.`
            });
            await github.rest.issues.addLabels({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: pr_number,
              labels: ["needs-human", "blocked"]
            });
            await github.rest.issues.removeLabel({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: pr_number,
              name: "auto-fix"
            }).catch(() => {});

  auto-merge-on-pass:
    runs-on: ubuntu-latest
    if: |
      github.event.check_suite.conclusion == 'success' ||
      github.event.workflow_run.conclusion == 'success'
    permissions:
      pull-requests: write
      contents: write

    steps:
      - name: Remove won't-merge label on CI pass
        uses: actions/github-script@v8
        with:
          script: |
            const prs = await github.rest.pulls.list({
              owner: context.repo.owner,
              repo: context.repo.repo,
              state: 'open'
            });
            
            const head_sha = context.payload.check_suite?.head_sha || 
                            context.payload.workflow_run?.head_sha;
            const matching_pr = prs.data.find(pr => pr.head.sha === head_sha);
            
            if (!matching_pr) return;
            
            const labels = matching_pr.labels.map(l => l.name);
            
            // Only act on PRs the Ralph Loop was managing
            if (!labels.includes("auto-fix")) return;
            
            // Remove blocking labels
            for (const label of ["won't-merge", "auto-fix"]) {
              await github.rest.issues.removeLabel({
                owner: context.repo.owner,
                repo: context.repo.repo,
                issue_number: matching_pr.number,
                name: label
              }).catch(() => {});
            }
            
            await github.rest.issues.createComment({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: matching_pr.number,
              body: `✅ **Ralph Loop — All checks passed!**\n\nMerge block removed. This PR is ready to merge.`
            });
```

---

## Configuration

Add to `.github/ralph-loop.yml` in any repository to customise the loop:

```yaml
# .github/ralph-loop.yml
ralph_loop:
  max_retries: 5              # Number of auto-fix attempts before escalation
  escalate_to: "midnghtsapphire"  # GitHub username to notify on escalation
  labels:
    blocking: "won't-merge"
    in_progress: "auto-fix"
    escalated: "needs-human"
    ready: "auto-merge"
  copilot_trigger: "@copilot"
  vault_agent_on_failure: true  # Trigger vault-agent if secret-related failure
```

---

## Integration with Error Reporting Skill

The Ralph Loop connects to the `error-reporting` skill for server-side errors:

```text
Server job fails (monitored() wrapper)
→ error-reporting skill: create GitHub Issue (Tier 3)
→ Issue created with label "auto-fix" + "copilot"
→ @copilot triggered via issue mention
→ @copilot makes fix PR
→ Ralph Loop takes over on the PR
→ Loop until merged or escalated
```

---

## Agent Instructions (System Prompt)

```text
You are the Ralph Loop orchestrator. You are not a persona — you are an 
automated process. You do not introduce yourself. You just run the loop.

When triggered on a PR failure:
1. Read the CI failure output completely
2. Identify the root cause (never guess — read the actual error)
3. Make the MINIMUM change required to fix the error
4. Push the fix as a single commit with message: "fix: [error description] (ralph-loop attempt N)"
5. Do NOT merge the PR yourself — wait for CI to pass
6. Do NOT make unrelated changes
7. If the fix requires secrets or credentials, trigger the vault-agent skill

If you cannot determine the fix:
- Comment with a detailed description of what you found
- Add label: "needs-human"
- Stop the loop

You succeed when: all CI checks pass and the "won't-merge" label is removed.
```

---

## Examples

### Example 1: Lint Failure

**Ralph comment triggers:**
```text
🔄 Ralph Loop — Attempt 1/5

@copilot The `Lint & Type Check` check failed.

Please analyze the failure, make the minimum change required to fix it,
and push a commit. Do not merge until all checks pass.
```

**@copilot response:** Fixes lint error in the flagged file, pushes commit.

**CI re-runs → passes → Ralph removes `won't-merge`.**

### Example 2: Test Failure

**Ralph triggers @copilot** with test failure details.
**@copilot** reads the test output, fixes the broken assertion, pushes.
**CI passes → auto-merged.**

### Example 3: Escalation

After 5 failed attempts:
```text
⚠️ Ralph Loop — Escalation Required

This PR has failed 5 consecutive auto-fix attempts.
@midnghtsapphire Please review this PR manually.
```

---

## Dependencies

| Dependency | Required? | Purpose |
|---|---|---|
| **GitHub Actions** | ✅ Required | Runs the Ralph Loop workflow |
| **`@copilot` assignment** | ✅ Required | Triggers Copilot auto-fix |
| **`vault-agent` skill** | ⭕ Optional | For credential-related failures |
| **`error-reporting` skill** | ⭕ Recommended | Server-side error escalation to Ralph Loop |

---

## Testing

```bash
# Simulate a Ralph Loop trigger locally
gh workflow run ralph-loop.yml --field pr_number=<PR_NUMBER>

# Check loop status on a PR
gh pr view <PR_NUMBER> --json labels,comments
```

---

## Related Skills

- **`error-reporting`** — Server-side three-tier error reporting that feeds into the Ralph Loop
- **`vault-agent`** — Triggered by Ralph Loop when error is credential-related
- **`code-review`** — Pre-merge quality gate that Ralph Loop enforces
- **`deployment`** — Post-merge deployment that Ralph Loop protects
