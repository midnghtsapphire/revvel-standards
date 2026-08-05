# Revvel Tools Catalog — All Scripts, APIs, MCPs, CLIs & 3rd-Party Apps

**Version:** 1.0.0
**Date:** April 15, 2026
**Status:** Auto-Maintained
**Maintained by:** `scripts/sync-flow-charts.js`

> **Also available as:** [`TOOLS_CATALOG.csv`](./TOOLS_CATALOG.csv) for Excel / database import.

---

## How to Read This Catalog

Every tool in the Revvel ecosystem is listed here with:
- **What it does** (plain English)
- **Where in the flow** it is used
- **Category** (API / MCP / CLI / Script / GitHub Action / App)
- **Cost** (Free / Paid / Usage-based)
- **Required secrets** (what you need to configure)

---

## 1. GitHub Platform Tools

| # | Tool | Category | What It Does | Flow Phase | Cost | Required Secret |
|---|---|---|---|---|---|---|
| 1 | **GitHub Actions** | CI/CD Platform | Runs all automated workflows. The backbone of every automated step. | All phases | Free (public repos) / $0.008/min (private) | `GITHUB_TOKEN` (auto-provided) |
| 2 | **GitHub Issues** | Project Tracking | Tracks every task, bug, and feature request as a numbered ticket | Phase 4 | Free | none |
| 3 | **GitHub Pull Requests** | Code Review | Proposes and reviews code changes before merging to main | Phase 5–6 | Free | none |
| 4 | **GitHub Pages** | Static Hosting | Auto-deploys portfolio and documentation sites from the repo | Phase 7 | Free | none |
| 5 | **GitHub App** | Authentication | Generates short-lived tokens for workflows that need cross-repo access | All phases | Free | `APP_ID`, `APP_PRIVATE_KEY` |
| 6 | **Dependabot** | Dependency Updates | Automatically opens PRs to update outdated npm/pip/etc. packages | Background | Free | none |
| 7 | **GitHub Copilot** | AI Code Review/Fix | Reviews PRs, suggests fixes, auto-fixes CI failures via Ralph Loop | Phase 5–6 | Paid subscription | none (OAuth) |
| 8 | **GitHub CLI (`gh`)** | CLI Tool | Command-line tool to create issues, PRs, and manage repos from terminal | Phase 4 | Free | `GH_TOKEN` |
| 9 | **`actions/checkout@v4`** | GitHub Action | Checks out the repo code inside a workflow runner | All CI phases | Free | none |
| 10 | **`actions/setup-node@v4`** | GitHub Action | Installs Node.js inside a workflow runner | Phase 2, 5 | Free | none |
| 11 | **`actions/create-github-app-token@v1`** | GitHub Action | Mints a short-lived (1-hour) GitHub App token for secure API calls | All phases | Free | `APP_ID`, `APP_PRIVATE_KEY` |
| 12 | **`actions/github-script@v8`** | GitHub Action | Runs JavaScript inside a workflow to call the GitHub API | Phase 5–6 | Free | none |
| 13 | **`matheusvellone/labels-as-parameters@1.0.0`** | GitHub Action | Converts PR labels (`key:value`) into named step outputs — drives conditional deploys and feature flags without manual `workflow_dispatch` inputs | Phase 5–7 | Free | none |
| 13a | **`GeekZoneHQ/eisenhower@25222276`** | GitHub Action | Eisenhower Priority Labeler — reads `Impact` / `Urgency` fields from an issue template and auto-assigns `P1`–`P4` labels using the Eisenhower Matrix | Phase 4 | Free | `GH_ACCESS_TOKEN` (or `GITHUB_TOKEN`) |

---

## 2. AI / LLM APIs

