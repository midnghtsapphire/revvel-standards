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
| Vulnerability alerts | Separate lane, `schedule` doesn't apply — security PRs open immediately (Renovate prioritizes vulnerability-fix PRs automatically; `prPriority` is not a valid field inside `vulnerabilityAlerts` and was removed — see the "Validating the config" section) |
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

### CI validation (automated)

Manual `npx` is still the offline / pre-push check. CI now runs the same
validator automatically via:

- **Workflow:** [`.github/workflows/renovate-config-validator.yml`](../.github/workflows/renovate-config-validator.yml)
- **Reusable template:** [`templates/cicd/renovate-config-validator.yml`](../templates/cicd/renovate-config-validator.yml)
- **Action:** [`suzuki-shunsuke/github-action-renovate-config-validator@v2.1.0`](https://github.com/suzuki-shunsuke/github-action-renovate-config-validator)
  (pinned to the full commit SHA for tag `v2.1.0`)

| Trigger | When it runs |
| --- | --- |
| `pull_request` | Paths include any common Renovate config file or the workflow itself |
| `push` to `main` | Same path filters |
| `workflow_dispatch` | Manual re-run from the Actions tab |

The job is named **Validate Renovate Configuration**. It:

1. Checks that `.github/renovate.json5` exists (fail-fast with an
   actionable `::error::` if the file was renamed without updating the
   workflow).
2. Runs the validator in **strict** mode with **npm cache** enabled
   (the v2.1.0 default — reduces install time and npm rate-limit pressure).

**Failure modes (by design — do not weaken these):**

| Condition | Result |
| --- | --- |
| Unknown / invalid Renovate option | Job fails; log names the bad key |
| Config file path missing | Presence-guard step fails before the action runs |
| npm cannot install `renovate` | Action step fails (no silent pass) |
| Valid config | Job green — `INFO: Config validated successfully` |

### Prior art and alternatives

| Approach | Notes | Chosen? |
| --- | --- | --- |
| `npx -p renovate renovate-config-validator` (local) | Already used when authoring `.github/renovate.json5`; remains the offline fallback | Complementary |
| `suzuki-shunsuke/github-action-renovate-config-validator@v2.1.0` | Node 24 + `~/.npm` cache; thin wrapper around the same CLI | **Yes (this WR)** |
| `tj-actions/renovate-config-validator` (WR #15812) | Alternate marketplace action; not the pin this WR requires | No |
| Custom shell that greps keys | Brittle vs Renovate's real schema | No |

### How to re-run or extend

1. **Manual CI run:** GitHub → Actions → **Renovate Config Validator** →
   **Run workflow**.
2. **Validate another path:** set `config_file_path` (multi-line supported)
   in the workflow `with:` block, and add the path to both `paths:` filters.
3. **Consumer repos:** copy `templates/cicd/renovate-config-validator.yml`
   into `.github/workflows/` and point `config_file_path` at that repo's
   Renovate config.
4. **Upgrade the action:** resolve the new tag's commit SHA, update the
   `uses:` pin and the trailing `# vX.Y.Z` comment together, and keep the
   entry in `ACCEPTED_SINGLE_AUTHOR_ACTIONS` inside
   `scripts/audit-third-party-actions.sh`.
