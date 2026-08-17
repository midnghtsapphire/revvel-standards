# Changelog

All notable changes to the Revvel Standards repository will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased] - 2026-04-30

### Added
- `GOAP.md` — New top-level Goap agent system hub and SSOT index. Defines the Goap persona, 
  the six high-level goals, current #1 priority (Reese-Reviews), key standards, self-healing 
  memory loop instructions, and a complete file map linking all SSOT documents 
  (`GOAL.md`, `learnings.md`, `GOAP_AGENT_PROMPT.md`, `GOAP_AGENT_STANDARD.md`, 
  `wr/NORTH_STAR.md`, `SYSTEM_STATE.md`, `docs/AGENTS.md`). This is the new entry point 
  for all agents. Resolves issue: "[Deep Research] Create a goal.md and learning.md and 
  more and all one source of truth points to these."

### Changed
- `GOAL.md` — Updated REFERENCES section to add cross-links to `learnings.md` 
  (self-healing log), `GOAP.md` (hub), `GOAP_AGENT_PROMPT.md` (canonical system prompt), 
  and `wr/NORTH_STAR.md` with descriptive labels.
- `learnings.md` — Added SSOT header with links to `GOAP.md`, `GOAL.md`, and 
  `GOAP_AGENT_PROMPT.md` so every agent reading this file knows the full context and 
  the rule: read before every session, append after every task.
- `docs/AGENTS.md` — Updated "Required Files" table to include `GOAP.md` (position 1), 
  `learnings.md` (position 3), and re-numbered existing entries. Added `GOAP.md` 
  and `learnings.md` subsections with creation instructions for missing files.
- `GOAP_AGENT_PROMPT.md` — Updated References section to include `GOAP.md` 
  (Goap hub), `GOAL.md` (mission), and `learnings.md` (self-healing log) 
  as the three primary SSOT files.
- `docs/Master_Inventory/GOAP_AGENT_STANDARD.md` — Updated References section to add 
  `GOAP.md`, `GOAL.md`, and `learnings.md` as labeled SSOT entries at the top of the list.

### Added
- `docs/Master_Inventory/GOAP_AGENT_STANDARD.md` — Goap Agent Standard: 
  goal-oriented action planner (Goap) specialized autonomous agent under 
  the AUDREY umbrella. Core mission: build fully autonomous systems within 
  3 years that run 24/7 without human intervention. High-level goals include 
  financial freedom ($5–10M+ net worth within 3–5 years), lifestyle/environment, 
  family presence, creative expression, health/longevity. Includes self-healing 
  via Reflexion pattern with persistent memory through learnings.md, operational 
  rules, and integration with Revvel Standards. Simplified and focused on personal 
  goals without project-specific details.
- `templates/agent-factory/GOAP_LEARNINGS_TEMPLATE.md` — Template for 
  Goap's persistent memory file (learnings.md). Self-healing log format 
  with example seed entry and auto-generated entries structure. Goap reads/writes 
  to this file every session, learning from failures and never repeating 
  the same error twice.

### Changed
- `docs/Master_Inventory/AUDREY_AUTONOMOUS_AGENT_STANDARD.md` — Added 
  section "[2026-04-29] Goap Specialized Agent" documenting Goap as one 
  specialized member of the AUDREY agent conglomerate. Clarifies that 
  AUDREY agents operate as a **conglomerate** (organizational structure) 
  while "swarm" refers to coordination patterns. Emphasizes these terms 
  are complementary, not interchangeable, preserving existing terminology.
- `docs/Master_Inventory/README.md` — Added Goap Agent Standard to the 
  Standards Documents table with description.

## [Unreleased] - 2026-04-28

### Added
- `docs/YUMYUMCODE_EVAL_2026-04-28.md` — standards-level evaluation of
  yumyumcode.com revitalization. Recommends **"NomNom Review"**, a
  neurodivergent-friendly free AI code-review widget at
  `https://yumyumcode.com/review/`, served from the existing GitHub Pages
  host with the LLM call routed through **OpenRouter** per the repo's
  `.github/copilot-instructions.md` Automation Routing Policy. Net-new
  infra cost: $0 baseline. Implementation lives in a separate PR against
  `MIDNGHTSAPPHIRE/yumyumcode` (scope defined in §6 of the eval).
  Resolves the [Jules] "REVIEW YUMYUMCODE.COM FOR UPGRADES AND CUTTING
  EDGE UTILITY" issue.

