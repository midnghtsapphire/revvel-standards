# SYSTEM STATE — revvel-standards

> **Read this first at the start of every agent session.**
> **Update this last at the end of every agent session.**
> See `standards/SYSTEM_STATE_STANDARD.md` for full rules.

---

## Infrastructure

| Component | Status | Details |
|---|---|---|
| CI/CD | ✅ | GitHub Actions workflows in `.github/workflows/` |
| oAudrey App Platform app | ⏳ | **Pending human action:** Set `DIGITALOCEAN_API_TOKEN` GitHub secret → trigger `deploy-oaudrey.yml` |
| oAudrey DNS (`oaudrey.com`) | ⏳ | **Pending human action:** Log into Namecheap (`uprisinghope`) → oaudrey.com → Nameservers → Custom DNS → `ns1.digitalocean.com`, `ns2.digitalocean.com`, `ns3.digitalocean.com` |
| oAudrey DNS (`fieldwork.oaudrey.com`) | ⏳ | **Pending human action:** Same NS change as above + add CNAME in DigitalOcean Networking → Domains |
| Database | ❌ | Not applicable (standards repo — no DB) |
| SSL | ⏳ | Auto-provisioned by DigitalOcean Let's Encrypt once DNS resolves and app is deployed |

**Status key:** ✅ Working | ⚠️ Working but degraded | ❌ Not applicable / not needed | ⏳ Pending human action (infrastructure blocker — see `docs/AGENTS.md` Infrastructure Blocker Protocol)

---

## Domain Pages

| Page / Route | Status | Last Verified | Notes |
|---|---|---|---|
| `/` | ⚠️ | 2026-04-29 | Static site files exist; not verified deployed |

---

## Known Bugs

| ID | Description | Severity | Status | Reported |
|---|---|---|---|---|
| BUG-001 | `npm test` fails if dependencies are not installed (`npm ci` required) | low | resolved | 2026-04-29 |
| BUG-002 | YAML parsing errors in credential-label-router.yml and weekly-research.yml causing workflow validation failures | medium | resolved | 2026-05-02 |
| BUG-003 | Duplicate keys in secrets-health-check.yml causing YAML validation failure | low | resolved | 2026-05-02 |
| BUG-004 | `[WR]` issue automation broken — workflow_run loops saturated runner queue, killing every WR run with `startup_failure` | high | resolved | 2026-05-04 |
| BUG-005 | Bot-spam `[FAILURE]` / `[ALERT]` issues opened by failing workflows (~999) | medium | resolved | 2026-05-04 |
| BUG-006 | Workflow YAML validation still fails on pre-existing malformed `api-rate-limit-handler.yml` and duplicate-key `jules-coding-agent.yml` fixtures | low | open | 2026-05-18 |
| BUG-006 | Music Video Creator `safeParse` greedy fallback merged multiple LLM JSON blocks and dropped valid responses | medium | resolved | 2026-05-15 |
| BUG-007 | Music Video Creator kept polling provider status indefinitely after provider completion because `artifact_created` was not terminal in the client | medium | resolved | 2026-05-15 |
| BUG-008 | ColdTrace backend pinned `python-jose[cryptography]` to vulnerable 3.3.0 instead of fixed 3.4.0 | high | resolved | 2026-05-15 |
| BUG-009 | Music Video Creator duplicated `requireApiKey`, `OR_MODELS`, and `OPENROUTER_API_URL` across API routes, risking drift between endpoints | low | resolved | 2026-05-15 |
| BUG-010 | Music Video Creator dependency tree carried Next.js/PostCSS npm audit findings after validation install | high | resolved | 2026-05-15 |
| BUG-011 | Music Video Creator PR accidentally downgraded unrelated ColdTrace dependencies (`geopandas`, `python-multipart`, `python-dotenv`) from current backend pins | medium | resolved | 2026-05-15 |
| BUG-012 | Stuck-WR detector falsely escalated WR #13460 even after PR creation because it only searched by title text | high | resolved | 2026-05-15 |
| BUG-013 | Workflow YAML validation failed on `api-rate-limit-handler.yml` multiline body and `jules-coding-agent.yml` misindented step `env` blocks | medium | resolved | 2026-05-15 |
| BUG-014 | Project dashboard parser detected catalog links but did not assign them, and README scanning included dependency folders / checkout-specific root names | medium | resolved | 2026-05-15 |
| BUG-015 | Affiliate Hub regressed below patched Next.js/PostCSS dependency floor (`next` 15.5.15, `eslint-config-next` 14.2.3, nested PostCSS 8.4.x) | high | resolved | 2026-05-16 |
| BUG-016 | BASIC WR / issue-type intake could miss required WR labels, causing `wr-pr-creation.yml` to skip instead of creating a PR | high | resolved | 2026-05-17 |
| BUG-017 | Root workflow validation failed on malformed `ship-status-audit.yml` markdown template literal indentation and duplicate `script` keys in `ship-to-market.yml` | medium | resolved | 2026-05-19 |
| BUG-018 | Fleet maintenance treated failed open-WR lookup as no open WR, risking duplicate `[WR]` issues | high | resolved | 2026-07-09 |

