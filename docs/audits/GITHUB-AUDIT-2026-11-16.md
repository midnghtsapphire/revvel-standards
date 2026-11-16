# MIDNGHTSAPPHIRE — Complete GitHub Audit
**Date:** 2026-11-16 · **Account:** `midnghtsapphire` (Audrey Evans / Freedom Angel Corp / GlowStarLabs / Revvel)
**Scope:** all 392 repositories (211 public 🌐 / 181 private 🔒), with a deep-dive on `revvel-standards`
**Method:** live GitHub API (authenticated) + full clone of `revvel-standards` (11,745 commits of history read)

---

# PART 1 — THE ACCOUNT AT A GLANCE

| Number | What |
|---|---|
| **392** | total repositories |
| **211** | public |
| **181** | private |
| **42** | forks of other people's repos (verdicts in Part 4) |
| **350** | your own repos |
| **~200** | repos created or bulk-touched in the **2026-11-11 mass-import** (Replit exports, monorepo splits, LocalFileScout archives) |
| **698 MB** | size of `revvel-standards` alone |

## The one-paragraph story

`revvel-standards` is the brain (standards, 246 workflows, WR pipeline, skills vault). Around it orbit: a **product fleet** (~117 app/site repos, most imported 2026-11-11 from Replit and the old `audrey-evans-official` monorepo), **22 InTheWild MCP module repos** (all pushed 2026-11-15), the **Revvel platform family** (21 repos), **forensics/SAR research** (22), **Linear A / ancient-script book projects** (6, several very large), **26 business-plan vaults**, **music**, **Oz/Neurooz ADHD apps**, and **42 forked reference repos**. Almost everything is "source staged, deploy pending" — the whole ecosystem's bottleneck is the same handful of missing human actions (secrets, DNS, payment rails), documented in `revvel-standards/SYSTEM_STATE.md`.

---

# PART 2 — REVVEL-STANDARDS, COMPLETELY MAPPED

## 2.1 Vitals

| | |
|---|---|
| Created | 2026-02-20 ("Initial commit: REVVEL_MASTER_STANDARDS.md") |
| Commits on `main` | **11,745** |
| Branches | **521** (most are stale agent branches — see §2.7) |
| Files | ~5,555 |
| Size | 698 MB |
| Open issues / open PRs | **8 / 16** (916 PRs merged all-time) |
| Workflow files | **246** in `.github/workflows/` + 4 in a `cron/` subfolder + CircleCI |
| Role | **Single Source of Truth (SSOT)** for every standard, process, and the WR→ship pipeline |

## 2.2 THE FLOW — step by step, what was there, what is there NOW

This is the designed pipeline (from `START_HERE_CALL_CHAIN.md`, `MASTER.md`, `docs/process/SYSTEM_MAP.md`) with the **verified current status** of each step as of 2026-11-16.

```text
YOU open a GitHub Issue titled "[WR] <what you want>"
        │
        ▼
STEP 1  ROUTE      openrouter-assignee.yml        ⚠️ EXISTS, event-gated (fires on issue open)
STEP 2  CLASSIFY   wr-auto-classify.yml           ⚠️ needs PROJECTS_PAT; Project Board Sync currently FAILING
STEP 3  RESEARCH   research-engine.yml            ⚠️ "Weekly Research (WR)" run FAILED 2026-11-16
STEP 4  WR DOC PR  wr-pr-creation.yml             ⚠️ exists; WR Field Filler currently FAILING
        │
        │  ⟹ THE GAP: someone must apply label "wr:code" or "spec-approved"
        │    (tracked as the "spec-to-action bridge", issue #15507, pending WR 03)
        │    THIS is why products stall as research essays.
        ▼
STEP 5  CODE       openrouter-coder.yml           ⚠️ exists; last run SKIPPED (no qualifying label)
STEP 6  GATES      CircleCI lint-and-test          ✅ THE GATE THAT ACTUALLY RUNS (billing-free)
                   + wr-lint.yml                   ⚠️ runs on PR events
                   + merge-prosecutor.yml          ⚠️ runs on PR events
                   + Proofy security gates 1–4     ✅ NEW 2026-11-15, in CircleCI
                   + GitHub-hosted checks          ❌ BILLING-LOCKED since 2026-11-06 (jobs never start)
STEP 7  MERGE      pr-state-orchestrator.yml
                   trusted-bot-auto-approve.yml    ⚠️ exist; owner rule now: agents never merge — draft PRs only
        ▼
STEP 8  SHIP       ship-to-market.yml             ❌ never fires — needs deliver:* labels, which never get applied
HEAL    watchdogs  stuck-wr-detector, stuck-label/check-watchdogs, agent-fallback  ⚠️ present, event-gated
```

**Read this as:** steps 1–4 (intake → research → WR document) genuinely worked during the active months. Steps 5–8 (code → ship) have almost never completed end-to-end. The repo itself says so: *"Research + WR PR ✅ often happens · Coder + deliver:* ❌ often never"* (`START_HERE_CALL_CHAIN.md`, "Why products often stop short of live").

### The two hard external blockers (both documented in-repo)