### Changed
- `docs/SPRINT_STATE.md` — replaced `yumyumcode.com | TBD | TBD` with
  the now-documented GitHub Pages mapping and a cross-reference to the
  new eval.
- `docs/REPO_TODO_LIST.md` — row 8 (`yumyumcode`) now cross-references
  the eval alongside the existing "Add license" TODO so standards-level
  direction is discoverable from the TODO list.

## [Unreleased] - 2026-04-20

### Added
- `docs/revvel-standards/MOBILE_TEST_HARNESS_RESEARCH.md` — research and
  recommendation document for an Android + iOS test harness for Revvel apps.
  Recommends **`jest-expo` + `@testing-library/react-native` + Maestro** as the
  default stack with **Detox** as an opt-in alternate tier and **Appium**
  explicitly excluded. Wires native execution to **EAS Build `--profile preview`**
  - **GitHub Actions `macos-14` (iOS sim)** + **`ubuntu-latest` +
  `reactivecircus/android-emulator-runner` (Android emu)** so no developer
  needs Xcode or Android Studio installed locally — matching the
  `docs/AGENTS.md` Expo / EAS mandate. Includes RFC-2119 requirements
  (R-MTH-01..R-MTH-G-04) and an 8-PR per-app rollout plan. $0 for public repos.
  Resolves [Jules] PLEASE RESEARCH A TEST HARNASS FOR ANDROID AND IOS AND IMPLEMENT.
- `standards/MOBILE_TESTING.md` — short, normative mobile testing standard
  derived from the research doc. Mirrors the structure of `standards/TESTING.md`
  and reuses the 80/75/80/80 coverage thresholds from `skills/testing/SKILL.md`.
- `skills/mobile-testing/SKILL.md` + `mobile-testing.skill.yml` — new
  developer-facing skill so agents auto-load mobile-testing rules on Expo /
  React Native repos. Registered in `skills/REGISTRY.md` and
  `skills/SKILLS_INDEX.yml` under the `Testing & Quality` category.
- `templates/mobile/testing/` — drop-in starter configs:
  `jest.config.js` (jest-expo preset + coverage thresholds),
  `jest.setup.ts`, `mocks/expo-secure-store.ts`,
  `maestro/auth/sign-in.yaml` (reference flow for the mandatory Sign-In
  E2E journey), and `mobile-test.yml` (GH Actions workflow matrix —
  required status check name `mobile-test`).
- `templates/mobile/README.md` — updated to link to the new `testing/`
  subdirectory.
- `.gitbutler/config.json` — adds shared GitButler repo defaults (`baseBranch:
  main`, `remote: origin`) so contributors can make faster small commits /
  stacks before OpenRouter orchestration picks up issues and PRs.
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
- `docs/GITKRAKEN_INTEGRATION.md` — integration doc wiring in the
  GitKraken Client + `gk` CLI + GitLens as an opt-in, read-side
  contributor GUI. Adds multi-repo Workspaces, a unified Launchpad that
  surfaces existing `openrouter` / `graphite` / `graphite:stacked`
  labels, and a visual conflict editor for Graphite-rebased stacks.
  Free tier for public repos at $0; `gk` CLI is MIT-licensed FOSS.
  Includes RFC-2119 requirements (R-GK-01..R-GK-G-03) and a 4-step
  rollout plan (PR-1..PR-4). GitKraken is **not** granted write access
  and **not** a required tool.
- `.github/labels.yml` — two new canonical labels (`gitkraken`,
  `gitkraken:workspace`) added to the repository label definition set.
