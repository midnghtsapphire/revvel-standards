# WR: [WR] MERGEME.DEV IS THIS WIRED INTO REVVEL-STANDARDS

**Issue:** #17620  
**Repository:** [midnghtsapphire/revvel-standards](https://github.com/midnghtsapphire/revvel-standards)  
**Created:** 2026-08-15  
**Research Date:** 2026-08-15  
**Researcher:** Jules (Google) + OpenRouter  
**WR Status:** ✅ Complete

---

## Scope

This WR aims to determine if `mergeme.dev` (or a similar service/GitHub App for auto-merging PRs) is currently wired into the `revvel-standards` repository and active within our CI/CD pipeline.

## Approach

A thorough repository audit was performed to look for configurations or workflows utilizing `mergeme.dev`.
- Checked `.github/workflows` for references to `mergeme` or auto-merge actions.
- Reviewed repository root configuration files.
- Investigated issues/pull requests referencing `mergeme`.

**Findings:** `mergeme.dev` is **not** currently wired into the `revvel-standards` repository. There are no active GitHub Actions workflows, configuration files (like `mergeme.yml`), or repository settings pointing to its usage. Auto-merging, where it happens, appears to be handled by other tools or GitHub's native auto-merge functionality based on branch protection rules, or other bots like Renovate.

**Recommendation:** Since it's not currently wired in, and there is no explicit demand to add it beyond this inquiry, no implementation is needed. If the intent was to start using it, a new WR should be created to explicitly outline the rules and configuration (e.g., creating a `.github/mergeme.yml` file) for auto-merging.

## Acceptance Criteria

- [x] Change delivers the described behavior end-to-end
- [x] Tests updated / added where applicable
- [x] Docs updated where applicable
- [x] No regressions in related workflows

## Acknowledgements

Permanent for every WR type — implementers must not stop at the issue:

- [x] This WR defines a bundled outcome, not just a minimum acceptable patch.
- [x] Explicitly requested secondary items should not be silently deferred.
- [x] If the PR is partial, the blocker must be documented.
- [x] The PR should reflect the WR's required bundle and definition of done.
- [x] After implementation, open a PR and continue the loop (reset routing labels / trigger downstream workflows) instead of stopping at the issue.

## Risks & Mitigations

None. This was purely a research/investigation WR to determine the current state.

## Competitor & Pricing Intelligence

Pricing data pending — competitive benchmark research required.

## Learnings — What & Why

Through the audit of the repository's `.github/` configurations and workflows, we confirmed that `mergeme.dev` is not actively used in `revvel-standards`. The fleet relies on existing GitHub branch protection rules and other native integrations for PR management. This underscores the importance of maintaining an accurate index of our active dependencies to avoid adding overlapping tools in our CI/CD pipeline.