---

## MCP Servers

> **Status column meaning:** tracks repo-level *availability* of each server
> (whether the source / npm package is published and consumable). The
> `disabled` flag in each `.mcp.json` entry is a separate, per-clone
> *runtime* signal indicating whether a particular workspace has the
> credentials and dependencies installed to run the server. A server can be
> `✅ live` here while still being `"disabled": true` in a fresh clone of
> `revvel-standards` until that clone provisions its own secrets.

| Server | Status | Notes |
|---|---|---|
| `rvvel-affiliate-links` | ✅ live | Production, npm: `rvvel-affiliate-links-mcp` |
| `code-review` | ✅ live | Production, mandatory in every project |
| `wr-pr-control-plane` | ✅ live | In-tree at `mcp-servers/wr-control-plane/`. Implements the 2026 WR-PR Automation Blueprint contract for Composio + Firecrawl + Tavily + Obot + FastMCP. Ships `"disabled": true` in `.mcp.json` so downstream clones opt in after installing the local Python deps (`uv pip install -e .`) and provisioning the credentials listed in `.env.example`. |
| `perplexity-no-key` | ✅ documented | `.mcp.json` entry for the `helallao/perplexity-ai` no-key MCP server. Ships `"disabled": true` until a clone installs `python -m pip install "perplexity-api[mcp] @ git+https://github.com/helallao/perplexity-ai.git@main"`. No `PERPLEXITY_API_KEY` is required. |

---

## Database Schema Status

| Table | Exists | Last Migration | Notes |
|---|---|---|---|
| N/A | ❌ | N/A | Standards repo (no DB) |

---

## Environment Variables

| Variable | Production | Staging | Notes |
|---|---|---|---|
| `OPENROUTER_API_KEY` | ❌ not set | ❌ not set | Used by OpenRouter-routed workflows |
| `JULES_API_KEY` | ❌ not set | ❌ not set | Used by `.github/workflows/jules-invoke.yml` |
| `COMPOSIO_API_KEY` | ❌ not set | ❌ not set | WR/PR control-plane — tool router |
| `FIRECRAWL_API_KEY` | ❌ not set | ❌ not set | WR/PR control-plane — deterministic crawl/scrape/PDF research (optional) |
| `TAVILY_API_KEY` | ❌ not set | ❌ not set | WR/PR control-plane — LLM-optimized live web search (optional, pairs with Firecrawl) |
| `OBOT_BASE_URL` | ❌ not set | ❌ not set | WR/PR control-plane — governance gateway |
| `OBOT_IDP_CONFIG` | ❌ not set | ❌ not set | WR/PR control-plane — IdP for per-user OAuth |
| `NEXT_PUBLIC_POLAR_CHECKOUT_URL` | ⚠️ optional | ⚠️ optional | Creator Payout Tracker checkout URL for Creator Pro CTA; app falls back to email contact when unset |
| `WR_DEFAULT_REPO` | `midnghtsapphire/revvel-standards` | `midnghtsapphire/revvel-standards` | Default repo target for WR/PR control-plane |

---

## Test Suite Status

