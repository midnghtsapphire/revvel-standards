# OPENROUTER_API_KEY Verification Standard

## Overview

This document defines the standard patterns for verifying `OPENROUTER_API_KEY` in GitHub Actions workflows to ensure consistent behavior across all OpenRouter-powered automation.

## Two Verification Patterns

### Pattern 1: Hard-Fail (Required Operation)

Use when the workflow **cannot proceed** without the API key (e.g., workflows that exist solely to call OpenRouter).

**When to use:**

- Manual dispatch workflows that only call OpenRouter (e.g., `research-module.yml`, `run-human-testing-api.yml`)
- Workflows triggered by review events that must analyze PR content (e.g., `pr-review-request-handler.yml`)
- Any workflow where skipping the API call makes the workflow meaningless

**Implementation:**

```yaml
- name: Verify OPENROUTER_API_KEY
  env:
    OPENROUTER_API_KEY: ${{ secrets.OPENROUTER_API_KEY }}
  run: |
    if [ -z "${OPENROUTER_API_KEY}" ]; then
      echo "::error::OPENROUTER_API_KEY is not set. Cannot proceed with [workflow purpose]."
      exit 1
    else
      echo "OPENROUTER_API_KEY is configured."
    fi
```

**Behavior:**

- Workflow fails immediately with clear error message
- Prevents subsequent steps from running
- GitHub Actions UI shows failed status
- User is directed to configure the secret

### Pattern 2: Graceful-Skip (Optional Enhancement)

