# 🧰 Revvel Tools Inventory

> **Auto-maintained by:** `scripts/update-master-flow.sh`  
> **Last updated:** 2026-04-15 18:10 UTC
> **Repository:** midnghtsapphire/revvel-standards
> **Format:** Also available as [`TOOLS_INVENTORY.csv`](./TOOLS_INVENTORY.csv) for Excel / database upload

---

This is the complete list of every tool, script, API, MCP server, CLI, and third-party app used in the Revvel-Standards workflow — with a plain-English description of what each one does.

---

## 🤖 AI Models & Platforms

| Name | Type | URL / Location | What It Does | Required Secret |
|---|---|---|---|---|
| **OpenRouter** | API | `openrouter.ai` | Sends one question to 5+ AI models at once and picks the best answer. The "switchboard" for all AI calls. | `OPENROUTER_API_KEY` |
| **Anthropic Claude** (Sonnet 4 / 4.5) | AI Model | `anthropic.com` | Writes code, documentation, and standards. Used by Claude Code CLI. | `ANTHROPIC_API_KEY` |
| **OpenAI GPT** | AI Model | `openai.com` | Powers PandaOps PR review. Reviews your code changes for bugs. | `OPENAI_API_KEY` |
| **DeepSeek** | AI Model | `deepseek.com` | Open AI model used for research sub-agents. | Via OpenRouter |
| **Grok** | AI Model | `grok.x.ai` | Fast inference with real-time data. Used as a research sub-agent. | Via OpenRouter |
| **Kimi** | AI Model | `kimi.ai` | Long-context model (200k+ tokens). Good for reading big documents. | Via OpenRouter |
| **Venice.ai** | AI Platform | `venice.ai` | Privacy-focused AI. No data logged. Used for sensitive research. | Via OpenRouter |
| **Perplexity AI** | Research Tool | `perplexity.ai` | AI search engine with citations. Used for fact-checking research. | Optional API key |
| **GitHub Copilot** | AI Coding Assistant | GitHub extension | Suggests code completions inside VS Code / Cursor / Windsurf. | GitHub subscription |

---

## 💻 Code Editors & IDEs

| Name | Type | URL | What It Does |
|---|---|---|---|
| **Cursor** | AI Code Editor | `cursor.sh` | VS Code + AI. Writes whole features based on your description. |
| **Windsurf** | AI Code Editor | `codeium.com/windsurf` | Similar to Cursor. Made by Codeium. |
| **VS Code** | Code Editor | `code.visualstudio.com` | Standard code editor. Works with Copilot and Codeium. |
| **Claude Code** | AI CLI Agent | `claude.ai/code` | Terminal agent that writes, edits, and tests code autonomously. |
| **Cline** | VS Code Extension | VS Code Marketplace | AI agent extension inside VS Code. |

---

## 🐙 GitHub Tools & Actions

| Name | Type | Location | What It Does |
|---|---|---|---|
| **GitHub Actions** | CI/CD Platform | `.github/workflows/` | Runs automated jobs on every push, PR, or schedule. |
| **`actions/checkout@v4`** | GitHub Action | Marketplace | Downloads the repo code onto the runner. |
| **`actions/setup-node@v4`** | GitHub Action | Marketplace | Installs Node.js on the GitHub Actions runner. |
| **`actions/create-github-app-token@v1`** | GitHub Action | Marketplace | Creates a secure token for a GitHub App to use in workflows. |
| **`actions/github-script@v7`** | GitHub Action | Marketplace | Runs JavaScript inside GitHub Actions to call the GitHub API. |
| **`omnedia/panda-ops@v1`** | GitHub Action | Marketplace | AI code reviewer. Posts inline feedback on every PR. |
| **GitHub CLI (`gh`)** | CLI Tool | Built-in on runners | Creates issues, PRs, and comments from command line or scripts. |
| **GitHub REST API** | API | `api.github.com` | Programmatic access to issues, PRs, branches, comments. |
| **GitHub Projects** | Project Management | GitHub UI | Organizes issues into Kanban boards with automatic tracking. |
| **Branch Protection Rules** | GitHub Setting | Repo Settings | Prevents merging unless all checks pass. |
| **Dependabot** | GitHub Bot | `.github/dependabot.yml` | Automatically opens PRs to update outdated dependencies. |

