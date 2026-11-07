# Changelog

## 2026-11-05

- 2026-11-05 — Grok Bot (Audrey-directed, TriageChief t59u) — Kill allow-destroy bypass (comment-out, not delete). `.circleci/scripts/check-archival-policy.sh`: old `resolve_allow_destroy` / label-ratify path commented out with Audrey quote ("ya not lets get rid of that") + AGENTS.md OWNER RULE (2026-10-30); deletions always fail closed. `scripts/no-destroy-guard.js` + `.github/workflows/no-destroy-guard.yml`: surgical comment-out of allow-destroy bypass wiring only (no new Actions). `tests/circleci-allow-destroy.test.js` + `tests/no-destroy-guard.test.js`: expect fail-closed / label ignored. Supersedes approach in draft #18261 (kept open). LEDGER.md not on base — no ledger line.

All notable changes to the Revvel Standards repository will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## 2026-11-05

- 2026-11-05 — Grok Bot (for Audrey) — Added `docs/governance/GITHUB_GOVERNANCE_PLAYBOOK.md` (links existing governance docs, states the daily-branch draft-PR rule, records the open `allow-destroy` vs OWNER RULE conflict for owner decision); appended one pointer line to `AGENTS.md`. Source: Freedom-Angel-Corp/brain-dump#3.
- 2026-11-05 — Grok Bot (Audrey-directed, TriageChief t60u) — Metal standards wave 1: **archive then rewrite**. Moved wordy `AGENTS.md`, `MASTER.md`, `VISITING_AGENTS.md`, `CLAUDE.md`, `.cursorrules`, `.github/copilot-instructions.md`, `docs/AGENTS.md` into `Archive/2026-11-05/` (`git mv`, history preserved). Wrote short metal replacements under original names; never-delete impossible to miss (no rm/trash/force-push wipe; visiting LLMs invent no permissions; call out search/long runs). Claude/Cursor/Copilot stubs point only at AGENTS + VISITING. Added `docs/governance/GUARDED_ARCHIVIST.md` (diffs-only) and `Library/references/metal-rewrite-2026-11-05.md` (PNG + Aegis + ROI notes; Dependabot/ImgBot marked diagram artifact). Compatible with drafts #18258/#18259/#18260. LEDGER.md not on base.
## 2026-11-06

