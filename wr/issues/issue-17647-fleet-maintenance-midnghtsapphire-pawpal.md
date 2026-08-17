# WR: [WR] Fleet maintenance — midnghtsapphire/pawpal

**Issue:** #17647
**Repository:** [midnghtsapphire/revvel-standards](https://github.com/midnghtsapphire/revvel-standards)
**Created:** 2026-08-17
**Research Date:** 2026-08-17
**Researcher:** Jules (Google) + OpenRouter
**WR Status:** 🟡 In Progress

---

## Scope

Target repository is `midnghtsapphire/pawpal`.
1. Update / refresh the docs (README, overview, contributing).
2. Research concrete improvements (deps, security, tests, DX, performance).
3. Ensure the target repo has the standard review workflows (`ai-pr-review-openrouter.yml`, Jules, Semgrep, CodeQL).
4. Outline the improvements locally to be implemented as a draft PR on the target repo when cloned.

## Approach

1. Review target repo (pawpal) documentation and prepare refreshed `README.md` and `CONTRIBUTING.md`.
2. Inspect target repo dependencies and structure; outline updates for security, tests, and DX.
3. Validate presence of standard CI workflows (OpenRouter, Semgrep, CodeQL) in target repo's `.github/workflows` and copy them from `midnghtsapphire/revvel-standards` if missing.
*Note: Due to sandboxed credential limits, the actual PR to `pawpal` will require the fleet manager to execute the proposed changes, or the workflow will proceed to `coder` stage with credentials.*

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

None locally in `revvel-standards`. Updating the target repository docs and workflows is low risk. Rollback by reverting the target repository PR.

## Competitor & Pricing Intelligence


## Learnings — What & Why

The primary hurdle was lack of direct read/write access to `midnghtsapphire/pawpal` within the current ephemeral sandbox environment. This highlights the need for cross-repo token availability for the `coder` or `research-engine` agents in fleet maintenance tasks.
