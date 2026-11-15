# Repository inventory — what is here, what belongs here

> **Generated 2026-11-14 by Auky for Audrey, against `main` @ `e6b5a99`.**
> Method: every top-level path was listed with its tracked-file count, size and last
> commit date, then checked for what points at it (workflows, scripts, tests,
> `package.json`, `config/`, CircleCI, Vercel/`vercel.json`, DigitalOcean spec,
> self-hosted-ci, and docs links). "Get rid of" is read as **move to where it belongs**.
> Nothing in this pass is deleted (RVS-AGENT-001); every move is a pure `git mv`.

## The short version

- **165** top-level entries (files + folders), **5,416** tracked files, **~842 MB** of tracked content.
- **123** belong at the root as they are (core governance, CI, tool config, Pages/Vercel root, live registries).
- **19** moved in this PR (phase 1, safe, nothing pointed at them).
- **17** do not really belong in a standards repo (mostly product/app code) — **proposed for phase 2**, held back because a workflow, test, link or the flake8 baseline is wired to their current path.
- **6** need your call (see "Needs a decision").
- **71 % of the repo's size is one folder** (`docs/case-files`, 598 MB) and **17 % is another** (`docs/agents/claude/transcripts`, ~146 MB). Neither is a root problem, but both are what is making clones heavy. See Phase 2.

## Phase 1 move map (this PR)

