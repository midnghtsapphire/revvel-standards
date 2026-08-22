# WR: [WR] Harden merge-prosecutor and wire it on the main PR path

**Issue:** #17893  
**Repository:** [midnghtsapphire/revvel-standards](https://github.com/midnghtsapphire/revvel-standards)  
**Created:** 2026-08-22  
**Research Date:** 2026-08-22  
**Researcher:** Jules (Google) + OpenRouter  
**WR Status:** ✅ Complete

---

## Scope

- Fail-closed GitHub API fetches (no empty arrays / empty diffs that look like a clean pass).
- Paginate issue comments and review comments (do not stop at page 1).
- Fix Jules regex defects: CRLF / language-tag code blocks, substring false positives, dismissive `leave it` matching.
- Add tests that would have caught those defects.
- Add `.github/workflows/merge-prosecutor.yml` using the in-repo composite action.
- Out of scope: Do not rewrite the product from zero; do not vendor Octopus Review; do not reopen RecurseML/Octopus paid lanes.

## Approach

- Modify `products/merge-prosecutor` core script to paginate GitHub API comments fully rather than reading only the first page.
- Implement explicit error handling to fail the check completely on API errors, preventing empty diffs from giving a false pass.
- Adjust regex logic to properly handle CRLF line endings, language tags in markdown code blocks, and prevent substring/dismissive phrase matching.
- Expand `products/merge-prosecutor/tests/prosecutor.test.js` to cover pagination edge cases and the identified regex false positives.
- Create `.github/workflows/merge-prosecutor.yml` to trigger the prosecutor on default-branch PRs.

## Acceptance Criteria

- [ ] Change delivers the described behavior end-to-end
- [ ] Tests updated / added where applicable
- [ ] Docs updated where applicable
- [ ] No regressions in related workflows
- [ ] One PR (replacement for #17888) is created
- [ ] `merge-prosecutor` runs on PRs from the default-branch workflow path
- [ ] CircleCI `lint-and-test` / `policy-check` and Ship Quality Check remain the real green gates

## Risks & Mitigations

**Risk:** PR workflow disruptions due to new fail-closed behavior causing false-negative blocked merges.
**Mitigation:** Comprehensive unit testing in `products/merge-prosecutor/tests/prosecutor.test.js` verifying regex constraints and mock API error responses.

## Competitor & Pricing Intelligence

N/A — This is an internal technical fix.

## Learnings — What & Why

Learned that paginating GitHub comments and failing closed on API errors is essential for reliable merge defense; without it, large or errored PRs silently skip review checks. We also learned that CRLF and regex boundary edge cases in automated PR reviews easily trigger false positives or miss actionable feedback, requiring robust parsing logic.
