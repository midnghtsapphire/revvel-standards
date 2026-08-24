# WR: [WR] `auto-reset-stuck-issues.yml` claims it triggered assignee but never dispatches - #17883

**Issue:** #17936  
**Repository:** [midnghtsapphire/revvel-standards](https://github.com/midnghtsapphire/revvel-standards)  
**Created:** 2026-08-24  
**Research Date:** 2026-08-24  
**Researcher:** Jules (Google) + OpenRouter  
**WR Status:** 🟡 In Progress

---

## Scope

<!-- Detailed scope: what's in, what's out, boundaries with other WRs. -->

## Approach

<!-- Proposed approach / design sketch. Alternatives considered. -->

## Acceptance Criteria

- [ ] Change delivers the described behavior end-to-end
- [ ] Tests updated / added where applicable
- [ ] Docs updated where applicable
- [ ] No regressions in related workflows

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

A workflow that reports success without verifying its side effect landed is
worse than one that fails outright. `auto-reset-stuck-issues.yml` logged
"triggered assignee" for weeks while dispatching nothing, so the failure was
invisible in exactly the place someone would look to check it.

Two causes, both silent:

1. **GitHub drops `workflow_dispatch` fired with the default `GITHUB_TOKEN`.**
   This is deliberate — it prevents a workflow triggering itself into an
   infinite loop. The REST call still returns `204 No Content`, i.e. success,
   and nothing runs. The caller therefore has no signal that anything went
   wrong. The fix is to authenticate the dispatch with a PAT
   (`ADMIN_GITHUB_TOKEN`, falling back to `GITHUB_TOKEN`).

2. **`ref: context.ref` is not always a branch.** On `issues` and `schedule`
   events `context.ref` can be absent or point at something the dispatch
   cannot resolve, so the target workflow is never located. Passing an explicit
   `'main'` removes the ambiguity.

Why it matters beyond this one file: any workflow in this repo that dispatches
another inherits both traps. A `204` from `createWorkflowDispatch` means the
request was accepted, **not** that a run started. Treating it as proof of
execution is how a dead automation lane stays green. Where a dispatch is
load-bearing, verify a run actually appeared rather than trusting the status
code — the same evidence-first principle as `standards/VERIFY_THE_POSTCONDITION.md`.

<!--
Guidance: agents completing other WR types should fill this in themselves once
done — capture what was learned and _why_ it matters, not just what changed.
For follow-up-generated WRs this section is populated automatically by the
Follow-up Checkbox Router with the original follow-up text, a link to the
source PR/issue, and (if applicable) a note that this is a chained follow-up.
-->
