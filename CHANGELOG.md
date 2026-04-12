# Changelog

All notable changes to the Revvel Standards repository will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased] - 2026-04-12

### Added
- `SYNTAX_ERROR_PREVENTION_STANDARD.md` — mandatory four-layer standard for preventing syntax errors before they reach CI or become issues/PRs. Covers Git pre-commit hooks, pre-commit framework, Husky + lint-staged, and GitHub Actions CI checks.
- `templates/cicd/syntax-check.yml` — GitHub Actions workflow template for automated syntax and lint validation on every push and PR (TypeScript, ESLint, Prettier, JSON, YAML, Shell).
- `templates/hooks/pre-commit` — Native git pre-commit hook script template that checks shell, JS, TypeScript, JSON, Python, and YAML syntax before every commit.
- `templates/hooks/.pre-commit-config.yaml` — Pre-commit framework config template with hooks for YAML/JSON validation, shellcheck, secret detection, and file hygiene.
- `COMPLIANCE_RUBRIC.md` v1.1.0 — added Category G checks G6 (syntax-check.yml, P1), G7 (.pre-commit-config.yaml, P2), and G8 (SYNTAX_ERROR_PREVENTION_STANDARD reference, P1). G6 and G8 are now scored checks, not bonus.
- `scripts/check-compliance.js` v1.1.0 — added automated checks for G6, G7, G8; updated bonus logic to use per-check `bonus` flag instead of category-level blanket exclusion.

### Changed
- `scripts/bootstrap-repo.sh` — Steps 5b and 5c added to install native git hook and `.pre-commit-config.yaml` during bootstrap; Step 3 now also downloads `syntax-check.yml`; Husky pre-commit hook now includes `tsc --noEmit` check in addition to lint-staged.
- `scripts/bootstrap-new-project.sh` — Step 7 added to copy `.pre-commit-config.yaml`; `syntax-check.yml` now included in Step 2 workflow scaffold.

- `docs/claw-code/BLUEPRINT.md` with full architecture and data flow for the claw-code Rust CLI agent harness (Revvel EXRUP compliant).
- `docs/claw-code/CONTEXT_PRIMER.md` as a quick-start guide for claws and new contributors covering current state, next priorities, and contribution rules.

### Changed
- Improved documentation coverage for the claw-code project to align with Revvel PHILOSOPHY.md and EXRUP methodology.

## [1.3.0] - 2026-04-03
### Added
- `DEPLOYMENT_STANDARD.md` establishing the mandatory deploy agent pattern: multiple teams work on feature branches and merge to main, but ONE final deploy agent handles the actual production deployment. No individual team deploys.

### Context
- This version was prompted by the reese-reviews deployment on April 3, 2026, where 4 teams (A, B, C, D) merged their work to main but the live site showed a blank page due to Dockerfile misconfiguration. The deploy agent model was formalized to prevent similar issues by centralizing deployment verification and ensuring all merged code is validated before going live.

## [1.2.0] - 2026-04-03
### Added
- `CONCURRENT_DEVELOPMENT_STANDARD.md` establishing mandatory branch protection rules, multi-team coordination workflow, and no-force-push policy across all repos.

### Changed
- `CODE_REVIEW_STANDARD.md` updated with a "No Force Push" policy section and a reference to the new concurrent development standard.

### Context
- This version was prompted by an April 3, 2026 incident in which a force-push to master on the MindMappr repo overwrote commits from two other teams working concurrently.

## [1.1.0] - 2026-04-03
### Added
- `CHANGELOG.md` created to track all future changes.
- `CODE_REVIEW_STANDARD.md` documenting mandatory code review pipeline and CI/CD rules.
- `AUTO_DOCUMENTATION_STANDARD.md` establishing auto-generation rules for docs and changelogs.
- `MASTER_APP_TEMPLATE.md` established as the single source of truth for new applications.

### Changed
- Consolidated `INFRASTRUCTURE_MAP.md` and `INFRASTRUCTURE_COMPLETE.md` into a single `INFRASTRUCTURE_MAP.md` file.

### Removed
- Deleted `INFRASTRUCTURE_COMPLETE.md` after merging content.
- Removed duplicate documentation files from the root directory.

### Moved
- Relocated all `SESSION_NOTES_*.md` and raw research documents from the root directory to the `docs/` directory to maintain a clean root.

## [1.0.0] - 2026-02-25
### Added
- Initial baseline of Revvel standards and specifications.
- `DEFAULT_APP_TEMPLATE.md` established.
- Initial CI/CD templates and scripts created in `templates/cicd/`.
- Corporate entity hierarchy and SEO strategy defined.