| From | To | Why |
| --- | --- | --- |
| `AGENT-DEPLOY-ONEFILE.md`, `…_COPILOT.md`, `…_Guardrails.md` | `docs/archive/root-batch-3/` | Old one-file agent prompts; 0 references |
| `IMPLEMENTATION_SUMMARY.md`, `IMPLEMENTATION_SUMMARY_BITO_AI.md` | `docs/archive/root-batch-3/` | One-off status reports (link in `docs/AGENT_PROMPT_EXECUTION_EVALUATION.md` updated) |
| `REPO_AUDIT.md` | `docs/archive/root-batch-3/` | 2026-05-02 snapshot |
| `.agents_tmp/PLAN.md` | `docs/archive/root-batch-3/agents_tmp/PLAN.md` | Agent scratch |
| `test-wr/wr/wr-12345-prosecutor.md` | `docs/archive/root-batch-3/test-wr/wr/` | WR test fixture, 0 references |
| `wr_watcher.py` | `docs/archive/root-batch-3/` | Already retired and fully commented out (#18313) |
| `DASHBOARD_QUICKREF.md` | `docs/DASHBOARD_QUICKREF.md` | Sits with `docs/PROJECT_DASHBOARD.md` |
| `TRUSTFORGE_SETUP.md` | `docs/TRUSTFORGE_SETUP.md` | Setup guide, belongs in docs |
| `README_SOCIAL_MEDIA_AUTOMATION.md` | `docs/README_SOCIAL_MEDIA_AUTOMATION.md` | Docs (link in `docs/ENGINE_INVENTORY.md` updated) |
| `Anatomy_of_Agentic_Resilience (1).jpg`, `Self-Evolving_AI_Agent_Architecture.jpg`, `Self-Healing_System_Architecture_Infographic (1).jpg`, `The_Immortal_Agent (1).pdf`, `The_Self-Healing_Agent (2).pdf` (about 20 MB) | `docs/veins/` | Same topic as the VEINS reference set already there; 0 references. Names unchanged |
| `requirements-spike.txt` | `scripts/spike/requirements-spike.txt` | Belongs next to `run_spike.py` (command in `docs/repaint/SPIKE_REPORT.md` updated) |
| `revvel-standards/docs/audrey/agents/audrey_super_agent.py` | `docs/audrey/agents/audrey_super_agent.py` | Stray nested folder named after the repo; `config/flake8-baseline.txt` line re-pointed (same `W292 1`) |

Plus two small edits so the moves are honest:
`.markdownlintignore` gains `docs/archive/**` (the archive README already says it is excluded; the glob was missing, so moved-in files would have been linted as live docs) and `docs/archive/README.md` / `docs/veins/README.md` list what arrived.

**Not moved, on purpose** (root-level files that look like clutter but are wired): `fix-semgrep.js` and `fix-zizmor.js` (pinned in a RATCHET list in `no-root-junk.yml` + a test; moving them means editing a workflow), `llms.txt.incoming.bak` (linked from `llms.txt`), both `hvac-bom-generator*.html` (linked from `index.html`, the Pages hub), `tokens.json`, `fleet-status.json`, `state.json`, `dashboard*.{html,json}`, `connections-dashboard.html`, `hub-registry.*`, `agent-creator*` (workflow-written or allow-listed at root), and `.cursorrules` (a symlink to `VISITING_AGENTS.md`).

## Needs a decision

1. **`fix-semgrep.js` / `fix-zizmor.js`** — junk, but removing them from the root means touching `no-root-junk.yml`. Your ratification (#17790) is the sanctioned route.
2. **`resumes/resume1.pdf`** — a personal résumé in a *public* repo, and `naukri-resume.yml` reads it. Suggest a private repo plus a workflow change.
3. **`cloudflare/MIGRATION.md` vs the rest of the repo** — it says oaudrey.com is on Vercel (free) with no DigitalOcean; `oaudrey/.do/app.yaml`, the standards and learnings say DigitalOcean App Platform with DNS on Cloudflare. One is stale. I did not touch either, and `oaudrey/` and `cloudflare/` stay put.
4. **`.lintmdrc`** and **`.session.db`** — unreferenced (an old lint config; an empty file). Harmless; left alone.
5. **`docs/case-files/` (598 MB)** — verified: **282 of its 284 files are byte-identical (same git blob) to the private repo `midnghtsapphire/case-files`**, which also holds the nine files left out here; only `README.md` and `MANIFEST.csv` differ, as expected. The README says this public copy is deliberate, and `docs/blue-ocean-sar/realdata/*.py`, `python-flake8.yml`, `scripts/flake8-baseline-gate.js` and two tests read it by path. So it is a "keep or slim down" call, not a cleanup. Moving it out of `main` would **not** shrink existing git history; that is a separate decision and I would not rewrite history.
6. **`docs/agents/claude/transcripts/` (~146 MB of raw session JSONL)** — bot output, not standards. Proposed home: a private archive repo (for example `box-backups` or `searchcrew-library`). `.markdownlintignore` already treats it as generated.

## Phase 2 proposals (not in this PR)

Ordered by payoff. Each needs a cross-repo draft PR in the target **and** a pointer here, and the source stays until both are merged.

| # | What | To | Blocked by |
| --- | --- | --- | --- |
| 1 | `products/*` (52 folders, 18 MB). Repos that already exist: `hvac-calc-service`, `deck-to-video-kit`, `openmythos`, `wr-4600-photon-bench`, `revvel-skill-runner` | the same-named repos | Check each for workflow pins first; `products/oaudrey-home` is a deploy source (see below) and the visiting-agent scan |
| 2 | Python apps: `coldtrace`, `growlingeyes`, `fraud-signal-verification-fleet`, `gatekeeper-cli`, `revvel-rosette-automation`, `penny-sovereign-yield-scout`, `poc` | `growlingeyes` (exists, private); the others need a new private repo each | `config/flake8-baseline.txt` is keyed by path, and `verify-security-fix.yml` runs `penny-sovereign-yield-scout` tests |
| 3 | `reesereviews/` | `reese-reviews` (public, exists) | `vine-to-marketplace.yml` uses `reesereviews/vine-marketplace` |
| 4 | `fieldwork/`, `osint-hub/` | their own repos or `products/` | `deploy-oaudrey.yml`; `docs/app-deployments.yml` |
| 5 | `mcp-servers/*` (279 files) | per-server repos or `github-free-toolkit` | Currently core to the fleet |
| 6 | `hvac-bom-generator*.html`, `avatars/`, `voices/`, `resumes/` | product repo / media repo / private repo | `index.html` links; `naukri-resume.yml` |
| 7 | `docs/agents/claude/transcripts/` | private archive repo | Your pick of target |
| 8 | `docs/` itself: ~100 loose standards next to 100 sub-folders; a `docs/` index grouped by topic | in place, with an index | ~1,000 inbound links; do as its own PR with a link checker |

## Deploy-path check (done before moving anything)

- **Vercel homepage** (`vercel.json`): runs `bash scripts/build-static.sh`, copies `docs/` and `projects/*/docs`, regenerates `hub-registry.json`. Root files I moved are not read by it. `docs/` gains about 20 MB of images/PDFs under `docs/veins/` (it already copies `docs/case-files`).
- **oaudrey.com / audit.oaudrey.com**: sources are `oaudrey/` (with `oaudrey/.do/app.yaml`) and `products/oaudrey-home/`. **Not touched.**
- **GitHub Pages root**: `index.html`, `404.html`, `.nojekyll`, `dashboard*`. **Not touched.**
- **CircleCI / self-hosted-ci** (`.circleci/`, `ops/self-hosted-ci/`): not touched. **No workflow files were edited.**
- Only `config/flake8-baseline.txt` (one path re-pointed) and `.markdownlintignore` (one glob added) are non-doc edits.

## Repo health numbers (reported, not acted on)

- Open PRs: **12** (5 draft). Branches on origin: **512**. Stale-branch cleanup was not requested.

## Top-level table (every entry)

Columns: path · what it is · tracked files / size / last commit · verdict · proposed home · reason.

| Path | What it is | Files / size / last commit | Verdict | Proposed home | Reason |
| --- | --- | --- | --- | --- | --- |
| `.agents_tmp` | Stray agent scratch folder (one `PLAN.md` about a `create-product.sh` idea). | 1 / 8 KB / 2026-08-20 | 🔀 moved (this PR) | `docs/archive/root-batch-3/agents_tmp/` | Scratch; nothing references it. |
| `.circleci` | CircleCI config + scripts. The real merge gate (`lint-and-test`, `policy-check`). | 11 / 80 KB / 2026-11-13 | ✅ stays | — | Core CI. Not touched. |
| `.claude` | Claude Code hooks/settings. | 1 / 16 KB / 2026-08-20 | ✅ stays | — | Tool config must live at root. |
| `.coderabbit.yaml` | CodeRabbit review config. | 1 / 4 KB / 2026-08-20 | ✅ stays | — | Tool config must live at root. |
| `.codex` | Codex `config.toml` (registers the action-gateway MCP). | 1 / 8 KB / 2026-11-12 | ✅ stays | — | `tests/action-gateway-mcp.test.js` and `config/connections.yml` pin the path. |
| `.cursorrules` | Symlink → `VISITING_AGENTS.md`. | 1 / 1 KB / 2026-08-24 | ✅ stays | — | Symlink; moving `VISITING_AGENTS.md` would break it. |
| `.dockerignore` | Docker build ignore. | 1 / 3 KB / 2026-11-12 | ✅ stays | — | Tool config. |
| `.editorconfig` | Editor defaults. | 1 / 1 KB / 2026-08-20 | ✅ stays | — | Tool config. |
| `.env.example` | Names of every env var the fleet uses (no values). | 1 / 19 KB / 2026-11-10 | ✅ stays | — | Convention. |
| `.flake8` | flake8 config. | 1 / 3 KB / 2026-10-16 | ✅ stays | — | Tool config. |
| `.flake8ignore` | Extra flake8 ignore list. | 1 / 1 KB / 2026-08-20 | ✅ stays | — | Pinned by `tests/python-flake8-workflow.test.js`. |
| `.gitattributes` | Git attributes. | 1 / 1 KB / 2026-08-20 | ✅ stays | — | Tool config. |
| `.gitbutler` | GitButler `config.json` (the rest is ignored). | 1 / 8 KB / 2026-08-20 | ✅ stays | — | `.gitignore` pins it. |
| `.gitguardian.yaml` | GitGuardian secret-scan config. | 1 / 2 KB / 2026-11-12 | ✅ stays | — | Merge gate input. |
| `.github` | Workflows, issue templates, CODEOWNERS, agent routing files (267 files). | 267 / 2.3 MB / 2026-11-12 | ✅ stays | — | Workflows are off-limits for this pass (Actions billing lock rule). |
| `.gitignore` | Git ignore rules. | 1 / 2 KB / 2026-08-20 | ✅ stays | — | Tool config. |
| `.gosqlx.yml` | GoSQLX lint config. | 1 / 1 KB / 2026-08-20 | ✅ stays | — | `gosqlx-lint.yml` uses it. |
| `.lintmdrc` | Older markdown-lint config (`excludeFiles`). | 1 / 1 KB / 2026-08-20 | ❓ needs Audrey's decision | keep, or `archive` | Nothing in `.github`, `scripts`, `tests` or `package.json` references it; the live configs are `.markdownlint.yaml` / `.jsonc`. Left alone because it is tiny and harmless. |
| `.markdownlint.jsonc` | markdownlint config (variant 1). | 1 / 1 KB / 2026-08-20 | ✅ stays | — | Pinned by `lint-md.yml` and `tests/markdown-gates-agree.test.js`. Note: a second config (`.markdownlint.yaml`) exists; both are wired. |
| `.markdownlint.yaml` | markdownlint config (variant 2). | 1 / 2 KB / 2026-08-20 | ✅ stays | — | Pinned by `lint-md.yml` and `markdownlint-repo.mjs`. |
| `.markdownlintignore` | Paths the markdown gates skip. | 1 / 1 KB / 2026-10-16 | ✅ stays | — (edited: +`docs/archive/**`) | The archive README already said archive is excluded; the glob was missing. |
| `.mcp.json` | MCP server registry for Claude Code. | 1 / 9 KB / 2026-11-12 | ✅ stays | — | Pinned by `config/connections.yml` and tests. |
| `.nojekyll` | GitHub Pages: skip Jekyll. | 1 / 0 KB / 2026-08-20 | ✅ stays | — | Pages needs it at root. |
| `.openhands` | OpenHands microagents + setup. | 2 / 16 KB / 2026-11-03 | ✅ stays | — | Tool config. |
| `.pre-commit-config.yaml` | pre-commit hooks. | 1 / 1 KB / 2026-08-20 | ✅ stays | — | Referenced by bootstrap scripts. |
| `.pre-commit-hooks` | Hook scripts used by pre-commit. | 2 / 20 KB / 2026-11-07 | ✅ stays | — | Tool config. |
| `.sandbox` | One folder per visiting agent (`claude-code-opus5`, `jules`, `cursor-cloud`). | 9 / 68 KB / 2026-08-21 | ✅ stays | — | `sandbox-guardrail.yml` requires `.sandbox/<agent>/`; VISITING_AGENTS §1b. |
| `.secrets.baseline` | detect-secrets baseline. | 1 / 16 KB / 2026-08-20 | ✅ stays | — | Security tooling. |
| `.session.db` | Empty (0 byte) tracked file. | 1 / 0 KB / 2026-08-20 | ❓ needs Audrey's decision | `docs/archive/` or leave | Unreferenced and empty. Left alone because an empty file is harmless. |
| `.sonarcloud.properties` | SonarCloud config. | 1 / 1 KB / 2026-11-11 | ✅ stays | — | Merge gate input. |
| `.veins` | V.E.I.N.S. self-healing proposals. | 7 / 36 KB / 2026-08-20 | ✅ stays | — | `scripts/veins-*.js` and `biome/sheaf.js` read `.veins/proposals/`. |
| `404.html` | GitHub Pages 404. | 1 / 3 KB / 2026-08-20 | ✅ stays | — | Pages root. |
| `AGENT-DEPLOY-ONEFILE.md` | Old one-file agent prompt ("Driven" agent). | 1 / 10 KB / 2026-08-20 | 🔀 moved (this PR) | `docs/archive/root-batch-3/` | 0 references; superseded by AGENTS.md / GOAP prompts. |
| `AGENT-DEPLOY-ONEFILE_COPILOT.md` | Variant of the same prompt (no guardrails). | 1 / 13 KB / 2026-08-20 | 🔀 moved (this PR) | `docs/archive/root-batch-3/` | 0 references. |
| `AGENT-DEPLOY-ONEFILE_Guardrails.md` | Variant of the same prompt (guardrails). | 1 / 16 KB / 2026-08-20 | 🔀 moved (this PR) | `docs/archive/root-batch-3/` | 0 references. |
| `AGENTS.md` | Master rules for every agent working in the repo. | 1 / 26 KB / 2026-11-04 | ✅ stays | — | Core governance; ~430 mentions. |
| `AGENT_BUILD_PROMPT.md` | Build-agent prompt. | 1 / 8 KB / 2026-11-10 | ✅ stays | — | Referenced by scripts/docs. |
| `ARTIFACT_GENERATOR.md` | Video artifact generator spec. | 1 / 11 KB / 2026-11-10 | ✅ stays | — | Referenced by `artifacts/` and a script. |
| `ASSUMPTIONS.md` | Agents' assumption log (AGENTS.md says to read it first). | 1 / 2 KB / 2026-08-20 | ✅ stays | — | Named in the agent rules. |
| `Anatomy_of_Agentic_Resilience (1).jpg` | Infographic. | 1 / 670 KB / 2026-08-20 | 🔀 moved (this PR) | `docs/veins/` | Unreferenced; sits with the VEINS reference set. |
| `BUSINESSES.md` | Master entity/project index (her companies). | 1 / 12 KB / 2026-11-09 | ✅ stays | — | Core context; 0 references but it is the owner's index. Candidate for `docs/` later. |
| `CHANGELOG.md` | Repo changelog (append-only). | 1 / 48 KB / 2026-11-13 | ✅ stays | — | Rule: write CHANGELOG as you go. |
| `CLAUDE.md` | Claude Code rules + gotchas. | 1 / 7 KB / 2026-08-20 | ✅ stays | — | Tool convention. |
| `CODE_REVIEW_STANDARD.md` | Code-review standard. | 1 / 6 KB / 2026-08-20 | ✅ stays | — | Core governance. |
| `DASHBOARD_QUICKREF.md` | Quick reference for the project dashboard. | 1 / 5 KB / 2026-10-30 | 🔀 moved (this PR) | `docs/DASHBOARD_QUICKREF.md` | Sits next to `docs/PROJECT_DASHBOARD.md`; only archived reports mention it. |
| `DECISIONS-TODAY.md` | Daily decision queue (currently "quiet mode"). | 1 / 1 KB / 2026-08-20 | ✅ stays | — | Named by `triage-cron.yml` and a standard. |
| `DECISIONS.md` | Decision log. | 1 / 8 KB / 2026-08-21 | ✅ stays | — | Core governance. |
| `Dockerfile` | Root image for CI/dev. | 1 / 2 KB / 2026-08-21 | ✅ stays | — | Pinned by deploy/CI references. |
| `GOAL.md` | Mission and revenue targets. | 1 / 2 KB / 2026-08-20 | ✅ stays | — | Core; GOAP.md links to it. |
| `GOAP.md` | GOAP agent system index. | 1 / 6 KB / 2026-08-20 | ✅ stays | — | Core. |
| `GOAP_AGENT_PROMPT.md` | Canonical GOAP system prompt. | 1 / 17 KB / 2026-08-20 | ✅ stays | — | Core; linked from GOAP.md. |
| `HANDOFF.md` | Current handoff (CUDA execution-model rollout). | 1 / 10 KB / 2026-08-20 | ✅ stays | — | Live handoff; named in agent rules. |
| `IMPLEMENTATION_SUMMARY.md` | 2026-04-29 summary of an agent enhancement PR. | 1 / 13 KB / 2026-08-20 | 🔀 moved (this PR) | `docs/archive/root-batch-3/` | One-off status report. |
| `IMPLEMENTATION_SUMMARY_BITO_AI.md` | Bito AI integration summary. | 1 / 6 KB / 2026-08-20 | 🔀 moved (this PR) | `docs/archive/root-batch-3/` | One-off status report; two doc links updated. |
| `LEDGER.md` | Work ledger. | 1 / 15 KB / 2026-11-12 | ✅ stays | — | Rule: write LEDGER as you go. |
| `LICENSE` | License. | 1 / 1 KB / 2026-08-20 | ✅ stays | — |  |
| `Library` | Shipping evidence library (halo-demo-stream, verification…). | 6 / 60 KB / 2026-11-12 | ✅ stays | — | Rule: `Library/` is part of the standard. |
| `MASTER.md` | System of record; says which doc governs. | 1 / 10 KB / 2026-10-30 | ✅ stays | — | Core governance. |
| `MEMORIES.md` | Bug-finding memory log. | 1 / 1 KB / 2026-08-20 | ✅ stays | — | Append-only log; nothing reads it by name but agents write to it. |
| `MODEL_CONFIG.md` | LLM lane table / house rules. | 1 / 5 KB / 2026-08-21 | ✅ stays | — | Core (local-first LLM policy). |
| `QUICKSTART.md` | Quick start. | 1 / 3 KB / 2026-08-20 | ✅ stays | — |  |
| `README.md` | Main README (SSOT front page). | 1 / 50 KB / 2026-11-12 | ✅ stays | — |  |
| `README_SOCIAL_MEDIA_AUTOMATION.md` | Social-post-on-merge package notes. | 1 / 2 KB / 2026-08-20 | 🔀 moved (this PR) | `docs/README_SOCIAL_MEDIA_AUTOMATION.md` | Only `docs/ENGINE_INVENTORY.md` mentions it (link updated). |
| `REMINDERS.md` | "If you're about to do X, read Y" index. | 1 / 10 KB / 2026-08-20 | ✅ stays | — | Core; README links it. |
| `REPO_AUDIT.md` | Audit snapshot dated 2026-05-02. | 1 / 5 KB / 2026-10-30 | 🔀 moved (this PR) | `docs/archive/root-batch-3/` | Point-in-time report. |
| `REPO_LIBRARY_STANDARD.md` | Library/ standard. | 1 / 1 KB / 2026-10-30 | ✅ stays | — | Core governance. |
| `REVENUE_GATE.md` | Pre-build revenue checklist for every WR. | 1 / 3 KB / 2026-08-20 | ✅ stays | — | Referenced by `artifacts/revvel-finishers`. |
| `SHIP_STATUS.md` | Latest operational ship receipt. | 1 / 7 KB / 2026-11-10 | ✅ stays | — | Live status; referenced by scripts. |
| `START_HERE_CALL_CHAIN.md` | File → next file call chain. | 1 / 10 KB / 2026-08-24 | ✅ stays | — | README pins it. |
| `SYSTEM_STATE.md` | Current system state. | 1 / 28 KB / 2026-11-12 | ✅ stays | — | Live; referenced by scripts. |
| `Self-Evolving_AI_Agent_Architecture.jpg` | Infographic. | 1 / 693 KB / 2026-08-20 | 🔀 moved (this PR) | `docs/veins/` | Unreferenced. |
| `Self-Healing_System_Architecture_Infographic (1).jpg` | Infographic. | 1 / 747 KB / 2026-08-20 | 🔀 moved (this PR) | `docs/veins/` | Unreferenced. |
| `THINKING_SCRATCHPAD.md` | Unfiltered brain-dump journal (opposite of learnings.md). | 1 / 10 KB / 2026-08-20 | ✅ stays | — | Linked from two docs; by design at root. |
| `TRUSTFORGE_SETUP.md` | TrustForge E-E-A-T agent setup guide. | 1 / 7 KB / 2026-08-20 | 🔀 moved (this PR) | `docs/TRUSTFORGE_SETUP.md` | Only archived reports mention it. |
| `The_Immortal_Agent (1).pdf` | 9 MB PDF. | 1 / 9.0 MB / 2026-08-20 | 🔀 moved (this PR) | `docs/veins/` | Unreferenced. |
| `The_Self-Healing_Agent (2).pdf` | 11 MB PDF. | 1 / 10.9 MB / 2026-08-20 | 🔀 moved (this PR) | `docs/veins/` | Unreferenced. |
| `UPREV_METHOD.md` | UPREV method. | 1 / 9 KB / 2026-11-10 | ✅ stays | — | Core governance. |
| `VISITING_AGENTS.md` | Rules for visiting agents (`.cursorrules` symlinks here). | 1 / 13 KB / 2026-11-12 | ✅ stays | — | Core governance. |
| `WRITE_AS_YOU_GO_STANDARD.md` | Write-as-you-go standard. | 1 / 1 KB / 2026-10-30 | ✅ stays | — | Core governance. |
| `WR_RESEARCH_MANDATE.md` | WR research mandate. | 1 / 10 KB / 2026-11-10 | ✅ stays | — | Core governance. |
| `WR_TEMPLATE.md` | Work-request template. | 1 / 2 KB / 2026-08-20 | ✅ stays | — | Referenced by workflows/scripts. |
| `WR_TEMPLATE_BASIC.md` | Short WR template. | 1 / 2 KB / 2026-08-20 | ✅ stays | — | Referenced by workflows/scripts. |
| `agent-creator-data.js` | Generated persona data for `agent-creator.html`. | 1 / 44 KB / 2026-08-22 | ✅ stays | — | Allow-listed at root by `no-root-junk.yml`; rebuilt by `update-agent-creator-data.yml`. |
| `agent-creator-data.json` | Same data as JSON. | 1 / 60 KB / 2026-08-22 | ✅ stays | — | Same workflow + tests. |
| `agent-creator.html` | Agent creator page. | 1 / 45 KB / 2026-08-20 | ✅ stays | — | Served from root; workflow-pinned. |
| `agent-factory` | Agent factory (commands/hooks/plugins/settings). | 7 / 48 KB / 2026-11-12 | ✅ stays | — | Referenced by docs + templates. |
| `agent-pack` | Failure-ledger schema, routing-failover example, lefthook. | 4 / 20 KB / 2026-08-20 | ✅ stays | — | `scripts/failure-ledger.js` and `lane-failover.js` read it. |
| `artifacts` | Artifact templates, WR packs, formal reports. | 35 / 276 KB / 2026-11-12 | ✅ stays | — | Workflows and scripts read it. |
| `avatars` | Avatar repository README (video production). | 1 / 8 KB / 2026-08-20 | 📌 stays for now → Phase 2 proposal | `docs/` or a media repo | Index-only (1 file). Low value either way. |
| `cloudflare` | Cloudflare DNS migration runbook + bulk redirects CSV. | 2 / 12 KB / 2026-11-09 | ❓ needs Audrey's decision | — | Leave. `MIGRATION.md` says oaudrey.com is on **Vercel free, no DigitalOcean**, but `oaudrey/.do/app.yaml`, the standards and learnings say **DigitalOcean App Platform with DNS on Cloudflare**. One of them is stale. |
| `coldtrace` | ColdTrace cold-case GIS platform (Python backend). | 24 / 168 KB / 2026-08-21 | 📌 stays for now → Phase 2 proposal | its own repo (private; none exists yet) | Product code. Pinned: `config/flake8-baseline.txt` is keyed by path, and `codeql.yml` mentions it. |
| `compliance` | WR-15279 privacy impact assessment. | 11 / 92 KB / 2026-08-20 | ✅ stays | — | `tests/wr-15279-pia.test.js` pins the path. |
| `config` | Fleet config (connections, personas, quality paths, flake8 baseline). | 24 / 180 KB / 2026-11-12 | ✅ stays | — | Core; read by ~260 files. |
| `connections-dashboard.html` | On-demand connections dashboard. | 1 / 18 KB / 2026-11-12 | ✅ stays | — | Generated by `connections-registry.yml`. |
| `dashboard-data.json` | Project dashboard data. | 1 / 55 KB / 2026-08-24 | ✅ stays | — | Written by `update-project-dashboard.yml`. |
| `dashboard.html` | Project dashboard page. | 1 / 36 KB / 2026-08-24 | ✅ stays | — | Pages root; README links it. |
| `data` | Hub entries, security advisories, subscriptions. | 5 / 36 KB / 2026-08-20 | ✅ stays | — | Workflows trigger on `data/hub/entries/**`, `data/subscriptions.yml`. |
| `deploy` | Lago billing docker-compose + metrics. | 2 / 16 KB / 2026-11-12 | ✅ stays | — | Billing workflows use it. |
| `disaster-recovery` | Grok build pack 2026-08-05 (formal report, memory snapshot). | 6 / 52 KB / 2026-08-20 | ✅ stays | — | `formal-auto-wr.yml` and `agent-scorecard-governance.yml` read a file in it. |
| `docs` | Everything documented: 1,677 files; 100 sub-folders + 343 loose files. | 1677 / 790.9 MB / 2026-11-13 | ✅ stays | — (see docs section below) | Core, but crowded. Needs its own pass. |
| `dprint.json` | dprint formatter config. | 1 / 1 KB / 2026-08-20 | ✅ stays | — | `dprint-check.yml` + test. |
| `engines` | Runner orchestrator + engine contract. | 3 / 36 KB / 2026-08-20 | ✅ stays | — | `npm run engine` runs it. |
| `fieldwork` | FieldWork static app. | 8 / 76 KB / 2026-08-21 | 📌 stays for now → Phase 2 proposal | its own repo or `products/` | `deploy-oaudrey.yml` triggers on `fieldwork/**`; deploy path, not moved. |
| `fix-semgrep.js` | One-shot patcher for `image-seo-qa.yml` (throwaway). | 1 / 1 KB / 2026-08-20 | ❓ needs Audrey's decision | `scripts/` or archive | Real junk, but `no-root-junk.yml` has it in a RATCHET list and a test asserts the list. Moving it means editing a workflow, which is off-limits here. Needs your ratification (#17790). |
| `fix-zizmor.js` | Same kind of one-shot patcher. | 1 / 2 KB / 2026-08-20 | ❓ needs Audrey's decision | `scripts/` or archive | Same RATCHET pin as above. |
| `fleet-status.json` | Live fleet status feed. | 1 / 1 KB / 2026-11-09 | ✅ stays | — | Read by `ag_ui_bridge.mjs` and `docs/fleet`. |
| `fork-audit` | Fork audit candidates list. | 1 / 8 KB / 2026-08-20 | ✅ stays | — | Read by `fork-audit-bot.yml` / script. |
| `fraud-signal-verification-fleet` | Fraud-signal fleet (Python). | 38 / 260 KB / 2026-08-20 | 📌 stays for now → Phase 2 proposal | its own repo | `config/fleets.yml`, flake8 baseline. |
| `gatekeeper-cli` | gatekeeper Python CLI. | 13 / 88 KB / 2026-08-20 | 📌 stays for now → Phase 2 proposal | its own repo | flake8 baseline keyed by path. |
| `growlingeyes` | GrowlingEyes Python tooling (axion_mcp, doppemcp). | 26 / 268 KB / 2026-08-20 | 📌 stays for now → Phase 2 proposal | `growlingeyes` repo (private, exists) | flake8 baseline keyed by path. |
| `hub-registry.js` | Generated hub registry (JS). | 1 / 8 KB / 2026-11-10 | ✅ stays | — | Allow-listed; publish workflows read it. |
| `hub-registry.json` | Generated hub registry (JSON). | 1 / 10 KB / 2026-11-10 | ✅ stays | — | Same. |
| `hvac-bom-generator-FULL.html` | Standalone HVAC bill-of-materials page. | 1 / 14 KB / 2026-08-20 | 📌 stays for now → Phase 2 proposal | `products/hvac-calc-service/` (and the private `hvac-calc-service` repo) | Product page, not governance. Not moved: `index.html` links `./hvac-bom-generator.html`, which is the Pages hub. |
| `hvac-bom-generator.html` | Compact version of the same page. | 1 / 10 KB / 2026-08-20 | 📌 stays for now → Phase 2 proposal | same | Same link in `index.html`. |
| `index.html` | Pages hub landing page. | 1 / 17 KB / 2026-08-20 | ✅ stays | — | Served from root. |
| `install` | GBrain easy-install kit (kong, mac, windows). | 10 / 116 KB / 2026-08-20 | ✅ stays | — | Referenced by README and docs. |
| `inventory` | Federal/state records, GitHub orgs, ideas, migration manifest. | 5 / 36 KB / 2026-11-04 | ✅ stays | — | Research inventories; `migration-cron.yml` reads the manifest. |
| `learnings.md` | Append-only learnings log (curated, trusted). | 1 / 85 KB / 2026-11-11 | ✅ stays | — | Core. Do not whole-file-rewrite. |
| `llms.txt` | llms.txt for LLM crawlers. | 1 / 12 KB / 2026-08-27 | ✅ stays | — | Served from root. |
| `llms.txt.incoming.bak` | Incoming llms.txt revision kept for comparison. | 1 / 7 KB / 2026-08-27 | 📌 stays for now → Phase 2 proposal | `docs/archive/` | Not moved: `llms.txt` and `docs/llms-txt-eval-2026-08-27.md` link to it. |
| `logs` | Agent audit + failure ledger. | 3 / 256 KB / 2026-08-20 | ✅ stays | — | Written by workflows. |
| `mcp-servers` | MCP servers (doppler, meilisearch, wr-control-plane, gemini-notebook CLI…). 279 files, 3.9 MB. | 279 / 3.8 MB / 2026-08-21 | 📌 stays for now → Phase 2 proposal | `github-free-toolkit` or per-server repos | Core to the fleet today. Candidate once they have their own repos. |
| `oaudrey` | oAudrey hub sources (`audit.oaudrey.com` static site, `.do/app.yaml`). | 16 / 312 KB / 2026-11-12 | ✅ stays | — | **Deploy path.** `deploy-oaudrey.yml` and the App Platform spec point here. Not touched. |
| `ops` | `self-hosted-ci` dispatcher + WR rewrite workflow. | 8 / 68 KB / 2026-10-16 | ✅ stays | — | Core: the billing-lock CI lane. |
| `osint-hub` | OSINT Hub static site. | 4 / 92 KB / 2026-08-21 | 📌 stays for now → Phase 2 proposal | `products/` or its own repo | `docs/app-deployments.yml` and a test point at `osint-hub`. |
| `package-lock.json` | npm lockfile. | 1 / 140 KB / 2026-11-10 | ✅ stays | — |  |
| `package.json` | npm manifest + `npm test`. | 1 / 4 KB / 2026-11-11 | ✅ stays | — |  |
| `packages` | Shared config packages (eslint, prettier, repaint_core, style-dictionary…). | 34 / 240 KB / 2026-11-12 | ✅ stays | — | Used by builds. |
| `penny-sovereign-yield-scout` | Yield-scout Python app. | 31 / 332 KB / 2026-08-20 | 📌 stays for now → Phase 2 proposal | its own repo | `verify-security-fix.yml` runs tests from this path. |
| `poc` | Meilisearch proof of concept. | 4 / 40 KB / 2026-08-20 | 📌 stays for now → Phase 2 proposal | `docs/archive/` or `mcp-servers/` | flake8 baseline is keyed by path. |
| `postman` | One Postman collection. | 1 / 8 KB / 2026-08-20 | ✅ stays | — | `docs/POSTMAN_SETUP.md` tells people to import this path. |
| `process` | Capability manifest, WR/PR pipeline doc. | 2 / 12 KB / 2026-08-20 | ✅ stays | — | Referenced widely. |
| `products` | 52 product folders + Gumroad/launch docs (983 files, 18 MB). | 983 / 17.7 MB / 2026-11-13 | 📌 stays for now → Phase 2 proposal | per-product repos (hvac-calc-service, deck-to-video-kit, openmythos, wr-4600-photon-bench, revvel-skill-runner already exist) | Biggest category that does not belong in a standards repo. See products section. |
| `projects` | Hub project cards (`project.json` + docs per project). | 111 / 692 KB / 2026-11-09 | ✅ stays | — | `build-static.sh` and the hub registry read it. |
| `promptforproject.md` | Step-0 router prompt. | 1 / 6 KB / 2026-08-20 | ✅ stays | — | README, REMINDERS and SYSTEM_STATE link it. |
| `recurse-rules.md` | Rules for the Recurse ML lane. | 1 / 12 KB / 2026-08-20 | ✅ stays | — | Referenced by scripts. |
| `reesereviews` | Early Reese Reviews site + vine-marketplace. | 29 / 368 KB / 2026-10-16 | 📌 stays for now → Phase 2 proposal | `reese-reviews` repo (public, exists) | `vine-to-marketplace.yml` uses `reesereviews/vine-marketplace`. `docs/archive/reesereviews/` already holds one earlier piece. |
| `requirements-spike.txt` | Python deps for `scripts/spike/run_spike.py`. | 1 / 1 KB / 2026-11-04 | 🔀 moved (this PR) | `scripts/spike/requirements-spike.txt` | Belongs next to the script; `docs/repaint/SPIKE_REPORT.md` command updated. |
| `resumes` | `resume1.pdf` (a personal résumé). | 1 / 8 KB / 2026-08-20 | ❓ needs Audrey's decision | private repo | Public repo + personal PDF. `naukri-resume.yml` references it, so not moved. |
| `revenue` | Revenue plan and product one-pagers. | 5 / 24 KB / 2026-08-20 | ✅ stays | — (or `docs/revenue/`) | Old agent prompts write into `revenue/`. |
| `revvel-rosette-automation` | Rosette test harness (Python). | 35 / 228 KB / 2026-08-20 | 📌 stays for now → Phase 2 proposal | its own repo | flake8 baseline keyed by path. |
| `revvel-standards` | A stray nested `revvel-standards/docs/audrey/agents/` path holding one Python file. | 1 / 20 KB / 2026-08-20 | 🔀 moved (this PR) | `docs/audrey/agents/audrey_super_agent.py` | The folder name duplicated the repo name. flake8 baseline line re-pointed to the new path (same W292 count). |
| `schemas` | JSON schemas + credential SQL. | 5 / 40 KB / 2026-11-04 | ✅ stays | — | Used by validators. |
| `scripts` | 213 automation scripts. | 213 / 2.3 MB / 2026-11-12 | ✅ stays | — | Core. |
| `seed.md` | The one-back protocol (minimum genome). | 1 / 3 KB / 2026-10-28 | ✅ stays | — | Intentionally at root. |
| `site` | Generated landing `site/index.html`. | 1 / 72 KB / 2026-08-21 | ✅ stays | — | `readme-landing.yml`, `ship-to-market.yml`. |
| `skills` | Skills vault (189 files, 70+ skills). | 189 / 1.8 MB / 2026-11-10 | ✅ stays | — | Core. |
| `sql` | SQL fixtures (GoSQLX-gated). | 7 / 52 KB / 2026-08-20 | ✅ stays | — | `gosqlx-lint.yml`. |
| `src` | Model-router JS (`src/lib`). | 2 / 16 KB / 2026-08-20 | ✅ stays | — | Used by scripts/tests. |
| `standards` | 109 standards documents. | 109 / 948 KB / 2026-11-12 | ✅ stays | — | Core governance. |
| `state.json` | Dashboard state. | 1 / 1 KB / 2026-08-24 | ✅ stays | — | Read/written by `populate-state.js`. |
| `templates` | Templates for projects, WRs, CI, brand… | 199 / 1.4 MB / 2026-11-12 | ✅ stays | — | Core. |
| `test-wr` | A WR test fixture (`wr-12345-prosecutor.md`). | 1 / 12 KB / 2026-10-16 | 🔀 moved (this PR) | `docs/archive/root-batch-3/test-wr/` | 0 references. |
| `testing` | Testing skill standard (`SKILL.md`). | 1 / 8 KB / 2026-08-20 | ✅ stays | — |  |
| `tests` | 238 test files (`npm test`). | 238 / 2.1 MB / 2026-11-13 | ✅ stays | — | Core. |
| `tokens.json` | Legacy root UI tokens. | 1 / 1 KB / 2026-08-20 | ✅ stays | — | `ui-audit-logger.yml` validates it (canonical copy is `packages/style-dictionary/tokens/`). |
| `tools` | `harvest.py` + sandbox-audit tools. | 6 / 48 KB / 2026-08-20 | ✅ stays | — | `watchtower.yml` runs `tools/harvest.py`. |
| `trust-community` | TruthSlayer audit showcase. | 4 / 40 KB / 2026-08-20 | ✅ stays | — | `skills/truthslayer-audit` writes here. |
| `tsconfig.json` | TypeScript config. | 1 / 1 KB / 2026-08-20 | ✅ stays | — |  |
| `ui` | Three small UIs (repo manager, issues board, ops board). | 8 / 104 KB / 2026-08-20 | ✅ stays | — | Referenced by workflows/docs. |
| `vercel.json` | Vercel static build (`scripts/build-static.sh` → `public/`). | 1 / 1 KB / 2026-08-22 | ✅ stays | — | Deploy config for the Vercel homepage. |
| `voices` | Voice repository README (video production). | 1 / 12 KB / 2026-08-20 | 📌 stays for now → Phase 2 proposal | `docs/` or a media repo | Index-only (1 file). |
| `workflows` | Workflow *docs* (automation guides). Not the Actions workflows. | 25 / 236 KB / 2026-11-13 | ✅ stays | — | Docs referenced by many files; name is confusing but pinned. |
| `wr` | Weekly Research / work requests (550 files, 6.9 MB). | 550 / 6.8 MB / 2026-11-12 | ✅ stays | — | Core automation state. |
| `wr_watcher.py` | Retired WR watcher demo (every line already commented out, #18313). | 1 / 5 KB / 2026-11-10 | 🔀 moved (this PR) | `docs/archive/root-batch-3/` | Already disabled; was a root `.py`. |

## `products/` (66 entries: 52 folders + 14 loose files)

All of `products/` is app code and sales material, which is not a standards concern. It stays for now because the **visiting-agent scan** and `build-static.sh` read it, and several products have deploy workflows. Same-named repos already exist for: `hvac-calc-service`, `deck-to-video-kit`, `openmythos`, `wr-4600-photon-bench`, `revvel-skill-runner`. Loose files at `products/` level: `DEPLOYMENT.md`, `GUMROAD-*.md`, `GUMROAD_SEO_LAUNCH.md`, `LAUNCH_SUMMARY.md`, `PRODUCTS_README.md`, `SECURITY_UPDATE.md`, `SHIPPED.md`, `build_packs.py`, `build_skills_vault.py`, `generate_covers.py`, `gumroad_attach_*.py`, and `rnd-research-fleet-v1.0.0.tar.gz` — all product-pipeline material.

The 15 biggest by file count: `beauty-kit` (75), `revvel-skill-runner` (58), `rnd-research-fleet` (49), `life-insurance-lead-engine` (48), `goap-swarm-console` (45), `oaudrey-home` (44, **deploy source — keep**), `life-insurance-lead-saas` (37), `pplx-api-skills` (35), `ai-ad-generator` (34), `affiliate-hub` (31), `music-video-creator` (30), `ai-video-toolkit` (29), `screen-recorder-finder` (29), `groq-code-review` (28), `ugc-review-generator` (27). Many of the rest are 1-file stubs (`audrey-evans-portfolio`, `freedom-angel-corps`, `meetaudreyevans-com`, `live-dashboard`, `marketplace-relister` — already a "Moved" pointer).

## `projects/` (20 project cards)

`projects/<slug>/` holds a `project.json` plus docs per project (company hubs such as `rising-aloha`, `freedom-angel-corps`, `oaudrey`, and case projects like `bodyfinders`, `case-files`). `build-static.sh` and the hub registry read these. **Stay.** `projects/agent-generated` (64 files) is the only large one.

## `docs/` (1,677 files; 100 sub-folders + 343 loose files)

Largest sub-folders: `case-files` (284 files, 598 MB), `Governance-ape-ci-errors` (213), `blue-ocean-sar` (185), `bots` (115), `agents` (66 files but ~146 MB of transcripts), `hfmr` (65), `Master_Inventory` (50), `tool-history` (47), `ml-assets` (29), `prompts` (21), `archive` (19 → 28 with this PR). The tree is **referenced by about 1,000 files and published by the Vercel build**, so I left its structure alone. Re-organising it by topic, with a link checker, is item 8 above.
