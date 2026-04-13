# Auto-Documentation Skill

Automatically generate and maintain project documentation including changelogs, API docs, and session artifacts.

## Core Principle

**No change goes undocumented.** Every action on a repository, server, or configuration must leave an automated trail. Documentation is a first-class citizen, on par with code itself.

## Mandatory Repository Artifacts

### CHANGELOG.md (Required in Every Repo)

- Must exist in the root directory of every repository
- Format: [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) + Semantic Versioning
- Auto-updated by GitHub Action on every push to `main`
- Must capture: **timestamp**, **description** (from commit/PR title), **author** (developer or AI agent name)

```yaml
# GitHub Action trigger
on:
  push:
    branches: [main]
```

### Automated API Documentation

- Tools: Swagger (OpenAPI) or TypeDoc — integrated into build process
- Hosting: GitHub Pages or `/docs` route on deployed app
- Must update simultaneously with code deployment (always reflects live environment)

### Deploy Report (`DEPLOY_REPORT.md`)

Every deployment must produce a `DEPLOY_REPORT.md` documenting:
- What was deployed
- TypeScript check result
- Test suite result
- Build result
- Any fixes made by the deploy agent
- Live verification result

## Infrastructure Documentation

### INFRASTRUCTURE_MAP.md (SSOT)

`INFRASTRUCTURE_MAP.md` in `revvel-standards` is the absolute single source of truth for all infrastructure, domains, and server configurations.

Any script or pipeline that:
- Provisions a new droplet
- Updates a DNS record
- Changes a deployment port

...must automatically trigger an update to `INFRASTRUCTURE_MAP.md`.

### Sprint State and Handoffs

`SPRINT_STATE.md` (or project-specific `/docs` equivalent) should auto-pull:
- Number of commits since last sprint
- Open issues count
- Recent deployments
- Real-time project health snapshot for agent handoffs

## CI/CD Gates

- GitHub Actions pipelines **fail** if `CHANGELOG.md` is missing
- Pipelines **fail** if the automated update script fails
- AI reviewers (Venice AI, Claude) reject PRs that bypass automated logging systems

## Compliance

Every repo in the organization must have:
- [ ] `CHANGELOG.md` in root directory
- [ ] Automated changelog update GitHub Action
- [ ] API documentation generation configured (Swagger/TypeDoc)
- [ ] `DEPLOY_REPORT.md` generated per deployment
- [ ] `INFRASTRUCTURE_MAP.md` updated on infrastructure changes
