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
| CI test job (use the exact name GitHub shows) | test workflow | Repo test suite green |

Leave the LLM rewrite reviewers (OpenRouter, PandaOps) **non-required** — they
are advisory and dispatch-only by design to control cost.

> **Known issue — `Jules PR Review` is a target-state required check, but keep it non-required for now.** As of 2026-05-21 the
> Jules job fails at runtime without posting a `jules/review` verdict on every
> PR. The workflow guard only checks that `JULES_API_KEY` is *non-empty*, not
> valid — so an invalid/expired key passes the guard, the action runs, and it
> fails on the Jules API call. Verify/rotate `JULES_API_KEY` in
> **Settings → Secrets and variables → Actions**, confirm a green `jules/review`
> status appears on a PR, and only then add it to the required list.

## How to set it

GitHub UI: **Settings → Branches → Branch protection rules → `main` (edit) →
Require status checks to pass before merging** → search for and add each check
name above. Also enable **Require branches to be up to date before merging** so
checks run against the latest base.

Prefer the GitHub UI for updates. If you need API automation, first inspect the
current required-check config so you can replace it intentionally without
overwriting unrelated branch-protection settings:

```bash
gh api repos/midnghtsapphire/revvel-standards/branches/main/protection \
  --jq '.required_status_checks'
```

If you script the update, prefer the dedicated required-status-checks endpoint
so you only change that list:

```bash
gh api -X PATCH \
  repos/midnghtsapphire/revvel-standards/branches/main/protection/required_status_checks \
  -f strict=true \
  -f 'checks[][context]=semgrep' \
  -f 'checks[][context]=Analyze (javascript-typescript)' \
  -f 'checks[][context]=Analyze (actions)' \
  -f 'checks[][context]=<exact CI test job name>'
```

Add `Jules PR Review` later, after the key/runtime issue above is fixed.

> A check name only becomes selectable after it has run on at least one PR, so
> open one PR first, then add the names that appear.

## Note on the Semgrep gate

`semgrep.yml` runs two passes: a full-repo **advisory** SARIF upload (Security
tab) and a **diff-aware blocking** gate (`--baseline-commit`) that fails only on
ERROR-severity findings the PR introduces. This keeps the existing backlog from
blocking unrelated PRs while still stopping new vulnerabilities and secrets.
