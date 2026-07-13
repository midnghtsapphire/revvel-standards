# Renovate Setup

This document explains the Renovate configuration in
[`.github/renovate.json5`](../.github/renovate.json5), the rationale behind
its conservative auto-merge policy, and the **required manual step** to
actually turn Renovate on for this repository.

## What is Renovate?

[Renovate](https://docs.renovatebot.com/) is an automated dependency-update
service. Once installed as a GitHub App, it monitors declared dependencies
in the repo (npm packages, GitHub Actions versions, Dockerfile base images,
etc.) and opens pull requests when updates are available.

## Why add it now?

- `dependency-update-checker.yml` already runs weekly and lists Renovate as
  a "recommended tool to evaluate" in its manual report — but nothing acts
  on that report.
- No `renovate.json`/`renovate.json5` config previously existed, and no PR
  or issue has ever been authored by `renovate[bot]` in this repo.
- Manually reviewing 166+ GitHub Actions workflows and every npm dev
  dependency for updates is not sustainable.

## Policy summary

| Area | Behavior |
| --- | --- |
| Managers enabled | `npm`, `github-actions` only |
| Schedule | Wednesday before 06:00 UTC (weekly) |
| PR limits | 10 concurrent, 4/hour |
| Labels | `dependencies` (matches existing report issues) |
| Commit style | Conventional commits (`type(scope): …`) |
| Dependency Dashboard | Enabled; majors require checking a box before PR opens |
| Vulnerability alerts | Immediate (not batched); OSV enabled for broader coverage |
| Lockfile maintenance | Weekly |
| GH Actions non-major | Grouped, auto-merge on green CI |
| GH Actions major | Isolated, dashboard-gated, **no** auto-merge |
| npm `devDependencies` non-major | Grouped, auto-merge on green CI |
| npm `dependencies` (any) | **Never** auto-merged — human review required |
| Any major bump | Dashboard-gated, **no** auto-merge |
| Action pin style | Renovate won't force tag→SHA pinning (audit workflows own that) |

## Why is auto-merge so conservative?

Auto-merge is scoped strictly to **low-risk, non-shipped** updates:

- **GitHub Actions non-major bumps** — CI tooling; a broken action fails
  CI loudly and can be reverted immediately.
- **npm `devDependencies` non-major bumps** — never shipped to end users;
  breakage surfaces in `npm test`, not in production.

Everything else — production dependencies (any bump), any major bump,
breaking GitHub Action upgrades — requires:

1. A maintainer to tick the corresponding checkbox in the **Dependency
   Dashboard** issue to open the PR at all, and
2. Manual review and merge of that PR.

This addresses the flagged gap around blind auto-merging: the config
explicitly does **not** auto-merge everything Renovate opens.

## Interaction with existing auto-approve workflows

`trusted-bot-auto-approve.yml` and `auto-approve-clean-prs.yml` already
list `renovate[bot]` in their allowlists. These do **not** need to change:

- **Auto-approve** and **auto-merge** are separate gates. Auto-approve
  simply provides the review; auto-merge is what actually merges.
- Renovate's own `automerge: true` scoping in this config (only non-major
  dev/CI bumps) means production deps and majors will **still wait for a
  human** even after they've been auto-approved.
- If a maintainer later decides to broaden or narrow auto-merge, they edit
  `.github/renovate.json5` — not the auto-approve allowlists.

## Validation

Before committing changes to `.github/renovate.json5`, validate locally:

```bash
npx --yes -p renovate renovate-config-validator .github/renovate.json5
```

Expected output ends with `INFO: Config validated successfully`.

## How to actually turn this on

The config file alone does **nothing**. Renovate must be installed as a
GitHub App by a repository or organization admin:

1. Go to <https://github.com/apps/renovate>.
2. Click **Install** (or **Configure** if it's already installed at the
   org level).
3. Choose the account/organization that owns this repository.
4. Select **Only select repositories** and pick this repository (or
   **All repositories** if the org policy prefers that).
5. Click **Install** / **Save**.
6. Within a few minutes, Renovate will:
   - Open an **onboarding PR** (which can be closed immediately since
     `.github/renovate.json5` already exists and will be detected), **or**
   - If it detects the existing config, skip onboarding and open the
     **Dependency Dashboard** issue directly.
7. Review the Dependency Dashboard issue to see all pending updates,
   including any that require checking a box to open (majors,
   dashboard-gated items).

### Verifying it's working

- A new issue titled **"Dependency Dashboard"** should appear, authored
  by `renovate[bot]`.
- Within one Wednesday cycle, one or more PRs authored by `renovate[bot]`
  should appear (assuming there are pending updates).
- Non-major GH Actions and dev-dependency PRs should auto-merge once CI
  passes; everything else should remain open for human review.

## Adjusting the policy later

Common adjustments:

- **Silence a noisy dependency** — add a `packageRules` entry matching
  it with `enabled: false`.
- **Change the schedule** — edit the top-level `schedule` array
  (and `lockFileMaintenance.schedule`).
- **Broaden auto-merge** — add or extend a `packageRules` entry with
  `automerge: true`. **Do not** enable auto-merge for `matchDepTypes:
  ["dependencies"]` or `matchUpdateTypes: ["major"]` without an explicit
  team decision.
- **Enable additional managers** (e.g., `dockerfile`, `pip`) — add them
  to `enabledManagers`. Only add managers whose file surfaces actually
  exist in this repo.

Always re-run the validator after edits.
