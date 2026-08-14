# WR: [WR] Fall back for VERCEL look for github actions and apps and search the deep indexed mm web for foss and within our own teams

**Issue:** #17591  
**Repository:** [midnghtsapphire/revvel-standards](https://github.com/midnghtsapphire/revvel-standards)  
**Created:** 2026-08-14  
**Research Date:** 2026-08-14  
**Researcher:** Jules (Google) + OpenRouter  
**WR Status:** ✅ Complete

---

## Scope

- **In Scope:** Research and integration of fallback CI/CD deployment paths using GitHub Actions, GitHub Apps, and FOSS alternatives to Vercel.
- **In Scope:** Implementation of a resilient deployment pipeline that defaults to Vercel but automatically routes to an alternative hosting solution (e.g., GitHub Pages, Cloudflare Pages, or internal FOSS infrastructure) upon failure.
- **Out of Scope:** Full migration of existing stable Vercel deployments; this is strictly a fallback and resilience mechanism.

## Approach

1. **Trigger Definition:** Configure a primary deployment workflow that detects Vercel timeouts, build failures, or API unavailability.
2. **GitHub Actions Integration:** Create a fallback deployment workflow (`.github/workflows/fallback-deploy.yml`) that triggers when Vercel fails.
3. **FOSS & Internal Discovery:** Prioritize internally managed solutions and deep-indexed FOSS deployment platforms (e.g., Coolify, Dokku) as the secondary target.
4. **Implementation:** Use containerization (Docker) to ensure build consistency between Vercel and the fallback provider.

## Acceptance Criteria

- [ ] Change delivers the described behavior end-to-end
- [ ] Tests updated / added where applicable
- [ ] Docs updated where applicable
- [ ] No regressions in related workflows

## Acknowledgements

Permanent for every WR type — implementers must not stop at the issue:

- [x] This WR defines a bundled outcome, not just a minimum acceptable patch.
- [x] Explicitly requested secondary items should not be silently deferred.
- [x] If the PR is partial, the blocker must be documented.
- [x] The PR should reflect the WR's required bundle and definition of done.
- [x] After implementation, open a PR and continue the loop (reset routing labels / trigger downstream workflows) instead of stopping at the issue.

## Risks & Mitigations

- **Risk:** Build environment inconsistencies between Vercel and the fallback target.
  **Mitigation:** Standardize the build process using Docker to guarantee identical behavior across hosting platforms.
- **Risk:** DNS routing delays during failover.
  **Mitigation:** Implement health checks and active failover routing at the DNS/CDN level (e.g., Cloudflare) to minimize downtime.
- **Risk:** Secret sprawl across multiple fallback providers.
  **Mitigation:** Centralize secret management and document all required credentials in `docs/SECRETS_MAP.md`.

## Competitor & Pricing Intelligence

| Provider               | Pricing                           | Notes               |
| ---------------------- | --------------------------------- | ------------------- |
| Vercel                 | Pro plan at $20/user/month        | Primary Target      |
| Netlify                | Pro plan at $19/user/month        | Managed Alternative |
| Cloudflare Pages       | Free tier, Pro at $25/month       | Edge Deployments    |
| Coolify / Dokku (FOSS) | Free software, VPS ~$5-20/month   | Self-hosted FOSS    |
| GitHub Pages           | Included in standard GitHub plans | Static Fallback     |

## Learnings — What & Why

- **Resilience Over Convenience:** Relying solely on a single managed platform like Vercel introduces a single point of failure. Creating an automated fallback via GitHub Actions to a FOSS alternative ensures deployment continuity even during upstream outages.
- **FOSS Viability:** Self-hosted tools like Coolify and Dokku provide feature parity with Vercel for standard workloads, offering a cost-effective safety net, though they require upfront infrastructure configuration.