| Suite | Last Run | Status | Coverage |
|---|---|---|---|
| `node tests/workflow-yaml-validation.test.js` | 2026-05-19 | ✅ all 124 workflows parse and expose required top-level keys | — |
| `npm test` | 2026-05-20 | ✅ passing after schema contract fix | — |
| Green Website Reporting standard | 2026-05-19 | ✅ `node tests/green-website-standard.test.js`, `node tests/workflow-yaml-validation.test.js`, `npm run workflows:validate -- --no-report`, and `npm test` pass after `npm ci` | Verifies active workflow, portable template, README marker/card contract, standard docs, and workflow syntax |
| Creator Payout Tracker product | 2026-05-21 | ✅ `npm run test`, `npm run lint`, `npm run build`, and `npm audit --audit-level=high` pass in `products/creator-payout-tracker` | Verifies payout recommendation engine, Markdown/CSV report export, `/api/report`, TypeScript, and production build. npm audit still reports a moderate nested Next/PostCSS advisory with no stable non-breaking fix. |
| WR issue template / BASIC WR regression test | 2026-05-17 | ✅ `node tests/work-request-form-sync.test.js` verifies template label sync, portable template sync, and BASIC WR workflow detection | — |
| Perplexity no-key integration | 2026-05-17 | ✅ `node tests/perplexity-research-issue.test.js`, `npm run workflows:validate`, and `npm test` pass after `npm ci` | Verifies the fork-backed research script, no required `PERPLEXITY_API_KEY`, workflow install path, Credential Gatekeeper omission, and MCP registration |
| Fleet Maintenance WR dedupe | 2026-07-09 | ✅ `node tests/fleet-maintenance.test.js` and `npm test` pass | Verifies open-WR lookup success, empty results, `gh` failure, malformed JSON, and no issue creation after failed lookup |
| PromptForge app validation | 2026-05-17 | ✅ `node tests/prompt-generation-app.test.js`; `npm run lint`; `npm run build` in `products/prompt-generation-app` | — |
| Research Engine unit test | 2026-05-17 | ✅ `node tests/research-engine.test.js` verified lane coverage, OpenRouter triangulation, missing-key packets, and offline mocked execution | — |
| Workflow YAML validation | 2026-05-17 | ✅ `node tests/workflow-yaml-validation.test.js` compiles key WR github-script blocks; `npm run workflows:validate` reports 120 valid workflows, 0 invalid, 0 missing timeouts | — |
| Affiliate Hub dependency/security check | 2026-05-16 | ✅ `npm audit --audit-level=high`, `npm ls next eslint eslint-config-next postcss --depth=0`, and `npm ls postcss` verified `next@15.5.18`, `eslint-config-next@16.2.6`, `eslint@9.39.4`, and PostCSS deduped/overridden to `8.5.14` | — |
| Affiliate Hub build/lint | 2026-05-16 | ✅ `npm run lint && npm run build` | — |
| ColdTrace backend dependency check | 2026-05-15 | ✅ `python3 -m pip install --dry-run --ignore-installed "python-jose[cryptography]==3.4.0"` | — |
| ColdTrace restored dependency pins check | 2026-05-15 | ✅ `git diff --exit-code origin/main...HEAD -- coldtrace/backend/requirements.txt` + `python3 -m pip install --dry-run --ignore-installed "geopandas==1.1.2" "python-multipart==0.0.27" "python-dotenv==1.2.2"` | — |

---

## Operating Model

