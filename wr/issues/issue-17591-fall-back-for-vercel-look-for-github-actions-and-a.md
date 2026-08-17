# WR: [WR] Fall back for VERCEL look for github actions and apps and search the deep indexed mm web for foss and within our own teams

**Issue:** #17591  
**Repository:** [midnghtsapphire/revvel-standards](https://github.com/midnghtsapphire/revvel-standards)  
**Created:** 2026-08-14  
**Research Date:** 2026-08-14  
**Researcher:** Jules (Google) + OpenRouter  
**WR Status:** ✅ Complete

---

## Scope

The scope of this WR is to implement a robust, automated fallback mechanism for Vercel deployments utilizing GitHub Actions and GitHub Apps. This includes creating the necessary GitHub Actions workflows, securely configuring required deployment secrets, and integrating with the existing Skills Vault.

## Approach

1. **Create Fallback Workflow:** Generate a new file `.github/workflows/vercel-fallback.yml` utilizing standard FOSS deployment actions (e.g., standard GitHub Pages or alternative serverless FOSS targets).
2. **Configure Triggers:** Set the `on:` block to include `workflow_dispatch` (for manual fallback) and `repository_dispatch` (to allow monitoring agents to trigger the fallback autonomously during Vercel outages).
3. **Secrets Management:** Document and enforce the addition of the new deployment target's API keys into `docs/SECRETS_MAP.md`. Do not hardcode any credentials in the workflow file.
4. **Skills Vault Integration:** Call the existing deployment scripts mapped in `skills/` to ensure the build process remains identical to the primary Vercel pipeline, guaranteeing cross-repository consistency.
5. **Prime Directive Compliance:** Ensure the entire fallback process can be triggered without human intervention and completes end-to-end within the repository's strict automation requirements.

## Acceptance Criteria

- [ ] Change delivers the described behavior end-to-end
- [ ] Tests updated / added where applicable
- [ ] Docs updated where applicable
- [ ] No regressions in related workflows
- [ ] `.github/workflows/vercel-fallback.yml` is created and passes workflow validation.
- [ ] Required secrets for the fallback deployment target are documented in `docs/SECRETS_MAP.md`.
- [ ] The fallback deployment workflow executes successfully via a `workflow_dispatch` test run.

## Acknowledgements

Permanent for every WR type — implementers must not stop at the issue:

- [x] This WR defines a bundled outcome, not just a minimum acceptable patch.
- [x] Explicitly requested secondary items should not be silently deferred.
- [x] If the PR is partial, the blocker must be documented.
- [x] The PR should reflect the WR's required bundle and definition of done.
- [x] After implementation, open a PR and continue the loop (reset routing labels / trigger downstream workflows) instead of stopping at the issue.

## Risks & Mitigations

- **Risk:** Incomplete build parity between Vercel and the fallback FOSS target.
  - **Mitigation:** Rely exclusively on the unified build scripts in the `skills/` vault for both deployment routes to ensure identical artifacts.
- **Risk:** Secrets sprawl across multiple providers.
  - **Mitigation:** Strictly register all new fallback credentials in `docs/SECRETS_MAP.md` and enforce rotation policies.

## Competitor & Pricing Intelligence

Pricing data pending — competitive benchmark research required.

## Learnings — What & Why

Relying exclusively on a single vendor (Vercel) creates a single point of failure, which violates the Prime Directive's mandate for uninterrupted, high-availability operations. By establishing an automated GitHub Actions fallback leveraging FOSS tools, we ensure the fleet can autonomously route around provider outages, significantly increasing the resilience of our production applications.
