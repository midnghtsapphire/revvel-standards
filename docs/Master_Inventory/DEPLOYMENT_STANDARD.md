# Deployment Standard

**Author:** Revvel DevOps  
**Title:** DEPLOYMENT_STANDARD  
**Description:** Defines the mandatory deployment workflow where multiple teams develop on feature branches, merge to main, and a single deploy agent handles the final production deployment.  
**Date:** 2026-04-03  
**SEO Keywords:** deployment standard, deploy agent, CI/CD, production deployment, multi-team workflow, revvel standards  

---

## Overview

   This standard establishes the deployment pattern used across all Revvel and GlowStarLabs projects. The core principle is separation of concerns: development teams build and merge features, but **no individual team deploys to production**. A single designated deploy agent is responsible for the final production deployment.

   This pattern prevents partial deployments, ensures all team contributions are integrated before going live, and provides a single point of accountability for production readiness.

---

## The Deploy Agent Model

   The deploy agent is the sole authority for pushing code to production. This role may be filled by a person, an automated pipeline, or a combination of both. The deploy agent follows a strict 10-step checklist before any production deployment.

### Step 1: Pull Latest Main

   The deploy agent clones or pulls the latest `main` branch, which contains all merged work from every team.

```bash
git clone <repo-url>
cd <repo>
git pull origin main
```

### Step 2: Resolve Any Merge Conflicts

   If any merge conflicts exist on main (which should not happen if teams follow the concurrent development standard), the deploy agent resolves them before proceeding. All conflict resolutions are documented in the deploy report.

### Step 3: Run TypeScript Check

   The deploy agent runs a full TypeScript type check to catch any type errors introduced by merged code.

```bash
npx tsc --noEmit
```

   Every TypeScript error must be resolved before proceeding. Zero errors is the only acceptable result.

### Step 4: Run Full Test Suite

   The deploy agent runs the complete test suite to verify all tests pass.

```bash
npx vitest run
```

   All tests must pass. Any failing tests are fixed or documented with a corresponding GitHub issue before deployment proceeds.

### Step 5: Run Clean Build

   The deploy agent runs a clean production build.

```bash
npm run build
```

   The build must succeed without errors. Warnings are documented but do not block deployment unless they indicate functional issues.

### Step 6: Fix Any Build Errors

   If the build fails, the deploy agent diagnoses and fixes the errors. Common issues include missing dependencies, incorrect import paths, or environment variable misconfigurations. All fixes are committed with the message format:

```text
fix: deploy agent cleanup — <description>
```

### Step 7: Commit Fixes

   Any fixes made by the deploy agent are committed to main with a clear, descriptive commit message.

```bash
git add -A
git commit -m "fix: deploy agent final cleanup — <description>"
git push origin main
```

### Step 8: Push to Main

   The deploy agent pushes the final, verified code to the main branch. This push triggers the deployment pipeline (e.g., DigitalOcean App Platform auto-deploy).

### Step 9: Trigger and Verify Deployment

   The deploy agent monitors the deployment pipeline to confirm it completes successfully. This includes:

- Checking the deployment platform status (e.g., via API or dashboard)
- Waiting for the build and deploy steps to reach SUCCESS status
- Verifying the live URL returns the expected HTML and renders correctly

```bash
curl -sL https://<live-url> | head -20
```

### Step 10: Verify Live Site

   The deploy agent performs a final verification of the live site:

- Confirms the page loads (not blank)
- Checks that the React app mounts and renders content
- Verifies key routes are accessible
- Documents the verification in the deploy report

---

## Rules

| Rule | Description |
|------|-------------|
| No individual team deploys | Only the deploy agent pushes to production |
| All teams merge to main first | Feature branches are merged via PR before the deploy agent runs |
| CodeRabbit review required | All PRs must pass CodeRabbit automated review before merge |
| Zero TypeScript errors | The deploy agent will not deploy with any TS errors |
| All tests must pass | The deploy agent will not deploy with failing tests |
| Build must succeed | The deploy agent will not deploy if the build fails |
| Issues are created for findings | Any bugs, warnings, or issues found during deployment are logged as GitHub issues |
| Deploy report is mandatory | Every deployment produces a DEPLOY_REPORT.md documenting what was done |

---

## Why This Pattern

   In multi-team environments, individual teams often have incomplete context about what other teams have merged. Deploying from a single team's perspective risks:

- Deploying code that conflicts with another team's changes
- Missing environment variable configurations
- Shipping broken builds because one team's changes break another team's features
- Inconsistent deployment configurations across team members

   The deploy agent model eliminates these risks by centralizing the deployment decision and verification process.

---

## Integration with Other Standards

   This standard works in conjunction with:

- **CODE_REVIEW_STANDARD.md** — All PRs must pass CodeRabbit review before merge
- **CONCURRENT_DEVELOPMENT_STANDARD.md** — Teams work on feature branches and merge to main via PR
- **AUTO_DOCUMENTATION_STANDARD.md** — Deploy reports and changelogs are generated for every deployment

---

## References

- [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)
- [Semantic Versioning](https://semver.org/spec/v2.0.0.html)
- [DigitalOcean App Platform Docs](https://docs.digitalocean.com/products/app-platform/)
