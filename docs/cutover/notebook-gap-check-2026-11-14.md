# Notebook gap check — Deterministic AST Governance and Monorepo Architecture

**Date:** November 14, 2026 (America/Denver)  
**Scope:** read-only check of GitHub `midnghtsapphire/revvel-standards` (primary) and `midnghtsapphire/oaudrey` (fallback if an item was not in standards). No writes were made to GitHub.  
**Notebook:** "Revvel Standards: Deterministic AST Governance and Monorepo Architecture Analysis" (notes dated around August 11–13, 2026). The notebook's claims were checked against the repos, not assumed true.  
**Dashboard figures:** 393 RPS and $179,500 MRR are sample output and are not treated as data.

## Refs searched

| Repo | Ref | HEAD | Commit time (America/Denver) |
|------|-----|------|------------------------------|
| revvel-standards | `main` | `e6b5a99659bf454874f62e8c8e4fba8f5aed32d5` | November 13, 2026, 9:21 PM MST |
| revvel-standards | `daily/2026-11-14` | `a6e8b5d7b3153203842eafffa6a97741359d8edc` | November 14, 2026, 3:01 PM MST |
| revvel-standards | all other `daily/*` branches (10 total, 2026-10-30 through 2026-11-14) | (trees listed; no script-name hits) | — |
| oaudrey | `main` | `80b9632e51eb05e11d25569f7e8bdfa49623ead3` | November 12, 2026, 1:52 PM MST |
| oaudrey | `daily/2026-11-05` | `6f1a28a9a83b77f335f0421065b8fb92eac5cf73` | November 11, 2026, 6:18 PM MST |
| oaudrey | all remote branches (unique file union) | no named-file hits | — |

**History method:** `git ls-tree` on `main` and every `daily/*` branch; `git log --all --full-history --diff-filter=A\|D\|R` for each exact basename; `git log --all --diff-filter=D --name-only` keyword filter; default-branch GitHub code search (script names returned no hits; later queries were rate-limited); GitHub issue search for the same names (no hits). Pickaxe/`-S` was not exhaustively run across the full monorepo object store (blobless clone).

**Limitation:** revvel-standards has 509 heads. Feature branches other than `daily/*` were not individually tree-walked. Nothing in main/daily history, current trees, docs mentions, or issue search pointed at the ten missing scripts, so a forgotten unmerged feature branch is possible but unlikely.

None of the named scripts, specs, or notebook concepts were found in oaudrey.

## Status key

- **EXISTS** — present on `main` and/or `daily/2026-11-14` (path and branch given).
- **WAS DELETED/MOVED** — once in git history, not at that path now (commit SHA and date).
- **NEVER FOUND** — not in the current trees or in add/delete/rename history of the searched refs, and not mentioned by that exact name in the current `main` tree.

---

## Scripts

| Item | Status | Where / notes |
|------|--------|----------------|
| `linter-router.js` | NEVER FOUND | No path, history, doc mention, or issue hit in searched refs. No close filename on `main`. Product-level `eslint.config.*` / `.eslintrc.json` files exist, but there is no repo-wide linter router. |
| `test-linter-router.js` | NEVER FOUND | Same as above. |
| `validate-symlinks.js` | NEVER FOUND | Related, different file: `tests/entry-point-guards-survive-symlinks.test.js` (exists on `main` and `daily/2026-11-14`). |
| `agent-fleet-simulator.js` | NEVER FOUND | No related filename. |
| `cleanup-environment.js` | NEVER FOUND | Related, different file: `scripts/cleanup-repo.sh` (exists on both branches). |
| `install-git-hooks.sh` | NEVER FOUND | Related existing hook path: `.pre-commit-config.yaml`, `.pre-commit-hooks/`, `templates/hooks/pre-commit` (all on both branches). |
| `test-parallel-products.py` | NEVER FOUND | No related filename. Products have individual test/dev scripts. |
| `devops-dashboard-cli.js` | NEVER FOUND | Related, different files: `scripts/dashboard-cli.js` (project-visibility CLI; not this name) and `products/devops-dashboard/` (Next.js app on port 3011). Both exist on `main` and `daily/2026-11-14`. |
| `devops-dashboard-unified.py` | NEVER FOUND | Same related product/CLI as above. No Python dashboard of this name. |
| `monorepo-health-status.md` | NEVER FOUND | Related, different files: `scripts/daily-diagnostic-audit.js`, `products/devops-dashboard/`. Do not backfill from sample dashboard numbers. |
| Deterministic AST transformation scripts (design-token AST; jscodeshift / ts-morph / babel) | NEVER FOUND | No `jscodeshift`, `ts-morph`, or "AST transform" / "deterministic AST" hits on `main`. Related CPU-first stand-in: `scripts/validate-design-tokens.js` + `tests/validate-design-tokens.test.js` (JSON schema validation and CSS/Tailwind emit, not AST rewrite). Also `packages/style-dictionary/`. All on both branches. |

