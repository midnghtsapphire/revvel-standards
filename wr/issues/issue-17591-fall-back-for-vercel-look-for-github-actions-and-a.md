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

<!-- Known risks, fragile files touched, rollback plan. -->

## Competitor & Pricing Intelligence

<!--
For Competitor and GitHub Star Intelligence WRs, the competitor/pricing table
must list actual prices (e.g. "$99-299/month"), not vague labels like "Paid tiers".
If a competitor's price is unknown, write:
"Pricing data pending — competitive benchmark research required."
Do not ship incomplete competitive intelligence. This rule is kept in sync with
scripts/research-engine.js by tests/research-engine.test.js.
-->

## Learnings — What & Why

- **Resilience Over Convenience:** Relying solely on a single managed platform like Vercel introduces a single point of failure. Creating an automated fallback via GitHub Actions to a FOSS alternative ensures deployment continuity even during upstream outages.
- **FOSS Viability:** Self-hosted tools like Coolify and Dokku provide feature parity with Vercel for standard workloads, offering a cost-effective safety net, though they require upfront infrastructure configuration.

<!--
Guidance: agents completing other WR types should fill this in themselves once
done — capture what was learned and _why_ it matters, not just what changed.
For follow-up-generated WRs this section is populated automatically by the
Follow-up Checkbox Router with the original follow-up text, a link to the
source PR/issue, and (if applicable) a note that this is a chained follow-up.
-->