---

## 🔄 Workflow Files (GitHub Actions)

| File | Trigger | What It Does |
|---|---|---|
| `research-module.yml` | Manual (`workflow_dispatch`) | Runs the AI research module. Creates docs and an issue. |
| `create-issue-branch.yml` | Issue labeled/assigned | Auto-creates a git branch for every new issue. |
| `panda-ops.yml` | PR opened/updated | AI reviews the PR diff and posts inline comments. |
| `ralph-loop.yml` | CI check completes | If CI fails, asks Copilot to fix it. After 5 failures, escalates to human. |
| `ready-for-review.yml` | PR checks pass | Marks PR as ready for review automatically. |
| `recurse-ml.yml` | PR/push | Runs recursive ML checks on the codebase. |
| `update-master-flow.yml` | Push to main + weekly cron | Regenerates this flow chart document. Detects repo/doc changes. |

---

## 📜 Scripts

| File | Language | What It Does |
|---|---|---|
| `scripts/research-module.js` | Node.js | Sends a question to 5 OpenRouter AI agents and writes the answer to a `.md` file. |
| `scripts/run-human-testing-api.js` | Node.js | Simulates human users testing a URL using S.H.I.F.T. AI agents. Writes a test report. |
| `scripts/check-compliance.js` | Node.js | Checks if a repo has all required Revvel standard files (CHANGELOG, AGENTS.md, etc.). |
| `scripts/bootstrap-repo.sh` | Bash | Sets up a brand-new repo with all Revvel standard files, CI/CD, and folder structure. |
| `scripts/bootstrap-new-project.sh` | Bash | Creates a new app project from templates (mobile, web, etc.) with workflows and docs. |
| `scripts/setup-mcp.sh` | Bash | Copies the right MCP server config (`.mcp.json`) into a project. Profiles: minimal/web/mobile/full. |
| `scripts/sync-bom.sh` | Bash | Syncs the Bill of Materials (BOM) document across all repos. |
| `scripts/update-master-flow.sh` | Bash | **This auto-updater.** Scans the repo, updates metadata in this flow chart, detects name/path changes. |

---

## 🔌 MCP Servers (Model Context Protocol)

> MCP servers connect AI agents directly to external tools. Configured in `.mcp.json`.  
> Full details: `MCP_STANDARD.md` and `docs/MCP_REVVEL_CATALOG.md`

| Server | What It Does |
|---|---|
| **Postgres MCP** | Let AI query your PostgreSQL database with plain English. |
| **Supabase MCP** | Let AI read/write Supabase (hosted Postgres + auth). |
| **SQLite MCP** | Let AI work with local SQLite databases. |
| **Brave Search MCP** | Let AI search the web via Brave Search API. |
| **Fetch MCP** | Let AI read any URL or webpage. |
| **Filesystem MCP** | Let AI read and write files on your computer. |
| **Memory MCP** | Give AI persistent memory across sessions. |
| **GitHub MCP** | Let AI create issues, PRs, and branches via natural language. |
| **Slack MCP** | Let AI send Slack messages and read channels. |
| **SendGrid MCP** | Let AI send emails. |
| **Twilio MCP** | Let AI send SMS messages. |
| **Stripe MCP** | Let AI read payment data and create charges. |
| **Shopify MCP** | Let AI manage Shopify stores. |
| **Google Maps MCP** | Let AI search and route using Google Maps. |
| **Playwright MCP** | Let AI control a web browser (testing, scraping). |
| **Redis MCP** | Let AI use Redis for caching and queuing. |
| **Elasticsearch MCP** | Let AI search Elasticsearch indexes. |
| **Docker MCP** | Let AI manage Docker containers. |
| *(+ 14 more)* | See `MCP_STANDARD.md` for the full 32-server catalog. |

