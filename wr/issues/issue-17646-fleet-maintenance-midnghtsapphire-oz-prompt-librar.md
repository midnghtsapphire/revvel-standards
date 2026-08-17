# WR: [WR] Fleet maintenance — midnghtsapphire/oz-prompt-library

**Issue:** #17646  
**Repository:** [midnghtsapphire/revvel-standards](https://github.com/midnghtsapphire/revvel-standards)  
**Created:** 2026-08-17  
**Research Date:** 2026-08-17  
**Researcher:** Jules (Google) + OpenRouter  
**WR Status:** ✅ Complete

---

## Scope

This Work Request covers the fleet maintenance for the `midnghtsapphire/oz-prompt-library` repository. The scope includes:
1. Auditing and updating repository documentation (README.md, TEMPLATE.md, AGENTS.md, etc.).
2. Researching and implementing concrete improvements related to dependencies, security, tests, Developer Experience (DX), and performance.
3. Verifying and installing standard Revvel Standards review workflows (`ai-pr-review-openrouter.yml`, Jules integrations, Semgrep, CodeQL) to ensure automated code review processes are correctly configured.
4. Submitting these improvements as a single, comprehensive Draft Pull Request to the target repository.

Out of scope: Structural changes to the prompt library contents themselves, unless required for formatting or linting compliance.

## Approach

1. **Documentation Refresh**: Review existing `README.md` and `TEMPLATE.md` for clarity and correctness. Ensure contributing guidelines are present and up to date.
2. **Workflow Standardization**: Inject standard GitHub Actions workflows into `.github/workflows/` to ensure the repository has the full review jury (OpenRouter, Semgrep, CodeQL, and Jules).
3. **Repository Audit**: Analyze current dependencies and security posture. Introduce linting for markdown and other files if not present to improve DX.
4. **Draft PR Submission**: Implement all changes and open a Draft PR on `midnghtsapphire/oz-prompt-library` for final human review.

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

- **Risk**: Overwriting custom workflows that might be unique to the `oz-prompt-library` repository.
  **Mitigation**: Perform a non-destructive audit first. If workflows exist, merge standard steps instead of overwriting. Currently, the repository does not appear to have a `.github/workflows` directory, so the risk is low.
- **Risk**: Breaking existing prompt formats during linting or documentation updates.
  **Mitigation**: Apply formatting cautiously and run a test build/linting locally before committing.

## Competitor & Pricing Intelligence

N/A — This is a repository maintenance WR, not a product or competitive intelligence task.

## Learnings — What & Why

- **Workflow Parity**: Ensuring all repositories in the fleet have identical foundational CI/CD workflows is critical for maintaining a uniform security and quality baseline. The absence of standard review workflows in `oz-prompt-library` highlighted the need for proactive fleet sweeps.
- **Documentation Importance**: Standardizing `README.md` and `AGENTS.md` across the fleet reduces onboarding friction for automated agents and human contributors alike.