- `docs/ANTIGRAVITY_INTEGRATION.md` — integration plan for Google
  Antigravity, the agent-first IDE (public preview, 2025-11). Answers
  the originating issue's three questions — *where? how? BOM?* —
  positioning Antigravity as the contributor-local, browser-aware,
  artifact-producing counterpart to the existing Copilot / OpenRouter
  server-side swarms. Composes with Graphite stacks and the GitKraken
  Launchpad; PRs still traverse the unmodified `openrouter-assignee.yml`
  hand-off. MCP client reads the existing `skills/REGISTRY.md`; no new
  skills required and no CI role granted. Includes RFC-2119 requirements
  (R-AG-01..R-AG-G-03) and a 4-step opt-in rollout plan (PR-1..PR-4).
  Free / public-preview Individual tier at $0; Pro ~$20/mo and
  Enterprise ~$250/mo+ would require a new BOM row and standards-owner
  review.
- `.github/labels.yml` — two new canonical labels (`antigravity`,
  `antigravity:agent-run`) added to the repository label definition set.
- `docs/AUTOMATION_EXTENSIONS_INTEGRATION.md` — integration doc wiring in
  the **automation extensions** lane (`automation-app-bot` Probot GitHub
  App + Make.com SaaS scenarios + self-hosted n8n workflows) downstream
  of the OpenRouter hand-off. Turns the Make.com + n8n references
  already in the Marketing Automation Standard §5.4 into a live,
  labelled, BOM-tracked lane. All three tools are **not** granted write
  access to `main`; credentials flow through `skills/vault-agent`, and
  the upstream `automation-app-bot` fork is gated by
  `skills/fork-audit-bot`. Free tier / $0 for this repo. Includes
  RFC-2119 requirements (R-AX-01..R-AX-G-03) and a 4-step rollout plan
  (PR-1..PR-4).
- `.github/labels.yml` — four new canonical labels (`automation-ext`,
  `automation-ext:probot`, `automation-ext:make`, `automation-ext:n8n`)
  added to the repository label definition set.

### Changed
- `.gitignore` — now ignores local GitButler state while still committing
  `.gitbutler/config.json` as the team-shared config source.
- `docs/revvel-standards/BOM.md` — appended a Graphite row to
  "Purchase Needed" at P1 / $0 / 🟡 Planned, linking to the new
  integration doc.
- `docs/OPENROUTER_ASSIGNEE_PROCESS.md` — appended a cross-reference to
  `GRAPHITE_INTEGRATION.md` in the "See also" section (append-only).
- `docs/OPENROUTER_ASSIGNEE_PROCESS.md` — appended a cross-reference to
  `GITKRAKEN_INTEGRATION.md` in the "See also" section (append-only).
- `docs/revvel-standards/BOM.md` — appended a GitKraken row to
  "Purchase Needed" at P2 / $0 / 🟡 Planned, linking to the new
  integration doc.
- `docs/OPENROUTER_ASSIGNEE_PROCESS.md` — appended a cross-reference to
  `AUTOMATION_EXTENSIONS_INTEGRATION.md` in the "See also" section
  (append-only).
- `docs/revvel-standards/BOM.md` — appended an Automation Extensions
  row to "Purchase Needed" at P2 / $0 / 🟡 Planned, linking to the new
  integration doc.

### Policy
- **Append-only** — no existing files deleted or renamed. The existing
  `TEST_HARNESS_RESEARCH.md` v1.0.0 is left intact; Graphite is added as
  an extension (PR-9..PR-13) rather than an edit to that versioned doc.
- Repository automation no longer relies on the paid GitHub Copilot Coding
  Agent for issue/PR routing; OpenRouter API calls are now the routing path.

## [Unreleased] - 2026-04-15

### Added
- `trust-community/` — new root-level **Trust Community** area, Audrey's
  public home for published TruthSlayer audits. Ships with `README.md`,
  machine-readable `index.json` (schema `trust-community-index/v1`), and
  the first seeded audit at `trust-community/audits/revvel-standards/`
  (score 78 / Grade B / Bronze / confidence: high). Append-only layout
  preserves trust-signal history over time.
- `skills/truthslayer-audit/` — schema bumped to `truthslayer-audit/v1.1`
  (skill `1.1.0`). Adds required overall `confidence` level
  (`high | medium | low`) matching the Revvel research convention in
  `AI_RESEARCH_MODULE_STANDARD.md §8`, optional per-factor
  `evidence_confidence` map, and a `publication` block linking audits to
  the new trust-community area. `skills/SKILLS_INDEX.yml` updated to the
  new version. Backward-compatible with `v1` consumers.
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
