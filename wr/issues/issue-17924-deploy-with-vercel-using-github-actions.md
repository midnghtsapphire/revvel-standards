# WR: [WR] deploy with vercel using github actions

**Issue:** #17924  
**Repository:** [midnghtsapphire/revvel-standards](https://github.com/midnghtsapphire/revvel-standards)  
**Created:** 2026-08-24  
**Research Date:** 2026-08-24  
**Researcher:** Jules (Google) + OpenRouter  
**WR Status:** ✅ Complete

---

## Scope

This Work Request covers the implementation of a GitHub Actions workflow that handles deployments to Vercel. Since automatic deployments triggered by Git pushes are intentionally disabled across the repository (configured via `"git": { "deploymentEnabled": false }` in `vercel.json`), we will route all Vercel deployments through a standard GitHub Actions pipeline utilizing the `hardpixel/deploy-to-vercel-action@v2.0.1` community action.

## Approach

- Create a new GitHub Actions workflow file that triggers on appropriate events (e.g., push to main, workflow_dispatch).
- Use `actions/checkout` to clone the repository.
- Use the `hardpixel/deploy-to-vercel-action@v2.0.1` action to deploy the site to Vercel.
- The action will require environment variables like `VERCEL_TOKEN`, `VERCEL_ORG_ID`, and `VERCEL_PROJECT_ID` mapped to GitHub repository secrets.

## Acceptance Criteria

- [ ] Change delivers the described behavior end-to-end
- [ ] Tests updated / added where applicable
- [ ] Docs updated where applicable (e.g., `docs/SECRETS_MAP.md` updated with the new required secret names, but not values)
- [ ] No regressions in related workflows
- [ ] `npm test` passes 100%
- [ ] `npm run workflows:validate` reports 0 invalid workflows
- [ ] `anti-scaffolding-enforcer.yml` passes
- [ ] PR title follows Conventional Commits

## Risks & Mitigations

- **Secret Leakage:** Supplying the Vercel token directly in the repository configuration presents a security risk. To mitigate this, `VERCEL_TOKEN`, `VERCEL_ORG_ID`, and `VERCEL_PROJECT_ID` will be managed using GitHub Repository Secrets. The workflow will reference these secrets securely via the `${{ secrets.SECRET_NAME }}` interpolation.
- **Downtime / Build Failure:** Incorrect Vercel configurations could result in broken deployments. Mitigated by maintaining a staging environment and executing tests (`npm test` and `npm run workflows:validate`) prior to the final deployment step.

## Competitor & Pricing Intelligence

N/A — This is an internal technical fix.

## Learnings — What & Why

Deploying to Vercel using a GitHub Action provides greater observability and control over the deployment process compared to the native Vercel Git integration. By forcing deployments through GitHub Actions, we can enforce our repository's standard CI gates (e.g., `npm test`, linters, custom policies) before initiating the actual deployment. This ensures a higher bar of quality and prevents potentially breaking changes from being published, aligning with our strict `GREEN_MAIN_STANDARD` principles.
