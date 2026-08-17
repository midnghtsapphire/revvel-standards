# WR: [WR] need to increast time outs and need a better system to detect freezing

**Issue:** #17305
**Repository:** [midnghtsapphire/revvel-standards](https://github.com/midnghtsapphire/revvel-standards)
**Created:** 2026-08-11
**Research Date:** 2026-08-11
**Researcher:** Jules (Google) + OpenRouter
**WR Status:** ✅ Complete

---

## Scope

**In Scope:**
- Analyzing current timeout configurations across all GitHub Actions workflows (`.github/workflows/`).
- Identifying workflows prone to silent freezing.
- Designing a mechanism to detect freezes.
- Updating workflow files to implement these changes.

**Out of Scope:**
- Fixing the underlying bugs that cause the tools themselves to freeze (this focuses on detection and graceful termination).

## Approach

1. **Audit:** Analyze all workflow files in `.github/workflows/` to list their current `timeout-minutes` settings and identify those without limits or with excessive limits.
2. **Global Update:** Ensure every job in every workflow has a realistic `timeout-minutes` (e.g., max 30-60 mins for heavy jobs, 5-10 mins for lint/test). Update all `timeout-minutes` across the repo to match this standard.
3. **Freeze Detection:** Implement step-level timeouts for notoriously slow operations where feasible.
4. **Reporting:** Integrate a failure hook or notification step if a timeout is reached, rather than silently failing.

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

- **Risk:** Increasing timeouts or tightening them might mask underlying performance regressions or incorrectly kill valid long-running jobs.
- **Mitigation:** Rely on step-level timeouts for granular detection, and use workflow dashboards to track execution times. Ensure testing across different external tools/extensions before rolling out broadly.

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

- **What:** Identified that relying on default GitHub Actions timeouts (360 minutes) wastes resources when jobs hang or freeze, particularly for agentic tasks or external tool calls.
- **Why:** Explicit `timeout-minutes` at both the job and step levels ensures fail-fast behavior, saving CI minutes, providing faster feedback loops for developers, and aligning with cross-repository consistency and best practices.
