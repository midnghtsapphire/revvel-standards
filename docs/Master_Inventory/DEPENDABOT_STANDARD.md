# Revvel Dependabot Standard

**Version:** 1.0.0  
**Date:** April 14, 2026  
**Status:** Mandatory Policy  
**Author:** Audrey Evans (MIDNGHTSAPPHIRE)

---

## 1. Introduction

Dependabot is GitHub's built-in automated dependency management tool. It keeps your project dependencies up to date and alerts you to known security vulnerabilities — without manual intervention. Every Revvel project must have Dependabot configured from day one.

This document defines the standard configuration, integration patterns, and best practices for Dependabot across all Revvel applications.

---

## 2. What Is Dependabot

Dependabot is a GitHub-native tool that does three things:

| Feature | What It Does |
|---|---|
| **Dependabot Alerts** | Scans your dependency graph for known CVEs (Common Vulnerabilities and Exposures) and notifies you |
| **Dependabot Security Updates** | Automatically opens PRs to patch vulnerable dependencies |
| **Dependabot Version Updates** | Automatically opens PRs to bump dependencies to their latest versions on a schedule |

### How It Works

1. GitHub indexes your `package.json`, `requirements.txt`, `Dockerfile`, etc. into the **Dependency Graph**
2. When a new CVE is published to the **GitHub Advisory Database**, Dependabot matches it against your graph
3. For security updates: a PR is opened immediately (no schedule)
4. For version updates: PRs are opened on the configured schedule (daily / weekly / monthly)

### Where It Fits in the Revvel Pipeline

```text
Code Push / PR
      ↓
CI Workflow (ci.yml)
  - TypeScript check
  - Unit tests
  - E2E tests
      ↓
Security Workflow (security.yml)
  - pnpm audit
  - TruffleHog secret scan
      ↓                          ← Dependabot operates here (parallel to CI)
Dependabot
  - Dependency Graph scan
  - CVE matching
  - Version currency check
  - Auto-opens PRs
      ↓
Deploy Workflow (deploy.yml)
  - Production deployment
```

Dependabot runs **in parallel** with your CI/CD pipelines. It is not a step inside your workflows — it is a GitHub platform feature that operates continuously on your repository.

---

## 3. Prerequisites

Before Dependabot can work, enable these settings in **Repository Settings → Code security and analysis**:

| Setting | Required For | How to Enable |
|---|---|---|
| **Dependency graph** | All Dependabot features | Always on for public repos; toggle on for private repos |
| **Dependabot alerts** | Security CVE notifications | Enable after Dependency graph |
| **Dependabot security updates** | Auto-PRs for security patches | Enable after Dependabot alerts |
| **Dependabot version updates** | Scheduled version bump PRs | Configured via `.github/dependabot.yml` |

> **Note for private repositories:** The dependency graph and Dependabot alerts require GitHub Advanced Security for private repos on certain plans. Check your organization's GitHub plan at `https://github.com/organizations/midnghtsapphire/settings/billing`.

---

## 4. Configuration: `.github/dependabot.yml`

### 4.1. Minimal Configuration (npm projects)

```yaml
# .github/dependabot.yml
version: 2

updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
      day: "monday"
      time: "06:00"
      timezone: "America/New_York"
```

### 4.2. Standard Revvel Configuration

Copy `templates/cicd/dependabot.yml` to `.github/dependabot.yml` in your app repo:

```bash
cp templates/cicd/dependabot.yml .github/dependabot.yml
```

Then replace the placeholders:

| Placeholder | Replace With |
|---|---|
| `OWNER_USERNAME` | Your GitHub username (e.g., `midnghtsapphire`) |

### 4.3. Full Configuration Reference

```yaml
version: 2

updates:
  # ── npm / pnpm / yarn ──────────────────────────────────────────────────────
  - package-ecosystem: "npm"
    directory: "/"                          # Root package.json
    schedule:
      interval: "weekly"
      day: "monday"
      time: "06:00"
      timezone: "America/New_York"
    open-pull-requests-limit: 10            # Max open PRs at once
    target-branch: "main"
    labels:
      - "dependencies"
      - "automated"
    assignees:
      - "OWNER_USERNAME"                    # Replace with your GitHub username
    reviewers:
      - "OWNER_USERNAME"
    commit-message:
      prefix: "chore"
      prefix-development: "chore"
      include: "scope"
    # Group related updates into a single PR (reduces PR noise)
    groups:
      production-dependencies:
        dependency-type: "production"
        update-types:
          - "minor"
          - "patch"
      development-dependencies:
        dependency-type: "development"
        update-types:
          - "minor"
          - "patch"
    # Never auto-update these (require manual review)
    ignore:
      - dependency-name: "*"
        update-types: ["version-update:semver-major"]

  # ── GitHub Actions ─────────────────────────────────────────────────────────
  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "weekly"
      day: "monday"
      time: "06:00"
      timezone: "America/New_York"
    open-pull-requests-limit: 5
    labels:
      - "dependencies"
      - "github-actions"
    commit-message:
      prefix: "ci"

  # ── Docker ─────────────────────────────────────────────────────────────────
  # Uncomment if your project uses Docker
  # - package-ecosystem: "docker"
  #   directory: "/"
  #   schedule:
  #     interval: "weekly"
  #     day: "monday"
  #   labels:
  #     - "dependencies"
  #     - "docker"

  # ── Python (pip) ───────────────────────────────────────────────────────────
  # Uncomment if your project has Python dependencies
  # - package-ecosystem: "pip"
  #   directory: "/"
  #   schedule:
  #     interval: "weekly"
  #   labels:
  #     - "dependencies"
  #     - "python"
```

