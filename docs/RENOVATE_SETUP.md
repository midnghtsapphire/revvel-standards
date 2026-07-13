# Renovate Setup

This document explains the Renovate configuration in `.github/renovate.json5`,
why it was added, and the **required manual step** to actually turn it on.

## What is Renovate?

[Renovate](https://docs.renovatebot.com/) is an open-source dependency update
bot (like Dependabot, but more configurable). Once enabled, it opens PRs to
keep npm packages and GitHub Actions workflows up to date, and it batches,
schedules, and (optionally) auto-merges those PRs according to the policy in
`.github/renovate.json5`.

## Why now?

- `dependency-update-checker.yml` runs weekly and lists Renovate as a
  "recommended tool to evaluate" in its manual report, but nothing acts on
  that report.
- No `renovate.json` / `renovate.json5` existed prior to this change, and
  `renovate[bot]` has never authored a PR/issue against this repo (verified
  via GitHub search).
- The existing `trusted-bot-auto-approve.yml` and
  `auto-approve-clean-prs.yml` workflows already allowlist `renovate[bot]`
  as a trusted author -- the infrastructure was ready; only the config and
  the app install were missing.

## Policy summary

| Scope | Update type | Grouped? | Auto-merge? | Dashboard gate? |
| --- | --- | --- | --- | --- |
| GitHub Actions | minor / patch / digest | yes | **yes** (CI-green) | no |
| GitHub Actions | major | no (one PR each) | no | **yes** |
| npm `devDependencies` | minor / patch | yes | **yes** (CI-green) | no |
| npm `dependencies` (prod) | any | no | **no** | no |
| Anything | major | no | no | **yes** |
| Vulnerability alerts | any | no | no (opens immediately) | no |
| Lockfile maintenance | weekly | n/a | inherits default | no |

Key properties of this policy:

- **Conservative auto-merge.** Only low-risk lanes (non-major CI tooling and
  non-major dev dependencies) auto-merge, and only once CI is green. Every
  major bump and every production npm dependency waits for a human.
- **Dashboard-gated majors.** Major bumps don't even open a PR until a
  maintainer checks the corresponding box on the Renovate Dependency
  Dashboard issue. This prevents a flood of breaking-change PRs on first
  install.
- **Fast lane for security.** `vulnerabilityAlerts` and
  `osvVulnerabilityAlerts` run outside the weekly schedule so security
  fixes are not delayed by the batch cadence.
- **Aligned schedule.** Runs Wednesday before 06:00 UTC, two days after the
  Monday 09:00 UTC `dependency-update-checker.yml` report, so a maintainer
  has visibility of the manual report before automated PRs arrive.
- **Aligned label taxonomy.** Uses the same `dependencies` label the
  existing manual report issues use -- one taxonomy, not two.
- **Aligned commit style.** `semanticCommits: enabled` produces
  `type(scope): description` titles matching the conventional-commit
  convention this repo already enforces via `pull_request_template.md`.

## Interaction with existing auto-approve workflows

`trusted-bot-auto-approve.yml` and `auto-approve-clean-prs.yml` already list
`renovate[bot]` as a trusted author. **These do not need to change.**

Auto-approve and auto-merge are separate gates:

- Auto-approve gives a Renovate PR the required approving review.
- Auto-merge (controlled here in `renovate.json5`) decides whether Renovate
  is allowed to actually merge that PR after CI + approval.

Because this config only sets `automerge: true` on the non-major CI /
dev-dependency lanes, majors and production-dependency PRs will still sit
waiting for a human to hit merge, **even if** they've already been
auto-approved. That's intentional -- approval is not merge authority.

## How to actually turn this on

**This config is inert until a repo/org admin installs the Renovate GitHub
App.** Merging this PR alone does nothing. Steps:

1. A user with **admin** rights on this repo (or the owning org) visits
   <https://github.com/apps/renovate>.
2. Click **Install** (or **Configure** if the app is already installed on
   another repo in the org).
3. Choose either:
   - **All repositories** (org-wide install), or
   - **Only select repositories** and pick this repo.
4. Grant the requested permissions. Renovate needs read access to code and
   write access to PRs, issues, and workflows.
5. Within a few minutes, Renovate will:
   - Read `.github/renovate.json5`.
   - Open a "Configure Renovate" onboarding PR (first-time installs only).
   - After that PR merges (or if onboarding is skipped), open the
     **Dependency Dashboard** issue and begin scheduling updates per the
     Wednesday cadence.

## Validating changes to the config

Before committing any change to `.github/renovate.json5`, run:

```bash
npx --yes -p renovate renovate-config-validator .github/renovate.json5
```

A passing run prints `INFO: Config validated successfully`. Renovate ships
this validator specifically so config drift is caught locally, not after a
bad push causes it to stop running.

## Disabling / pausing Renovate

- **Pause temporarily:** check the "Pause Renovate" box on the Dependency
  Dashboard issue.
- **Disable entirely:** uninstall the Renovate GitHub App from repo/org
  settings, **or** set `"enabled": false` at the top level of
  `.github/renovate.json5`.
- **Disable a single manager or package:** add a `packageRules` entry with
  `"enabled": false` scoped by `matchManagers` / `matchPackageNames`.

## References

- Renovate docs: <https://docs.renovatebot.com/>
- Config options: <https://docs.renovatebot.com/configuration-options/>
- Presets: <https://docs.renovatebot.com/presets-config/>
- GitHub App: <https://github.com/apps/renovate>
