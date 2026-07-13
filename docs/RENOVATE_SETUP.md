# Renovate Setup

This repository uses [Renovate](https://docs.renovatebot.com/) to automate
dependency updates for `npm` packages and GitHub Actions workflows. The
configuration lives at [`.github/renovate.json5`](../.github/renovate.json5).

> **⚠️ Renovate is not active until a repo/org admin installs the
> [Renovate GitHub App](https://github.com/apps/renovate).** Merging this
> config file alone does nothing. See
> [How to actually turn this on](#how-to-actually-turn-this-on) below.

---

## Why Renovate, why now

The repo already runs `dependency-update-checker.yml` weekly (Monday 09:00
UTC) and lists Renovate as a "recommended tool to evaluate" in its manual
report. Nothing acts on that report today -- someone has to read it and
file PRs by hand. Renovate closes that loop by opening the PRs itself,
with a conservative policy that keeps humans in the loop on anything
risky.

Surface area covered:

- **npm** -- via `package.json`
- **GitHub Actions** -- 166+ workflow files under `.github/workflows/`

No Dockerfiles exist in the repo, so no Docker manager is enabled.

---

## Policy summary

| Area | Behavior |
| --- | --- |
| Schedule | Wednesday before 06:00 UTC (gives the Monday manual report a head start) |
| PR limits | 10 concurrent, 4 per hour |
| Dependency dashboard | Enabled -- majors require checking a box before their PR even opens |
| Labels | `dependencies` (matches the existing checker workflow's taxonomy) |
| Commit style | Semantic / conventional commits (`type(scope): description`) |
| GitHub Actions -- non-major | Grouped into one PR, auto-merged when CI is green |
| GitHub Actions -- major | Isolated, no auto-merge, dashboard-gated |
| npm `devDependencies` -- non-major | Grouped, auto-merged when CI is green |
| npm `dependencies` (production) | Never auto-merged, any bump size |
| Any major bump (either manager) | Never auto-merged, dashboard-gated |
| Vulnerability alerts | Fast lane -- open immediately, not delayed by weekly cadence |
| OSV alerts | Enabled -- wider detection than GitHub's native advisory feed |
| Lockfile maintenance | Weekly -- catches transitive drift |
| GitHub Actions pin style | `pinDigests: false` -- respect existing tag-pinned convention; already-SHA-pinned actions still get digest refreshes |
| Range strategy | `auto` -- matches existing caret-range style |

---

## Why the auto-merge policy is conservative

Auto-merge is scoped **only** to:

- Non-major GitHub Actions bumps (CI tooling, low-risk, and there are 166+
  workflow files -- reviewing each patch bump by hand is not a realistic
  ask).
- Non-major npm `devDependencies` (dev tooling, not shipped to users).

Everything else -- majors of any kind, production npm deps of any size --
opens a PR and waits for a human. The `dependencyDashboardApproval` flag
on majors means those PRs don't even *open* until a maintainer ticks the
box on the dependency dashboard issue.

This is deliberately narrower than "auto-merge everything Renovate
opens." It addresses the concern that noisy or aggressive automation has
been a repeated pain point on this repo.

---

## Interaction with existing auto-approve workflows

`trusted-bot-auto-approve.yml` and `auto-approve-clean-prs.yml` already
list `renovate[bot]` in their allowlists. **These do not need to change.**

Auto-approve and auto-merge are separate gates:

- Auto-approve says "this PR is from a trusted bot, stamp a review on it."
- Auto-merge (Renovate's, controlled by this config) says "once CI is
  green and required reviews are satisfied, merge it."

Because this config's `automerge: true` is scoped only to non-major dev/CI
bumps, the existing auto-approve behavior is exactly what we want: a
human-free path for the narrow safe slice, and human review still
required for majors and production deps (which have `automerge: false`
regardless of whether they get auto-approved).

---

## How to actually turn this on

This PR only lands the config file. Renovate itself is a GitHub App and
must be installed by an admin. Steps:

1. Go to <https://github.com/apps/renovate>.
2. Click **Install** (or **Configure** if already installed at the org).
3. Select the org that owns this repository.
4. Choose **Only select repositories** and add this repo, or **All
   repositories** if enabling org-wide is desired.
5. Confirm and grant the requested permissions.

On first run Renovate will:

- Open an onboarding PR (if it doesn't detect `.github/renovate.json5`
  first -- with this PR merged, it should skip onboarding and use the
  committed config directly).
- Create the **Renovate Dependency Dashboard** tracking issue.
- Begin opening scheduled PRs on the configured cadence.

---

## Validating changes to `renovate.json5`

Before committing changes to `.github/renovate.json5`:

```bash
npx --yes -p renovate renovate-config-validator .github/renovate.json5
```

A successful run ends with `INFO: Config validated successfully`.

---

## Turning it off

To pause Renovate without uninstalling the app, add to
`.github/renovate.json5`:

```json5
{
  enabled: false,
}
```

To remove it entirely, uninstall the GitHub App from the org's
installed-apps settings.