### 4.4. Schedule Options

| Interval | When It Runs | Use Case |
|---|---|---|
| `daily` | Every day at the configured time | Fast-moving projects, high security requirements |
| `weekly` | Once per week (default: Monday) | **Standard Revvel recommendation** |
| `monthly` | First weekday of the month | Stable / low-churn projects |

> **Recommendation:** Use `weekly` for all production Revvel apps. Daily is noisy; monthly means you fall behind.

### 4.5. Supported Package Ecosystems

| Ecosystem | `package-ecosystem` Value | Manifest File |
|---|---|---|
| npm / pnpm / yarn | `npm` | `package.json` |
| Python pip | `pip` | `requirements.txt`, `Pipfile`, `pyproject.toml` |
| Docker | `docker` | `Dockerfile` |
| GitHub Actions | `github-actions` | `.github/workflows/*.yml` |
| Go modules | `gomod` | `go.mod` |
| Ruby gems | `bundler` | `Gemfile` |
| Rust cargo | `cargo` | `Cargo.toml` |
| Java/Kotlin (Maven) | `maven` | `pom.xml` |
| Java/Kotlin (Gradle) | `gradle` | `build.gradle` |
| .NET (NuGet) | `nuget` | `*.csproj`, `packages.config` |
| Terraform | `terraform` | `*.tf` |

---

## 5. Workflow Integration

### 5.1. How Dependabot PRs Trigger CI

When Dependabot opens a PR, it triggers your standard CI workflow (`ci.yml`) exactly like any other PR. No special configuration is needed.

```text
Dependabot opens PR
      ↓
GitHub triggers: pull_request event
      ↓
ci.yml runs:
  - TypeScript check   ✅/❌
  - Unit tests         ✅/❌
  - E2E tests          ✅/❌
      ↓
security.yml runs:
  - pnpm audit         ✅/❌
  - TruffleHog         ✅/❌
      ↓
PR is either ready to merge or blocked by CI
```

### 5.2. Dependency Review Action

The `actions/dependency-review-action` compares dependency changes between the base and head of a PR and blocks merges that introduce known vulnerabilities.

> **Important:** This action requires **GitHub Advanced Security** and **Dependency Graph** to be enabled. If these are not available, use `pnpm audit` in `security.yml` as the equivalent check.

```yaml
# In ci.yml — only add if GitHub Advanced Security is confirmed available
- name: Dependency Review
  uses: actions/dependency-review-action@v4
  with:
    fail-on-severity: high
    deny-licenses: GPL-2.0, AGPL-3.0
```

**When NOT to use `dependency-review-action`:**
- Private repos without GitHub Advanced Security enabled
- Repositories on the free GitHub plan
- When `pnpm audit` in `security.yml` already provides equivalent coverage

### 5.3. Auto-Merge for Dependabot PRs

For patch and minor security updates with passing CI, auto-merge reduces manual overhead:

```yaml
# .github/workflows/dependabot-auto-merge.yml
name: Dependabot Auto-Merge

on: pull_request

permissions:
  contents: write
  pull-requests: write

jobs:
  auto-merge:
    name: Auto-merge Dependabot PRs
    runs-on: ubuntu-latest
    if: github.actor == 'dependabot[bot]'

    steps:
      - name: Fetch Dependabot metadata
        id: metadata
        uses: dependabot/fetch-metadata@v2
        with:
          github-token: "${{ secrets.GITHUB_TOKEN }}"

      - name: Auto-merge patch updates
        if: |
          steps.metadata.outputs.update-type == 'version-update:semver-patch' ||
          steps.metadata.outputs.update-type == 'version-update:semver-minor'
        run: gh pr merge --auto --squash "$PR_URL"
        env:
          PR_URL: ${{ github.event.pull_request.html_url }}
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

> **Rule:** Only auto-merge `patch` and `minor` updates where CI passes. Always require manual review for `major` updates.

---

## 6. Best Practices

### 6.1. Group Related Updates

Without grouping, a project with 50 dependencies generates 50 separate PRs per week. Use `groups` to batch them:

```yaml
groups:
  # All non-major production dep updates → 1 PR
  production-dependencies:
    dependency-type: "production"
    update-types: ["minor", "patch"]
  
  # All non-major dev dep updates → 1 PR
  development-dependencies:
    dependency-type: "development"
    update-types: ["minor", "patch"]
  
  # Linting tools together
  linting:
    patterns:
      - "eslint*"
      - "prettier*"
      - "@typescript-eslint/*"
    update-types: ["minor", "patch"]
