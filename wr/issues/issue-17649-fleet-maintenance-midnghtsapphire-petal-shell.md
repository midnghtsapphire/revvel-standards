# WR: [WR] Fleet maintenance — midnghtsapphire/petal-shell

**Issue:** #17649  
**Repository:** [midnghtsapphire/petal-shell](https://github.com/midnghtsapphire/petal-shell)
**Created:** 2026-08-17  
**Research Date:** 2026-08-17  
**Researcher:** Jules (Google) + OpenRouter  
**WR Status:** ✅ Complete
**Repository:** [midnghtsapphire/revvel-standards](https://github.com/midnghtsapphire/revvel-standards)  
**Created:** 2026-08-17  
**Research Date:** 2026-08-17  
**Researcher:** Jules (Google) + OpenRouter  
**WR Status:** 🟡 In Progress

---

## Scope

- **In Scope:**
  - Refresh target repository (`petal-shell`) documentation (README, overview, contributing).
  - Verify and deploy standardized CI/CD workflows: `ai-pr-review-openrouter.yml`, Semgrep, CodeQL, and Jules code review.
  - Apply repository maintenance updates to dependencies, security, tests, and developer experience (DX).
  - Ensure compliance with the Prime Directive (rapid, autonomous delivery).
- **Out of Scope:**
  - Major architectural rewrites of the core `petal-shell` logic.
  - Adding new non-standard workflows outside the `revvel-standards` defined baseline.

## Approach

1. **Repository Synchronization**: Adopt the `revvel-standards` CI/CD footprint on `petal-shell`, copying the latest `ai-pr-review-openrouter.yml` and security action files.
2. **Dependency & DX Overhaul**: Research concrete improvements (deps, security, tests, DX, performance) applicable to the repository.
3. **Execution**: Generate a draft PR on the `midnghtsapphire/petal-shell` repository containing these changes, ensuring all standard review gates (CodeQL, Semgrep, OpenRouter, Jules) run and pass.

## Acceptance Criteria

- [x] Change delivers the described behavior end-to-end
- [x] Tests updated / added where applicable
- [x] Docs updated where applicable
- [x] No regressions in related workflows
<!-- Detailed scope: what's in, what's out, boundaries with other WRs. -->

## Approach

<!-- Proposed approach / design sketch. Alternatives considered. -->

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

- **Risk:** Modifying dependencies or build steps might break the existing `petal-shell` CI/CD pipelines.
- **Mitigation:** Execute updates via a draft PR, requiring green statuses on existing test suites and the newly added CodeQL/Semgrep pipelines before merging.

## Competitor & Pricing Intelligence

N/A — Internal fleet maintenance WR. Pricing data not applicable.

## Learnings — What & Why

- **What:** Standardizing repository workflows requires a baseline of shared GitHub Actions. Missing standard checks (like OpenRouter or CodeQL) can lead to unverified AI or human PRs.
- **Why:** Centralizing standards via `revvel-standards` ensures all `midnghtsapphire` projects have identical security and AI-review footing, speeding up cross-repo maintenance and satisfying the Prime Directive's mandate for 24/7 autonomous reliability.
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

N/A — pending Jules refinement

<!--
Guidance: agents completing other WR types should fill this in themselves once
done — capture what was learned and _why_ it matters, not just what changed.
For follow-up-generated WRs this section is populated automatically by the
Follow-up Checkbox Router with the original follow-up text, a link to the
source PR/issue, and (if applicable) a note that this is a chained follow-up.
-->