| # | Tool | Category | What It Does | Flow Phase | Cost | Required Secret |
|---|---|---|---|---|---|---|
| 13 | **OpenRouter API** | AI Routing API | Routes requests to multiple AI models (Claude, GPT, Gemini) under one API key | Phase 2 | Usage-based | `OPENROUTER_API_KEY` |
| 14 | **Anthropic Claude Sonnet 4** | LLM (via OpenRouter) | Spec research agent — reads official docs and specifications | Phase 2 (Agent 1) | Via OpenRouter | `OPENROUTER_API_KEY` |
| 15 | **Anthropic Claude Opus 4** | LLM (via OpenRouter) | Security analysis agent + research synthesizer | Phase 2 (Agent 3 & Synth) | Via OpenRouter | `OPENROUTER_API_KEY` |
| 16 | **OpenAI GPT-4.1** | LLM (via OpenRouter) | Competitive analysis agent — compares alternatives | Phase 2 (Agent 2) | Via OpenRouter | `OPENROUTER_API_KEY` |
| 17 | **OpenAI GPT-4o-mini** | LLM (via OpenRouter) | Cost analysis agent — estimates budget and ops burden | Phase 2 (Agent 4) | Via OpenRouter | `OPENROUTER_API_KEY` |
| 18 | **Google Gemini 2.5 Pro** | LLM (via OpenRouter) | Community knowledge agent — real-world developer experience | Phase 2 (Agent 5) | Via OpenRouter | `OPENROUTER_API_KEY` |
| 19 | **Claude Code** | AI Coding Agent | Full AI developer that reads repos, writes code, and runs tests | All phases | Paid subscription | none (OAuth) |
| 20 | **Venice AI** | AI Coding Agent | Secondary AI code reviewer. Privacy-focused, runs locally | Phase 6 | Free/Paid | none |

---

## 3. MCP Servers (Model Context Protocol)

These run locally as background processes and let AI agents read/write data sources directly.
Config file: `.mcp.json` in each project root. Setup: `scripts/setup-mcp.sh`.

| # | Tool | Category | What It Does | Flow Phase | Cost | Required Secret |
|---|---|---|---|---|---|---|
| 21 | **postgres-mcp** | MCP / Database | Lets AI agents run SQL queries on PostgreSQL | Dev / AI phase | Free | `DATABASE_URL` |
| 22 | **sqlite-mcp** | MCP / Database | Lets AI agents read/write SQLite files locally | Dev / AI phase | Free | `SQLITE_DB_PATH` |
| 23 | **mongodb-mcp** | MCP / Database | Lets AI agents query MongoDB collections | Dev / AI phase | Free | `MONGODB_URI` |
| 24 | **redis-mcp** | MCP / Database | Lets AI agents read/write Redis cache | Dev / AI phase | Free | `REDIS_URL` |
| 25 | **brave-search-mcp** | MCP / Search | Lets AI agents do real-time web searches via Brave Search API | Phase 2 | Free tier / Paid | `BRAVE_API_KEY` |
| 26 | **exa-mcp** | MCP / Search | Semantic web search designed for AI agents | Phase 2 | Usage-based | `EXA_API_KEY` |
| 27 | **mem0-mcp** | MCP / Memory | Persistent AI agent memory across sessions | All AI phases | Free/Paid | `MEM0_API_KEY` |
| 28 | **filesystem-mcp** | MCP / Filesystem | Sandboxed file read/write for AI agents | All AI phases | Free | none |
| 29 | **stripe-mcp** | MCP / Payments | Lets AI agents query Stripe customer and payment data | Dev / AI phase | Free | `STRIPE_SECRET_KEY` |
| 30 | **github-mcp** | MCP / GitHub | Lets AI agents manage issues, PRs, and repos via GitHub API | All AI phases | Free | `GITHUB_TOKEN` |
| 31 | **slack-mcp** | MCP / Communication | Lets AI agents send Slack messages and notifications | Notifications | Free | `SLACK_BOT_TOKEN` |
| 32 | **code-review-mcp-server** | MCP / Custom | Revvel's custom code review MCP server. Runs locally. | Phase 6 | Free (FOSS) | `CODE_REVIEW_MCP_PATH` |

---

## 4. CLI Tools

| # | Tool | Category | What It Does | Flow Phase | Cost | Required Secret |
|---|---|---|---|---|---|---|
| 33 | **Git** | CLI / VCS | Version control. Every change is tracked and committed with Git. | All phases | Free | none |
| 34 | **Node.js / npm** | CLI / Runtime | JavaScript runtime for scripts. Required for `research-module.js` and other scripts. | Phase 2, 5 | Free | none |
| 35 | **Bash** | CLI / Shell | Shell scripting. Powers `bootstrap-new-project.sh`, `setup-mcp.sh`, and others. | All phases | Free | none |
| 36 | **SSH** | CLI / Deploy | Secure shell for deploying to DigitalOcean droplets. | Phase 7 | Free | `SSH_PRIVATE_KEY` |
| 37 | **PM2** | CLI / Process Manager | Keeps Node.js web apps running on servers. Restarts on crash. | Phase 7 | Free | none |

---

## 5. Scripts (in `scripts/` folder)

