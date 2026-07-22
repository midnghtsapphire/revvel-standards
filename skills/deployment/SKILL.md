# Deployment Skill

Deploy Revvel applications using the Deploy Agent model — a single designated agent handles all production deployments after teams merge to `main`.

## Core Principle

**No individual team deploys to production.** Only the deploy agent pushes to production. Development teams build and merge features via PRs to `main`; the deploy agent handles the rest.

## Deploy Agent 10-Step Checklist

```bash
# Step 1: Pull latest main
git pull origin main

# Step 2: Resolve any merge conflicts (document all resolutions)

# Step 3: TypeScript check — zero errors required
npx tsc --noEmit

# Step 4: Run full test suite — all must pass
npx vitest run

# Step 5: Clean production build — must succeed
npm run build

# Step 6: Fix any build errors, commit as:
git commit -m "fix: deploy agent final cleanup — <description>"

# Step 7: Commit fixes and push
git push origin main

# Step 8: Push to main triggers deployment pipeline

# Step 9: Monitor pipeline; verify SUCCESS status

# Step 10: Verify live site
curl -sL https://<live-url> | head -20
```

## Rules

| Rule | Requirement |
|---|---|
| No individual team deploys | Only deploy agent pushes to production |
| All teams merge to main first | Feature branches merged via PR before deploy agent runs |
| CodeRabbit review required | All PRs must pass before merge |
| Zero TypeScript errors | Deploy agent will not proceed with TS errors |
| All tests must pass | Deploy agent will not proceed with failing tests |
| Build must succeed | Deploy agent will not proceed if build fails |
| Deploy report is mandatory | Every deployment produces a `DEPLOY_REPORT.md` |
| Issues for findings | Bugs/warnings found during deployment → GitHub issues |

## Commit Message Format

All deploy agent fix commits use:
```text
fix: deploy agent cleanup — <description>
```

## Why This Pattern

Multi-team environments risk deploying incomplete/conflicting code when individual teams deploy from their own context. The deploy agent model:
- Sees the full integrated state of `main`
- Catches conflicts between teams' merged changes
- Provides a single point of accountability
- Prevents partial/broken deployments

## Integration

- **CODE_REVIEW_STANDARD** — all PRs pass CodeRabbit before merge
- **CONCURRENT_DEVELOPMENT_STANDARD** — teams use feature branches, merge via PR
- **AUTO_DOCUMENTATION_STANDARD** — deploy reports and changelogs generated per deployment
- **DigitalOcean App Platform** — push to `main` triggers auto-deploy