```

### 6.1.1. Monorepo rule — split-deps-per-directory (mandatory)

Formal verification on PR #16791 (`structural_conflict`, WR #16950) chose **path A
`split-deps-per-directory`** over path B `dependabot-group-bump` when a single
`npm_and_yarn` group spanned 10 directories. Cross-directory group bumps are a
formal fail in this monorepo.

**Hard rules** (enforced by `scripts/check-dependabot-split-deps.js` +
`tests/dependabot-split-deps.test.js`):

| Rule | Why |
| --- | --- |
| One `directory:` per `updates[]` entry | Never use `directories:` (plural) — Dependabot will open multi-dir PRs |
| Group names unique + directory-scoped | Shared names (e.g. `npm_and_yarn`) recreate path B |
| Never name a group `npm_and_yarn` / `npm-and-yarn` | That pattern produced the #16791 conflict |
| Within one directory, group patch+minor | Noise control is fine **inside** a single package root |
| Majors stay ignored / human-reviewed | Same as §6.2 |

```yaml
# ✅ Path A — one directory, scoped group name
- package-ecosystem: "npm"
  directory: "/products/affiliate-hub"
  groups:
    affiliate-hub-patch-minor:
      update-types: ["minor", "patch"]

# ❌ Path B — multi-directory group bump (formal structural_conflict)
- package-ecosystem: "npm"
  directories: ["/", "/products/affiliate-hub"]
  groups:
    npm_and_yarn:
      patterns: ["*"]
```

Validate anytime:

```bash
node scripts/check-dependabot-split-deps.js
node --test tests/dependabot-split-deps.test.js
```

### 6.2. Always Block Major Updates from Auto-Merge

Major version bumps (`1.x → 2.x`) often contain breaking changes. Always require manual review:

```yaml
ignore:
  - dependency-name: "*"
    update-types: ["version-update:semver-major"]
```

### 6.3. Prioritize Security Updates

Security updates bypass your configured schedule and open immediately. Do not delay reviewing them:

- **Critical / High CVE:** Review and merge within 24 hours
- **Medium CVE:** Review and merge within 1 week
- **Low CVE:** Review during normal sprint cycle

### 6.4. Update GitHub Actions Regularly

Outdated GitHub Actions are a security risk (supply chain attacks). Enable the `github-actions` ecosystem:

```yaml
- package-ecosystem: "github-actions"
  directory: "/"
  schedule:
    interval: "weekly"
```

This keeps `actions/checkout`, `actions/setup-node`, and other actions pinned to recent, reviewed versions.

### 6.5. Test Dependency Updates Before Merging

Your CI pipeline is the test harness for Dependabot PRs. Ensure these gates exist:

- [ ] TypeScript compilation passes (`pnpm check`)
- [ ] Unit tests pass (`pnpm test`)
- [ ] E2E tests pass (`pnpm test:e2e`)
- [ ] `pnpm audit` reports no new high/critical CVEs

If any gate fails, investigate the breaking change before merging.

---

## 7. Handling Breaking Changes

### 7.1. When CI Fails on a Dependabot PR

1. Check which test is failing in the CI run
2. Read the dependency's changelog / migration guide (usually linked in the PR description)
3. Apply the breaking change fix in a **separate PR** targeting the Dependabot branch:
   ```bash
   git fetch origin
   git checkout -b fix/upgrade-[package] origin/dependabot/npm_and_yarn/[package]-[version]
   # Make your changes
   git push origin fix/upgrade-[package]
   # Open PR targeting the Dependabot branch
   ```
4. Merge your fix PR into the Dependabot branch, then merge the Dependabot PR into `main`

### 7.2. When to Close a Dependabot PR

Close (don't merge) a Dependabot PR when:
- The new version is incompatible with your current architecture
- The update is blocked by another dependency (lock contention)
- You need to delay for a planned migration sprint

Always leave a comment explaining why it was closed.

---

## 8. Troubleshooting

### 8.1. "Dependency review is not supported on this repository

**Cause:** `actions/dependency-review-action` requires GitHub Advanced Security and Dependency Graph.

**Fix Options:**
1. Enable GitHub Advanced Security in **Repository Settings → Code security and analysis**
2. Remove `dependency-review-action` from `ci.yml` — your `security.yml` `pnpm audit` provides equivalent coverage without the prerequisite
3. Keep the job but add `continue-on-error: true` to prevent it from blocking PRs

### 8.2. Dependabot PRs Not Appearing

**Check:**
- Is `.github/dependabot.yml` present and valid YAML?
- Is the `package-ecosystem` value spelled correctly?
- Is the `directory` path correct? (Use `/` for root, `/packages/app` for monorepos)
- Are Dependabot version updates enabled in **Repository Settings → Code security and analysis**?

**Validate your config:**
```bash
# Install and run the dependabot-config validator
npx @dependabot/config-validator .github/dependabot.yml
```

### 8.3. Too Many Open PRs

**Cause:** `open-pull-requests-limit` not set, or grouping not configured.

**Fix:**
```yaml
open-pull-requests-limit: 10   # Hard cap on concurrent Dependabot PRs