1. **GitHub Actions billing lock (2026-11-06).** Every hosted job fails before its first step — "your account is locked due to a billing issue." Not a YAML bug. `docs/governance/ACTIONS_MIGRATION.md` (recovered from PR #18279, whose squash commit never landed on `main`) records this. **CircleCI + GitGuardian are the only gates that run.**
2. **LLM spend gate.** After ~$80 of unplanned OpenRouter spend in one day (issue #17849 — 46 scheduled workflows were firing ~496 runs/day), all cloud LLM calls require `REVVEL_LLM_ALLOW_CLOUD=1` exactly. Enforced by `scripts/llm-spend-gate.js`, `scripts/local_llm.py`, and a coverage test that fails the build if a new ungated call site appears. Layer 0 = local models first (LM Studio → Ollama → OpenRouter).

## 2.3 WHAT IS COMMENTED OUT / DISABLED — the full inventory

Your house rule (`AGENTS.md` OWNER RULE, 2026-10-30 + `standards/COMMENT-DONT-DELETE.md`, standard RVS-AGENT-001) is **never delete — comment out with a dated note**. Here is everything currently in that state:

### A. Workflows with commented-out triggers — 63 files
Their `on:` blocks (usually the `schedule:` / cron lines) are commented out in place, so they only run on manual dispatch or not at all. The big families:

| Family | Files (examples) | Why commented (per git history) |
|---|---|---|
| Scheduled audits/reports | `daily-diagnostic-audit.yml`, `daily-news-briefing.yml`, `daily-wr-summary.yml`, `weekly-research.yml`, `ai-weekly-changelog.yml`, `migration-cron.yml`, `hourly-growth-prioritizer.yml` | The 496-runs/day spend incident — crons were silenced to stop Actions burn |
| Biome "homeostat" suite | `biome-homeostat.yml`, `biome-inspector.yml`, `biome-medic.yml`, `biome-sentinel.yml`, `biome-sheaf.yml` | Self-healing experiment, retired to manual |
| Third-party AI reviewers | `bito-ai.yml`, `mabl.yml`, `neuralegion.yml`, `apisec-scan.yml`, `jules-coding-agent.yml` (partial) | Quota/cost control |
| Security scanners | `codeql.yml`, `apisec-scan.yml` | Disabled pending billing/security consolidation |
| Marketing automation | `image-seo-pipeline.yml`, `amplitude-to-notion.yml`, `market-evaluator.yml`, `naukri-resume.yml`, `news-with-cache.yml` | Post-spend-gate silence |
| Fleet infra | `fleet-controller.yml`, `fleet-maintenance.yml`, `durability-mirror.yml`, `ghcr-setup-status.yml`, `green-website.yml`, `app-artifact-audit.yml`, `auto-approve-clean-prs.yml`, `auto-deploy-to-stores.yml`, `automate-gumroad-artifacts.yml`, `ci-error-prevention.yml`, `formal-auto-wr.yml`, `mergeme-status.yml`, `api-monitor.yml`, `agent-audit-logger.yml`, `agent-monitor.yml`, `agent-scorecard-governance.yml`, `ai-architecture-market-evaluator.yml` | Same wave |

### B. Hard-disabled workflow files — 2
- `.github/workflows/agent-approval-check.yml.disabled`
- `.github/workflows/probe-selfhosted.yml.disabled`

### C. The ONE surviving live cron
- `blue-ocean-sar-source-health.yml` — `17 */6 * * *` (every 6 h at :17) — SAR data-source health checks. The only scheduled GitHub Action still on.

### D. `REVVEL-DISABLED` blocks in code — 121 files
Code commented out with the structured header (AGENT / MODEL / WR / DATE / STATUS / REASON) from standard RVS-AGENT-001. Concentrated in: `.circleci/` scripts, workflow YAMLs, `products/merge-prosecutor`, `docs/archive`, and governance receipts. `grep -rl REVVEL-DISABLED` = 121 files.

### E. Superseded-but-kept (documented replacements)
- **Cursor** removed from the agent fallback chain (PR #14539) — chain is now OpenRouter → OpenHands → human; Cursor config retained for history.
- **30-day launch framework** (`docs/30Dayiteration/`) — archived, superseded by one-iteration UPREV method.
- **HUSK → HULL** kernel rename in the oAudrey metal runtime (2026-11-05, noted in `oaudrey` private repo).
- **Old optimistic "production" labels** in `SYSTEM_STATE.md` — superseded 2026-11-10 with honest "staged, not live" statuses; old rows preserved per never-delete.

## 2.4 HISTORY — the nine phases of this repo

| Phase | Months | Commits | What happened (from the actual git log) |
|---|---|---|---|
| **1. Founding** | 2026-02 | 20 | `REVVEL_MASTER_STANDARDS.md` born. Session notes, Monica AI research, OpenClaw SaaS spec. |
| **2. Quiet** | 2026-03 | 10 | Mostly private-repo month (the 03-05 business-vault batch). |
| **3. First build wave** | 2026-04 | 1,323 | WR framework lands; mass standards authoring; agent instructions multiply. |
| **4. Product scaffolding** | 2026-05–06 | 1,385 | `products/` Next.js fleet scaffolded; OSINT/API-gatekeeper standards. |
| **5. Hyper-automation** | 2026-07–08 | **8,642** | The peak. 200+ workflows, agent-fallback branches by the hundred, WR flood (issue numbers climb into the ~#15,000–18,000 range), auto-merge, self-healing, VEINS engine built. Also the period that produced the ~$80/day OpenRouter incident (#17849) and the "empty PR merged by automation" incidents later prosecuted in WRs. |
| **6. The crash / silence** | 2026-09 | **6** | Near-total stop. VEINS engine goes silent (monitored: "114–115 silent days"). |
| **7. Governance rebuild** | 2026-10 | 147 | Restart. OWNER RULE (never delete, comment out, draft PRs only, 2026-10-30). Suggestion-handling standard. Cleanup of runaway automation. |
| **8. Billing lock + CircleCI era** | 2026-11-01 → 11-13 | ~150 | Actions billing-locked (11-06); CircleCI becomes the only gate; mass repo import on **2026-11-11** (~200 repos created from Replit exports, monorepo splits, LocalFileScout archives); Governance decision: "all bots work directly in GitHub, save immediately"; repo organized (19 root moves, nothing deleted, #18413). |
| **9. Security & completion proof** | 2026-11-14 → now | ~60 | "Proofy" security gates 1–4 into CircleCI (huge-delete guard, Trivy secrets + ClamAV, prompt-injection scan, API code review); Python syntax repairs on 3 files that *never compiled*; Windows test-suite fix; VEINS monitoring resumed; durable session-start/resume CLI (`agent-session-start.js`) made binding for all agents. |

**Authorship:** Audrey Evans 8,990 commits · copilot-swe-agent 827 · github-actions[bot] 607+317 · dependabot 172 · revvel-automation[bot] 169 · Devin 84+33 · OpenHands 64+24 · Jules 45 · Claude 34+10 · cubic-dev-ai 30 · Cursor Agent 17 · Codex 16+13. (Roughly 20% of all commits are bots.)

## 2.5 THE COMPLETE TREE — every root item and what it is

```text
revvel-standards/
│
│── GOVERNANCE ROOT FILES (the "constitution")
│   ├── AGENTS.md                  ← agent behavior bible: OWNER RULE (never delete), orchestrator discipline,
│   │                                LLM spend gate, Layer-0 local-LLM rule, backup rules, resume requirement
│   ├── MASTER.md                  ← system of record; doc-order tie-breaker; the UPREV pipeline definition
│   ├── START_HERE_CALL_CHAIN.md   ← the flow map (§2.2); owner bookmark
│   ├── README.md                  ← SSOT front door; EXRUP methodology; branding; monetization standards
│   ├── GOAP.md / GOAP_AGENT_PROMPT.md ← "Goap" goal-oriented planner persona + 6 life/revenue goals
│   ├── GOAL.md / REVENUE_GATE.md  ← $10k/mo → $10M prime directive
│   ├── UPREV_METHOD.md            ← one-iteration, max-over-minimum, self-healing method
│   ├── SYSTEM_STATE.md            ← infra truth file (read first, update last); honest "staged not live" statuses
│   ├── SHIP_STATUS.md             ← workstream tracker w/ terminal states
│   ├── HANDOFF.md / DECISIONS.md / DECISIONS-TODAY.md / ASSUMPTIONS.md / MEMORIES.md
│   │                              ← cross-agent memory files (read before deciding anything)
│   ├── learnings.md               ← self-healing log; every error becomes training module TM-NNNN
│   ├── LEDGER.md                  ← provenance ledger (who/what/model/route) — "the ledger is the product"
│   ├── CHANGELOG.md               ← auto-changelog
│   ├── CLAUDE.md → AGENTS.md      ← symlink for Claude Code
│   ├── VISITING_AGENTS.md         ← guest contract for transient agents (where they may write)
│   ├── WR_TEMPLATE.md / WR_TEMPLATE_BASIC.md / WR_RESEARCH_MANDATE.md ← WR schema + research-first rule
│   ├── REMINDERS.md               ← "if about to do X, read Y" index
│   ├── THINKING_SCRATCHPAD.md / seed.md / promptforproject.md / recurse-rules.md
│   ├── CODE_REVIEW_STANDARD.md / REPO_LIBRARY_STANDARD.md / WRITE_AS_YOU_GO_STANDARD.md
│   ├── AGENT_BUILD_PROMPT.md / ARTIFACT_GENERATOR.md / MODEL_CONFIG.md / BUSINESSES.md
│
│── THE MACHINE (what actually runs)
│   ├── .github/workflows/         ← 246 workflow files + cron/ (4) + REVVEL_GOVERNANCE_WORKFLOWS.md
│   │                                (only 1 live cron; 63 with commented triggers; 2 .disabled — see §2.3)
│   ├── .circleci/config.yml       ← THE gate that runs: package-integrity → visiting-agent scan →
│   │                                markdownlint → npm test → + Proofy security gates (huge-delete,
│   │                                Trivy/ClamAV, prompt-injection, archival policy, security-completion)
│   ├── engines/runner-orchestrator/orchestrate.js  ← local orchestrator (`npm run engine`); owns state.json
│   ├── scripts/ (239 files)       ← research-engine.js, llm-spend-gate.js, local_llm.py, openrouter-triage.js,
│   │                                agent-session-start.js, security-gates/, bnatsheaf/cli.js, automation-doctor.js…
│   ├── wr/ (552 files)            ← the WR system: issues/ (390), pending/ (23 — see §2.6), resolved/,
│   │                                memory/decisions.jsonl, agents/HIERARCHY.md, scripts/wr-lint.mjs (lint gate)
│   ├── mcp-servers/ (7)           ← wr-control-plane (the WR/PR MCP), doppler, meilisearch, social, github-issues…
│   ├── skills/ (76)               ← the skills vault: bnatsheaf, code-review, circleci-expert (ORBIT 🪐), …
│   ├── standards/ (102)           ← every *STANDARD*.md incl. COMMENT-DONT-DELETE, DELIVERY_MATRIX,
│   │                                PEDAL_TO_THE_METAL_ENTERPRISE, SECRET_NAMING, CIRCLECI_INTEGRATION
│   ├── docs/ (1,772 files, 353 top-level) ← Master_Inventory/ (50 core standards), process/SYSTEM_MAP.md,
│   │                                governance/ACTIONS_MIGRATION.md, security-gates/, security-completion/,
│   │                                agents/*/transcripts (kept transcripts), research-engine/, grok/uten/…
│   ├── config/connections.yml     ← SSOT for 54 wired integrations (49 verified) → generates README block
│   ├── .mcp.json                  ← MCP tool config (chrome-devtools-mcp wired here)
│
│── THE PRODUCTS (51 entries in products/)
│   ├── Next.js apps (dev ports 3000–3012): music-video-creator(3000), affiliate-hub(3001),
│   │   ai-video-toolkit(3002), screen-recorder-finder(3003), revvel-skill-runner(3004),
│   │   creator-payout-tracker(3005), hvac-calc-service(3006), cli-engine(3008), ai-ad-generator(3009),
│   │   red-light-therapy-dosage-calculator(3010), fda-design-controls(3010),
│   │   meddevice-compliance-navigator(3010), devops-dashboard(3011), wr-title-studio + goap-swarm-console
│   │   + gosqlx-sql-linter + easy-env-vars + mergeme-status + ghcr-console + pplx-api-skills
│   │   + greenfield-ui-lab + groq-code-review + star-optimizer (all 3012), caspian-channel-console (static)
│   ├── Sellable kits: beauty-kit, deck-to-video-kit, printbank, covers/, pdf-output/, gumroad scripts
│   ├── Research/productized: ai-architecture-framework, caspian-sdk-research, graphify-evaluator,
│   │   linear-a-lab, llama-research-70b-v2, openmythos, wr-4600-photon-bench, rnd-research-fleet
│   ├── Infra products: merge-prosecutor (the PR-conflict prosecutor used by CI), marketplace-relister,
│   │   revenue-billing (Lago receiver, SQLite inbox — offline-tested, no live checkout), live-dashboard,
│   │   halo-demo-stream, ugc-review-generator, oaudrey-git-greetings, audrey-evans-portfolio,
│   │   meetaudreyevans-com, freedom-angel-corps, bnat-sheaf-observatory, glottography-accessible-app,
│   │   life-insurance-lead-engine + life-insurance-lead-saas, oaudrey-home
│   └── Status per AGENTS.md: "products incubate in products/, graduate to own repo only after testing"
│
│── THE SUB-PROJECTS (root folders that are their own worlds)
│   ├── oaudrey/                   ← oaudrey.com hub + exposure-audit site (audit/) — DEPLOY PENDING (token+DNS)
│   ├── fraud-signal-verification-fleet/ (38 files) · revvel-rosette-automation/ (35)
│   ├── coldtrace/ (24) · growlingeyes/ (26) · osint-hub/ · trust-community/
│   ├── penny-sovereign-yield-scout/ (31) · reesereviews/ (29) · fieldwork/ (8)
│   ├── gatekeeper-cli/ (13) — credential/secret gatekeeper CLI
│   ├── agent-factory/ (7) · agent-pack/ · poc/ · install/ · cloudflare/ · deploy/ · disaster-recovery/
│   ├── workflows/ (31) — NON-GitHub automation blueprints: n8n, Make, Zapier, Gumloop, amazon-lemon8,
│   │   lemon8-geelark (cloud-phone), security-completion/
│   ├── artifacts/ (35) · packages/ (34) · templates/ (199) · Library/ · inventory/ · revenue/
│   ├── compliance/ (11) · governance/ · sql/ (7) · schemas/ (6) · testing/ · tests/ (258)
│   ├── site/ · ui/ · voices/ · avatars/ · data/ · logs/ · ops/ · process/
│   └── root HTML dashboards: dashboard.html, connections-dashboard.html, agent-creator.html,
│       hvac-bom-generator(-FULL).html, index.html, 404.html + vercel.json + Dockerfile
│
│── State/data files at root: state.json, fleet-status.json, dashboard-data.json,
│   hub-registry.json/.js, agent-creator-data.json/.js, tokens.json, llms.txt (+ .incoming.bak)
```

## 2.6 WHERE IT NEEDS TO GO — the 15 numbered pending WRs (the actual roadmap)

From `wr/pending/` — this is the system's own to-do list, in priority order:

| # | Pending WR | Plain meaning |
|---|---|---|
| 01 | sonnet-hardcode-migration | Remove hardcoded model names; route via model config |
| 02 | fleet-label-routing | Finish label→agent routing across the fleet |
| 03 | **spec-to-action-bridge** | **THE fix for §2.2's gap — auto-apply `wr:code`/`deliver:*` so research becomes shipped products** |
| 04 | ship-to-market-payment-rails | Real payment/checkout (LemonSqueezy/Gumroad/Stripe) wired into ship step |
| 05 | external-automation-n8n-gumloop | Move always-on automation off GitHub to n8n/Gumloop (billing-proof) |
| 06 | website-publication-lane | One reliable lane to publish sites (Vercel/Pages/DO) |
| 07 | review-fallback-when-octopus-quota-dead | Reviewer fallback chain when Octopus quota dies |
| 08 | yellow-brick-roads-rename-audit | Naming/rename audit across repos |
| 09 | client-contract-fleet | Fleet for client-contract work |
| 10 | label-taxonomy-cleanup | Dedupe/clean the label zoo |
| 11 | security-fleet | Consolidated security fleet (superseded-in-part by Proofy gates) |
| 12 | secrets-sanity | Secret naming convention `<APP>_API_KEY` / `_TOKEN` enforcement (in progress — PR #18417 merged) |
| 13 | review-cost-consolidation | Cut overlapping paid review bots |
| 14 | veins-grounding-gate | BNAT-sheaf H¹ grounding gate before VEINS reactivation |
| 15 | llms-txt-asset-synthesis | Synthesize llms.txt assets |

Plus standing infrastructure blockers (need YOU, not an agent):
- `DIGITALOCEAN_TOKEN` secret → run `deploy-oaudrey.yml` (oAudrey App Platform)
- Cloudflare DNS records for `oaudrey.com`, `www`, `fieldwork` subdomains
- GitHub Actions billing unlock (or accept CircleCI-only and finish pending WR 05)
- 4 Railway product releases staged — payment + production acceptance unverified
- ⛔ CAGE codes **8ZRW3 and 90SN0 both EXPIRED** (May 2026) — call DLA 1-877-352-2255; IRS transcript call this quarter

## 2.7 Housekeeping debt (measured, not guessed)

- **521 branches**; ~300 are stale `agent-fallback/issue-17xxx`, `jules-*`, `copilot/*`, `wr/issue-*`, `dependabot/*` branches from the hyper-automation era. A stale-branch-cleanup workflow exists (`stale-branch-cleanup.yml`) but is event-gated. Deleting merged bot branches would cut this to <50 without touching history (branches ≠ commits).
- **390 WR issue docs** in `wr/issues/` vs **8 open GitHub issues** — the WR docs are the real backlog archive.
- Root has ~90 entries — Phase-1 organize (PR #18413, 2026-11) moved 19 files, nothing deleted; more grouping possible.
- `npm run lint` at root is known-noisy (markdownlint doesn't honor ignore file; CI gate `lint-md.yml` is the authoritative one — this is documented, not a bug you introduced).

---
# PART 3 — EVERY REPOSITORY, BY FAMILY

Legend: 🌐 public · 🔒 private · **Size** = KB on GitHub · dates = last push. Forks are excluded here — they get their own verdict table in Part 4.

## Revvel platform — 21 repos

*The core. `revvel-standards` is the SSOT (Part 2). `rvvel` is the master app ecosystem. The skill/template/finisher repos exist to feed the pipeline. `revvel-twin-run`/`revvel-dark-run` were August's cheap-spend runners — superseded by the spend-gate era.*

| Repo | | Last push | Size KB | Language | What it is |
|---|---|---|---|---|---|
| revvel-standards | 🌐 | 2026-11-16 | 698571 | JavaScript | Single source of truth for all Revvel and MIDNGHTSAPPHIRE standards, processes, and specifications. |
| revvel-market-scout-gha | 🌐 | 2026-11-15 | 39264 | Python | GitHub Actions Marketplace Scaffolding and Evaluation System |
| revvel-metal-findings | 🌐 | 2026-11-13 | 1022 | — | Living scrape of near-metal architecture + deterministic-AI assets aimed at midnghtsapphire/revvel-standards. Tree changes as PedalToTheMetal acquires |
| revvel-hail | 🌐 | 2026-11-12 | 107 | — | Revvel Hail governance and project docs home. Strata / Global Mapping and other sequential work lives under docs/. Follows revvel-standards OWNER RULE |
| revvel-bots-private | 🔒 | 2026-11-11 | 450 | Python | Private full backup of Audrey bots, teams and agent call names |
| rvvel | 🌐 | 2026-11-11 | 62590 | TypeScript | Rvvel Master Platform — AI-powered app ecosystem by GlowStarLabs |
| rvvel-affiliate-links-mcp | 🌐 | 2026-11-11 | 19 | TypeScript |  |
| RevvelPress | 🌐 | 2026-11-11 | 280 | TypeScript | RevvelPress — AI-powered academic paper editor and viral content generator. Write papers, auto-generate Twitter threads, TikTok scripts, LinkedIn post |
| revvel-skill-runner | 🌐 | 2026-11-11 | 253 | TypeScript |  |
| revvel-forensic-studio | 🌐 | 2026-11-11 | 100 | Python |  |
| revvel-music-studio | 🌐 | 2026-11-11 | 102 | Python | Revvel Music Studio - Professional music production & distribution platform for artist Revvel and label HOTRS (House of the Rising Sun). CLI, API, MCP |
| revvel-email-organizer | 🌐 | 2026-11-11 | 94113 | TypeScript |  |
| revvel-skills-vault | 🌐 | 2026-11-11 | 5125 | Python |  |
| revvel-expert-skills | 🌐 | 2026-11-11 | 438 | Python |  |
| revvel-template-library | 🌐 | 2026-11-11 | 208 | Python | Comprehensive template library with 527+ legal, academic, business, government, and FOSS templates. Includes REST API, CLI tool, and searchable databa |
| revvel-vault | 🔒 | 2026-11-05 | 0 | — |  |
| revvel-pattern-atlas | 🔒 | 2026-11-02 | 0 | — |  |
| revvel-twin-run | 🌐 | 2026-08-27 | 17 | JavaScript | Twin/trio runner: Fable × Opus × Grok. Cheap spend, WR flags, DeepSeek via OpenRouter. |
| revvel-dark-run | 🌐 | 2026-08-27 | 12 | JavaScript | Twin/trio runner that does not use GitHub Actions. Use while Copilot billing locks Actions. |
| revvel-finishers | 🌐 | 2026-08-05 | 15 | Shell | A repository that finishes, finalizes, wires in missing code for assets, artifacts, sellable pdf, zips, skills, tools, api, cli, mcp, agent factories  |
| revvel-app-template | 🔒 | 2026-03-05 | 37 | TypeScript | Revvel application boilerplate template — React + Vite + Tailwind + Express + Drizzle + Stripe + Auth + 5 Accessibility Modes + AI Chat. Freedom Angel |

## oAudrey / exposure audit — 4 repos

*The current flagship push. Source staged; deploy blocked on `DIGITALOCEAN_TOKEN` + Cloudflare DNS records (Part 2.6).*

| Repo | | Last push | Size KB | Language | What it is |
|---|---|---|---|---|---|
| oaudrey | 🔒 | 2026-11-15 | 255 | — | HULL governance + metal Rust/Python enterprise AI agent runtime (OpenAudrey sibling); METAL kernel name HULL (supersedes HUSK 2026-11-05) |
| oaudrey-pages | 🌐 | 2026-11-12 | 142 | HTML | Public landing page for oaudrey.com |
| oaudrey-site | 🔒 | 2026-11-12 | 161 | HTML | Landing site and launch assets for oaudrey.com — exposure audits for small organizations |
| openaudrey | 🔒 | 2026-11-12 | 90340 | JavaScript | OpenAudrey — Umbrella brand identity for Revvel's entire business portfolio. A project of Freedom Angel Corp. |

## Audrey Evans brand — 7 repos

*`audrey-evans-official` was the old monorepo — its pieces were split out 2026-11-11 into the *-standalone repos. The monorepo remains as the archive/master.*

| Repo | | Last push | Size KB | Language | What it is |
|---|---|---|---|---|---|
| meetaudreyevans-dashboard | 🌐 | 2026-11-11 | 3557 | JavaScript | Standalone analytics/management dashboard for Audrey Evans - split from monorepo |
| audrey-evans-official | 🌐 | 2026-11-11 | 35585 | Python | Master repository for Audrey Evans Official - Parent company umbrella for all tech products, businesses, nonprofits, and projects |
| Meetaudreyevans | 🌐 | 2026-11-11 | 124550 | JavaScript | Life Hub |
| Lifehub | 🌐 | 2026-11-11 | 6 | — |  |
| oaudrey-bernstein-deterministic-factory | 🌐 | 2026-08-19 | 0 | — | Deterministic multi-CLI fallback wrapper for Bernstein — tries Claude, Codex, Gemini, and Qwen in order until one succeeds, with a signed audit trail. |
| meetaudreyevans-website | 🔒 | 2026-04-25 | 11 | HTML | Central hub website for all projects including data intelligence, inventions, apps, and music |
| meetaudreyevans-archive | 🔒 | 2026-03-05 | 34700 | JavaScript | Archive of the original meetaudreyevans.com site - preserved before migration to rvvel hub |

## InTheWild MCT modules — 22 repos

*All 22 pushed 2026-11-15 — freshly generated Docker+TS MCP module skeletons for the InTheWild platform. Uniform shape; none deployed yet.*

| Repo | | Last push | Size KB | Language | What it is |
|---|---|---|---|---|---|
| MCP-AFFILIATE | 🌐 | 2026-11-15 | 17 | TypeScript | MCT module for AFFILIATE - Part of InTheWild platform |
| MCP-KUBERNETES | 🌐 | 2026-11-15 | 23 | Shell | MCT module for KUBERNETES - Part of InTheWild platform |
| MCP-AB-TESTING | 🌐 | 2026-11-15 | 15 | Dockerfile | MCT module for AB-TESTING - Part of InTheWild platform |
| MCP-AD-CAMPAIGN | 🌐 | 2026-11-15 | 15 | Dockerfile | MCT module for AD-CAMPAIGN - Part of InTheWild platform |
| MCP-SOFTWARE-DISCOVERY | 🌐 | 2026-11-15 | 15 | Dockerfile | MCT module for SOFTWARE-DISCOVERY - Part of InTheWild platform |
| MCP-AI-CHAT | 🌐 | 2026-11-15 | 12 | Dockerfile | MCT module for AI-CHAT - Part of InTheWild platform |
| MCP-WEBSITE-GENERATOR | 🌐 | 2026-11-15 | 15 | Dockerfile | MCT module for WEBSITE-GENERATOR - Part of InTheWild platform |
| MCP-DATA-MANAGEMENT | 🌐 | 2026-11-15 | 15 | Dockerfile | MCT module for DATA-MANAGEMENT - Part of InTheWild platform |
| MCP-CUSTOMER-SUPPORT | 🌐 | 2026-11-15 | 15 | Dockerfile | MCT module for CUSTOMER-SUPPORT - Part of InTheWild platform |
| MCP-CODE-REVIEW | 🌐 | 2026-11-15 | 15 | Dockerfile | MCT module for CODE-REVIEW - Part of InTheWild platform |
| MCP-SEO-ACCESSIBILITY | 🌐 | 2026-11-15 | 15 | Dockerfile | MCT module for SEO-ACCESSIBILITY - Part of InTheWild platform |
| MCP-BRANDING | 🌐 | 2026-11-15 | 15 | Dockerfile | MCT module for BRANDING - Part of InTheWild platform |
| MCP-SUBSCRIPTION | 🌐 | 2026-11-15 | 15 | Dockerfile | MCT module for SUBSCRIPTION - Part of InTheWild platform |
| MCP-USER-DASHBOARD | 🌐 | 2026-11-15 | 15 | Dockerfile | MCT module for USER-DASHBOARD - Part of InTheWild platform |
| MCP-EMAIL-MARKETING | 🌐 | 2026-11-15 | 15 | Dockerfile | MCT module for EMAIL-MARKETING - Part of InTheWild platform |
| MCP-AUTH | 🌐 | 2026-11-15 | 21 | Dockerfile | MCT module for AUTH - Part of InTheWild platform |
| MCP-PAYMENT | 🌐 | 2026-11-15 | 14 | Dockerfile | MCT module for PAYMENT - Part of InTheWild platform |
| MCP-LOCALIZATION | 🌐 | 2026-11-15 | 14 | Dockerfile | MCT module for LOCALIZATION - Part of InTheWild platform |
| MCP-CONTENT-CALENDAR | 🌐 | 2026-11-15 | 14 | Dockerfile | MCT module for CONTENT-CALENDAR - Part of InTheWild platform |
| MCP-ANALYTICS | 🌐 | 2026-11-15 | 14 | Dockerfile | MCT module for ANALYTICS - Part of InTheWild platform |
| MCP-ADMIN-DASHBOARD | 🌐 | 2026-11-15 | 14 | Dockerfile | MCT module for ADMIN-DASHBOARD - Part of InTheWild platform |
| MCP-REPORTS | 🌐 | 2026-11-11 | 10 | Dockerfile | MCT module for REPORTS - Part of InTheWild platform |

## Reese Reviews / Amazon Vine — 2 repos

*The #1 stated business priority in GOAP (raise Vine review completion 47%→90%). `reese-reviews` is large and active; `VineFlow` is the private focused pipeline.*

| Repo | | Last push | Size KB | Language | What it is |
|---|---|---|---|---|---|
| reese-reviews | 🌐 | 2026-11-15 | 145130 | TypeScript | Reese Reviews Everything! I also can upload your reviews after I verify everything |
| VineFlow | 🔒 | 2026-10-30 | 9 | Python | Focused Amazon Vine review pipeline: Gmail ship notices → product image processing (bg remove + filter) → style-matched AI review generation → approva |

## Forensics / SAR / missing persons — 22 repos

*The research-heart cluster. `case-files` (620 MB) and `bodyfinders` (335 MB) are the heavy private data stores. `forensicfinders` is the active public planning desk.*

| Repo | | Last push | Size KB | Language | What it is |
|---|---|---|---|---|---|
| searchcrew-library | 🔒 | 2026-11-15 | 179 | HTML | Private append-only SearchCrew research library (canonical). Backup: searchcrew-libraries. First topic: Linear A. |
| forensicfinders | 🌐 | 2026-11-15 | 12116 | Python | Planning desk for the Fleming file and the A635 road-sight study. Not a detector. |
| forensic-text-recovery | 🔒 | 2026-11-14 | 926 | Python | Forensic Visual Text Recovery: evidence-preserving enhancement + OpenRouter vision reading of degraded plaques, stone, metal, documents and video (for |
| bodyfinders | 🔒 | 2026-11-14 | 335104 | — | BodyFinders: nonprofit missing/lost persons and remains search app. Private. |
| universal-sar-app | 🌐 | 2026-11-11 | 368 | TypeScript | Universal Search & Rescue Application — polymorphic subject tracking, Bayesian probability mapping, terrain analysis, Python SAR engine. FOSS-first. |
| case-files | 🔒 | 2026-11-07 | 619970 | Python |  |
| blue-ocean-dna-lidar-scanner | 🔒 | 2026-11-07 | 39496 | Python |  |
| forensic-finders-records-phone | 🔒 | 2026-11-07 | 102 | Python |  |
| searchcrew-libraries | 🔒 | 2026-11-06 | 0 | — | Private append-only SearchCrew research libraries. First topic: Linear A. |
| sar-research-fleet | 🔒 | 2026-11-05 | 46 | Jupyter Notebook | Free SAR machine-learning experiments run by a four-agent AI fleet |
| true-crime | 🔒 | 2026-11-05 | 37959 | — | LocalFileScout import 2026-11-05 private product archive |
| unfound-docket | 🔒 | 2026-10-29 | 587 | TypeScript |  |
| background-investigator | 🔒 | 2026-10-26 | 6 | Python | heavy duty for rentals , criminal, government work, state work, county work, et al |
| background-screening-specialist | 🌐 | 2026-10-26 | 1 | — | background for coldcases to locate missing people predicted determinism |
| forensic-finders-records | 🌐 | 2026-10-09 | 6 | Python |  |
| Affidavit-Grade-Search | 🔒 | 2026-09-27 | 31 | TypeScript |  |
| unfound-hour-unidentified-missing-and-human-remains | 🔒 | 2026-09-27 | 35 | TypeScript |  |
| Soul-Files | 🔒 | 2026-03-05 | 13 | — | Agent Soul Files |
| Epstein | 🔒 | 2026-03-05 | 6 | — |  |
| guardian-dog | 🔒 | 2026-03-05 | 396 | — | Guardian Dog — canine security and protection services |
| trafficking-stats | 🔒 | 2026-03-05 | 13 | — | Trafficking Stats — human trafficking data and awareness |
| Survivor-Advocacy-Anti-Trafficking | 🔒 | 2026-03-05 | 5 | — | Anti-trafficking advocacy, survivor support, and reskilling programs. |

## Linear A / ancient research — 7 repos

*Book projects (Tărtăria tablets 9.4 GB repo, Linear A 5.4 GB, sources 722 MB). `linear-a-sources` intentionally holds copyrighted research sources — keep private, do not redistribute.*

| Repo | | Last push | Size KB | Language | What it is |
|---|---|---|---|---|---|
| script-sweep | 🔒 | 2026-11-15 | 345 | Python | Private research toolkit for Linear A, Cretan Hieroglyphic, and Danube/Vinča sign-pattern analysis. |
| linear-a-sources | 🔒 | 2026-11-15 | 721795 | JavaScript | Private holding place for copyrighted or unknown-licence research sources (GORILA, lineara.xyz, and similar). Not for redistribution. |
| tartaria-tablets | 🔒 | 2026-11-15 | 9373758 | JavaScript | Research, calculations and manuscript for a non-fiction book on the Tărtăria tablets (Transylvania, excavated 1961). |
| linear-a | 🔒 | 2026-11-15 | 5369123 | HTML |  |
| scribes-of-the-palace | 🔒 | 2026-11-13 | 89871 | Python | Private manuscript + KDP pack for scribes-of-the-palace (Audrey Walter-Evans). Proofy-managed. |
| figs-wine-honey | 🔒 | 2026-11-09 | 265 | Python | Private manuscript + KDP pack for figs-wine-honey (Audrey Walter-Evans). Proofy-managed. |
| gold-of-crete | 🔒 | 2026-11-09 | 4637 | Python | Private manuscript + KDP pack for gold-of-crete (Audrey Walter-Evans). Proofy-managed. |

## Amazon KDP publishing — 3 repos

*The book-shipping lane: `kdp-packager` (covers, spine math, pre-answered upload manifest) + `kdp-agent-fleet` (Dockerized agents) + `amazon-books`. Closest-to-cash of the content plays.*

| Repo | | Last push | Size KB | Language | What it is |
|---|---|---|---|---|---|
| amazon-books | 🌐 | 2026-11-15 | 11524 | Python |  |
| kdp-packager | 🔒 | 2026-11-09 | 1449 | Python | KDP cover packager + pre-answered upload manifest tooling. Wraparound print covers (8.5x11 glossy, premium color), exact KDP geometry, spine math, bar |
| kdp-agent-fleet | 🌐 | 2026-10-25 | 37 | Python | Self-contained Dockerized multi-agent fleet for Amazon KDP publishing automation. LangGraph agents + optional n8n + GitHub Action. Prep, validate, lis |

## SSRN / whitepapers — 7 repos

*Academic-paper automation under the Walter Evans byline. Mostly March-era; SSRN_Whitepapers/SSRN-AUTOMATION re-touched in the Nov import.*

| Repo | | Last push | Size KB | Language | What it is |
|---|---|---|---|---|---|
| SSRN_Whitepapers | 🌐 | 2026-11-11 | 982 | — |  |
| SSRN-AUTOMATION | 🌐 | 2026-11-11 | 65 | Python | WHITE PAPER AUTOMATION |
| viral-content-engine | 🔒 | 2026-03-22 | 7 | Python |  |
| Walter-Evans-Viral-Content | 🔒 | 2026-03-20 | 2 | — | Daily viral content packages generated by AI engine. |
| ssrn-whitepapers | 🔒 | 2026-03-05 | 19 | — | SSRN Whitepapers — academic whitepaper collection |
| ssrn-papers | 🔒 | 2026-03-05 | 106 | — | SSRN Academic Papers by Audrey Evans / Freedom Angel Corp |
| ssrn-academic-papers | 🔒 | 2026-03-05 | 5 | — | SSRN Academic Papers — research papers and automation system |

## Music — 9 repos

*`music` (456 MB private) is the master audio backup. `sessiono` and `revvel-music-studio` are the product faces.*

| Repo | | Last push | Size KB | Language | What it is |
|---|---|---|---|---|---|
| survivor-soul-songs | 🌐 | 2026-11-11 | 187 | TypeScript |  |
| melody-intel | 🌐 | 2026-11-11 | 28 | TypeScript | clean up routine for manus |
| playlist-atlas | 🌐 | 2026-11-10 | 2145 | TypeScript | playlists over one million,  genres, confidence scores, proposals and recommendations |
| music | 🔒 | 2026-11-06 | 455966 | — | Private backup of Audrey Evans music (Revvel Hail and related) |
| sessiono | 🌐 | 2026-11-02 | 47 | HTML | create music or work with ai musicians to finish songs, etc |
| playlist-doggaze | 🔒 | 2026-08-24 | 16 | — |  |
| music-projects | 🔒 | 2026-08-11 | 40 | JavaScript | Music production, songwriting, stem separation, and distribution tools |
| Music-Videos | 🌐 | 2026-05-15 | 0 | — | Where all videos for Music will be created |
| Music-Production-Songwriting | 🔒 | 2026-03-05 | 6 | — | Extensive music catalog across genres including pop, rock, country, anthem, folk, cinematic, and experimental. |

## Oz / Neurooz (ADHD) — 7 repos

*Neurooz is the big one (289 MB, active today). The rest are supporting/experimental.*

| Repo | | Last push | Size KB | Language | What it is |
|---|---|---|---|---|---|
| neurooz | 🌐 | 2026-11-16 | 289184 | TypeScript | Neurooz - AI-Powered ADHD Productivity & Financial Guardian |
| neuro-adaptive-app | 🔒 | 2026-11-11 | 320 | TypeScript | Gamified neurodivergent life tracking app with ADHD-friendly features |
| universal_oz | 🌐 | 2026-11-11 | 18 | Python |  |
| yumyumcode | 🌐 | 2026-11-11 | 5 | — | Neurodivergent workspace: YumYumCode consulting, Neurooz accessibility, code reviews |
| oz-prompt-library | 🌐 | 2026-11-11 | 12 | — |  |
| oz-os | 🌐 | 2026-11-05 | 104 | Python |  |
| Oz-Engine-ADHD | 🔒 | 2026-03-05 | 5 | — | ADHD-focused neuro-adaptive application engine. |

## MindMappr — 4 repos

*Droplet-hosted mind-mapping system with persistent data backup repo. Setup repo documents the DigitalOcean deployment.*

| Repo | | Last push | Size KB | Language | What it is |
|---|---|---|---|---|---|
| mindmappr-setup | 🌐 | 2026-11-11 | 2008 | Python | MindMappr/OpenClaw droplet documentation, workspace backup, job queue system, and configuration |
| mindmappr | 🌐 | 2026-11-11 | 15094 | JavaScript |  |
| mindmappr-data | 🔒 | 2026-08-23 | 26341 | Python | MindMappr persistent data backup — auto-managed, do not edit manually |
| mindmappr-agents | 🔒 | 2026-04-09 | 0 | — | Complete MindMappr multi-agent system with REX, Watcher, Scheduler, and Processor |

## OpenClaw cluster — 3 repos

*OpenClaw agent-management SaaS experiments + DigitalOcean multi-agent droplet.*

| Repo | | Last push | Size KB | Language | What it is |
|---|---|---|---|---|---|
| OpenClaw_DigitalOcean | 🌐 | 2026-11-11 | 5 | — | Multiple Agents 🐠🫧🪼🐟 |
| openclaw-ui | 🌐 | 2026-11-11 | 437 | TypeScript | OpenClaw Agent Management SaaS Platform - Professional management layer for autonomous AI agents |
| openclaw-skills-hub | 🌐 | 2026-11-11 | 1036 | Python |  |

## Manus fleet — 4 repos

*Manus-agent backups and reports; `manus` repo currently holds the Global Fusion Digest automation.*

| Repo | | Last push | Size KB | Language | What it is |
|---|---|---|---|---|---|
| manus | 🔒 | 2026-11-15 | 68078 | Python | Global Fusion Digest — automated daily threat intelligence reports, social briefs, and operations logs for Audrey Evans. |
| manus-fleets | 🌐 | 2026-11-12 | 0 | — |  |
| manus-recovery | 🔒 | 2026-11-11 | 457 | TypeScript |  |
| manus-reports | 🔒 | 2026-03-05 | 1048 | TypeScript | Manus Reports — AI-generated business reports archive |

## Agent infra / tooling — 32 repos

*The plumbing: fleet governance, code-review MCP, secret vaults, CI troubleshooting dashboards, backups of bot brains. Mostly internal; several are restore-point repos.*

| Repo | | Last push | Size KB | Language | What it is |
|---|---|---|---|---|---|
| github-free-toolkit | 🌐 | 2026-11-15 | 44 | JavaScript | Free, small, open GitHub tools: Actions, MCP servers and CLIs that each solve one real problem. |
| github-free-toolkit-pro | 🔒 | 2026-11-15 | 292 | Shell |  |
| dbarchitect-bot | 🔒 | 2026-11-14 | 671 | HTML | Private backup of the DBArchitect bot: profile, schema work, and state. No secrets. |
| zeroqueue-governance | 🔒 | 2026-11-12 | 14 | Python | ZeroQueue — deterministic work-request governance for small teams |
| -name- | 🔒 | 2026-11-12 | 292 | TypeScript | "mindmappr-agent-center","description" |
| research-rodney-fleet | 🔒 | 2026-11-11 | 295 | — | Private backup of the ResearchRodneyAIArchitect SCALE research fleet (profiles, prompts, memory). Not a CI or app repo. |
| bot-builder-vault | 🔒 | 2026-11-11 | 6 | Shell | Private durable memory for the MoneyCrew Builder bot (QuickWinBuilder). Restore notes after a box reboot. |
| GIT-FLEET | 🌐 | 2026-11-11 | 117 | JavaScript |  |
| agent-site | 🔒 | 2026-11-11 | 0 | — | Private website assets for AgentOS. The agent opens pull requests only; it never force-pushes, never pushes to main, never deletes, and never merges. |
| code-review-mcp-server | 🌐 | 2026-11-11 | 25658 | TypeScript | Reusable Code Review MCP Server using 100% free open-source tools |
| premolt | 🌐 | 2026-11-11 | 273 | TypeScript | Premolt - AI Agent Security Sandbox and Identity Verification Platform |
| zeuroo | 🌐 | 2026-11-11 | 253 | TypeScript | Zeuroo — AI Gateway & Cost Optimizer. Multi-provider LLM routing, real-time cost tracking, prompt optimization, token billing. |
| toastbot-ai-scribe | 🌐 | 2026-11-11 | 471 | TypeScript |  |
| agent-guardian | 🌐 | 2026-11-11 | 211 | TypeScript |  |
| code-review-repo | 🌐 | 2026-11-11 | 8 | Python | A repository for code review |
| smart-ai-router | 🌐 | 2026-11-11 | 33 | Python | Smart multi-model AI routing architecture with automatic failover, cost optimization, and OpenClaw integration |
| MerchMaster | 🌐 | 2026-11-11 | 5 | — | Repository for https://replit.com/@angelreporters/MerchMaster |
| GitHub | 🔒 | 2026-11-09 | 0 | — | Github Cloned |
| agentic-stack | 🔒 | 2026-11-07 | 213 | Python |  |
| agentops | 🔒 | 2026-11-05 | 23 | Python |  |
| Governance-ape-cli-errors | 🌐 | 2026-07-14 | 0 | — |  |
| veinsloop | 🔒 | 2026-07-10 | 25680 | TypeScript |  |
| Governance-ape-ci-errors | 🔒 | 2026-07-04 | 1743 | TypeScript | CI/CD Troubleshooting Governance Dashboard - interactive decision-tree flowchart with full CRUD |
| vines | 🌐 | 2026-06-30 | 4 | — | Sheaf and biomimetrics self-healing for GitHub repositories and autonomous agents |
| veins-self-healing-engine | 🔒 | 2026-06-24 | 13 | Python | V.E.I.N.S. Self-Healing Engine v2.0 — VSPR + Perplexity Brain — Zero MCP, Revvel-Standard |
| master | 🔒 | 2026-05-21 | 75 | HTML |  |
| Agent-Forge | 🔒 | 2026-04-11 | 0 | — | Creates agent Skill? |
| infrastructure | 🔒 | 2026-03-15 | 45 | Shell | Infrastructure: Vault + GitHub OIDC for Freedom-Angel-Corp, midnghtsapphire, RisingALOha |
| osint-discovery | 🔒 | 2026-03-07 | 0 | — | OSINT Watch: Discoveries, Problems Solved, Blue Ocean Ideas, Research Findings |
| osint-agent-library | 🔒 | 2026-03-07 | 0 | — | OSINT Watch: All agent .md files, swarm configs, and persistent memory templates |
| github-dev-legacy | 🔒 | 2026-03-05 | 8 | HTML | GitHub Dev Legacy — legacy development files and archives |
| AI-Governance-Ethics | 🔒 | 2026-03-05 | 5 | — | Research on AI governance, bias auditing, and ethical frameworks. |

## TheAltText (ADA) — 5 repos

*AI alt-text generator — split into frontend/backend/standalone during the monorepo split. `the-alt-text` (138 MB) holds the big archive.*

| Repo | | Last push | Size KB | Language | What it is |
|---|---|---|---|---|---|
| the-alt-text | 🌐 | 2026-11-11 | 137749 | TypeScript |  |
| thealttext-frontend | 🌐 | 2026-11-11 | 164 | TypeScript | TheAltText Frontend — React UI for AI-powered alt text generation. Standalone deployment. A GlowStarLabs product by Audrey Evans. |
| thealttext | 🌐 | 2026-11-11 | 275 | Python | TheAltText — AI-Powered Alt Text Generator for ADA Compliance by GlowStarLabs |
| thealttext-standalone | 🌐 | 2026-11-11 | 93 | Python | Standalone version of thealttext-standalone from audrey-evans-official monorepo |
| thealttext-backend | 🌐 | 2026-11-11 | 71 | Python | TheAltText Backend — FastAPI server for AI-powered alt text generation. Standalone deployment with Docker. A GlowStarLabs product by Audrey Evans. |

## Website factory — 4 repos

*Prompt→5-LLM website generation experiments (OpenRouter). Early stage.*

| Repo | | Last push | Size KB | Language | What it is |
|---|---|---|---|---|---|
| in-the-wild-auto-website | 🌐 | 2026-11-11 | 476 | TypeScript |  |
| auto-deploy-stores | 🌐 | 2026-11-11 | 63 | Python |  |
| WEBSITE-FACTORY-GENERATOR | 🌐 | 2026-11-11 | 6 | — | Openrouter call to five different LLMS input prompt |
| WEBSITE-FACTORY-API | 🌐 | 2026-11-11 | 6 | — | Openrouter imput and output 5 models |

## Rental / pet platforms — 7 repos

*Peer-to-peer rental marketplace family ('Rent the Unrentable') + pet-care apps.*

| Repo | | Last push | Size KB | Language | What it is |
|---|---|---|---|---|---|
| Pawsitting | 🌐 | 2026-11-11 | 275 | TypeScript |  |
| rentiverse-finds-it-all-30 | 🌐 | 2026-11-11 | 218 | TypeScript |  |
| rent-anything-hub | 🌐 | 2026-11-11 | 289 | TypeScript | 🔑 Rentable — Rent the Unrentable. AI-powered peer-to-peer rental marketplace with barter system, CO2 tracking, emergency mode, weird vault, 5 accessib |
| rentiverse-finds-it-all | 🌐 | 2026-11-11 | 317 | TypeScript |  |
| pawpal | 🔒 | 2026-03-05 | 58 | — | PawPal — pet care and veterinary services platform |
| everything-rentable | 🔒 | 2026-03-05 | 4830 | — | Everything Rentable — peer-to-peer rental marketplace |
| Rentable-Universe-Platform | 🔒 | 2026-03-05 | 5 | — | Platform for rental property management and upgrades. |

## TikiWash bot — 6 repos

*IoT/smartfill washing-machine bot + Kickstarter assets + autofill frontend kits.*

| Repo | | Last push | Size KB | Language | What it is |
|---|---|---|---|---|---|
| TikiWashbot | 🌐 | 2026-11-11 | 61494 | HTML |  |
| tikiwash-autofill-frontend-kit-93 | 🌐 | 2026-11-11 | 191 | TypeScript |  |
| tikiwash-autofill-frontend-kit | 🌐 | 2026-11-11 | 179 | TypeScript |  |
| Tikiwashbot_kickstarter | 🌐 | 2026-11-11 | 5 | — |  |
| tikiwash-bot | 🔒 | 2026-03-05 | 6 | — | TikiWash automation bot — canonical bot codebase for the TikiWash platform by Freedom Angel Corp |
| tiki-washbot | 🔒 | 2026-03-05 | 5 | — | Tiki Washbot — Smartfill Kit IoT sensor for washing machines |

## Insurance lead-gen — 4 repos

*Life-insurance lead engines (Replit origin) + business vaults.*

| Repo | | Last push | Size KB | Language | What it is |
|---|---|---|---|---|---|
| GodsofInsurance | 🌐 | 2026-11-11 | 364 | TypeScript | Repository for https://replit.com/@angelreporters/InsuranceLeadPro |
| soul-insurance-business | 🔒 | 2026-03-05 | 3052 | — | Soul Insurance Business — insurance concept business docs |
| life-insurance-business | 🔒 | 2026-03-05 | 1080 | HTML | Life Insurance Business — insurance app business planning |
| Insurance-Business-Automation | 🔒 | 2026-03-05 | 5 | — | Life insurance business automation and lead generation platform. |

## Business plan vaults — 26 repos

*March 2026 business-plan archives. Nearly all static since creation; treat as idea vaults, not active work.*

| Repo | | Last push | Size KB | Language | What it is |
|---|---|---|---|---|---|
| no-kill-shelter-business | 🔒 | 2026-08-08 | 48 | JavaScript | No-Kill Shelter Business — shelter model business docs |
| kid-terminal-business | 🔒 | 2026-03-16 | 16569 | — | Kid Terminal Business — coding app business planning |
| wellington-water-plan-business | 🔒 | 2026-03-05 | 4136 | — | Wellington Water Plan Business — water plan business docs |
| business-ideas-vault | 🔒 | 2026-03-05 | 3404 | — | Business Ideas Vault — concept archive and research |
| rolecall-business | 🔒 | 2026-03-05 | 19 | — | Rolecall Business — talent platform business planning |
| mana-explorer-business | 🔒 | 2026-03-05 | 25 | TypeScript | Mana Explorer Business — cultural app business planning |
| mechatropolis-business | 🔒 | 2026-03-05 | 288 | — | Mechatropolis Business — robotics business planning |
| built-to-rise-business | 🔒 | 2026-03-05 | 160 | — | Built to Rise Business — sustainability initiative business docs |
| birthday-freebie-business | 🔒 | 2026-03-05 | 1407 | — | Birthday Freebie Business — rewards app business planning |
| ever-unity-church-business | 🔒 | 2026-03-05 | 3721 | — | EverUnity Church Business — church platform business planning |
| school-alert-business | 🔒 | 2026-03-05 | 3150 | — | SchoolAlert Business — school safety business planning |
| rising-aloha-hub-business | 🔒 | 2026-03-05 | 6 | — | Rising Aloha Hub Business — community hub business planning |
| leaf2tree-business | 🔒 | 2026-03-05 | 324 | — | Leaf2Tree Business — project mastery business docs |
| certifixes-business | 🔒 | 2026-03-05 | 7 | — | Certifixes Business — certification platform business docs |
| golden-glow-business | 🔒 | 2026-03-05 | 4207 | — | Golden Glow Business — beauty brand business planning |
| green-life-goodies-business | 🔒 | 2026-03-05 | 1531 | — | Green Life Goodies Business — eco products business docs |
| dna-projects-business | 🔒 | 2026-03-05 | 69 | — | DNA Projects Business — genealogy business planning |
| premolt-business | 🔒 | 2026-03-05 | 82 | — | Premolt Business — aquaculture business planning |
| subkill-business | 🔒 | 2026-03-05 | 23 | — | SubKill Business — subscription management business docs |
| constellation-as-ai-business | 🔒 | 2026-03-05 | 190 | — | Constellation as AI Business — AI app business planning |
| affiliate-marketing-business | 🔒 | 2026-03-05 | 15 | — | Affiliate Marketing Business — affiliate program business docs |
| qahwa-coffee-business | 🔒 | 2026-03-05 | 44172 | — | Qahwa Coffee Business — coffee brand business planning |
| cyber-security-turn-business | 🔒 | 2026-03-05 | 6894 | Python | TURN Cyber Security Business — security app business docs |
| pet-adoption-business | 🔒 | 2026-03-05 | 8 | HTML | Pet Adoption Business — adoption app business planning |
| ai-governance-business | 🔒 | 2026-03-05 | 12332 | — | AI Governance Business — AI policy business planning |
| project-roadmaps | 🔒 | 2026-03-05 | 411 | — | Project Roadmaps — strategic roadmaps for all projects |

## Products / apps / sites / other — 144 repos

*The long tail: ~40 apps imported 2026-11-11 (many from Replit, many from the monorepo split, several 'LocalFileScout import' private archives of folders from your machines). Most are source-only, never deployed.*

| Repo | | Last push | Size KB | Language | What it is |
|---|---|---|---|---|---|
| nomad-navigator | 🌐 | 2026-11-16 | 897 | TypeScript |  |
| neighborly-services | 🌐 | 2026-11-16 | 1978 | TypeScript |  |
| auky-slack | 🔒 | 2026-11-15 | 216 | TypeScript | Auky's Slack app for the oaudrey workspace: Cloudflare Worker (HTTP mode) plus GitHub Actions schedules. Fun, free-tier, no tracking. |
| hunger-gallows | 🔒 | 2026-11-15 | 183958 | Python |  |
| auky | 🔒 | 2026-11-15 | 6741 | HTML | Auky (ʻAukelenuiaʻīkū): Audrey's hula-girl mascot chat companion and meta-organizer bot. Home for its notes, assets, and ledger. |
| portfolio-inventory | 🔒 | 2026-11-14 | 578 | — | Private portfolio inventory and repo reassessment (Cartographer baseline) |
| sense-strata-ledger | 🔒 | 2026-11-14 | 12 | — | Append-only ledger kept by Sense-Strata |
| oath-gate-connect | 🌐 | 2026-11-14 | 538 | TypeScript |  |
| zero-startup-field-guide | 🔒 | 2026-11-14 | 6591 | Python | Private manuscript + KDP pack for zero-startup-field-guide (Audrey Walter-Evans). Proofy-managed. |
| box-backups | 🔒 | 2026-11-14 | 349675 | — | Box backups |
| strata-mapping | 🌐 | 2026-11-13 | 75 | Python | Strata / Global Mapping sequential build. Daily topography, residual, and mapping progress. Permanent home for the work. |
| deck-to-video-kit | 🔒 | 2026-11-12 | 75572 | Python | Deck-to-Video Kit: turn any slide deck into a 30-second AI video. Playbook $19, Full Kit $49, done-for-you from $299. |
| grok-api-demo | 🔒 | 2026-11-12 | 65 | Python | Tested Grok/xAI API demo: chat, Responses, streaming, JSON Schema, safe function calling, optional web/X search and vision, with capabilities guide an |
| bitcoin-channel-lab | 🔒 | 2026-11-12 | 14 | Python | Audrey-owned Bitcoin education channel and read-only explorer tools; no custody or trading |
| global-fusion-digest | 🌐 | 2026-11-12 | 100 | JavaScript | Official-source CISA KEV, ICS and FBI IC3 digest engine: CLI, API, MCP, GitHub Action and reusable skill |
| global-fusion-console | 🌐 | 2026-11-12 | 267 | TypeScript | Global Fusion official-source threat intelligence web console and read-only API |
| growlingeyes | 🔒 | 2026-11-12 | 27148 | TypeScript | GrowlingEyes OSINT Threat Intelligence Platform - Real-time maritime, air, kinetic, social, and cyber threat monitoring |
| zero-startup-dictionary | 🔒 | 2026-11-12 | 4306 | Python | Private manuscript + KDP pack for zero-startup-dictionary (Audrey Walter-Evans). Proofy-managed. |
| certifixes | 🌐 | 2026-11-12 | 143 | TypeScript |  |
| affiliate-marketing-system | 🌐 | 2026-11-12 | 83131 | TypeScript |  |
| XHUMANITY | 🌐 | 2026-11-12 | 108 | — | XPRIZE ELON MUSK FOUNDATION 100M REDUCE CARBON? MEH@ |
| ocean2-v2-research | 🌐 | 2026-11-11 | 2696 | Python |  |
| wedlock-wizard-mobile | 🌐 | 2026-11-11 | 675 | TypeScript |  |
| Puxxle | 🌐 | 2026-11-11 | 3700 | — | Puzzle app |
| instant-ordain-certificate-pro | 🌐 | 2026-11-11 | 2533 | TypeScript |  |
| guardaio | 🌐 | 2026-11-11 | 2605 | TypeScript |  |
| gmail-organizer | 🌐 | 2026-11-11 | 322 | Python |  |
| food-freedom-ai | 🌐 | 2026-11-11 | 805 | TypeScript |  |
| cozy-haven-hub | 🌐 | 2026-11-11 | 1216 | TypeScript |  |
| ceremony-spark-toolkit | 🌐 | 2026-11-11 | 2053 | TypeScript | CeremonyPro |
| risingaloha | 🌐 | 2026-11-11 | 211 | TypeScript |  |
| anime-ascend-wellness | 🌐 | 2026-11-11 | 334 | TypeScript |  |
| data-router-standalone | 🌐 | 2026-11-11 | 177 | Python | Standalone version of data-router-standalone from audrey-evans-official monorepo |
| project-face-standalone | 🌐 | 2026-11-11 | 24380 | Python | Standalone version of project-face-standalone from audrey-evans-official monorepo |
| datascope-standalone | 🌐 | 2026-11-11 | 477 | Python | Standalone AI-powered data intelligence platform - split from monorepo |
| ai-benchmarking-tool | 🌐 | 2026-11-11 | 503 | TypeScript | AI Model Benchmarking Tool - Compare speed, accuracy, and cost across AI providers |
| StarbucksSecretSips | 🌐 | 2026-11-11 | 273 | TypeScript |  |
| climate-resilience-navigator | 🌐 | 2026-11-11 | 231 | TypeScript |  |
| longevity-insights | 🌐 | 2026-11-11 | 251 | TypeScript |  |
| skill-builder-mobile | 🌐 | 2026-11-11 | 371 | TypeScript |  |
| soil-soul-map | 🌐 | 2026-11-11 | 704 | TypeScript |  |
| talent-ladder | 🌐 | 2026-11-11 | 301 | TypeScript |  |
| lifeos-hub | 🌐 | 2026-11-11 | 267 | TypeScript |  |
| carbon-champions | 🌐 | 2026-11-11 | 282 | TypeScript |  |
| sovereign-ai-hub | 🌐 | 2026-11-11 | 358 | TypeScript |  |
| muse-maker | 🌐 | 2026-11-11 | 239 | TypeScript |  |
| skin-ai-advisor | 🌐 | 2026-11-11 | 498 | TypeScript |  |
| exact-match-display | 🌐 | 2026-11-11 | 296 | TypeScript |  |
| trusty-agents | 🌐 | 2026-11-11 | 20083 | TypeScript |  |
| anime-ascend | 🌐 | 2026-11-11 | 237 | TypeScript |  |
| radiant-recommends-app | 🌐 | 2026-11-11 | 630 | TypeScript |  |
| drive-organizer | 🌐 | 2026-11-11 | 171 | Python | Google Drive Analyzer & Reorganizer - Scans, categorizes, deduplicates, and reorganizes entire Google Drive with industry-standard folder architecture |
| Mechatronopolis | 🌐 | 2026-11-11 | 61 | JavaScript | Everything about Mechatronics and Full Career Path and tracking |
| drive-easy-insure | 🌐 | 2026-11-11 | 289 | TypeScript |  |
| secret-sip-feed | 🌐 | 2026-11-11 | 503 | TypeScript |  |
| stellar-insight-archive-tool | 🌐 | 2026-11-11 | 185 | TypeScript |  |
| leaf2tree | 🌐 | 2026-11-11 | 86 | TypeScript |  |
| k9-community-site | 🌐 | 2026-11-11 | 89 | TypeScript | images k9-community-site/css k9-community-site/js |
| zenodo-auto-publish | 🌐 | 2026-11-11 | 25 | Python |  |
| marketing-automation-standalone | 🌐 | 2026-11-11 | 145 | Python | Standalone marketing automation with social media scheduling and TikTok integration - split from monorepo |
| project-face | 🌐 | 2026-11-11 | 365 | TypeScript | Project Face — AI-Powered Skin Analysis by GlowStarLabs |
| ai-benchmarking-standalone | 🌐 | 2026-11-11 | 142 | Python | Standalone version of ai-benchmarking-standalone from audrey-evans-official monorepo |
| PoliceScannerChatBot | 🌐 | 2026-11-11 | 5 | — |  |
| SymbolSoulConnect | 🌐 | 2026-11-11 | 5 | — | Repository for https://replit.com/@angelreporters/SymbolSoulConnect |
| TimelineTracker | 🌐 | 2026-11-11 | 5 | — | Repository for https://replit.com/@angelreporters/TimelineTracker |
| rags | 🌐 | 2026-11-11 | 72 | — |  |
| SmartBirthdayIdeascom | 🌐 | 2026-11-11 | 5 | — | Repository for https://replit.com/@angelreporters/SmartBirthdayIdeascom |
| TimelineTracker-1 | 🌐 | 2026-11-11 | 5 | — | Tracks you |
| universal-data-router | 🌐 | 2026-11-11 | 329 | Python | Universal Data Router — AI-Powered Multi-Source File Organizer by GlowStarLabs |
| HomecareListingscom | 🌐 | 2026-11-11 | 5 | — | Repository for https://replit.com/@angelreporters/HomecareListingscom |
| GlowYourSpace | 🌐 | 2026-11-11 | 5 | — |  |
| FreeBirthdaycards | 🌐 | 2026-11-11 | 5 | — | Repository for https://replit.com/@angelreporters/FreeBirthdaycards |
| BirthdayFreebies | 🌐 | 2026-11-11 | 5 | — | From Replit |
| VowGenerator | 🌐 | 2026-11-11 | 5 | — | Repository for https://replit.com/@angelreporters/VowGenerator |
| wr-4600-photon-bench | 🌐 | 2026-11-09 | 0 | — |  |
| midnghtsapphire | 🌐 | 2026-11-07 | 5 | — | Profile README — Hawaiian Hibiscus on Obsidian Black |
| hfmr-prototype | 🔒 | 2026-11-07 | 7 | Python |  |
| bom-me | 🔒 | 2026-11-06 | 2038 | — | LocalFileScout import 2026-11-05 private product archive |
| ai-architecture-new | 🔒 | 2026-11-05 | 1051327 | Python | LocalFileScout import 2026-11-05 private product archive |
| vspr | 🔒 | 2026-11-05 | 727970 | Python | LocalFileScout import 2026-11-05 private product archive |
| halo-stylist | 🔒 | 2026-11-05 | 186 | CSS | Halo Stylist — high-contrast Stylus-like UserCSS Chrome extension (private) |
| waterless-dishrupter | 🔒 | 2026-11-05 | 435845 | — | LocalFileScout import 2026-11-05 private product archive |
| prompt-library | 🔒 | 2026-11-05 | 7 | — | Curated collection of 16000+ prompts across 16 categories |
| claude-redlight | 🔒 | 2026-11-05 | 342 | Python |  |
| pretty-portions-site | 🔒 | 2026-11-05 | 3 | — |  |
| webar-field-dossier | 🔒 | 2026-11-05 | 21 | — |  |
| halo-steno | 🔒 | 2026-11-05 | 1874 | Python | Self-hosted Whisper draft transcription demo (MoneyCrew) — local only, not shipped |
| badge | 🔒 | 2026-11-05 | 89757 | HTML | LocalFileScout import 2026-11-05 private product archive |
| gumloop | 🔒 | 2026-11-05 | 184939 | — | LocalFileScout import 2026-11-05 private product archive |
| angel-reporter | 🔒 | 2026-11-05 | 13 | Python | LocalFileScout import 2026-11-05 private product archive |
| moneycrew-hub | 🔒 | 2026-11-04 | 0 | — | MoneyCrew bots communication hub (Discussions) |
| halo-registry | 🔒 | 2026-11-04 | 42 | PLpgSQL |  |
| research-resource-catalog | 🔒 | 2026-11-04 | 49 | Jupyter Notebook | Checked catalog of free models, datasets and compute for SAR, Tartaria and Linear A research |
| nanoscope | 🔒 | 2026-10-28 | 2092 | Python |  |
| gwyddion- | 🔒 | 2026-10-28 | 0 | — | Gwyddion |
| medical-records-private | 🔒 | 2026-10-26 | 35468 | — | Private archive of personal medical records and imaging reports (Audrey Evans). Not for public access. |
| layer-peel | 🔒 | 2026-10-17 | 484 | TypeScript |  |
| deep-research | 🔒 | 2026-10-16 | 0 | — |  |
| recovery-methods | 🔒 | 2026-10-16 | 0 | — |  |
| forkright | 🌐 | 2026-09-24 | 16 | HTML | Forkright — search, score, and fork patent and copyright claims. Static site for GitHub Pages. |
| Sakura_Property_Scout | 🌐 | 2026-08-25 | 42 | HTML | great deals for property like mobile homes, land and more - pittsburgh, Gulf Coast and Laramie right now |
| Property-Search-App | 🔒 | 2026-08-25 | 12 | — | Real estate property search application concept. |
| cancercurred | 🔒 | 2026-08-22 | 0 | — | Private personal archive. Stewardship of Vincent Gammill's cancercurred work. Not a public product. No storefront. |
| daily-digest | 🔒 | 2026-08-05 | 46 | TypeScript |  |
| glowstarlabs-vault | 🔒 | 2026-07-15 | 29 | Python | Encrypted credential vault with CLI for managing secrets across all GlowStar Labs repositories |
| ScoutSavvy | 🔒 | 2026-07-15 | 65 | TypeScript |  |
| soul2bowl | 🔒 | 2026-06-09 | 277 | TypeScript | A local catering, meal planning, pickup food , sunday meal place based in Northern Colorado |
| bar-chart-race-engine | 🌐 | 2026-06-02 | 33 | Python |  |
| Soup2Bowl | 🌐 | 2026-05-02 | 14 | HTML | shelley Wirt |
| hvac-calc-service | 🔒 | 2026-04-28 | 32 | — | Description: One-button HVAC calculator service |
| FLEXTINA | 🌐 | 2026-04-28 | 2 | Python |  |
| freedom-angel-corps | 🔒 | 2026-03-05 | 5 | — | Parent corporation documentation, business playbooks, and cultural legacy archive |
| cyber-security-turn | 🔒 | 2026-03-05 | 173 | — | TURN Cyber Security App — threat intelligence and security platform |
| tutu-the-dishruptor | 🔒 | 2026-03-05 | 13990 | — | Tutu The Dishruptor — disruptive business concept |
| petal-shell | 🔒 | 2026-03-05 | 23737 | — | PetalShell — beauty and wellness brand concept |
| wellington-water-plan | 🔒 | 2026-03-05 | 232 | — | Wellington Water Plan — water conservation and management |
| eco-anchor | 🔒 | 2026-03-05 | 13 | — | EcoAnchor — environmental sustainability platform |
| project-mars | 🔒 | 2026-03-05 | 46319 | — | Project Mars — space exploration and Mars mission concepts |
| petalshell | 🔒 | 2026-03-05 | 5 | — | Floral-inlaid casement panels using bioepoxy, real Hawaiian flowers, and cellulose layers |
| hypeman-app | 🔒 | 2026-03-05 | 5 | — | Social engagement and motivation mobile application platform |
| pixeloyalty | 🔒 | 2026-03-05 | 50353 | — | Pixeloyalty — digital loyalty and rewards program |
| blue-ocean-reports | 🔒 | 2026-03-05 | 587 | — | Blue Ocean Reports — market research and opportunity analysis |
| snapwealth | 🔒 | 2026-03-05 | 5 | — | Financial wellness platform focused on SNAP benefits optimization and wealth building |
| glowstar-labs | 🔒 | 2026-03-05 | 5 | — | Repository hub for inventions, projects, and applications under the GlowStar Labs brand |
| ManaMenders | 🔒 | 2026-03-05 | 5 | — | Character art and creative project. |
| Hypeman-Mobile-App | 🔒 | 2026-03-05 | 5 | — | Motivational mobile app concept. |
| qahwa-coffee | 🔒 | 2026-03-05 | 5 | — | Arabian mythical wellness coffee line with functional mushroom blends and e-commerce |
| vertical-manufacturing | 🔒 | 2026-03-05 | 5 | — | Framework for vertical integration in manufacturing and supply chain efficiency |
| vagus-nerve-healing | 🔒 | 2026-03-05 | 5 | — | Research on vagus nerve healing through song and music therapy |
| Transparency-Software | 🔒 | 2026-03-05 | 5 | — | Government and corporate transparency software platform. |
| App-Certification-Navigator | 🔒 | 2026-03-05 | 5 | — | Tool for navigating app store certification processes. |
| ai-conversation-extractions | 🔒 | 2026-03-05 | 72909 | — | AI Conversation Extractions — curated AI session archives |
| tutu-dishruptor | 🔒 | 2026-03-05 | 6 | — | Portable bio-friendly piezoelectric dishwasher and retrofit kit for existing dishwashers |
| Qahwa-Coffee-Products | 🔒 | 2026-03-05 | 5 | — | Specialty coffee brand with Arabian and Hawaiian volcanic coffee products. |
| blue-ocean-opportunities | 🔒 | 2026-03-05 | 587 | — | Blue Ocean Opportunities — untapped market research |
| Legal-Documents-Court-Filings | 🔒 | 2026-03-05 | 5 | — | Legal documents, court filings, FOIA requests, and estate planning. |
| Uprising-Hope-LLC | 🔒 | 2026-03-05 | 5 | — | Social enterprise LLC focused on community empowerment. |
| ai-threat-detection | 🔒 | 2026-03-05 | 5 | — | AI-driven cybersecurity threat detection research and tools |
| ecommerce-automation | 🔒 | 2026-03-05 | 5 | — | Automated ecommerce and affiliate site factory with social media integration |
| Cybersecurity-CISA-Alerts | 🔒 | 2026-03-05 | 5 | — | Cybersecurity monitoring, vulnerability tracking, and threat intelligence. |
| Kickstarter-Campaigns | 🔒 | 2026-03-05 | 5 | — | Crowdfunding campaign planning and pitch development. |
| crispr-research | 🔒 | 2026-03-05 | 5 | — | Research on CRISPR and AI applications for disease prevention |
| AI-Conversation-Archive | 🔒 | 2026-03-05 | 5601 | — | Master archive of all projects, prompts, code, BOMs, and content extracted from AI conversation history. |
| colorado-cle-online | 🔒 | 2026-03-05 | 2100 | JavaScript | Colorado CLE Online Program platform — comprehensive CLE platform with vacation bundles targeting 25,000 Colorado attorneys |


---

# PART 4 — THE 42 FORKS: DO YOU NEED THEM?

**Short answer: forks cost you nothing and nothing breaks if they sit there — but only ~10 are load-bearing.** I checked every fork against the actual contents of `revvel-standards` (which workflows, configs, and docs reference it). Verdicts below are based on those references plus each fork's own activity.

## Tier 1 — ACTIVELY USED (do not touch)

| Fork | Parent | Evidence it's load-bearing |
|---|---|---|
| **Roo-Code** | RooCodeInc/Roo-Code | Your only fork with its own commits (pushed **today**, 2026-11-16). Referenced in `wr-dispatcher.yml`, `config/connections.yml`, LEDGER. Roo owns the "Testing lane" in your reviewer roster. |
| **perplexity-ai** | helallao/perplexity-ai | The no-key Perplexity research lane. Referenced by 4 live workflows (`perplexity-research-agent`, `free-llm-router`, `dragnet-ci-autofix`, `persona-comment-trigger`) and the README. This is your keyless research fallback — part of the spend-gate architecture. |
| **chrome-devtools-mcp** | ChromeDevTools/chrome-devtools-mcp | Wired into `.mcp.json` — agents' browser tooling. |
| **octopus** | octopusreview/octopus | In `.github/agent-router.json` and `fleets.yml` — the default PR reviewer lane (`octopus-route.yml`). |

## Tier 2 — REFERENCE LIBRARIES (keep; zero cost, real research value)

Forensics stack (supports the SAR/forensics family — your nonprofit heart): **sleuthkit**, **artifacts**, **artifacts-kb**, **awesome-forensics**, **ForensicsTools**, **Digital-Forensics-Guide**, **OpenSourceArtifactollectionToolkit-OSACT**, **core** (InSAR radar processing), **Radar** (DIY GPR), **US-Real-time-gun-detection…dataset**, **vigil**, **VIGIL---AI-Powered…** — all cited in `docs/REPO_CATALOG.md`, `BUSINESSES.md`, or the GrowlingEyes credential audit.

Agent-craft stack (patterns your fleet standards borrow from): **claude-fleets** (has a written eval: `docs/CLAUDE_FLEETS_EVAL_2026-08-08.md`), **claude-code-hooks-mastery**, **Claude-Skills-Governance-Risk-and-Compliance**, **agent-of-empires**, **babysitter**, **caveman**, **clawe**, **claw-code**, **OpenClaw-Medical-Skills**, **awesome-openclaw-skills**, **OpenClaw-Docs-Sync**, **awesome-cli-coding-agents**, **awesome-opensource-boilerplates**, **trawl**, **traceroot**, **OpenMythos**, **dialog**, **Medusa2**, **nano-banana-skills**, **XcodeBuildMCP**, **product-manager-prompts**, **lean-agent-protocol**, **google-notebooklm-integration**, **open-llms**.

## Tier 3 — DEAD WEIGHT (safe to delete or archive whenever)

| Fork | Why |
|---|---|
| **FORKED-Octopus-Github-Repo** | 2019 Selenium test framework, untouched since 2019, superseded by the `octopus` review fork above. |
| **dxtrabinognnb** | Random crypto-trading-bot fork from 2025-05, zero references anywhere in your ecosystem. |

**Bottom line on forks:** don't spend a session on this. Delete the 2 in Tier 3 if you want hygiene; leave the rest. The ones that matter (Tier 1) matter because your *workflows* call them, not because the code sits there.

---

# PART 5 — WHERE EVERYTHING STANDS & WHAT TO DO NEXT

## What's actually DONE
- ✅ The standards/governance layer: 102 standards, 76 skills, 7 MCP servers, complete WR schema, lint gates, spend gate, security gates 1–4 (Nov 15), CircleCI green gate.
- ✅ Intake→research half of the pipeline (steps 1–4) proven at scale (916 merged PRs).
- ✅ The repo memory system (ledger, decisions, learnings, handoffs) — genuinely best-in-class for agent provenance.
- ✅ Mass consolidation: ~200 repos imported/organized 2026-11-11; Phase-1 root organize done.

## What's stuck and exactly why
1. **Ship step (5–8) never fires** → fix = pending WR 03 (spec-to-action bridge): auto-apply `wr:code` after research-complete and `deliver:*` after merge. This is the single highest-leverage change in the whole ecosystem.
2. **GitHub Actions billing lock** (since 11-06) → either unlock billing or finish pending WR 05 (move always-on jobs to n8n/Gumloop) — CircleCI already carries the gates.
3. **oAudrey deploy** → human: set `DIGITALOCEAN_TOKEN`, add 3 Cloudflare DNS records.
4. **Revenue rails** → pending WR 04: payment wiring; 4 Railway releases sit staged; `products/revenue-billing` has offline-tested receiver but no live checkout.
5. **Compliance clock** → CAGE 8ZRW3 & 90SN0 expired May 2026 (DLA 1-877-352-2255); IRS transcript call due.
6. **521 branches** → mostly stale bot branches; safe bulk-delete of merged `agent-fallback/*`, `jules-*`, `copilot/*`, `dependabot/*` branches.

## Suggested order of operations
1. You (10 min): CAGE renewal call + GitHub billing decision + the 2 secrets/DNS items. These unblock everything agents cannot do.
2. Agent (one WR): implement pending WR 03 — the spec-to-action bridge. After this, research actually becomes shipped product without hand-holding.
3. Agent: stale-branch cleanup sweep (existing workflow, run manually once).
4. Then pick ONE product (recommend `reese-reviews` — your stated #1 — or `kdp-packager`/`amazon-books` — closest to cash) and run it through the full 8-step chain as the proof of life.

---

*Generated 2026-11-16 from authenticated GitHub API data and a full clone of `midnghtsapphire/revvel-standards` (HEAD `ce6c3abab`). Revoke the token used for this audit tonight as planned — it is not stored in this document or any file.*
