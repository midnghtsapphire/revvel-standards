# WR: [WR] #17758 left a stray root script, edited vendored upstream code, and fixed a cause that was measured as false

**Issue:** #17764  
**Repository:** [midnghtsapphire/revvel-standards](https://github.com/midnghtsapphire/revvel-standards)  
**Created:** 2026-08-20  
**Research Date:** 2026-08-20  
**Researcher:** Jules (Google) + OpenRouter  
**WR Status:** ✅ Complete

---

## Issue Context

This WR addresses the cleanup of PR #17758, which left behind a one-off migration script (`patch_ossar.js`) at the repository root, made unauthorized cosmetic edits to vendored upstream code (`mcp-servers/gemini-notebook-mcp-cli/src/notebooklm_tools/utils/cdp.py`), and implemented a fix for a CI failure (OSSAR) based on a misdiagnosis of the root cause (path length vs. tool crash).

## Background & Motivation

There is a recurring pattern of throwaway scripts being committed as product code (this is the second incident in two days). These rushed fixes accumulate technical debt, confuse future contributors, and complicate the management of vendored dependencies by causing unnecessary merge conflicts during upstream syncs. Immediate cleanup and the implementation of preventive process controls are necessary to maintain CI/CD pipeline reliability and repository hygiene. This affects engineering teams relying on clean, self-documenting codebases.

## Scope

- **In Scope:**
  - Removal of the stray `patch_ossar.js` script.
  - Reverting modifications to the vendored `cdp.py` file to match upstream.
  - Annotating the disabled OSSAR workflow step.
  - Implementing an automated repository hygiene check (GitHub Action) to prevent future throwaway scripts at the root.
- **Out of Scope:** Migration to a new static analysis tool like Semgrep (this will be handled in a separate WR/PR).

## Approach

1. **Immediate Cleanup:**
   - Delete `patch_ossar.js` from the repository root.
   - Revert `mcp-servers/gemini-notebook-mcp-cli/src/notebooklm_tools/utils/cdp.py` to its exact upstream state to avoid future merge conflicts.
   - Update `.github/workflows/ossar.yml` to clearly annotate the disabled "Enable Windows Long Paths" step as inert and explain why it was disabled (historical record).
2. **Preventive Process Guards:**
   - Create a new GitHub Actions workflow (`.github/workflows/repo-hygiene.yml`) that runs on `pull_request` and fails if files matching `^[^/]+\.(js|py|sh)$` (scripts at the repository root) are detected in the diff.

## Acceptance Criteria

- [ ] `patch_ossar.js` is removed from the repository.
- [ ] Vendored `cdp.py` is reverted to upstream state.
- [ ] The `ossar.yml` workflow contains an explicit, disabled step annotation explaining the historical context.
- [ ] A new repository hygiene workflow is added to block root-level scripts.
- [ ] Changes pass all CI structural validations (`npm run workflows:validate`) and tests (`npm test`).
- [ ] WR status is updated to complete and passes `wr-lint.mjs`.

## Risks & Mitigations

- **Risk:** The repository hygiene check might block legitimate, necessary root-level configuration scripts.
  - **Mitigation:** The regex targets common extension types (`.js`, `.py`, `.sh`) rather than config files (e.g., `.json`, `.yml`, `.config.js`). It can be refined if false positives occur.
- **Risk:** Reverting `cdp.py` might re-introduce linting errors.
  - **Mitigation:** Vendored code should be excluded from local linting via the existing `.flake8` configuration.

## Competitor & Pricing Intelligence

### Direct Competitors for Repository Hygiene Tools

| Tool | GitHub Stars | Pricing | Key Differentiator |
|------|--------------|---------|-------------------|
| Pre-commit | 11.5k+ | Free | Git hook framework for code quality |
| Renovate | 17.7k+ | Free OSS / $99-299/month Pro | Automated dependency updates |
| Danger JS | 5.2k+ | Free | Automated code review for common issues |
| Super Linter | 9.3k+ | Free | Multi-language linting in CI |

### Static Analysis Alternatives (OSSAR Replacements)

| Tool | GitHub Stars | Pricing | Best For |
|------|--------------|---------|----------|
| CodeQL | 6.6k+ | Free public / GitHub Advanced Security | Deep semantic analysis |
| Semgrep | 10.4k+ | Free / $500+/month Team | Custom security rules |
| SonarQube | 8.8k+ | Free Community / $150+/month | Comprehensive quality metrics |
| Bandit | 5.8k+ | Free | Python-specific security |

## Learnings — What & Why

Through the analysis of PR #17758, we learned that relying solely on manual review to prevent throwaway scripts is insufficient, as demonstrated by the recurrence of this issue. We also recognized the importance of strict boundaries for vendored code; local cosmetic changes, while well-intentioned, create significant maintenance burdens during upstream synchronization. Finally, the OSSAR failure misdiagnosis highlights the need for careful root cause analysis in CI failures (identifying tool crashes vs. tool findings) before implementing environment changes like enabling Windows Long Paths. Implementing automated checks is essential to enforce these boundaries consistently.
