# WR: [WR] PR #14120 documents shell injection risk but omits workflow fix

**Issue:** #14253  
**Repository:** [midnghtsapphire/revvel-standards](https://github.com/midnghtsapphire/revvel-standards)  
**Created:** 2026-06-02
**WR Status:** ✅ Complete

## Issue Context

## Bug Report

### Problem Description

PR #14120 is titled as a fix for a shell injection risk in the third-party action audit workflow, but the diff only adds a tracking/research document under wr/issues/. The actual vulnerable workflow file is untouched, so the latent expression-injection vector remains in main after merge.

### Details

The referenced vulnerability is in .github/workflows/third-party-action-audit.yml at line 57, where \`\$\{\{ steps.audit.outputs.report_file \}\}\` is interpolated unquoted into a shell \`cat\` command and into \`fs.readFileSync()\` inside a github-script step. Because the value flows directly from a step output into both a shell context and a JavaScript context via GitHub Actions expression interpolation, a crafted output value could break out of the intended argument and execute attacker-controlled code in the runner.

The PR's stated intent (per its title) is to fix this issue, but the diff contains only a new markdown file documenting the problem. This creates a misleading changelog/audit trail: reviewers and downstream consumers may believe the vulnerability has been remediated when it has not. The Suggested Action described in the WR document is correct; it simply has not been applied to the workflow.

### Location

**Tracking doc:** wr/issues/issue-13996-fix-shell-injection-risk-from-unquoted-workflow-ou.md:1
**Unpatched workflow:** .github/workflows/third-party-action-audit.yml:57
**Pull Request:** #14120 (<https://github.com/midnghtsapphire/revvel-standards/pull/14120>)

### Suggested Action

Choose one of the following before merging:

1. Add the actual workflow patch to this PR:
   - In the affected job step(s), pass the output through an \`env:\` block, e.g. \`env: REPORT_FILE: \$\{\{ steps.audit.outputs.report_file \}\}\`.
   - Replace the unquoted shell usage with \`"$REPORT_FILE"\` in any \`run:\` shell steps.
   - Replace the interpolation inside the \`github-script\` step with \`process.env.REPORT_FILE\` and read the file via \`fs.readFileSync(process.env.REPORT_FILE, 'utf8')\`.
   - Verify the workflow still passes on a test branch.

2. Rename the PR to reflect its actual scope (e.g., "Track shell injection risk from unquoted workflow output in audit step") and open a separate PR that applies the fix above, linking both.

## Summary

The third-party action audit workflow is currently vulnerable to shell injection due to unquoted interpolation of step outputs. PR #14120 documented this vulnerability but did not apply the fix to the actual workflow file.

## Objective

Apply the missing fix to the workflow to prevent shell injection vulnerabilities.

## Required Bundle

N/A

## Definition of Done

The workflow \`.github/workflows/third-party-action-audit.yml\` is patched using an \`env\` block to safely read step outputs without expression interpolation vulnerabilities.

**Implementation Steps:**

1. In the affected job step(s), pass the output through an \`env:\` block, e.g. \`env: REPORT_FILE: \$\{\{ steps.audit.outputs.report_file \}\}\`.
2. Replace the unquoted shell usage with \`"$REPORT_FILE"\` in any \`run:\` shell steps.
3. Replace the interpolation inside the \`github-script\` step with \`process.env.REPORT_FILE\` and read the file via \`fs.readFileSync(process.env.REPORT_FILE, 'utf8')\`.
4. Verify the workflow still passes on a test branch.

## Validation

Workflow execution on a test branch successfully passes without interpolation errors.

## Blockers

N/A
