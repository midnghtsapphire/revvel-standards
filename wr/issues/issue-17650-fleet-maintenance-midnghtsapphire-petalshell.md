# WR: [WR] Fleet maintenance — midnghtsapphire/petalshell

**Issue:** #17650  
**Repository:** [midnghtsapphire/revvel-standards](https://github.com/midnghtsapphire/revvel-standards)  
**Created:** 2026-08-17  
**Research Date:** 2026-08-17  
**Researcher:** Jules (Google) + OpenRouter  
**WR Status:** ✅ Complete

---

## Scope

This Work Request (WR) details the execution of a comprehensive fleet maintenance sweep for the target repository `midnghtsapphire/petalshell`. The scope involves researching and implementing critical updates to bring the project into alignment with Revvel Standards. This includes refreshing documentation, updating dependencies, resolving security vulnerabilities, expanding test coverage, improving the developer experience (DX), and ensuring performance optimization. Crucially, the outcome must be a draft Pull Request to the target repository equipped with the full suite of review workflows (OpenRouter, Jules, Semgrep, and CodeQL).

## Approach

The maintenance process will follow a structured four-stage execution plan:

1.  **Documentation Synchronization:** Audit and refresh core documentation. Ensure the `README.md` accurately reflects the project's current state, review project overview materials, and align the contributing guidelines with the latest Revvel standards.
2.  **Diagnostics & Research Engine Execution:** Run comprehensive research utilizing the established research engine to surface actionable improvements. This involves:
    *   **Dependency Audit:** Identify outdated or vulnerable packages.
    *   **Security Assessment:** Analyze for common security flaws or misconfigurations.
    *   **Test Coverage Review:** Pinpoint areas lacking adequate test coverage.
    *   **DX & Performance Profiling:** Identify and recommend fixes for performance bottlenecks and developer friction points.
3.  **Workflow Standardization (Review Jury Setup):** Systematically check `midnghtsapphire/petalshell` for the required review workflows (`ai-pr-review-openrouter.yml`, Jules integration, Semgrep, and CodeQL). If any are absent or outdated, explicitly add or update them to ensure the resulting PR benefits from the full automated review jury.
4.  **Implementation & Draft PR Submission:** Implement the identified improvements locally. Bundle these changes into a cohesive update and submit it as a draft PR to the target repository for final validation.

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

*   **Risk:** Updating legacy dependencies may introduce breaking API changes resulting in test failures or build errors.
    *   **Mitigation:** Execute updates incrementally, verify locally using existing test suites, and rely heavily on the full review jury (specifically CodeQL and Semgrep) to identify regressions before moving the PR out of draft status.
*   **Risk:** The target repository may lack the infrastructure required for the full review jury, leading to incomplete validation.
    *   **Mitigation:** Step 3 explicitly mandates verifying and installing the required workflow files (`ai-pr-review-openrouter.yml`, etc.) as a prerequisite to submitting the draft PR.

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

N/A — As this WR governs a routine fleet maintenance operation, specific technical learnings and architectural discoveries will be documented directly within the resulting maintenance PR on the `midnghtsapphire/petalshell` repository.

<!--
Guidance: agents completing other WR types should fill this in themselves once
done — capture what was learned and _why_ it matters, not just what changed.
For follow-up-generated WRs this section is populated automatically by the
Follow-up Checkbox Router with the original follow-up text, a link to the
source PR/issue, and (if applicable) a note that this is a chained follow-up.
-->
