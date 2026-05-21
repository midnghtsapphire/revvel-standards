# Branch Protection — Required Checks

**Status:** Action required (one-time GitHub settings change)
**Date:** 2026-05-21

## Why this doc exists

Making a workflow "blocking" in YAML (the job exits non-zero on a finding) does
**not** stop a merge on its own. A failing check only prevents merge when it is
marked a **Required status check** in the branch's protection rule. PR #13703
merged even though the Semgrep gate failed — proof that these checks are not yet
required on `main`.

So the jury is now *able* to block, but GitHub will not *enforce* it until the
checks below are marked required. That is a repository **Settings** change (UI or
API), not something a workflow file can do.

## Recommended required checks for `main`

| Check (job name) | Workflow | Gates on |
| --- | --- | --- |
| `semgrep` | `semgrep.yml` | New ERROR-severity security + secret findings (diff-aware) |
| `Analyze (javascript-typescript)` | `codeql.yml` | CodeQL findings in JS sources |
| `Analyze (actions)` | `codeql.yml` | CodeQL findings in workflows |
| `Jules PR Review` | `jules-pr-reviewer.yml` | Blocking-severity AI review verdict |
| CI test job | (test runner) | `npm test` green |

Leave the LLM rewrite reviewers (OpenRouter, PandaOps) **non-required** — they
are advisory and dispatch-only by design to control cost.

## How to set it

GitHub UI: **Settings → Branches → Branch protection rules → `main` (edit) →
Require status checks to pass before merging** → search for and add each check
name above. Also enable **Require branches to be up to date before merging** so
checks run against the latest base.

Or via the API (requires admin):

```bash
gh api -X PUT repos/midnghtsapphire/revvel-standards/branches/main/protection \
  -f 'required_status_checks[strict]=true' \
  -f 'required_status_checks[checks][][context]=semgrep' \
  -f 'required_status_checks[checks][][context]=Analyze (javascript-typescript)' \
  -f 'required_status_checks[checks][][context]=Jules PR Review'
```

> A check name only becomes selectable after it has run on at least one PR, so
> open one PR first, then add the names that appear.

## Note on the Semgrep gate

`semgrep.yml` runs two passes: a full-repo **advisory** SARIF upload (Security
tab) and a **diff-aware blocking** gate (`--baseline-commit`) that fails only on
ERROR-severity findings the PR introduces. This keeps the existing backlog from
blocking unrelated PRs while still stopping new vulnerabilities and secrets.
