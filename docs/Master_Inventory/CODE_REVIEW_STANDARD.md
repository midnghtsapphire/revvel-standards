# Revvel Code Review and Deployment Standard

**Version:** 1.1.0
**Date:** April 3, 2026
**Status:** Mandatory Policy

## 1. Introduction

This document outlines the mandatory code review and deployment pipeline for all Revvel and MIDNGHTSAPPHIRE applications. To ensure quality, security, and stability, all code must pass through rigorous automated and AI-driven reviews before reaching production.

## 2. Mandatory Code Review Pipeline

Every commit pushed to any application repository is subject to a multi-tiered AI review process. Human review is secondary to this automated pipeline.

### 2.1. Primary Reviewer: Venice AI

Venice AI is the mandatory primary reviewer for all code before it is pushed to the `main` branch. It acts as the first line of defense, checking for logic errors, adherence to the `MASTER_APP_TEMPLATE.md` standards, and security vulnerabilities. No code may bypass the Venice AI review.

### 2.2. Fallback Reviewers

If Venice AI is unavailable, encounters an error, or flags code that requires a second opinion, the following fallback sequence must be used:

1.  **First Fallback: Claude Sonnet 4.5.** Used for complex logic analysis, architectural review, and deep reasoning tasks where Venice AI requires assistance.
2.  **Second Fallback: DeepSeek V3.2 Speciale.** Used specifically for high-speed, high-volume code scanning and pattern matching if the primary and first fallback systems are engaged or unavailable.

### 2.3. Automated PR Reviews (Coderabbit)

All pull requests (PRs) must integrate with Coderabbit for automated line-by-line review. Coderabbit provides immediate feedback on syntax, style, and common anti-patterns directly within the GitHub PR interface. Developers must address all Coderabbit comments before a PR can be merged.

### 2.4. AI PR Review (PandaOps)

All repositories must include the **PandaOps** GitHub Actions workflow (`omnedia/panda-ops@v1`). PandaOps runs on every pull request, fetches the diff, performs heuristic scanning (e.g. `console.log`, `debugger`, TODOs, large diffs), and then calls OpenAI to post inline code-level feedback and a summary comment directly to the PR.

- **Workflow template:** `templates/cicd/panda-ops.yml` → copy to `.github/workflows/panda-ops.yml`
- **Required secret:** `OPENAI_API_KEY` (add via GitHub → Settings → Secrets and variables → Actions)
- **Interaction with Coderabbit:** PandaOps and Coderabbit operate independently and complement each other — PandaOps focuses on AI reasoning over the full diff while Coderabbit provides line-by-line rule-based checks.
- **Blocking policy:** `fail_on_warnings` defaults to `false`. Set it to `true` in repos where you want AI warnings to block merges at the CI level.

See [`templates/cicd/README.md`](../../templates/cicd/README.md) for full configuration options and setup instructions.

## 3. Deployment Pipeline Structure

The official software development lifecycle for Revvel applications mandates a structured progression through distinct environments to ensure stability.

### 3.1. The Official Dev → Test → Live Pipeline

1.  **Development (Dev):** Local or sandbox environments where initial coding and unit testing occur. Code is frequently changing and unstable.
2.  **Testing (Test / Staging):** A staging environment that mirrors production as closely as possible. Integration tests, end-to-end tests (via Playwright), and final QA are performed here.
3.  **Production (Live):** The live, user-facing environment. Code reaches this stage only after passing all reviews and tests.

### 3.2. Current Operational Exception: Live-First Deployment

*Important Note: While the Dev → Test → Live pipeline is the official standard, we are currently operating under a "Live-First" deployment exception to save time and avoid sandbox environment limitations.*

Currently, code is pushed directly to the `main` branch, triggering immediate deployment to the live production environment. This makes the pre-push AI code review (Section 2) absolutely critical, as there is no staging buffer to catch errors before users see them. The organization plans to transition to the full gated pipeline in the future.

## 4. CI/CD Integration

All deployments are automated via Continuous Integration and Continuous Deployment (CI/CD) pipelines. Manual deployments via SSH or FTP are strictly prohibited except in absolute emergencies.

### 4.1. GitHub Actions (Web & Backend)

GitHub Actions handles the build, test, and deploy phases for all web applications and backend services. Upon a push to `main`, the pipeline automatically builds the project, runs Vitest unit tests, and deploys the application to the designated DigitalOcean Droplet or App Platform. Reference the `templates/cicd/` directory for standard configurations.

### 4.2. CodeMagic (Mobile Applications)

For mobile applications built with React Native and Expo, CodeMagic is the mandatory CI/CD platform. CodeMagic automates the building of iOS and Android binaries, runs necessary tests, and handles direct submission to the Apple App Store and Google Play Store.

## 5. No Force Push Policy

`git push --force` is **permanently banned** across all Revvel and MIDNGHTSAPPHIRE repositories. This policy is non-negotiable and applies to all contributors, automated agents, and CI/CD pipelines without exception.

### 5.1. Why This Policy Exists

On April 3, 2026, a force-push to the `master` branch of the MindMappr repository overwrote two teams' committed work — including the Rex Tools integration and the Activity Window feature. The lost commits required a full manual reconstruction effort. This policy exists to ensure this never happens again.

### 5.2. Enforcement

- GitHub branch protection rules must be enabled on all repos to block force-pushes at the server level.
- Pre-push hooks in CI/CD templates must detect and reject `--force` flags.
- Any force-push attempt triggers an immediate alert to the repository owner.
- If a branch has diverged from `master`, the correct resolution is always `git rebase`, never `git push --force`.

### 5.3. Reference

See [`CONCURRENT_DEVELOPMENT_STANDARD.md`](./CONCURRENT_DEVELOPMENT_STANDARD.md) for the full multi-team coordination workflow and branch protection rules that accompany this policy.

## 6. Security Gates

During the CI/CD process, several security gates are enforced:
-   **Secret Management:** All secrets must be injected via HashiCorp Vault (AppRole + OIDC auth) or GitHub Actions Secrets. Hardcoded credentials will cause an immediate pipeline failure.
-   **Dependency Scanning:** Automated checks for known vulnerabilities in npm/pip packages.
-   **Static Analysis:** Code is scanned for common vulnerabilities (e.g., SQL injection, XSS) before deployment.

## 7. Developer Productivity Analytics (Waydev)

All Revvel and MIDNGHTSAPPHIRE repositories are monitored by the **Waydev GitHub App** for developer productivity analytics. Waydev is installed at the organisation level and requires no per-repository configuration.

### 7.1. What Waydev Tracks

| Metric | Purpose |
|---|---|
| PR cycle time | Flags PRs that sit open longer than 48 hours without review |
| Code churn | Detects excessive rework (> 30% churn triggers a review) |
| Commit frequency | Confirms regular delivery cadence per sprint |
| Deployment frequency | Validates that `main` receives merges at the expected rate |
| Review participation | Ensures code review obligations are being met |

### 7.2. Dashboard Access

- **URL:** https://app.waydev.co
- **Login:** Use GitHub SSO (same account as `midnghtsapphire`)
- **Repositories covered:** All active Revvel application repos

### 7.3. Installation & Evaluation

Waydev was evaluated as part of a 1-week trial. Full setup instructions, pricing, and removal steps are documented in:

→ [`docs/WAYDEV_SETUP.md`](../WAYDEV_SETUP.md)

### 7.4. Scope

Waydev reads only repository *metadata* (commit timestamps, PR titles, author usernames). It does **not** access source code content and has no write permissions to any repository.