## Specs

| Item | Status | Where / notes |
|------|--------|----------------|
| `UPREV_METHOD.md` | EXISTS | Repo root on `main` and `daily/2026-11-14`. Added in `2482ae6f65d3bfc4958e3fd2b8a790b80eed481e` (`governance: close 6 P0 gaps from MASTER.md §5`, #18325) on November 10, 2026, 7:42 AM MST (America/Denver). The August 2026 notebook's "missing master specs" finding is outdated. Real SSOT (six UPREV pillars), not a stub. |
| `WR_RESEARCH_MANDATE.md` | EXISTS | Repo root on both branches. Same add commit/date as above. |
| `ARTIFACT_GENERATOR.md` | EXISTS | Repo root on both branches. Same add commit/date as above. |
| `AGENT_BUILD_PROMPT.md` | EXISTS | **Root SSOT** `AGENT_BUILD_PROMPT.md` on both branches, same add commit as the three specs above. A **different** file, `docs/case-files/platform/AGENT_BUILD_PROMPT.md` (Recovery Methods Platform SaaS prompt, not the master spec), was added earlier in `cec16d1d714b4d1c000600fa53b02f3c80a65e31` on October 16, 2026, 4:13 PM MDT (America/Denver). Also `docs/case-files/platform/AGENT_BUILD_PROMPT_1.md`. Do not confuse the case-file prompts with the root SSOT. |
| CONTRACT file with "Rule 4" | EXISTS | `engines/CONTRACT.md` on both branches. Rule 4 is **Revenue preservation**: every `state.json` step must carry `revenue_target_monthly_usd` and `goal_phase`; the orchestrator must refuse work with no revenue target. The same file's prime directive is `$10k/month → $10M in 3 years`, which matches the notebook's Rule 4 target. Enforced in `engines/runner-orchestrator/orchestrate.js` and covered by a unit test. |

## Concepts

| Concept | Status | Where / notes |
|------|--------|----------------|
| Grounding Gates | EXISTS (spec / pending WR, not a finished named gate) | `wr/pending/14-veins-grounding-gate.md`; also `docs/bnatsheaf/BNAT_SHEAF_STANDARD.md`, `docs/bnatsheaf/MOTU_MASTER_PROMPT.md`, `.github/workflows/self-healing.yml`, `tests/self-healing.test.js`, `wr/issues/issue-15763-need-permanent-fix-in-self-healing-for-grounding-g.md`. The pending WR asks for a bi-directional proof gate: real `npm test` / compile must pass; an LLM "ship quality" opinion may WARN, never PASS. Plural phrase "Grounding Gates" was not used. |
| Anti-scaffolding / anti-bypass guard | EXISTS (anti-scaffolding only) | `.github/workflows/anti-scaffolding-enforcer.yml` plus docs (`docs/AGENTS.md`, `UPREV_METHOD.md`, `VISITING_AGENTS.md`, and others). Scans added diff lines for scaffolding language and bare `TODO`s. **Anti-bypass / "anti-bypass guard" as a named rule: NEVER FOUND.** |
| Linter rejecting `eslint-disable` / `@ts-ignore` / empty catch | NEVER FOUND | No repo-wide ban in eslint/biome configs, workflows, or standards. `eslint-disable` appears in production code. `@ts-ignore` was not found on `main`. "empty catch" appears only incidentally (e.g. product tests / a WR issue), not as a reject rule. |
| WR state machine Intake / Research / Design / Build / Ship / Live / Heal | NEVER FOUND (exact 7-phase machine) | No document or enum lists that seven-phase sequence together. Pieces exist separately: WR intake forms, research engine / mandate, build/ship workflows, self-heal. `WR_RESEARCH_MANDATE.md` has an intake → research → build-authorization pipeline, not the seven-phase machine. |
| Ralph Loop | EXISTS | `skills/ralph-loop/SKILL.md`, `.github/workflows/ralph-loop.yml`, `tests/ralph-loop-unblock.test.js`, `templates/cicd/ralph-loop.yml` on both branches. Skill text: retry CI fixes via `@copilot`, then escalate with `needs-human` after `max_retries`. **Documented `max_retries` is 5, not the notebook's "retries up to twice, then 24 hours."** Workflow is also gated on `REVVEL_LLM_ALLOW_CLOUD` / `REVVEL_SWITCH_CODING_AGENTS` (can invoke paid/cloud agents). |
| Personas oAudrey / The Professor / MindMappr / OpenRouter / Coder | EXISTS | All five are in `scripts/openrouter-personas.js` and `agent-creator-data.json` (23 personas total, not 5). Same set is referenced from `docs/CALL-NAMES.md`, `docs/BOT-ROSTER.json`, `docs/agents/professor/README.md`, and persona workflows. Present on both branches. |
| research-orchestrator MCP | NEVER FOUND (named tree + MCP runtime). Related orchestrator code EXISTS. | `MASTER.md` still cites `research-orchestrator/BUILD_SPEC.md`, `src/core.mjs`, `bin/dr.mjs`, `config/models.json`, and `mcp/manifest.json`, and says the MCP runtime is not built. **None of those paths exist** on `main` or `daily/2026-11-14`, and they have no add/delete history under that directory name (except `tests/research-orchestrator.test.js`, added in `e6b5a996` on November 13, 2026, 9:21 PM MST). The test imports `products/rnd-research-fleet/orchestrator.js` — a JS research-fleet orchestrator, **no `mcp/` directory**. Treat the MCP runtime as unbuilt; do not trust the MASTER.md file list as present. |
| Products on ports 3000–3011 | EXISTS (on `main` AGENTS.md; moved to legacy on daily) | `AGENTS.md` on `main` lists **13 products**, ports **3000–3011**, with **three compliance apps sharing 3010**, matching the notebook. Port **3007 is unused**; 3006 (HVAC Calc Service) is in the table but omitted from the copy-paste `npm run dev` command list. On `daily/2026-11-14`, the live `AGENTS.md` is the new rulebook and **does not include the port table**; the table remains in `legacy/AGENTS.md`. Product trees (including `products/devops-dashboard`, port 3011) are still on both branches. |

## PR #15668 and issue #15507

| Item | State | Labels / notes |
|------|--------|----------------|
| [PR #15668](https://github.com/midnghtsapphire/revvel-standards/pull/15668) checkpoint-gated Grids | **MERGED** (not stalled) | Merged July 10, 2026, 6:20 PM MDT (America/Denver) as `fc43cf25eb8380b38cb7fceaddc7b29174fde33d`. Base `main`, head `feat/checkpoint-gated-blocks`, not a draft. Current labels: `copilot`, `openrouter`, `priority-p2`, `role:orchestrator`. The August notebook's "stalled checkpoint-gated PR" finding is outdated; the rule landed. |
| [Issue #15507](https://github.com/midnghtsapphire/revvel-standards/issues/15507) spec-to-action bridge | **CLOSED** with `issue:done` | Created July 8, 2026, 12:28 AM MDT; closed July 8, 2026, 11:28 PM MDT (America/Denver). Assignee `midnghtsapphire`. `research:complete` and `wr:research-complete` were applied; `wr:jules` was applied July 8, 10:46 PM MDT. **`wr:code` was never applied.** Close coincided with merge of [PR #15572](https://github.com/midnghtsapphire/revvel-standards/pull/15572) (`1725362357f4cd331c32ed1861a1331eb3d59bd8`), which added only `wr/issues/issue-15507-spec-to-action-bridge-research-completes-execution.md` (+354, one file). [PR #15524](https://github.com/midnghtsapphire/revvel-standards/pull/15524) (same title, earlier branch) was closed unmerged. **No `.github/workflows/spec-to-action-bridge.yml` (or equivalent) exists.** Leftover labels still include `wr:in-progress`, `awaiting-review`, and `research:review-needed`. The notebook's "missing research-to-code label transition" is still substantively right: the issue is closed, but the bridge was not built. |

---

## Recommended to restore or build

Ordered by value to the deterministic flow (CPU-first, no paid services). "Restore" is used only when history shows the artifact once existed. Everything in the script list is **build**, not restore.

1. **Implement Grounding Gates (highest value).** The pending WR `wr/pending/14-veins-grounding-gate.md` already specifies a CPU-first gate: compile + real test suite must pass before auto-merge or a "PASS / ready to ship" verdict; LLM review may only WARN. This is the core of the notebook's deterministic governance story and does not need paid APIs.

2. **Add a deterministic suppressions / empty-catch check (stand-in for `linter-router.js` + `test-linter-router.js`).** Those scripts were never in git. The current anti-scaffolding enforcer does not ban `eslint-disable`, `@ts-ignore`, or empty `catch` blocks, and `eslint-disable` is already used in the tree. A small CI lint (eslint/biome `ban-ts-comment` / `no-empty` / no-unlimited-disable, or a repo-wide grep gate with a short allowlist) is CPU-first and closes this gap without a new router framework.

3. **Finish the spec-to-action bridge for #15507 (follow-through, not a reopen-for-its-own-sake).** The issue is closed, but only a WR markdown merged. Build a label-driven, deterministic kickoff: `research:complete` → actionable coder task list / `wr:code` (or the current coder route), plus stuck detection. Prefer templates and repo heuristics over a paid LLM extractor.

4. **Add a symlink / link check (stand-in for `validate-symlinks.js`).** Never in git. A CI check for unexpected or broken symlinks fits the current "no symlinks in the rulebook" decision and is cheap and deterministic. Existing coverage is only `tests/entry-point-guards-survive-symlinks.test.js`.

5. **Keep `scripts/validate-design-tokens.js`; do not build an AST-transform stack unless tokens start drifting in code.** The notebook's deterministic AST / jscodeshift / ts-morph / babel layer was never in the repo. The JSON token validator plus Style Dictionary is already CPU-first. Extend that validator if needed; do not introduce a paid or heavy AST toolchain first.

6. **Optional product smoke runner (stand-in for `test-parallel-products.py`).** Never in git. A local script that starts the assigned ports and hits health/home routes would be deterministic. Note port 3007 is unused and 3010 is shared by three apps.

7. **Use the existing hook path instead of writing `install-git-hooks.sh`.** `.pre-commit-config.yaml` and `templates/hooks/` already exist. Document and install those; do not add a second installer unless the existing hooks are unwired.

8. **Do not invent `monorepo-health-status.md` from sample telemetry.** If a health snapshot is still wanted, generate it from real CPU checks (`scripts/daily-diagnostic-audit.js`, CI, existing dashboard). Never seed 393 RPS or $179,500 MRR.

9. **Low value / do not duplicate:** `cleanup-environment.js` (see `scripts/cleanup-repo.sh`); `agent-fleet-simulator.js` (not required for merge gates); `devops-dashboard-cli.js` / `devops-dashboard-unified.py` (Next.js app and `scripts/dashboard-cli.js` already exist under other names).

10. **Defer the research-orchestrator MCP runtime.** It is unbuilt, and the tree `MASTER.md` cites is also missing. Related logic already lives in `products/rnd-research-fleet/orchestrator.js`. An MCP/OpenRouter runtime is not CPU-first and is not needed to close the deterministic-flow gaps above. If anything is landed later, start with the cited spec files existing in-repo so MASTER.md stops pointing at absent paths.

11. **Do not formalize the seven-phase WR state machine unless routing is actually blocked.** The exact Intake/Research/Design/Build/Ship/Live/Heal machine was never found; intake, research, build, ship, and heal already exist as separate pieces.

**Already present — no restore needed:** the four master specs (added November 10, 2026), `engines/CONTRACT.md` Rule 4, Ralph Loop, the five named personas (among 23), anti-scaffolding enforcer, product port map (on `main` AGENTS.md; on daily it lives in `legacy/AGENTS.md`), and PR #15668 (merged).

On `daily/2026-11-14` only: if the new AGENTS.md rulebook is cut over, consider carrying the port table forward or linking `legacy/AGENTS.md` so visiting agents still see 3000–3011. That is a docs cutover issue, not a missing product tree.
