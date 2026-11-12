## 2026-11-11 (3) — MarketShipper — draft App Platform deploy jobs

- `do-app-update.sh` and the three `*-do-deploy` CircleCI jobs live only on this draft. They are not in the product image-gate PRs. A merge can create or update DigitalOcean apps after Audrey sets `DIGITALOCEAN_ACCESS_TOKEN`. This draft is not approved.
## 2026-11-11 (5) — MarketShipper — screen-recorder-finder binds the shared Stripe server

- Restacked onto main `3d6ae9a8`. CircleCI keeps every job from main and adds `screen-recorder-finder-image`. The product calls `bindProduct('screen-recorder-finder')` in `packages/static-stripe-server`. `deploy_on_push` stays false. No DigitalOcean deploy job was added.

## 2026-11-11 (3) — MarketShipper — screen-recorder-finder image gate does not write to App Platform

- Restacked onto main `7aceb6284` (#18364 and #18365 kept). CircleCI keeps `demo-kit-test`, `affiliate-hub-build`, and `screen-recorder-finder-image`. The DigitalOcean create/update job is not on this branch. `npm ci` in the image uses `--ignore-scripts`. Checkout rate limit keys on `do-connecting-ip`, then the first `X-Forwarded-For` hop.

## 2026-11-11 — MarketShipper — screen-recorder-finder deploy path (WR #18332)

- Added an active Dockerfile, compose service, `/health`, pricing-page Stripe checkout, and DigitalOcean spec for `screen-recorder-finder.revvel.co` under `products/screen-recorder-finder/`. CircleCI job `screen-recorder-finder-image` builds the image and requests `/health`. No live URL and no real charge. Details: `products/screen-recorder-finder/CHANGELOG.md`.
## 2026-11-11 (4) — MarketShipper — one static Stripe server for affiliate-hub and ai-video-toolkit

- `packages/static-stripe-server/` is the server, the checkout button, and the image-gate cases. Each product file names its service and keeps the previous copy as line comments. `deploy_on_push` stays false. No DigitalOcean deploy job was added.

## 2026-11-11 (3) — MarketShipper — ai-video-toolkit image gate does not write to App Platform

- Restacked onto main `7aceb6284` (#18364 and #18365 kept). CircleCI keeps `demo-kit-test`, `affiliate-hub-build`, and `ai-video-toolkit-image`. The DigitalOcean create/update job is not on this branch. `npm ci` in the image uses `--ignore-scripts`. Checkout rate limit keys on `do-connecting-ip`, then the first `X-Forwarded-For` hop.

## 2026-11-11 — MarketShipper — ai-video-toolkit deploy path (WR #18331)

- Added an active Dockerfile, compose service, `/health`, pricing-page Stripe checkout, and DigitalOcean spec for `ai-video-toolkit.revvel.co` under `products/ai-video-toolkit/`. CircleCI job `ai-video-toolkit-image` builds the image and requests `/health`. No live URL and no real charge. Details: `products/ai-video-toolkit/CHANGELOG.md`.
## 2026-11-11 (4) — ResearchRodneyAIArchitect — PUCT priors reach the strategy entry point

- `runPot` forwards `priorFor` into the search. Lane runs read `context.potPriorFor`. A test goes through `runStrategy`, not only `search`.

## 2026-11-11 (3) — ResearchRodneyAIArchitect — MCTS uses the seed and PUCT follows the prior

- Expansion and rollouts read the search seed. PUCT picks the next untried action from the prior, including the first move. Without `potReward` the lane order is that seeded sample, not a quality ranking.

## 2026-11-11 (2) — ResearchRodneyAIArchitect — pot lane execution matches the linear fan-out

- `RESEARCH_STRATEGY=pot` runs the chosen lanes with `Promise.all` and reuses the Ralph retry/merge helpers. Without `potReward` the order matches definition order and the trace says so (`rewardConfigured: false`).

## 2026-11-11 — ResearchRodneyAIArchitect — Policy-of-Thoughts CPU engine (WR #18341)

- Added `scripts/pot-research/`: UCT Monte Carlo tree search, a GRPO step on a transient adapter, a frozen base-weight vector, and a deterministic stub policy. The linear lane fan-out in `scripts/research-engine.js` stays the default; `RESEARCH_STRATEGY=pot` opts in.
- Added `tests/pot-research.test.js`, `docs/research/pot-research-engine.md` (GPU budget marked as an estimate), `scripts/pot-research/LEDGER.md`, and `scripts/pot-research/benchmark.js`. The harness reports the +20-30% criterion as not measured. No quality delta is invented.
- CircleCI already runs `tests/**/*.test.js`. No new job and no GitHub-hosted workflow.
## 2026-11-11 (3) — MarketShipper — affiliate-hub image gate does not write to App Platform

- Restacked onto main `7aceb6284` (#18364 and #18365 kept). CircleCI keeps `demo-kit-test`, `affiliate-hub-build`, and `affiliate-hub-image`. The DigitalOcean create/update job is not on this branch. `npm ci` in the image uses `--ignore-scripts`. Checkout rate limit keys on `do-connecting-ip`, then the first `X-Forwarded-For` hop.

## 2026-11-11 — MarketShipper — affiliate-hub deploy path (WR #18330)

- Added an active Dockerfile, compose service, `/health`, pricing-page Stripe checkout, and DigitalOcean spec for `affiliate-hub.revvel.co` under `products/affiliate-hub/`. CircleCI job `affiliate-hub-image` builds the image and requests `/health`. No live URL and no real charge. Details: `products/affiliate-hub/CHANGELOG.md`.

## 2026-11-11 — MarketShipper (Grok 4.7, Cursor Cloud) — GOAP agent-as-FTE sales deck and landing

- `products/goap-swarm-console/sales/deck.md`: 13-slide source for work request #18334. Includes the value proposition, the $2,000 to $5,000 per agent per month band, an ROI illustration, and a proof-pending case study. No customer, quote, or result was invented. A same-day URL check found no deployed product to cite (issue #18330 is still open).
- `products/goap-swarm-console/public/goap-agent-sales-deck.pdf`: rebuilt from that source by `scripts/build_sales_deck.py`.
- `products/goap-swarm-console/landing/` and `deploy/app.yaml`: static landing page for agent-as-fte.revvel.co. The Calendly embed reads `CALENDLY_URL` and stays off when that value is empty or not an https link on calendly.com with a scheduling path.
- `.circleci/config.yml`: job `agent-as-fte` builds the PDF and the landing page and requires HTTP 200 on loopback.
- Prospect contact, closed customers, and Stripe MRR were not done. Ledger: `products/goap-swarm-console/LEDGER.md`.

## 2026-11-11 (2) — Rules-Steward — evidence checker follows readiness links

- 2026-11-11 — Rules-Steward (Cursor, Grok 4.7) — `scripts/compliance-evidence.js`: relative markdown links in the compliance docs are checked for file presence, beside the existing backtick-path scan. Bugbot on PR #18365. `tests/compliance-evidence.test.js` covers a relative link, a skipped web link, and a missing file.

## 2026-11-11 — Rules-Steward — NIST readiness mapping (WR #18343)

- 2026-11-11 — Rules-Steward (Cursor, Grok 4.7) — `docs/compliance/NIST_READINESS.md`: readiness mapping of repository controls to SP 800-53 Rev. 5 families. Statuses are implemented, partial, or gap. Not a compliance attestation. NISTIR 8605D is not drafted. Appended rescope notes to the 2026-11-10 NIST docs. Root `LEDGER.md` opened with this entry because the file was absent.

## 2026-11-11 — halo-demo-stream: AG-UI streaming + session-resume demo kit, wired to affiliate-hub (QuickWinBuilder, WR #18342)

- Added `products/halo-demo-stream/`: zero-dependency Node kit. `POST /agui` streams AG-UI standard events over SSE (RUN_STARTED, STATE_SNAPSHOT, TEXT_MESSAGE_START/CONTENT/END, STATE_DELTA as JSON Patch, RUN_FINISHED, RUN_ERROR). File-backed sessions resume by session id on any new client, including after a server restart. Plain HTML demo page, every text colour pair at least 7:1. 15 tests.
- Moved the affiliate-hub program catalogue and filter/sort logic out of `products/affiliate-hub/app/page.tsx` into `app/lib/programs.mjs` (+ `.d.mts`), so the page and the demo kit run the same code. `next build` passes. No behaviour change.
- CircleCI: new `demo-kit-test` job (kit tests) and `affiliate-hub-build` job (`npm ci` + `next build`), in both workflows. No GitHub Actions.
- Not done: ai-video-toolkit and screen-recorder-finder adapters, any deploy, cross-device test on live URLs (blocked on #18330 to #18332).

## 2026-11-10 (3) — Bot, team and agent backup, nested under docs/ (Proofy)

- Added `docs/bots/bot-<name>/README.md` (98 bots, call `/bot-<name>`), `docs/teams/<team>-team/README.md` (15 teams plus a pointer for the existing `/dragnet-team`), and `docs/agents/<name>/README.md` (pointers for 9 existing OpenRouter personas such as `/coder`, no prefix). Added `docs/CALL-NAMES.md`, `docs/README.md`, `docs/BOT-COMMON-RULES.md`, `docs/BOT-ROSTER.json`.
- Additions only; no existing file edited except an appended pointer in `docs/agents/README.md`. Existing persona/fleet definitions are linked, not copied.
- Private details redacted (public repo): emails, locations, a registry id, a family member's name, account-recovery specifics. Two Sense system prompts are kept in the private backup. No secrets or memory contents.

## 2026-11-10 (2) — scripts-as-CI wave 2: PR Lifecycle + PR Check Status + shared client

- `scripts/ci/lib/mini-github.js` — shared zero-dep client; listForRef/listComments now paginate fully (MEASURED: 235 check runs on main).
- `scripts/ci/pr-lifecycle.js`, `scripts/ci/pr-check-status.js` — extracted from YAML; replay-tested (PR #18324 green suite correctly resolved to aggregate failing; label write verified).
- Orchestrator refactored onto shared lib (regression: 19-PR resync OK).
- All three workflows: thin shims, `runs-on: self-hosted`, `shell: cmd`, **checkout pinned to `main`** so untrusted event-SHA code never runs on CARESSE with a write token.

## 2026-11-10 — PR State Orchestrator: scripts-as-CI extraction (METAL)

- `scripts/ci/pr-state-orchestrator.js` — ALL orchestrator logic extracted from YAML into one versioned, zero-dependency node script (MEASURED: local resync of 19 open PRs OK).
- `.github/workflows/pr-state-orchestrator.yml` — jobs are now thin invokers; `runs-on: self-hosted` (CARESSE), immune to GitHub-hosted billing lock (CITED: probe run 42686663155).
- Keeps schedule-trigger fix from earlier today (6-hourly auto resync — was gated on `schedule` with no trigger).
- Principles: oaudrey `governance/METAL/ci-docker-runners-principles.md` #1, #3, #8.

# Changelog

All notable changes to the Revvel Standards repository will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## 2026-11-07

- 2026-11-07 — Claude Fable 5 — `products/linear-a-lab/`: new incubating product (PRODUCT_INCUBATION_STANDARD). GORILA-GE license-clean Linear A corpus engine (1,711 inscriptions, schema `gorila-ge/1`, built from the public-domain-dedicated lineara.xyz data file — GORILA print corpus and SigLA are not license-clean); deterministic evidence/prosecution layer whose KU-RO arithmetic audit finds 8/22 documents summing exactly and reproduces the known HT 13 (+½) and HT 9a (−¾) discrepancies; test→deconstruct→prosecute→fix loop on LM Studio (stdlib-only client), first live case run on gemma-3-4b. 22 unit tests, offline, all green. BLUEPRINT.md, BLUEOCEAN.md, LEDGER.md, Library/ per standards.

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

## 2026-11-10 — Owned delivery and cross-repository integration

- Added working pricing and health exports for affiliate-hub, ai-video-toolkit,
  and screen-recorder-finder; fixed the affiliate Tailwind build and shared
  ESLint consumer resolution. Standalone public-artifact packaging runs locally
  on Node/Bun without repository webhooks or GitHub-hosted execution.
- Added GOAP sales/ROI pages and a verified twelve-slide PDF, plus evidence-based
  compliance readiness documentation. Billing and research acceptance remain
  open until real transactions, benchmarks, and operating evidence exist.
- Repaired the current scripts-as-CI checks, hub-registry compatibility, portable
  npm integrity checks, and template contract. Superseded code is preserved as
  dated comments, including the simulated root watcher at its original path.
- Cross-repository review, per-issue acceptance matrix, HULL merge/execution
  receipts, and pending hosting apply are recorded under wr/summaries/. HULL
  execution merged in oaudrey PR #13. No live deployment is claimed here.

## 2026-11-10 — Shipping continuation after Cloudflare handoff

- Codex revenue specialist added the signed Lago HTTP receiver, durable SQLite
  inbox, authoritative invoice/subscription reconciliation, persisted retry
  backoff, degraded health and actual crash/replay tests. Public paid checkout
  remains disabled until authenticated identity and live billing are verified.
- Codex intelligence specialist connected the existing optional LangGraph
  lifecycle to actual HULL policy execution, durable receipt references and
  explicit recovery/review commands; no second command executor was introduced.
- Codex prosecution specialist extended the existing prosecutor with local
  operator policy, real bounded subprocess checks, retained per-run receipts,
  stable repair IDs and advisory reviewer snippets. Fixed the root test wrapper
  that previously inherited NODE_TEST_CONTEXT and silently missed child tests.
- All 96 standards files were read across the assigned specialists before new
  implementation. This closes the standards-directory reading gap; it does not
  claim full semantic reading of the entire 824 MB archived corpus.
- Existing GIT-FLEET scheduling is extended in its own repository; no Cloudflare,
  Proofy, paid model, subscription, production access or DNS configuration changed.
  Live deployment and original issue acceptance remain explicitly open.

- Codex integration review retained the initial failed prosecution and passed
  63-test HULL receipt. Corrected full-diff work bounds, strict JSON evidence
  classification with duplicate-key rejection, executable template/regex
  handling, complete skill discovery, and bounded multi-batch billing drain.
  Added regression cases; no comparison budget, legacy allowance or merge gate
  was relaxed. Continued source-head validation is recorded with PR #18348.

- Codex operational verification: installed the separate owned local-checks
  Windows task, observed two zero-exit executions, retained the final 78-test
  HULL/prosecution receipt in GIT-FLEET PR #2, and recorded actual CircleCI
  job 23006 success on the implementation source head. Product hosting remains
  staged; no deployment, transaction, benchmark or customer result invented.

- Codex final handoff: recorded confirmed implementation merges #18348 and
  GIT-FLEET #2, exact reviewed/merged tree agreement, the installed local task,
  successful required CircleCI job 23013 and retained final execution receipts.
  Preserved an unstaged continuation-note appendix in a separate documentation
  follow-up; original product/research/customer acceptance remains open.

- Codex documentation completeness: added all nine Lago receiver environment
  names to canonical .env.example, including explicit issuer/key/database
  guidance. No credential values, live environment settings, listeners or
  subscriptions were created or changed.

- Codex follow-up gate repairs: registered Lago in the existing connections
  source and canonical generated views, preserving README content outside its
  generated marker. Corrected the timeout test's Linux postcondition to verify
  absent or actually terminated zombie/dead state, never accept a live PID.
  Retained the failing CI evidence and old assertion; no production timeout,
  comparison budget, drift check or legacy allowance was weakened.

- Codex prosecution integration: the larger 227 KB source packet now passes
  within the unchanged comparison budget. A UTF-16 character-count lower bound
  rejects mathematically impossible matches before edit-distance work; the
  actual multiline billing-assertion false positive has regression coverage.
  Independent review checked 35,962 cases against the exact legacy distance.
  Final HULL/prosecution run passed 81 tests, zero findings/provider calls.

- Codex, PR #18348 review follow-up: reproduced Cursor comment
  discussion_r4529468829 against current main. Ordinary comments and JSDoc no
  longer hide adjacent executable duplicates; partial comment state resets at
  unknown diff boundaries. Only anchored, explicit retirement headers retain
  the archive boundary. Added real regressions and preserved the old rules as
  dated comments; no paid Cursor autofix or provider call used.

- Codex final comment correction: a retirement header alone cannot exempt
  active code. Removed all comment/header segment barriers while retaining
  exclusion of actual commented bodies; active tails after closing block
  comments remain checked. Preserved the earlier incorrect archive assertion
  and rule as dated history. Forty-seven child regressions pass.
