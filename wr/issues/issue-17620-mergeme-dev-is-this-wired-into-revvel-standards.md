# WR: [WR] MERGEME.DEV IS THIS WIRED INTO REVVEL-STANDARDS

**Issue:** #17620  
**Repository:** [midnghtsapphire/revvel-standards](https://github.com/midnghtsapphire/revvel-standards)  
**Created:** 2026-08-15  
**Research Date:** 2026-08-15  
**Researcher:** Jules (Google) + OpenRouter  
**WR Status:** ✅ Complete

---

## Scope

This WR evaluates the integration of `mergeme.dev` (or equivalent GitHub-native auto-merge functionality) into the `revvel-standards` repository. The goal is to ensure auto-merge capabilities are properly configured and operational. This issue is a duplicate of #16824, and the scope involves consolidating the requirements from both issues into a single, cohesive configuration plan within the repository's CI/CD workflows, specifically targeting `.github/workflows/auto-merge.yml`.

## Approach

The approach involves validating and refining the existing GitHub auto-merge configuration in `.github/workflows/auto-merge.yml` and related orchestration workflows (like `pr-state-orchestrator.yml`) to ensure they cover the intended functionality of `mergeme.dev`.
Specifically, we rely on the `enablePullRequestAutoMerge` GraphQL mutation to natively squash and merge pull requests when the `auto-merge` label is applied and all required status checks (including the grounding gate / Ship Quality Check) have passed. No third-party marketplace action like `mergeme` is necessary as GitHub's native auto-merge handles the requirements robustly when properly configured.

## Acceptance Criteria

- [x] Change delivers the described behavior end-to-end
- [x] Tests updated / added where applicable
- [x] Docs updated where applicable
- [x] No regressions in related workflows
- [x] Native GitHub auto-merge via `auto-merge.yml` is verified to satisfy the `mergeme` requirements.
- [x] The `anti-scaffolding-enforcer.yml` check passes.
- [x] Issue #16824 is acknowledged as a duplicate and its scope is fully addressed by this resolution.

## Acknowledgements

Permanent for every WR type — implementers must not stop at the issue:

- [x] This WR defines a bundled outcome, not just a minimum acceptable patch.
- [x] Explicitly requested secondary items should not be silently deferred.
- [x] If the PR is partial, the blocker must be documented.
- [x] The PR should reflect the WR's required bundle and definition of done.
- [x] After implementation, open a PR and continue the loop (reset routing labels / trigger downstream workflows) instead of stopping at the issue.

## Risks & Mitigations

- **Risk:** Auto-merge might trigger prematurely if status checks are bypassed.
  **Mitigation:** The `.github/workflows/auto-merge.yml` script explicitly checks for the "Ship Quality Check" (grounding gate) and requires it to pass. Additionally, branch protection rules on `main` must enforce required status checks and reviews before the merge executes.
- **Risk:** Conflict between `auto-merge` and `won't-merge` labels.
  **Mitigation:** Built-in validation in the workflow prevents auto-merge from enabling if the `won't-merge` label is present.

## Competitor & Pricing Intelligence

N/A - This is an internal configuration and validation task, not a competitive product analysis.

## Learnings — What & Why

We confirmed that third-party services like `mergeme.dev` are not required because GitHub's native auto-merge functionality (invoked via the `enablePullRequestAutoMerge` GraphQL mutation) provides the necessary capabilities natively. By leveraging `.github/workflows/auto-merge.yml`, we can orchestrate merges reliably when the `auto-merge` label is applied, ensuring our grounding gates and quality checks are strictly enforced before squashing and merging. This reduces reliance on external marketplace actions and keeps our automation footprint secure and self-contained.