---

## 🌐 Third-Party Platforms & Apps

| Name | Category | URL | What It Does | Used In |
|---|---|---|---|---|
| **DigitalOcean** | Hosting | `digitalocean.com` | Runs deployed apps on virtual servers (Droplets). | `docs/droplet_access.md` |
| **Cloudflare** | CDN / Security | `cloudflare.com` | Protects the app from attacks. Routes traffic. Provides free HTTPS. | `API_GATEKEEPER_STANDARD.md` |
| **Supabase** | Database / Auth | `supabase.com` | Hosted Postgres database with built-in authentication. Free tier available. | `DATABASE_ARCHITECTURE_STANDARD.md` |
| **Vercel** | Hosting | `vercel.com` | One-click deploy for Next.js apps. Free tier. | Various project templates |
| **Netlify** | Hosting | `netlify.com` | Easy deploy for static sites and functions. Free tier. | Various project templates |
| **Stripe** | Payments | `stripe.com` | Handles online payments. Used for affiliate and e-commerce. | `AFFILIATE_MARKETING_STANDARD.md` |
| **Shopify** | E-commerce | `shopify.com` | Runs online stores. | `AFFILIATE_MARKETING_STANDARD.md` |
| **Perplexity AI** | Research | `perplexity.ai` | AI search with citations. Used when doing manual research. | Research workflow |
| **PDFiller** | Documents | `pdffiller.com` | Fills and signs PDF forms (legal documents, filings). | `docs/tax-legal-agent-SKILL.md` |
| **Waydev** | Analytics | `waydev.co` | Tracks developer activity and output metrics. | `docs/WAYDEV_SETUP.md` |
| **Tailwind CSS** | UI Framework | `tailwindcss.com` | Makes web apps look good without writing custom CSS. | All web projects |
| **Next.js** | Web Framework | `nextjs.org` | Full-stack React framework. The standard for Revvel web apps. | All web projects |
| **Expo** | Mobile Framework | `expo.dev` | Builds iOS and Android apps from one JavaScript codebase. | Mobile projects |
| **Vitest** | Testing | `vitest.dev` | Runs fast unit tests. | All projects |
| **Playwright** | E2E Testing | `playwright.dev` | Automates browser testing (clicks buttons, checks results). | `TESTING_STANDARD.md` |
| **Kong** | API Gateway | `konghq.com` | FOSS API gateway that controls who can call your APIs. | `API_GATEKEEPER_STANDARD.md` |
| **Sentry** | Error Tracking | `sentry.io` | Catches and reports errors in production automatically. | `DEPLOYMENT_STANDARD.md` |
| **OpenClaw** | AI Orchestration | Internal | Revvel's internal AI orchestration system for agents. | `docs/openclaw-agent-onboarding.md` |

---

## 🔑 Required GitHub Secrets

> Set these in: GitHub → Settings → Secrets and variables → Actions

| Secret Name | Used By | What It Is |
|---|---|---|
| `OPENROUTER_API_KEY` | `research-module.yml` | API key for OpenRouter (AI research) |
| `OPENAI_API_KEY` | `panda-ops.yml` | API key for OpenAI (PandaOps review) |
| `APP_ID` | Multiple workflows | GitHub App ID for bot authentication |
| `APP_PRIVATE_KEY` | Multiple workflows | GitHub App private key for bot authentication |
| `GITHUB_TOKEN` | All workflows | Auto-provided by GitHub. No setup needed. |

---

*This inventory is automatically regenerated by `scripts/update-master-flow.sh` whenever changes are pushed to main.*
Workflow Files,run-human-testing-api.yml,GitHub Workflow,.github/workflows/run-human-testing-api.yml,Auto-detected workflow — see file for details.,GITHUB_TOKEN