| # | Script | Language | What It Does | Flow Phase |
|---|---|---|---|---|
| 38 | `research-module.js` | Node.js | Runs 5 AI sub-agents via OpenRouter, synthesizes results into a research doc | Phase 2 |
| 39 | `bootstrap-new-project.sh` | Bash | Scaffolds a new project from Revvel templates (README, CHANGELOG, CI workflows, etc.) | Phase 0 |
| 40 | `bootstrap-repo.sh` | Bash | Similar to bootstrap but targeted at repo-level setup | Phase 0 |
| 41 | `setup-mcp.sh` | Bash | Copies the right `.mcp.json` template into a new project based on project type | Phase 0 |
| 42 | `check-compliance.js` | Node.js | Checks a repo for required Revvel standard files and labels | Phase 5 |
| 43 | `sync-bom.sh` | Bash | Syncs the Bill of Materials (BOM) across projects | Background |
| 44 | `run-human-testing-api.js` | Node.js | Runs human-in-the-loop testing API endpoints | Phase 5 |
| 45 | `sync-flow-charts.js` | Node.js | **THIS FILE'S MAINTAINER.** Scans docs, updates metadata, patches broken refs, commits | Phase 8 |

---

## 6. GitHub Actions Workflows (in `.github/workflows/`)

| # | Workflow File | What It Does | Trigger |
|---|---|---|---|
| 46 | `research-module.yml` | Runs the AI Research Module (5 agents + synthesis) | Manual (`workflow_dispatch`) |
| 47 | `ralph-loop.yml` | Self-healing CI — auto-invokes Copilot to fix failures, escalates after 5 tries | `check_suite` / `workflow_run` failure |
| 48 | `ready-for-review.yml` | Labels PRs as "ready for review" and assigns reviewers | `pull_request` |
| 49 | `create-issue-branch.yml` | Creates a branch automatically when a new issue is opened | `issues` opened |
| 50 | `panda-ops.yml` | CHANGELOG.md auto-update on every push to main | `push` to main |
| 50a | `pr-review-status.yml` | Auto-applies review status labels (`awaiting-approval`, `changes-requested`, etc.) and posts status badges on PRs | `pull_request`, `pull_request_review` |
| 50b | `pr-review-request-handler.yml` | **NEW:** When reviewer requests changes, analyzes all feedback via OpenRouter and generates prioritized fix recommendations | `pull_request_review` (changes requested), label `changes-requested` |
| 51 | `recurse-ml.yml` | ML/recursion automation workflow | Scheduled / manual |
| 52 | `run-human-testing-api.yml` | Human testing API runner | Manual |
| 53 | `flow-chart-sync.yml` | **THIS FOLDER'S MAINTAINER.** Auto-syncs flow charts on every push | `push` to main |
| 54 | `pr-labels.yml` | Reads PR labels via `joerick/pr-labels-action@v1.0.9`; triggers label-driven automations (security checklist, design reminder, BOM reminder, skip-tests gate) | `pull_request` |

---

## 7. 3rd-Party Apps & Services

| # | Service | Category | What It Does | Flow Phase | Cost |
|---|---|---|---|---|---|
| 54 | **DigitalOcean Droplet** | Cloud Server | Hosts Revvel web applications. Ubuntu VPS with static IP. | Phase 7 | ~$6–12/month |
| 55 | **Fastlane** | Mobile CI/CD | Automates iOS and Android app submission to App Store and Google Play | Phase 7 | Free (FOSS) |
| 56 | **Electron Builder** | Desktop Packaging | Packages web apps as `.exe` (Windows), `.dmg` (Mac), `.AppImage` (Linux) | Phase 7 | Free (FOSS) |
| 57 | **Vitest** | Test Runner | Fast unit and integration test runner for Vite-based projects | Phase 5 | Free (FOSS) |
| 58 | **Playwright** | E2E Testing | End-to-end browser testing (panel data void, UI tests) | Phase 5 | Free (FOSS) |
| 59 | **PromptFoo** | AI Skill Testing | Tests AI agent skills/prompts with automated assertions | Phase 5 (skills) | Free (FOSS) |
| 60 | **Swagger / OpenAPI** | API Docs | Auto-generates API documentation from source code | Phase 3 | Free (FOSS) |
| 61 | **TypeDoc** | Code Docs | Auto-generates TypeScript documentation from JSDoc comments | Phase 3 | Free (FOSS) |
| 62 | **pre-commit** | Git Hooks | Runs linters and secret scanners before every commit | Phase 5 | Free (FOSS) |
| 63 | **Supabase** | Backend-as-a-Service | PostgreSQL database + auth + storage + realtime | Dev phase | Free / $25/month |
| 64 | **Stripe** | Payments | Payment processing for Revvel token economy and subscriptions | Dev phase | 2.9% + $0.30/txn |
| 65 | **Twilio** | SMS/Voice | SMS notifications and voice calls (via MCP server) | Dev phase | Usage-based |
| 66 | **SendGrid** | Email | Transactional email delivery | Dev phase | Free / Usage-based |
| 67 | **Linear** | Project Management | Alternative to GitHub Issues for advanced sprint tracking (via MCP) | Phase 4 | Free / $8/user/month |
| 68 | **Notion** | Knowledge Base | Team knowledge base and documentation hub (via MCP) | Phase 3 | Free / $8/user/month |
| 69 | **Slack** | Communication | Team chat and automated notifications (via MCP) | Notifications | Free / $7.25/user/month |
| 70 | **Waydev** | Git Analytics | Developer activity analytics and reporting from git commits | Monitoring | Paid |
| 71 | **Mermaid** | Diagramming | Renders flow charts and sequence diagrams from text (used in this folder) | Documentation | Free (FOSS) |