| Component | Status | Details |
|---|---|---|
| Intake form (primary) | ✅ live | [`.github/ISSUE_TEMPLATE/00-work-request.yml`](.github/ISSUE_TEMPLATE/00-work-request.yml) |
| Intake form (lightweight) | ✅ live | [`.github/ISSUE_TEMPLATE/10-OpenHands-system-wr.yml`](.github/ISSUE_TEMPLATE/10-OpenHands-system-wr.yml) |
| Viability gate template | ✅ live | [`templates/viability-gate-template.md`](templates/viability-gate-template.md) |
| Invention flow template | ✅ live | [`templates/invention-flow-template.md`](templates/invention-flow-template.md) |
| Legacy refresh checklist | ✅ live | [`templates/legacy-refresh-checklist.md`](templates/legacy-refresh-checklist.md) |
| GitHub Project schema | ✅ documented | [`docs/github-project-schema.md`](docs/github-project-schema.md) — provisioned per-org |
| Notion knowledge layer | ✅ documented | [`docs/notion-structure.md`](docs/notion-structure.md) — provisioned per-org |
| Step 0 router | ✅ live | [`promptforproject.md`](promptforproject.md) |
| Operating model doc | ✅ live | [`docs/operating-model.md`](docs/operating-model.md) |
| Project v2 default-field automation | ✅ live | [`.github/workflows/set-default-project-v2-fields.yml`](.github/workflows/set-default-project-v2-fields.yml) (+ PAT variant `default-project-v2-fields-pat.yml`) |
| Project v2 ID discovery helpers | ✅ live | [`.github/workflows/print-project-v2-ids.yml`](.github/workflows/print-project-v2-ids.yml) (+ PAT variant `print-project-v2-ids-pat.yml`) |
| Project v2 setup walkthrough | ✅ live | [`docs/github-project-v2-workflows.md`](docs/github-project-v2-workflows.md) |
| Research Engine Orchestrator | ✅ documented + implemented | [`scripts/research-engine.js`](scripts/research-engine.js), [`.github/workflows/research-engine.yml`](.github/workflows/research-engine.yml), and [`docs/RESEARCH_ENGINE_STANDARD.md`](docs/RESEARCH_ENGINE_STANDARD.md) provide layered WR research across marketing, SEO, competitors, audience/chatter, facts, technical delivery, revenue, and code-review auto-fix lanes |
| BASIC WR label normalization | ✅ live | WR templates apply the full canonical WR label set (`work-request`, `weekly-research`, `wr:in-progress`, `deep-research`, `openrouter`, `role:orchestrator`); `wr-pr-creation.yml`, `weekly-research.yml`, and `wr-auto-classify.yml` also accept `[WR]`/BASIC WR signals when labels lag |
| Credential Backup Harness | ✅ implemented + tested | [`scripts/credential-backup-harness.js`](scripts/credential-backup-harness.js), [`scripts/gatekeeper-sync.sh`](scripts/gatekeeper-sync.sh), and [`docs/CREDENTIAL_BACKUP_HARNESS.md`](docs/CREDENTIAL_BACKUP_HARNESS.md) let Credential Gatekeeper resolve secrets from GitHub Actions secrets, env, JSON, SOPS/age, pass, Bitwarden CLI, 1Password CLI, Infisical/Vault handoff, or Doppler; Doppler is optional |
| Agent Self-Heal Utility | ✅ implemented + tested | [`scripts/agent-self-heal.js`](scripts/agent-self-heal.js) emits deterministic recovery packets and weekly WR research now routes OpenRouter failures to `auto-fix` + `ralph-loop` + `agent-fallback` instead of manual-only comments |
| Revvel PromptForge | ✅ implemented + tested | [`products/prompt-generation-app`](products/prompt-generation-app) provides a static prompt-generation UI with source logs, competitor matrix, blue/red-ocean scoring, legal OSINT boundary, markdown export, and root test coverage |
| Perplexity no-key research | ✅ implemented + tested | [`.github/workflows/perplexity-research-agent.yml`](.github/workflows/perplexity-research-agent.yml), [`scripts/perplexity-research-issue.js`](scripts/perplexity-research-issue.js), and [`docs/PERPLEXITY_NO_KEY_INTEGRATION.md`](docs/PERPLEXITY_NO_KEY_INTEGRATION.md) use the `helallao/perplexity-ai` fork for issue research without requiring `PERPLEXITY_API_KEY`; account-generation paths are intentionally excluded |
| Green Website Reporting | ✅ implemented + tested | [`.github/workflows/green-website.yml`](.github/workflows/green-website.yml), [`templates/cicd/green-website.yml`](templates/cicd/green-website.yml), and [`standards/GREEN_WEBSITE_REPORTING_STANDARD.md`](standards/GREEN_WEBSITE_REPORTING_STANDARD.md) standardize `filiptronicek/green-action@v1.0.2` reporting for Revvel public web apps with README card updates, committed `carbon` data, weekly/manual runs, and `GREEN_WEBSITE_URL` override support |
| Creator Payout Tracker | ✅ productized + tested | [`products/creator-payout-tracker`](products/creator-payout-tracker) is the shipped product from WR #13641 deep research: creator payout rankings, earnings calculator, recommendation engine, Markdown/CSV strategy brief export, `/api/report`, and Creator Pro checkout CTA |

`Status = ✅ documented` means the spec is in this repo and ready to be applied to the GitHub Project / Notion workspace; the runtime artifacts (the actual GitHub Project and Notion databases) are provisioned outside this repo.

### Project v2 automation requirements

Before the default-field workflows will run end-to-end, provision either path:

**GitHub App path** (recommended for org-owned boards) — `set-default-project-v2-fields.yml` + `print-project-v2-ids.yml`. Needs:

- Variable `PROJECTS_APP_ID` and secret `PROJECTS_APP_PRIVATE_KEY` for a GitHub App with org Projects = Read & write and repo Issues = Read.