groups:
  all-non-major:
    update-types: ["minor", "patch"]
```

### 8.4. Dependabot Can't Access Private Registry

Add a `registries` block to `.github/dependabot.yml`:

```yaml
version: 2

registries:
  private-npm:
    type: npm-registry
    url: https://npm.pkg.github.com
    token: ${{ secrets.DEPENDABOT_REGISTRY_TOKEN }}

updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    registries:
      - private-npm
```

Then add `DEPENDABOT_REGISTRY_TOKEN` to **Repository Settings → Secrets and variables → Dependabot secrets**.

### 8.5. Dependabot Conflicts With Other PRs

Dependabot rebases its PRs automatically when the target branch changes. If a conflict cannot be auto-resolved, Dependabot comments on the PR. To manually resolve:

```bash
git fetch origin
git checkout dependabot/npm_and_yarn/[package]-[version]
git rebase origin/main
# Resolve conflicts
git push --force-with-lease
```

---

## 9. Dependabot vs. Other Security Tools in the Revvel Stack

| Tool | What It Catches | When It Runs |
|---|---|---|
| **Dependabot Alerts** | Known CVEs in dependencies | Continuously (real-time) |
| **Dependabot Security Updates** | Same CVEs — but opens a PR fix | Immediately on CVE publication |
| **`pnpm audit`** (security.yml) | Known CVEs in dependencies | Every push + PR + weekly |
| **TruffleHog** (security.yml) | Leaked secrets in git history | Every push + PR + weekly |
| **OWASP ZAP** (optional) | Runtime application vulnerabilities | Pre-production releases |
| **Snyk** (optional) | CVEs + license issues + code issues | CI / continuous |

**Recommendation:** Use Dependabot + `pnpm audit` + TruffleHog as the baseline. Add Snyk or OWASP ZAP for high-compliance or fintech/healthtech projects.

---

## 10. Checklist: Dependabot Setup for New Projects

Run this checklist when bootstrapping a new Revvel project:

- [ ] Enable **Dependency graph** in Repository Settings → Code security and analysis
- [ ] Enable **Dependabot alerts** in Repository Settings → Code security and analysis
- [ ] Enable **Dependabot security updates** in Repository Settings → Code security and analysis
- [ ] Copy `templates/cicd/dependabot.yml` → `.github/dependabot.yml`
- [ ] Replace `OWNER_USERNAME` placeholder with your GitHub username
- [ ] Add `dependencies` and `automated` labels to the repository (see `docs/GITHUB_PROJECTS_SETUP.md`)
- [ ] Confirm CI workflow runs on `pull_request` events (required for Dependabot PRs to get checked)
- [ ] Optionally add `templates/cicd/dependabot-auto-merge.yml` → `.github/workflows/dependabot-auto-merge.yml`
- [ ] Verify first Dependabot PR appears within 24 hours of adding the config

---

## 11. Related Standards

| Document | Relevance |
|---|---|
| `docs/Master_Inventory/SECURITY_STANDARD.md` | Overall security requirements; Section 8 covers dependency scanning |
| `templates/cicd/security.yml` | The `pnpm audit` workflow that complements Dependabot |
| `templates/cicd/ci.yml` | The CI workflow that Dependabot PRs trigger |
| `docs/GITHUB_PROJECTS_SETUP.md` | Label setup for `dependencies` and `automated` labels |
| `docs/Master_Inventory/DEPLOYMENT_STANDARD.md` | How vetted dependency updates flow through to production |
