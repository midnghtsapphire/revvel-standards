# Renovate Setup

This repo uses [Renovate](https://docs.renovatebot.com/) to automate
dependency updates for `npm` and GitHub Actions workflows.

Config lives in [`.github/renovate.json5`](../.github/renovate.json5).

## Why Renovate, why now

- The existing `dependency-update-checker.yml` workflow produces a
  weekly manual report, but nothing acts on it. Renovate closes that
  loop by opening actual PRs.
- The repo has **166+ GitHub Actions workflow files** plus npm
  dependencies. Manually tracking upstream versions across that surface
  is not sustainable.
- Renovate's dependency dashboard and grouping features keep the PR
  volume manageable — critical for a repo with a documented aversion
  to noisy automation.

## Policy summary

| Area | Behavior |
| --- | --- |
| Schedule | Weekly, before 6am UTC Wednesday (offset from Monday 09:00 UTC manual report) |
| PR limits | 10 concurrent, 4/hour |
| Managers enabled | `npm`, `github-actions` only |
| Dependency Dashboard | Enabled — pending majors listed as checkboxes |
| Labels | `dependencies` (shared with existing dependency-update-checker taxonomy) |
| Commit style | Conventional commits (`type(scope): description`) |
| Vulnerability alerts | Immediate lane, not scheduled; OSV + GitHub advisories |
| Lock file maintenance | Weekly, catches transitive drift |
| GH Actions non-major | Grouped, **auto-merged** when CI passes |
| GH Actions major | Isolated PR, **dashboard-gated**, no auto-merge |
| npm `devDependencies` non-major | Grouped, **auto-merged** when CI passes |
| npm `dependencies` (production) | **Never auto-merged**, any bump size |
| Any major (either manager) | Isolated + dashboard-gated + no auto-merge |
| Action pinning | `pinDigests: false` — repo pins by tag; audit workflows own SHA pinning |
| Range strategy | `auto` — matches existing caret-range style |

## Why the auto-merge policy is conservative

WR #15833 flagged concern that auto-merge automation should not blindly
land arbitrary dependency changes. This config's `automerge: true` scope
is explicitly limited to:

1. **Non-major** updates only.
2. **CI tooling** (GitHub Actions) and **dev dependencies** only.

Everything else — majors, production `dependencies`, security fixes
requiring judgement — opens as a normal PR and waits for a human.

## Interaction with existing auto-approve workflows

`trusted-bot-auto-approve.yml` and `auto-approve-clean-prs.yml` already
list `renovate[bot]` in their allowlists. **These do not need to
change** — auto-approve and auto-merge are separate gates:

- Auto-approve just adds a review; it does not merge.
- Auto-merge is scoped by `packageRules` in this config.
- A major-bump PR from Renovate can be auto-approved and still sit
  waiting for a human to merge, because `automerge: false` applies.

## How to actually turn this on

**This config is inert until a repo/org admin installs the Renovate
GitHub App.** Merging this PR alone does nothing.

Steps (must be done by a GitHub admin through the UI — cannot be
automated from a PR):

1. Go to <https://github.com/apps/renovate>.
2. Click **Install** (or **Configure** if already installed elsewhere
   in the org).
3. Choose this repository (or grant org-wide access if that's the
   org's convention).
4. Renovate will detect `.github/renovate.json5` on its next scan and
   open an onboarding PR / the Dependency Dashboard issue within a few
   minutes.
5. Review the dashboard, check any major-update boxes that should
   proceed, and let the weekly schedule take over from there.

## Validating config changes

Before committing changes to `.github/renovate.json5`:

```bash
npx --yes -p renovate renovate-config-validator .github/renovate.json5
```

Expected output: `INFO: Config validated successfully`.

## Troubleshooting

- **No PRs appearing?** Check that the app is installed and has access
  to this repo. Look for the Dependency Dashboard issue — if it exists,
  Renovate is running.
- **Too many PRs?** Lower `prConcurrentLimit` / `prHourlyLimit` or add
  more aggressive `groupName` rules in `packageRules`.
- **Auto-merge not firing?** Confirm branch protection allows the
  Renovate bot to merge and that required checks match what CI reports.