**Classic PAT path** — `default-project-v2-fields-pat.yml` + `print-project-v2-ids-pat.yml`. Needs:

- Secret `PROJECTS_PAT` for a classic personal access token with `project` + `repo` scopes (or `public_repo` for public-only).

Both paths additionally need these repository or organization variables, populated from the helper workflow's output:

- `PROJECT_ID`
- `PRIORITY_FIELD_ID`, `EFFORT_FIELD_ID`, `CUSTOM_SELECT_FIELD_ID`
- `PRIORITY_HIGH_OPTION_ID`, `EFFORT_MEDIUM_OPTION_ID`, `CUSTOM_DEFAULT_OPTION_ID`

Until populated, the workflows fail loudly on every new issue (intentional — silent failure would let the project board drift). See [`docs/github-project-v2-workflows.md`](docs/github-project-v2-workflows.md) for the full setup walkthrough.

---

## Last Updated

```text
Last updated: 2026-07-09 03:03 UTC
Updated by: Cursor
Session summary: Fixed fleet maintenance WR dedupe to fail closed on `gh issue list` and JSON parse errors, with regression tests proving duplicate WR creation is blocked.

Last updated: 2026-05-19 05:34 UTC
Updated by: Cursor
Session summary: Added green website reporting workflow/template/standard with README carbon marker support, fixed workflow YAML blockers in ship-status/ship-to-market, and verified focused green tests, workflow validation, Automation Doctor, and full root npm test pass.

Last updated: 2026-05-18 22:30 UTC
Updated by: Cursor
Session summary: Added full blank/BASIC WR label parity, Doppler-independent credential backup harness, agent self-heal packets for WR research failures, CodeQL timeout hygiene, and verified workflow validation, label checks, targeted tests, and root `npm test`.

Last updated: 2026-05-17 21:20 UTC
Updated by: Cursor
Session summary: Resolved PR #13482 merge conflicts with main, categorized the life-insurance scoring concerns, added the Decision Scoring Engine standard, corrected async eligibility pseudocode guidance, and made the advanced CodeQL workflow manual-only because default code scanning is enabled.

Last updated: 2026-05-17 02:45 UTC
Updated by: Cursor
Session summary: Fixed PR #13482 newsletter opt-out mismatch, upgraded the life-insurance lead engine dependency/tooling stack, and verified product typecheck, lint, build, and npm audit pass.

Last updated: 2026-05-17 01:37 UTC
Updated by: Cursor
Session summary: Fixed BASIC WR intake label drift by defining missing labels, adding `weekly-research` to both WR templates, recognizing BASIC WR issue types in WR workflows, normalizing missing labels, and verifying targeted tests, workflow validation, label checks, and root npm test.
Last updated: 2026-05-17 01:39 UTC
Updated by: Cursor
Session summary: Added Revvel PromptForge prompt-generation app, research packet, docs, dashboard refresh, and verified focused app tests/build, root npm test, and workflow validation.

Last updated: 2026-05-17 02:04 UTC
Updated by: Cursor
Session summary: Replaced the Perplexity API-key workflow dependency with a no-key `helallao/perplexity-ai` fork integration, added MCP/docs/tests, removed the gatekeeper secret blocker, and verified focused tests, workflow validation, and root npm test after `npm ci`.

Last updated: 2026-05-17 01:20 UTC
Updated by: Cursor
Session summary: Added the layered Research Engine Orchestrator with OpenRouter triangulation, lane checklists, research lifecycle labels, code-review auto-fix handoff, dynamic label sync, workflow timeout fixes, and verified focused tests, workflow validation, and root npm test.

Last updated: 2026-05-16 23:23 UTC
Updated by: Cursor
Session summary: Restored Affiliate Hub to patched Next.js/PostCSS dependency versions, upgraded lint tooling to the required ESLint 9-compatible flat config, and verified audit, lint, build, dependency tree, and root tests pass.

Last updated: 2026-05-15 22:33 UTC
Updated by: Cursor
Session summary: Restored unrelated ColdTrace dependency pins downgraded in the Music Video Creator branch, verified the requirements file no longer differs from main, confirmed restored package dry-run resolution, and reran root `npm test` successfully after `npm ci`.

Last updated: 2026-05-15 22:08 UTC
Updated by: Cursor
Session summary: Fixed ColdTrace backend `python-jose[cryptography]` from vulnerable 3.3.0 to 3.4.0, verified no remaining 3.3.0 pin, confirmed package dry-run resolution, parsed 16 backend Python files, and reran root `npm test` successfully after `npm ci`.

Last updated: 2026-05-15 22:15 UTC
Updated by: Cursor
Session summary: Centralized Music Video Creator API auth/OpenRouter helpers into shared modules, removed duplicate route definitions, and verified product lint/typecheck/build plus root `npm test` pass.

Last updated: 2026-05-15 22:21 UTC
Updated by: Cursor
Session summary: Upgraded Music Video Creator to patched Next.js 15.5.18/PostCSS 8.5.14 with a package override, set the product tracing root, and verified npm audit, product lint/typecheck/build, and root `npm test` pass.

Last updated: 2026-05-05 14:55 UTC
Updated by: OpenHands
Session summary: Added the Revvel operating model layer — OpenHands Work Request intake form, simplified ISSUE_TEMPLATE/config.yml (blank issues disabled, single contact link), viability-gate / invention-flow / legacy-refresh templates, GitHub Project field schema, Notion knowledge-layer spec, the operating-model.md master document, and the Project v2 default-setter + ID-printer workflows (GitHub App and classic-PAT variants). Step 0 router in promptforproject.md already matches the spec. README and SYSTEM_STATE now surface the operating model alongside the existing WR/PR control-plane MCP server.

Last updated: 2026-05-18 21:55 UTC
Updated by: Cursor
Session summary: Routed Stuck Label Watchdog conflicts and stale PR states into deduped `agent-fallback` repair issues; restored issue-label triggers for the Agent Fallback Handler; changed workflow YAML parses cleanly, while full workflow validation still reports BUG-006 pre-existing failures.
Last updated: 2026-05-15 21:42 UTC
Updated by: Cursor
Session summary: Fixed Music Video Creator LLM JSON parsing by delegating orchestrator `safeParse` to the balanced-brace extractor, restored parser regression coverage after branch drift, and verified root `npm test` plus product typecheck/build pass.

Last updated: 2026-05-15 21:43 UTC
Updated by: Cursor
Session summary: Fixed false stuck-WR escalation by recognizing existing WR PRs through branch/body/comment signals; repaired workflow YAML validation failures, aligned BITO verifier checks, restored dashboard project links, and verified `npm test` passes.

Last updated: 2026-05-15 21:58 UTC
Updated by: Cursor
Session summary: Fixed Music Video Creator provider polling so `artifact_created` is treated as a terminal success state, added regression coverage, and verified targeted tests, root `npm test`, product lint, and product build pass.

Last updated: 2026-05-04 (post PR #10191 merge)
Updated by: OpenHands
Session summary: (1) Promoted Tavily to a first-class research provider in the wr-pr-control-plane MCP server (alongside Firecrawl). New TAVILY_API_KEY env var, new credential-matrix row, new research_mode branches (tavily-search, jules-plus-firecrawl-and-tavily). (2) Documented every deliberate v0.1.0 trade-off in the server module docstring, mcp-servers/wr-control-plane/README.md, docs/MCP_REVVEL_CATALOG.md, and a machine-readable v0_1_0_trade_offs field on data://wr-control-plane/architecture. (3) Added Composio Firebase toolkit to the architecture summary so per-app Firestore / Functions / Auth wiring has a documented home. (4) Clarified that the MCP Servers Status column tracks repo-level availability while .mcp.json `disabled` tracks per-clone runtime state.
Last updated: 2026-05-04 18:56 UTC
Updated by: OpenHands
Session summary: (1) Merged PR #9577 to fix WR/PR automation by killing workflow_run loops, restoring [WR] intake, OpenRouter as sole orchestrator, BITO as sole reviewer, and bot-spam guards. (2) Closed ~999 bot-spam [FAILURE]/[ALERT] issues. (3) Added in-tree wr-pr-control-plane MCP server at mcp-servers/wr-control-plane/ implementing the 2026 WR-PR Automation Blueprint integration contract for Composio + Firecrawl + Obot + FastMCP. Server is disabled by default in .mcp.json until credentials are provisioned.

Last updated: 2026-05-02 04:00 UTC
Updated by: copilot
Session summary: Implemented production-ready daily WR & PR summary system with automated HTML/markdown reports, full XSS protection, and comprehensive documentation. Fixed secrets-health-check.yml duplicate keys. All 214 tests passing.
```
