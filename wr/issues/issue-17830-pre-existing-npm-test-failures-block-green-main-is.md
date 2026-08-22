# WR: [WR] Pre-existing npm test failures block green-main (issue:done model, coder timeout ratchet, patch_ossar ratchet)

**Issue:** #17830  
**Repository:** [midnghtsapphire/revvel-standards](https://github.com/midnghtsapphire/revvel-standards)  
**Created:** 2026-08-20  
**Research Date:** 2026-08-20  
**Researcher:** Jules (Google) + OpenRouter  
**WR Status:** ✅ Complete

---

## Scope

- **In Scope:**
  - Fixing `tests/issue-done-marker.test.js` to reflect the new GraphQL closedByPrsCount model (after PRs #17791 / #17795).
  - Updating `tests/openrouter-coder-workflow.test.js` to assert `timeout-minutes >= 60` instead of `45` due to PR #17777.
  - Updating `tests/no-root-junk-workflow.test.js` to remove `patch_ossar.js` from the expected failure list, reflecting its actual removal.
  - Adding `yaml` to `devDependencies` in `package.json` to fix `MODULE_NOT_FOUND` errors in tests like `tests/xai-review-oleg-fork.test.js`.
  - Fixing `MODULE_NOT_FOUND` for `scripts/wr-fill-fields.js` in `tests/wr-fill-sweep.test.js` if applicable.
- **Out of Scope:**
  - Any modifications to the WR recovery path mechanisms (owned by #17736).
  - Functional behavior changes outside of aligning test assertions to current realities.

## Approach

1. **Fix `tests/issue-done-marker.test.js`:**
   - Update assertions to align with the GraphQL changes for `issue:done` markers where closed status is determined by `closedByPullRequestsReferences` instead of trusting the label blindly.
2. **Fix `tests/openrouter-coder-workflow.test.js`:**
   - Change the timeout assertion for `timeout-minutes` from an exact match of `45` to a minimum threshold (`>= 60`).
3. **Fix `tests/no-root-junk-workflow.test.js`:**
   - Remove `patch_ossar.js` from the ratchet array because the file has been successfully expunged.
4. **Fix `MODULE_NOT_FOUND` Errors:**
   - Run `npm install --save-dev yaml` and check dependencies for `tests/wr-fill-sweep.test.js`.

## Acceptance Criteria

- [ ] Change delivers the described behavior end-to-end
- [ ] Tests updated / added where applicable
- [ ] Docs updated where applicable
- [ ] No regressions in related workflows

## Risks & Mitigations

- **Risk:** Loosening test assertions (like `timeout >= 60`) could allow unintended regressions to slip by.
  - **Mitigation:** Setting a reasonable floor (like 60) still guards against drops in timeout thresholds while maintaining flexibility for further increases.
- **Risk:** Altering GraphQL closedByPrsCount assertions might misalign with the actual implementation in `wr-pr-creation.yml`.
  - **Mitigation:** Cross-reference tests against the live `.github/workflows/wr-pr-creation.yml` configuration.

## Competitor & Pricing Intelligence

N/A — This is an internal technical fix

## Learnings — What & Why

Through this research and test failure analysis, we learned that test assertions frequently outlive the code invariants they are meant to verify. When operational settings like `timeout-minutes` are modified (e.g., increased from 45 to 60 for robustness), tests pinning exact equality become fragile.

Similarly, cleanup operations (like removing `patch_ossar.js`) must ensure that negative-assertion tests ("no root junk") are updated concurrently, as ratchets cannot self-heal structural absence.

Finally, dependency drift (like `yaml` being missing from `devDependencies`) can silently break disjoint test suites. Moving forward, test assertions should be designed to describe the necessary invariants (e.g., `timeout >= 60`) rather than brittle exact values.
