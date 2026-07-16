# Revvel Code Review and Deployment Standard

**Version:** 1.2.0  
**Date:** May 6, 2026  
**Status:** Mandatory Policy

## 1. Introduction

This document outlines the mandatory code review and deployment pipeline for all Revvel and MIDNGHTSAPPHIRE applications. To ensure quality, security, and stability, all code must pass through rigorous automated and AI-driven reviews before reaching production.

## 2. Mandatory Code Review Pipeline

Every commit pushed to any application repository is subject to a multi-tiered AI review process. Human review is secondary to this automated pipeline.

### 2.1. Primary Reviewer: Bito AI

Bito AI is the primary reviewer for all code before it is pushed to the `main` branch.

**Setup:**
- Enable via GitHub Marketplace: <https://github.com/marketplace/bito-ai-code-reviewer>
- Or use the `openrouter-assignee.yml` workflow

### 2.2. Fallback Reviewers

If Bito AI is unavailable, encounters an error, or flags code that requires a second opinion, the following fallback sequence must be used:

1. **First Fallback: OpenRouter (Claude Sonnet 4).**  
   Used for complex logic analysis, architectural review, and deep reasoning tasks. Use the `ai-code-reviewer-pro.yml` template.

2. **Second Fallback: AI Code Reviewer Pro (OpenRouter/gemini-2.5-flash).**  
   Used specifically for high-speed, high-volume code scanning and pattern matching. Copy from `templates/cicd/ai-code-reviewer-pro.yml`.

### 2.3. Automated PR Reviews (Coderabbit)

All pull requests (PRs) must integrate with Coderabbit for automated line-by-line review. Coderabbit provides immediate feedback on syntax, style, and common anti-patterns directly within the GitHub PR interface. Developers must address all Coderabbit comments before a PR can be merged.

**Setup:**
1. Enable via GitHub Marketplace: <https://github.com/marketplace/coderabbit-ai>
2. Or add `.coderabbit.yaml` to repository root

### 2.4. Skill/LLM Testing (PromptFoo)

PromptFoo provides GitHub Action integration for testing prompts and LLM outputs.

**Primary Model: Claude Sonnet 4 via OpenRouter**
```yaml
providers:
  - id: anthropic/claude-sonnet-4
    config:
      api_key: ${OPENROUTER_API_KEY}
      base_url: https://openrouter.ai/api/v1
      temperature: 0
```

**Fallback: Claude Sonnet 4.5**
```yaml
  - id: anthropic/claude-sonnet-4.5
    config:
      api_key: ${OPENROUTER_API_KEY}
      base_url: https://openrouter.ai/api/v1
      temperature: 0
```

**GitHub Action:** <https://github.com/promptfoo/promptfoo-action>

### 2.5. MCP Code Review Server (Optional)

For local/dev-time scanning, use the `code-review-mcp-server`:

```bash
# Clone and build
git clone https://github.com/midnghtsapphire/code-review-mcp-server ~/mcp/code-review
cd ~/mcp/code-review && npm install && npm run build

# Add to .mcp.json
"code-review": {
  "command": "node",
  "args": ["${CODE_REVIEW_MCP_PATH}/dist/index.js"]
}
```

Tools available:
- `validate_deployment_readiness` — Gate check for dev/test/live
- `detect_security_issues` — XSS, injection, unsafe regex, secrets
- `scan_accessibility` — WCAG 2.1 scan

See [`docs/MCP_REVVEL_CATALOG.md`](../../MCP_REVVEL_CATALOG.md) for full documentation.

## 3. Deployment Pipeline Structure

The official software development lifecycle for Revvel applications mandates a structured progression through distinct environments to ensure stability.

### 3.1. The Official Dev → Test → Live Pipeline

1. **Development (Dev):** Local or sandbox environments where initial coding and unit testing occur. Code is frequently changing and unstable.
2. **Testing (Test / Staging):** A staging environment that mirrors production as closely as possible. Integration tests, end-to-end tests (via Playwright), and final QA are performed here.
3. **Production (Live):** The live, user-facing environment. Code reaches this stage only after passing all reviews and tests.

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
- **Secret Management:** All secrets must be injected via HashiCorp Vault (AppRole + OIDC auth) or GitHub Actions Secrets. Hardcoded credentials will cause an immediate pipeline failure.
- **Dependency Scanning:** Automated checks for known vulnerabilities in npm/pip packages.
- **Static Analysis:** Code is scanned for common vulnerabilities (e.g., SQL injection, XSS) before deployment.

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

- **URL:** <https://app.waydev.co>
- **Login:** Use GitHub SSO (same account as `midnghtsapphire`)
- **Repositories covered:** All active Revvel application repos

### 7.3. Installation & Evaluation

Waydev was evaluated as part of a 1-week trial. Full setup instructions, pricing, and removal steps are documented in:

→ [`docs/WAYDEV_SETUP.md`](../WAYDEV_SETUP.md)

### 7.4. Scope

Waydev reads only repository *metadata* (commit timestamps, PR titles, author usernames). It does **not** access source code content and has no write permissions to any repository.