---

## 8. Digital Product Creation & Sales Tools

| # | Service | Category | What It Does | Flow Phase | Cost |
|---|---|---|---|---|---|
| 73 | **Gumroad** | Digital Sales | Upload and sell digital products (PDFs, eBooks, guides). Automated checkout and delivery. Payment processing with zero upfront cost. | Phase 7 (Deploy) | Free to start; 10% commission per sale |
| 74 | **Carrd** | Website Builder | Create simple landing pages and online storefronts for digital products. Easy embedding of payment links. | Phase 7 (Deploy) | Free (up to 3 sites) / $19/year Pro |
| 75 | **ChatGPT** | AI Writing | Brainstorm, outline, and generate written content for PDF guides, eBooks, and templates. | Phase 2 (Create) | Free tier / $20/month Plus |
| 76 | **Claude** | AI Writing | Generate and refine written content, structure documents, create technical content for PDFs. | Phase 2 (Create) | Free tier / $20/month Pro |
| 77 | **Canva / Canva AI** | Design & PDF Creation | Format AI-generated text into polished PDFs. Create covers, promotional graphics, social media assets. | Phase 2–3 (Create/Design) | Free tier / $15/month Pro |
| 78 | **YouTube** | Marketing & Traffic | Create content channels (faceless or traditional) to drive traffic to digital product landing pages. Video descriptions and pinned comments link to storefront. | Phase 8 (Market) | Free (platform monetization available at 1K+ subs) |

---

## Required Secrets Reference

All secrets must be stored in **GitHub Secrets** (Settings → Secrets and variables → Actions).
They are **never** committed to code.

| Secret Name | Used By | What It Is |
|---|---|---|
| `APP_ID` | `create-github-app-token@v1` | GitHub App numeric ID |
| `APP_PRIVATE_KEY` | `create-github-app-token@v1` | GitHub App RSA private key (PEM format) |
| `OPENROUTER_API_KEY` | `research-module.js` | OpenRouter API key (`sk-or-...`) |
| `SSH_PRIVATE_KEY` | `deploy.yml` | SSH private key for DigitalOcean droplet access |
| `DATABASE_URL` | App + postgres-mcp | PostgreSQL connection string |
| `JWT_SECRET` | App auth | JWT signing secret (minimum 32 characters) |
| `STRIPE_SECRET_KEY` | Stripe + stripe-mcp | Stripe secret key (`sk_live_...` or `sk_test_...`) |
| `BRAVE_API_KEY` | brave-search-mcp | Brave Search API key |
| `EXA_API_KEY` | exa-mcp | Exa search API key |
| `SLACK_BOT_TOKEN` | slack-mcp | Slack bot OAuth token |
| `MEM0_API_KEY` | mem0-mcp | Mem0 memory API key |
| `GUMROAD_ACCESS_TOKEN` | Gumroad API | Gumroad API access token for automated product uploads |
| `CANVA_API_KEY` | Canva API (if using automation) | Canva API key for programmatic design generation |

---

*Auto-maintained. Last sync: 2026-04-15. Script: `scripts/sync-flow-charts.js`*