Use when the workflow **can still provide value** without the API key (e.g., marketplace actions that enhance PRs but aren't required).

**When to use:**

- Third-party GitHub Actions that use OpenRouter as an optional enhancement (e.g., `ai-pr-review-openrouter.yml`)
- Workflows that run on events but can skip the AI portion (e.g., `ai-ci-failure-helper.yml`)
- Scheduled workflows that triage items but shouldn't fail the cron job (e.g., `openrouter-triage.yml`)
- Workflows that have non-OpenRouter fallback behavior

**Implementation:**

```yaml
- name: Verify OPENROUTER_API_KEY is configured
  env:
    OPENROUTER_API_KEY: ${{ secrets.OPENROUTER_API_KEY }}
  run: |
    if [ -z "${OPENROUTER_API_KEY}" ]; then
      echo "::warning::OPENROUTER_API_KEY is not set — skipping [feature name]."
    else
      echo "OPENROUTER_API_KEY is configured."
    fi

- name: Run OpenRouter-powered step
  if: env.OPENROUTER_API_KEY != ''
  env:
    OPENROUTER_API_KEY: ${{ secrets.OPENROUTER_API_KEY }}
  # ... rest of step
```

**Behavior:**

- Verification step exits 0 (success) with warning
- Subsequent steps protected by `if: env.OPENROUTER_API_KEY != ''`
- Workflow completes successfully
- GitHub Actions UI shows success status with warning annotation

**Critical requirement:** ALL subsequent steps that use the API key MUST have the conditional check `if: env.OPENROUTER_API_KEY != ''`. Failing to add this check will cause the workflow to fail later when the script detects the missing key.

### Pattern Comparison

| Aspect                 | Hard-Fail           | Graceful-Skip              |
| ---------------------- | ------------------- | -------------------------- |
| Exit code when missing | 1 (failure)         | 0 (success)                |
| Subsequent steps       | Halted              | Must have `if` conditional |
| Workflow status        | Failed              | Success with warning       |
| Use case               | Required operations | Optional enhancements      |
| Script behavior        | Can still check key | Can still check key        |

## Script-Level Verification

Both patterns should be complemented by script-level verification for defense in depth:

### Hard-Fail Scripts

Scripts that are only called when the key is required:

> **For illustration only.** Do **not** paste this example into a CI workflow where stdout/stderr is logged. Always call OpenRouter via `scripts/openrouter-routing.js` (or another wrapper) so the key never appears in user-controlled contexts. — Octopus audit 2026-05-28

```javascript
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

if (!OPENROUTER_API_KEY) {
  console.error("ERROR: OPENROUTER_API_KEY environment variable is required.");
  process.exit(1);
}
```

**Examples:**

- `scripts/research-module.js`
- `scripts/run-human-testing-api.js`
- `scripts/pr-review-request-handler.js`

### Graceful-Skip Scripts

Scripts that may be called without the key and should handle it gracefully:

> **For illustration only.** Do **not** paste this example into a CI workflow where stdout/stderr is logged. Always call OpenRouter via `scripts/openrouter-routing.js` (or another wrapper) so the key never appears in user-controlled contexts. — Octopus audit 2026-05-28

```javascript
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

if (!OPENROUTER_API_KEY) {
  console.log(
    "::warning::OPENROUTER_API_KEY is not set. Skipping OpenRouter [operation].",
  );
  // Post a comment/label indicating the key is needed
  await reportNeedsKey();
  process.exit(0);
}
```

**Examples:**

- `scripts/openrouter-triage.js`

## Common Mistakes

### ❌ Wrong: Verification exits 0 but no conditional on subsequent steps

```yaml
- name: Verify OPENROUTER_API_KEY
  run: |
    if [ -z "${OPENROUTER_API_KEY}" ]; then
      echo "::warning::Will skip API call"
    fi

- name: Call API # ⚠️  MISSING CONDITIONAL!
  run: node scripts/call-api.js # Will fail when script checks key
```

**Problem:** Workflow proceeds to call the script, which then fails with exit 1, making the workflow fail despite the warning saying it would "skip."

**Fix:** Add `if: env.OPENROUTER_API_KEY != ''` to the second step.

### ❌ Wrong: Workflow says "will skip" but uses exit 1

```yaml
- name: Verify OPENROUTER_API_KEY
  run: |
    if [ -z "${OPENROUTER_API_KEY}" ]; then
      echo "Workflow will skip gracefully"
      exit 1  # ⚠️  CONTRADICTS THE MESSAGE!
    fi
```

**Problem:** Message claims graceful skip, but exit 1 causes hard failure.

**Fix:** Either use exit 0 and add conditionals, or change message to say "Cannot proceed."

### ❌ Wrong: Documentation claims graceful skip but workflow hard-fails

**Problem:** Documentation at docs/GITHUB_AUTOMATION_QUICKSTART.md says "workflows will skip gracefully" but the workflow uses exit 1.

**Fix:** Update documentation to match actual behavior, or change workflow to skip gracefully.

## Audit Checklist

When adding or updating OpenRouter workflows, verify:

- [ ] Workflow has a verification step before calling scripts
- [ ] Verification pattern matches intended behavior (hard-fail vs graceful-skip)
- [ ] If graceful-skip: all subsequent steps have `if: env.OPENROUTER_API_KEY != ''`
- [ ] Script checks the key and handles missing key appropriately
- [ ] Script behavior matches workflow pattern (exit 0 or exit 1)
- [ ] Workflow documentation correctly describes the skip behavior
- [ ] Error/warning messages match the actual behavior

## Migration Guide

### Converting Hard-Fail to Graceful-Skip

1. Change verification step exit 1 → implicit exit 0
2. Change `::error::` → `::warning::`
3. Add `if: env.OPENROUTER_API_KEY != ''` to all subsequent steps that use the key
4. Update script to exit 0 instead of exit 1 when key is missing
5. Update workflow documentation

### Converting Graceful-Skip to Hard-Fail

1. Change verification step `::warning::` → `::error::`
2. Add `exit 1` when key is missing
3. Remove `if: env.OPENROUTER_API_KEY != ''` conditionals (no longer needed)
4. Script can keep exit 1 for missing key (workflow already failed)
5. Update workflow documentation

## Repository Status

As of 2026-05-03, the repository follows these patterns:

### Hard-Fail Workflows

- `pr-review-request-handler.yml` ✅
- `research-module.yml` ✅ (fixed 2026-05-03)
- `run-human-testing-api.yml` ✅ (fixed 2026-05-03)

### Graceful-Skip Workflows

- `ai-pr-review-openrouter.yml` ✅
- `ai-ci-failure-helper.yml` ✅
- `ai-weekly-changelog.yml` ✅
- `openrouter-triage.yml` ✅
- `weekly-research.yml` ✅
- `proof-of-life.yml` ✅ (uses output variable pattern)

### No Explicit Verification (Scripts Handle It)

- `agent-fallback.yml` - calls `openrouter-triage.js` which handles missing key
- `openrouter-assignee.yml` - inline script with GitHub Script action
- `openrouter-coder.yml` - Python script handles verification
- `openrouter-instantiation-check.yml` - inline script
- `content-automation.yml` - inline script
- `priority-router.yml` - inline script
- Other workflows using inline scripts

## See Also

- [OPENROUTER_TRIAGE_PROCESS.md](./OPENROUTER_TRIAGE_PROCESS.md) - Documents the graceful-skip pattern for triage
- [GITHUB_AUTOMATION_QUICKSTART.md](./GITHUB_AUTOMATION_QUICKSTART.md) - Quick setup guide
- [CREDENTIAL_ROUTING_PROCESS.md](./CREDENTIAL_ROUTING_PROCESS.md) - How to provision secrets
