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
# Renovate — automated dependency updates

**What for:** Renovate is a GitHub App that scans a repo's dependency
manifests (here: `package.json`/`package-lock.json` for npm, and every
`uses:` line in `.github/workflows/*.yml` for GitHub Actions), compares
pinned versions against what's actually latest/safe, and opens PRs to bump
them — on a schedule, grouped sensibly, with an optional auto-merge lane for
low-risk bumps.

## Why this is being added now

`dependency-update-checker.yml` already runs every Monday, scans GitHub
Actions versions and npm dependency counts, and files/updates a
`[AUTO] Weekly Dependency & Version Update Report` issue. It has always
listed [Renovate](https://github.com/apps/renovate) itself under
"Recommended Tools to Evaluate" — a manual report with no automated
remediation. This config (`.github/renovate.json5`) is the automated half of
that loop: the weekly report tells you *that* something's stale; Renovate
now also opens the PR to fix it.

Until now this repo has never had Renovate installed. Confirmed before
writing this config:

- No `renovate.json` / `renovate.json5` / `.github/renovate.json` existed
  anywhere in the tree.
- No PR or issue in `midnghtsapphire/revvel-standards` has ever been
  authored by `renovate[bot]` (checked via GitHub search — zero results).
- `trusted-bot-auto-approve.yml` and `auto-approve-clean-prs.yml` both
  already list `renovate[bot]` in their trusted-bot allowlists — dead code
  until today, presumably added in anticipation of this. See
  [Interaction with existing auto-approve workflows](#interaction-with-existing-auto-approve-workflows)
  below.

## What the config does (`.github/renovate.json5`)

Full rationale for every option is inline as comments in the file itself;
this is the summary:

| Area | Policy |
| --- | --- |
| Scope | `npm` + `github-actions` managers only — no Dockerfiles exist in this repo (verified), no other manifests detected |
| Schedule | Weekly, `before 6am on Wednesday` UTC — deliberately not Monday (`dependency-update-checker.yml` already runs Monday 09:00 UTC), so the manual report lands first and the automated PRs follow a couple of days later |
| Grouping | GitHub Actions non-major bumps → one PR; npm devDependencies non-major bumps → one PR; every major bump (either manager) → its own isolated PR |
| Auto-merge | **Only** non-major GitHub Actions and non-major npm devDependencies, and only after required CI checks pass (`platformAutomerge: true` defers to GitHub's native branch-protection required-status-checks) |
| Never auto-merged | Any major version bump, and any npm **production** dependency bump of any size (there are none today — `package.json` has only `devDependencies` — but the rule is defined pre-emptively) |
| Vulnerability alerts | Separate lane, `schedule` doesn't apply — security PRs open immediately, `prPriority: 10` |
| Lockfile maintenance | Weekly, same Wednesday window, lockfile-only PRs (no `package.json` changes) |
| Dependency Dashboard | On — one tracking issue enumerating every pending update, labeled `dependencies`; majors require checking a box on the dashboard before Renovate even opens their PR (`dependencyDashboardApproval: true`) |
| Commit/PR title style | `semanticCommits: enabled` + explicit type/scope so output matches this repo's `type(scope): description` convention (e.g. `chore(deps): ...`, `chore(actions): ...`), matching what `.github/pull_request_template.md` already requires |
| Labels | `dependencies` — the same label `dependency-update-checker.yml` already uses for its report issues, so both land under one label instead of a second taxonomy |
| GitHub Actions pin style | `pinDigests: false` — this repo pins the large majority of actions by version tag (`@v4`, `@v9.0.0`); a couple of security-audit-owned workflows (`third-party-action-audit.yml`, `workflow-action-ref-audit.yml`) additionally pin by commit SHA with a trailing `# vX.Y.Z` comment. Renovate is told not to convert tag-pinned actions to SHA pinning (that's a decision the audit workflows already own), but it will still keep the *already* SHA-pinned ones up to date — Renovate updates the digest and the version comment together, which is default behavior once something is digest-pinned, no extra config needed |

## Why the auto-merge policy is conservative

WR #15833 (filed 2026-07-13) flagged a gap in this fleet's general
auto-merge/human-review posture. This config does not close that gap by
letting Renovate auto-merge everything it opens — it deliberately does the
opposite:

- Auto-merge is scoped to the lowest-risk slice only: non-major bumps to
  tooling that doesn't ship to users (dev tooling, CI action pins).
- Every major version bump — which is where breaking changes live — always
  gets its own PR, is never auto-merged, and requires a maintainer to
  explicitly approve it from the Dependency Dashboard before Renovate even
  raises the PR.
- Production npm dependencies (`dependencies`, as opposed to
  `devDependencies`) are never auto-merged regardless of bump size, because
  those ship in whatever this repo's automation runs at execution time.
- All auto-merges still require GitHub's own required-status-checks to be
  green (`platformAutomerge: true`) — Renovate cannot force a merge past a
  red or pending check.

## Interaction with existing auto-approve workflows

`trusted-bot-auto-approve.yml` and `auto-approve-clean-prs.yml` both already
include `renovate[bot]` in their `TRUSTED_BOTS` / `TRUSTED_AUTHORS`
allowlists, meaning once Renovate is installed, those workflows will
auto-**approve** (submit an APPROVE review on) any Renovate PR once its CI
checks pass — independent of Renovate's own auto-**merge** setting above.

This was evaluated and left as-is rather than changed in this PR:
auto-approve and auto-merge are two different gates in this fleet's model.
Approval alone doesn't merge anything — `pr-state-orchestrator` and the
merge automation still require the repo's normal merge conditions. Combined
with `renovate.json5`'s own conservative `automerge` scoping (only
non-major dev/CI bumps), the practical effect is: low-risk Renovate PRs get
both auto-approved *and* auto-merged (fully automated, as intended); every
major or production-dependency PR gets auto-approved (a green checkmark,
which is harmless — the diff still needs a human to merge it) but never
auto-merged, so it still waits for a person. No change to those two
workflows was necessary.

## How to actually turn this on (manual, one-time, outside this PR)

**Nothing in this PR makes Renovate run.** `.github/renovate.json5` is
config for an app that has to be installed first:

1. A repo/org admin visits <https://github.com/apps/renovate> and installs
   the Renovate GitHub App, either on this specific repository or the whole
   `midnghtsapphire` org.
2. On first install, Renovate's own onboarding PR may appear (it typically
   proposes a `renovate.json` — since this repo already ships
   `.github/renovate.json5`, Renovate should pick that up directly and skip
   onboarding, but confirm the first run's log/PR to be sure).
3. Watch the Dependency Dashboard issue Renovate creates — that's the
   control panel for everything pending, including the checkbox-gated major
   bumps described above.

This session (and this PR) cannot install a GitHub App — that requires
org/repo admin permissions exercised through the GitHub UI by a human.

## Validating the config

`.github/renovate.json5` is JSON5 (comments + unquoted-friendly), not
strict JSON, so `python3 -m json.load` won't parse it directly. Two checks
were run before opening this PR:

1. Structural validity via the `json5` npm package's `JSON5.parse()` —
   parses cleanly, all expected top-level keys present.
2. **Renovate's own validator**, `renovate-config-validator` (ships inside
   the `renovate` npm package):
   ```bash
   npx --yes -p renovate renovate-config-validator .github/renovate.json5
   ```
   `npx --yes renovate-config-validator` alone (without `-p renovate`)
   fails — that binary name isn't a published package by itself, it's a bin
   entry inside the full `renovate` package. Installing `renovate` took a
   few minutes (large dependency tree) but did succeed in this sandbox.
   The validator caught two real mistakes on the first pass — `prPriority`
   is not a valid field inside `vulnerabilityAlerts`, and there is no
   `matchCurrentVulnerability` packageRules selector — both were removed;
   Renovate prioritizes vulnerability-fix PRs automatically without needing
   either. Final run: `INFO: Config validated successfully`.
