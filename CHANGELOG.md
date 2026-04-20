# Changelog

All notable changes to the Revvel Standards repository will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased] - 2026-04-20

### Added
- `docs/GRAPHITE_INTEGRATION.md` — integration doc for the Graphite
  PR-stacking CLI + GitHub App. Explains how Graphite adds *granularity*
  to the existing `revvel-standards` test harness (see
  `docs/revvel-standards/TEST_HARNESS_RESEARCH.md`) without replacing any
  suite-level tool, and how stack metadata is surfaced in the PR →
  OpenRouter first-line-of-sight comment so the orchestrator receives
  stack-aware context. Includes RFC-2119 requirements (R-GT-01..R-GT-G-03)
  and a 5-step rollout plan (PR-9..PR-13). Adopts the Graphite Free tier
  for public repos at $0.
- `.github/labels.yml` — two new canonical labels (`graphite`,
  `graphite:stacked`) added to the repository label definition set.

### Changed
- `docs/revvel-standards/BOM.md` — appended a Graphite row to
  "Purchase Needed" at P1 / $0 / 🟡 Planned, linking to the new
  integration doc.
- `docs/OPENROUTER_ASSIGNEE_PROCESS.md` — appended a cross-reference to
  `GRAPHITE_INTEGRATION.md` in the "See also" section (append-only).

### Policy
- **Append-only** — no existing files deleted or renamed. The existing
  `TEST_HARNESS_RESEARCH.md` v1.0.0 is left intact; Graphite is added as
  an extension (PR-9..PR-13) rather than an edit to that versioned doc.

## [Unreleased] - 2026-04-15

### Added
- `ui/freedom-angel-repo-manager/` — production GitHub-wired repository
  inventory and Revvel Standards audit dashboard. Zero-dependency
  (HTML/CSS/vanilla JS), read-only against the GitHub REST API, and
  implements all 7 accessibility modes mandated by
  `ACCESSIBILITY_STANDARD.md` §4 (Standard, WCAG AAA, Dyslexia-Friendly,
  ADHD Focus, Sensory Safe, Large Print, ECO/Low-Power). Runs from
  `file://`, localhost, or GitHub Pages. Enables non-technical family
  members to audit the full MIDNGHTSAPPHIRE inventory against the
  standards via a fine-grained personal access token.
- `ui/freedom-angel-repo-manager/MASTER_PROMPT.md` — reusable EXRUP /
  XRP master system prompt that converts any third-party agent
  (OpenRouter, Grok, Claude, GPT, DeepSeek, Kimi, etc.) into a
  Revvel-Standards-compliant agent. Copy of the prompt appended to
  `AGENT_FACTORY_STANDARD.md` and `AUDREY_AUTONOMOUS_AGENT_STANDARD.md`.
- `ui/freedom-angel-repo-manager/README.md` — usage guide, GitHub
  Pages deployment instructions, and a 10-step bootstrap verification
  checklist for manual and automated verification.

### Changed
- `README.md` — appended dated section linking to the new UI and
  master prompt.
- `docs/Master_Inventory/AGENT_FACTORY_STANDARD.md` — appended reusable
  master prompt section.
- `docs/Master_Inventory/AUDREY_AUTONOMOUS_AGENT_STANDARD.md` —
  appended reusable master prompt section.
- `docs/SPRINT_STATE.md` — appended dated sprint entry for this task.
- `docs/REPO_CATALOG.md` — appended note pointing at the audit UI.
- `docs/Master_Inventory/INFRASTRUCTURE_MAP.md` — appended entry
  mapping the UI into the infrastructure diagram.

### Policy
- **Append-only** — no existing files deleted or renamed in this
  change. Per the repository's append-only policy, structural changes
  to existing files would be preceded by a dated backup rename.

## [Unreleased] - 2026-04-15

### Added
- `UI_FIELD_TESTING_DBA_STANDARD.md` — Mandatory DBA process module for UI-to-database field testing and mapping. Covers: field-to-column mapping verification, data type consistency, schema validation, full CRUD validation workflow (CREATE/READ/UPDATE/DELETE), ACID property testing, constraint testing (NOT NULL, UNIQUE, CHECK, FK), trigger and stored procedure testing, Playwright + PostgreSQL automated test patterns, test evidence log templates, CI/CD integration guide, and compliance checks DBA-001 through DBA-006.
- `docs/Universal-BOM_List/UI_FIELD_TESTING_BOM.md` — Bill of materials for all UI field testing tools. Covers automated testing (Playwright, Vitest, mabl), SQL-native testing (pgTAP, pg_prove), GUI DB clients (Supabase, Beekeeper Studio, DBeaver), no-code CRUD generators (Budibase, Appsmith, NocoDB), schema validation tools (drizzle-kit, schemalint), test data management (Faker.js, @snaplet/seed), and ACID/load testing tools. Minimum viable stack documented at $0 cost.

### Changed
- `DATABASE_ARCHITECTURE_STANDARD.md` — Section 7 expanded with subsection 7.1 linking to the new `UI_FIELD_TESTING_DBA_STANDARD.md` module. Field mapping section now includes the DBA testing requirement alongside the existing field map document references.
- `TESTING_STANDARD.md` — Section 10 expanded with subsection 10.5 documenting the UI-to-database field test requirement and linking to `UI_FIELD_TESTING_DBA_STANDARD.md` and the UI field testing BOM.
- `docs/Universal-BOM_List/README.md` — Added `UI_FIELD_TESTING_BOM.md` to the Files table.



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