- 2026-11-06 — Grok 4.7 (Cursor Cloud) — `docs/governance/ACTIONS_MIGRATION.md`: hosted Actions reds are an account billing lock (jobs fail with 0 steps and "your account is locked due to a billing issue"), not workflow code. Inventory and runner/webhook migration targets for `pr-lifecycle.yml`, `pr-state-orchestrator.yml`, `pr-check-status.yml`, and `agent-audit-logger.yml`. No CircleCI job added: the four are inline `actions/github-script` and need GitHub event payloads CircleCI does not receive. `.github/workflows/` unchanged. Refs #18268. Audrey decides: disable hosted workflows (not delete).
- 2026-11-06 — Cursor Grok — `products/merge-prosecutor`: a failed prosecution now opens a GitHub issue titled `[WR]`, which is the Work Request the call chain starts from. The runner markdown file is still written and is still discarded with the job. Repeat runs reuse the open issue via an `mpkey` search token. `docs/merge-prosecutor/index.html` is the page the README already linked. Owner direction on PR #18276: the empty "already done" close was not the work.
- 2026-11-06 — Cursor Cloud (Grok) — Follow-up on `standards/AGENT_SECURITY_BOUNDARIES.md` (PR #18260): history rewrite is an Audrey-approved incident exception under the `AGENTS.md` NEVER DELETE rule (rotate/revoke first and mandatory; private backup of original refs, plaintext secret never in a public place); token/app installation is the capability ceiling, and rulesets, branch protection, required reviews, and environment approvals also enforce limits; one-line pointers in `AGENTS.md` and `VISITING_AGENTS.md`; `lopezcaresse-wq` Write stays a pending owner action. No permissions changed. No workflow edits.

## 2026-11-05

- 2026-11-05 — Grok Bot (executor, for Audrey Evans) — Added `docs/plans/WR_TO_PR_PIPELINE_PLAN_2026-11-05.md`: plan for turning every request into a WR issue and a draft PR into `daily/YYYY-MM-DD`. Covers the Jules rewrite in code (REST API is the default; CLI and MCP documented), the Jules shutdown (sessions only until 2026-11-11), the model-chain and manual fallbacks, assignment by TriageChief with the confidence scorer, no hosted Actions, pull-only efficient pull paths, silent merge, and append-only. Plan only; nothing built. Also added `Library/README.md` and `Library/references/wr-to-pr-pipeline-sources.md`.
- 2026-11-05 — Grok Bot (Audrey via Proofy / TriageChief) — METAL (public) / HULL (kernel) governance pointer. Audrey's exact words: "HULL for the METAL kernel". Public brand stays METAL (public provenance face). Kernel renamed HUSK → HULL (protective kernel, linked to METAL and separable). No backronym assigned to HULL. Home stays midnghtsapphire/oaudrey; openaudrey stays brand-only. Archive-renamed `Library/references/husk-oaudrey-2026-11-05.md` to `docs/archive/2026-11-05/Library/references/husk-oaudrey-2026-11-05.md` (snapshot kept; not deleted; not git-rm). Canonical pointer: `Library/references/hull-oaudrey-2026-11-05.md`. Appended `wr/memory/decisions.jsonl` (`metal-public-hull-kernel`); earlier HUSK lines left in place. elisymlabs/husk remains a historical repo pointer only. Lowercase "metal" in #18263 is terse writing style, not the product name; that draft was not edited. No Actions YAML. Draft into daily/2026-11-05.
- 2026-11-05 — Grok Bot (executor, for Audrey Evans) — Locked Stage 0 Q1/Q2 on the WR→PR pipeline plan (#18267): from 2026-11-11 the default WR rewriter is Roo or Roomote (Jules until then); Jules data export owned by Secret into the vault only (never a repo); free-tier first, any paid option needs its own WR/PR. Plan file updated in place; outdated pending-Q1/Q2 lines marked SUPERSEDED, not deleted.
- 2026-11-05 — RulesSteward (recording Audrey Evans via Proofy / 1-Git-Triage widget t83s308) — Same Q1/Q2 lock on PR #18267, draft, not merged. Both Roo and Roomote stay the post-2026-11-11 rewriter options; Audrey did not pick only one. Lane 4 (repo model chain) and verbatim stay the fallbacks if Roo and Roomote are unavailable. Jules lanes stay historical / pre-11-11. Q2: Yes; Secret runs Google's Jules export into the vault only (never a repo). The export may include secrets. Free-tier first; anything paid needs its own WR/PR for Audrey's approval. No bot created. The row-4b "[VERIFY] wire into wr_rewrite.py" note is not the lock and is not wiring this plan authorizes. Plan only.
- 2026-11-05 — Grok Bot (executor, for Audrey Evans via 1-Git-Triage question card) — Added "Decisions 2026-11-05" to `docs/plans/WR_TO_PR_PIPELINE_PLAN_2026-11-05.md` (#18267): Q1 Roo/Roomote after 2026-11-11 (Jules primary until then; same in-code step, model-chain fallback kept), Q2 Jules export by Secret into the vault only, Q4 silent merges of clean PRs OK but no bot merges its own PR, Q6 land confidence scorer and root LEDGER from daily/2026-11-04 (#18249) once green, Q9 TriageChief = 1-Git-Triage (AGENTS roster later), and new merge gate: "Make sure the code has been assigned and done before merge." Open questions marked resolved by pointer; no text deleted.
- 2026-11-05 — RulesSteward (Grok Bot, for Audrey) — Added `standards/AGENT_SECURITY_BOUNDARIES.md` (token role is the boundary; Triage-only untrusted agents, Workflows perm off; one writer, loop cap 3; rotate-then-purge, Gitleaks on CircleCI/self-hosted). Read-only collaborator checks recorded. Refs Freedom-Angel-Corp/brain-dump#14.
- 2026-11-05 — Grok Bot (Audrey via Proofy / TriageChief) — METAL (public) / HULL (kernel) governance pointer. Audrey's exact words: "HULL for the METAL kernel". Public brand stays METAL (public provenance face). Kernel renamed HUSK → HULL (protective kernel, linked to METAL and separable). No backronym assigned to HULL. Home stays midnghtsapphire/oaudrey; openaudrey stays brand-only. Archive-renamed `Library/references/husk-oaudrey-2026-11-05.md` to `docs/archive/2026-11-05/Library/references/husk-oaudrey-2026-11-05.md` (snapshot kept; not deleted; not git-rm). Canonical pointer: `Library/references/hull-oaudrey-2026-11-05.md`. Appended `wr/memory/decisions.jsonl` (`metal-public-hull-kernel`); earlier HUSK lines left in place. elisymlabs/husk remains a historical repo pointer only. Lowercase "metal" in #18263 is terse writing style, not the product name; that draft was not edited. No Actions YAML. Draft into daily/2026-11-05.
- 2026-11-05 — RulesSteward (Audrey via Pedal + 1-Git-Triage) — Silent-merge lock. Exact words: "Make sure the code has been assigned and done before merge." Silent-merge only when the PR assignee is set, the linked work was assigned and is done (acceptance met), and required checks are green. Plan-only and "no bots until green-light" drafts stay draft. Agents still never merge their own PRs. The silent-merge actor still reports. Money, irreversible deletes without a prior yes, and personal secrets still escalate. Motivation: midnghtsapphire/oaudrey #2, #3, #4, and others merged 2026-11-05 with empty assignees. Canonical: `docs/governance/SILENT_MERGE.md`. Pointer in `AGENTS.md`. Library note: `Library/references/silent-merge-assignee-2026-11-05.md`. Refs #18269 (RulesSteward encode only; Secret's Whiteboard/hooks half for #18266 stays open on that issue). No Actions, scripts, or labels. Draft PR #18272 into daily/2026-11-05. Do not merge.

## 2026-11-04

- 2026-11-04 — Proofy (Grok Bot, approved by Audrey) — Opened Bot Lounge discussion #18246 (General); appended pointer line to AGENTS.md and VISITING_AGENTS.md.
- 2026-11-04 — Claude Opus 5 — `package.json`: `npm test` discovered zero JS tests on Windows and exited 0. npm runs scripts through cmd.exe, which does not treat the single quote as a quoting character, so `node --test 'tests/**/*.test.js'` reached node with the quotes attached and matched nothing. Switched to escaped double quotes. `test:all` and `test:cov` passed a bare directory, which Node >= 23 resolves as a module path and rejects; both now use the same glob. Guarded by `tests/npm-test-discovers-tests.test.js`.
- 2026-11-04 — Claude Opus 5 — `docs/distribution/`: added `WHITE_LABEL_DILIGENCE.md` (vendor rubric, direct-vs-sub-distribution asked first), `DDEX_AI_DISCLOSURE.md` (ContainsAI / AiContribution / GenerativeAI, per-DSP state, verified 2026-11-04), `ENFORCEMENT_SEPARATION.md` (hard rule: our own catalog does not ship through a distributor we operate), and `examples/release-metadata.example.json`.
- 2026-11-04 — Claude Opus 5 — `schemas/release-metadata.schema.json`: new. Per-element AI disclosure, required with no default; `Partly` requires a named `human_contribution`; `All` forbids one; owned-vs-borrowed ISRC registrant code. Enforced by `scripts/distribution/validate-release-metadata.js` and 32 tests in `tests/release-metadata-schema.test.js`.
- 2026-11-04 — Claude Opus 5 — Recovered six commits dropped by the squash-merge of PR #17913: `packages/repaint_core/artifacts.py`, `packages/repaint_core/mastering.py`, 56 tests, `scripts/naming/score_names.py`, `docs/distribution/HIT_PREDICTION_ASSESSMENT.md`, the voice-conversion fallback in `docs/repaint/SPIKE_REPORT.md`. No behaviour changes; restored verbatim.
- 2026-11-04 — Claude Opus 5 — `wr/memory/learnings-distribution.md`: new learning record. ERN 3.x is withdrawn (removed from DDEX sites 2026-03-01) and cannot carry AI disclosure, which inverts the scoring on a vendor rubric question; an omitted disclosure reads as unknown rather than none; Deezer's announced search toggle makes All-vs-Partly a revenue decision.
- 2026-11-04 — Claude Opus 5 — `packages/repaint_core/artifacts.py`, `scripts/naming/score_names.py`: cleared the flake8 findings that held the baseline gate red on this branch (E741 x2, E241 x54 — the gate allows no new debt above `config/flake8-baseline.txt`). `l` → `label` in two comprehensions; the aligned `CANDIDATES` table loses its column padding, which is what E241 is, so the table is now single-spaced. `score_names.py` is whitespace-only (`diff -w` against the recovered file is empty), both files still compile, and flake8 reports 0 findings on both under `.flake8`.
- 2026-11-04 — Claude Opus 5 — Opened Discussion #18252 (General): Copilot SWE Agent (app 1143301) holds an `always` bypass on ruleset 17149543 (`main`), covering `deletion`, `pull_request` and `required_status_checks`. The post recommends removing it, and records why that is not automatic — GitHub's 2025-11-13 changelog states that a repository carrying rules the agent cannot comply with disables the agent, so on some repositories deleting the entry switches it off. Here the enforced rules are not of that family (no commit-signing rule exists), `copilot-swe-agent` is absent from `suggestedActors(CAN_BE_ASSIGNED)`, and `openai-code-agent` is assignable under the same three rules with no bypass. Fallback if a Copilot PR ever stalls on `check-for-scaffolding`: re-add as “For pull requests only”, not `always`. Two side findings also recorded: the ruleset's `refs/heads/copilot/**` and `refs/heads/codex/**` excludes cannot match anything while the include is `refs/heads/main` alone, and `agent-approval-check` posts a commit status that no rule requires.

## 2026-10-30

- 2026-10-30 — Grok Bot (approved by Audrey) — Marked false live/shipped claims (no deletions): `rvvel-affiliate-links-mcp`, `@mechatronopolis/code-review-mcp`, `thealttext` are NOT on npm (SYSTEM_STATE.md, REPO_AUDIT.md, docs/MCP_REVVEL_CATALOG.md). Annotated Vercel URLs returning HTTP 402/404 on 2026-10-30 (soul2bowl, neurooz, veinsloop, printbank preview, revvel-standards, merchandise-asset-generator, cli-engine, pawsitting, music-video-creator) with dated status notes. Historical transcripts under docs/agents/claude/transcripts/ left untouched.
- 2026-10-30 — GitHubOrchestrator — Added `standards/PRODUCT_INCUBATION_STANDARD.md` and `standards/LEDGER_STANDARD.md`; registered both under Method & governance in `MASTER.md`.

## [Unreleased] - 2026-04-30

### Added
- `AGENTS.md`, `VISITING_AGENTS.md` — Appended "Whiteboard (GitHub Discussions)" rule: agents use each repo's Discussions as the whiteboard (2026-11-02).
- 2026-10-30 — `AGENTS.md`: added OWNER RULE — NEVER DELETE, NEVER REWRITE (Audrey Evans) near the top; overrides conflicting text, comment out instead of deleting.
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

## 2026-10-30

- 2026-10-30 — GitHubOrchestrator — added default bot role-symbol table at `Library/standards/bot-role-symbols.md`
- 2026-10-30 — GitHubOrchestrator — recorded design constraint: GitHub is not a hard dependency; Gitee (midnghtsapphire) approved as alternative primary or mirror.
- 2026-10-30 — GitHubOrchestrator — added permanent three-layer logo format to `Library/standards/bot-role-symbols.md`
- 2026-10-30 — GitHubOrchestrator — recorded design constraint: GitHub is not a hard dependency. GitLab and Gitee (midnghtsapphire) are approved alternative primaries or mirrors. `Library/standards/bot-role-symbols.md` (from e1fe176) should be mirrored/available on GitLab when ready.
- 2026-10-30 — GitHubOrchestrator — recorded HUSK (elisymlabs/husk) integration requirements as proposed, pending Audrey's confirmation of repo identity; no code changes.
- 2026-11-04 — Proofy — added 'Backups' section (back up to GitHub under backup-YYYY-MM-DD-<folder>-<bot>, verify size+sha256, never delete originals without Audrey's yes) to AGENTS.md and VISITING_AGENTS.md
- 2026-11-04 (MST) — Proofy — recorded on behalf of Claude Code (out of usage): two comments in revvel-standards Discussion #18238 (a misplaced pointer to the tartaria-tablets whiteboard, `19400617`, and Claude Code's correction under it, `19400657`) were DELETED by Claude Code on Audrey Evans's explicit instruction ("Delete it"). Both were Claude Code's own comments, posted minutes earlier by mistake; nothing else was touched. tartaria-tablets commit `2de436c`'s statement that they were "left in place" is superseded by this line (full entry in tartaria-tablets CHANGELOG.md).
