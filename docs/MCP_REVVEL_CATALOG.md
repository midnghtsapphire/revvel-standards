# Revvel Custom MCP Server Catalog

**Version:** 1.0.0  
**Date:** April 12, 2026  
**Author:** Audrey Evans (MIDNGHTSAPPHIRE)  
**Status:** Single Source of Truth  

---

## Overview

This catalog documents every custom MCP repository in the MIDNGHTSAPPHIRE GitHub organization. There are two distinct groups:

| Group | Count | Description |
|---|---|---|
| **[Group A] True MCP Servers** | 4 | Production-ready MCP servers exposing tools via the Model Context Protocol stdio transport |
| **[Group B] MCT Microservice Modules** | 20 | Express REST API microservices for the InTheWild platform with partial `@modelcontextprotocol/sdk` integration |

All repos in Group B follow the naming convention `MCP-<DOMAIN>` (uppercase), use TypeScript/Node.js, and are containerized via Docker. Each has a `src/mct/` layer that either fully implements MCP SDK tooling or has a placeholder awaiting completion.

---

## Group A: Production MCP Servers

### 1. `rvvel-affiliate-links-mcp`

| Field | Value |
|---|---|
| **Repo** | [midnghtsapphire/rvvel-affiliate-links-mcp](https://github.com/midnghtsapphire/rvvel-affiliate-links-mcp) |
| **Language** | TypeScript (Node.js) |
| **Transport** | stdio |
| **Database** | SQLite (`rvvel-affiliate-links.db`, local) |
| **Run** | `npx rvvel-affiliate-links-mcp` |
| **MCP Status** | ✅ Production-ready |

**What it does:**  
Central hub for storing, retrieving, searching, and tracking affiliate links across the entire Revvel ecosystem. One source of truth for affiliate link performance data.

**Tools (8):**

| Tool | Description |
|---|---|
| `store_affiliate_link` | Add a new affiliate link with program, product, commission rate, category, tags, notes |
| `get_affiliate_links` | Retrieve links filtered by category, program, minimum commission rate |
| `get_best_link` | Return the highest-performing link for a given category |
| `search_links` | Full-text search across all stored affiliate links |
| `get_stats` | Get clicks, conversions, revenue, and conversion rate for a link |
| `track_click` | Record a click event with source and optional user ID |
| `track_conversion` | Record a conversion with sale amount and order ID |
| `export_links` | Export all links as JSON or CSV |

**Database Schema:**
- `affiliate_links` — id, program, product, link (URL), commission_rate, category, tags (JSON), expiry, clicks, conversions, revenue, notes
- `link_clicks` — id, link_id, timestamp, source, user_id
- `link_conversions` — id, link_id, timestamp, amount, order_id

**`.mcp.json` entry:**
```json
"rvvel-affiliate-links": {
  "command": "npx",
  "args": ["rvvel-affiliate-links-mcp"]
}
```

**When to use:** Always include this in any Revvel project that displays products, recommends tools, or generates content — the AI agent can call `get_best_link` or `search_links` to automatically insert real affiliate links.

---

### 2. `code-review-mcp-server`

| Field | Value |
|---|---|
| **Repo** | [midnghtsapphire/code-review-mcp-server](https://github.com/midnghtsapphire/code-review-mcp-server) |
| **Language** | TypeScript (Node.js) |
| **Transport** | stdio |
| **Database** | None (scans filesystem in-process) |
| **Run** | `node /path/to/code-review-mcp-server/dist/index.js` |
| **MCP Status** | ✅ Production-ready |

**What it does:**  
Automated code quality, accessibility, security, and deployment readiness scanning using 100% free open-source tools (ESLint, TypeScript compiler, jsx-a11y, eslint-plugin-security). Enforces the Revvel Dev→Test→Live deployment gate.

**Tools (10):**

| Tool | Description |
|---|---|
| `scan_nested_anchors` | Detect `<Link><a>` nesting bugs that cause React console errors |
| `check_react_best_practices` | Validate hooks rules, key props, prop types, effect cleanup |
| `validate_typescript` | Run TypeScript compiler in standard or strict mode |
| `scan_accessibility` | WCAG 2.1 Level A/AA/AAA scan — alt text, ARIA, keyboard nav |
| `detect_security_issues` | XSS, injection, unsafe regex, npm audit, secret detection |
| `analyze_performance` | Performance bottleneck detection — tracked in the roadmap backlog |
| `generate_quality_report` | Full report in markdown, HTML, or JSON format |
| `validate_deployment_readiness` | Gate check for dev/test/live — tests, build, critical issues, security |
| `integrate_coderabbit` | Trigger CodeRabbit review on a GitHub PR |
| `send_slack_report` | Post quality report to a Slack webhook |

**`.mcp.json` entry:**
```json
"code-review": {
  "command": "node",
  "args": ["${CODE_REVIEW_MCP_PATH}/dist/index.js"]
}
```
Where `CODE_REVIEW_MCP_PATH` = absolute path to a local clone of `code-review-mcp-server`.

**When to use:** Include in every Revvel project. Run `validate_deployment_readiness` before every push to `main`. Wire `generate_quality_report` into the CI pipeline via `send_slack_report`.

---

### 3. `wr-pr-control-plane` (in-tree)

| Field | Value |
|---|---|
| **Repo** | In-tree: `mcp-servers/wr-control-plane/` (revvel-standards) |
| **Language** | Python (FastMCP) |
| **Transport** | stdio |
| **Database** | None (reads GitHub API + repo state) |
| **Run** | `uv run python ./mcp-servers/wr-control-plane/wr_control_plane/server.py` |
| **MCP Status** | ✅ Production-ready (disabled by default until credentials provisioned) |

**What it does:**
GitHub-native control plane for the 2026 WR-PR Automation Blueprint. Inspects `[WR]` issues, detects URLs / PDFs / requested integrations, reports credential readiness for Composio + Firecrawl + Tavily + Obot, and emits ready-to-paste `.mcp.json` entries. This is the integration point that lets Composio (tool router incl. Firebase / Slack / Notion / 100+), Firecrawl (deterministic research), Tavily (LLM-tuned live search), Obot (governance), and FastMCP (custom tools) be adopted incrementally without rewriting the existing `wr-pr-creation` / `jules-invoke` / `openrouter-coder` workflows.

**Tools (4):**

| Tool | Description |
|---|---|
| `control_plane_status` | Return server-level credential and governance readiness |
| `build_wr_issue_packet(issue_number, repo?)` | Fetch a WR issue + comments and produce a structured research/orchestration packet |
| `detect_wr_credential_requirements(issue_number, repo?)` | Identify required and missing credentials for a specific WR |
| `render_control_plane_mcp_entry(profile)` | Generate a ready-to-paste MCP config snippet for `repo` or downstream `template` profile |

**Resources (2):**

| Resource | Description |
|---|---|
| `data://wr-control-plane/env-schema` | Required and optional environment variables |
| `data://wr-control-plane/architecture` | Canonical Revvel interpretation of the 2026 blueprint (current Jules + next Firecrawl & Tavily, OpenRouter + Composio incl. Firebase toolkit, Obot governance, plus a `v0_1_0_trade_offs` field) |

**`.mcp.json` entry:**
```json
"wr-pr-control-plane": {
  "command": "uv",
  "args": [
    "run", "python",
    "./mcp-servers/wr-control-plane/wr_control_plane/server.py"
  ],
  "env": {
    "GITHUB_TOKEN": "${GITHUB_TOKEN}",
    "OPENROUTER_API_KEY": "${OPENROUTER_API_KEY}",
    "ANTHROPIC_API_KEY": "${ANTHROPIC_API_KEY}",
    "JULES_API_KEY": "${JULES_API_KEY}",
    "COMPOSIO_API_KEY": "${COMPOSIO_API_KEY}",
    "FIRECRAWL_API_KEY": "${FIRECRAWL_API_KEY}",
    "TAVILY_API_KEY": "${TAVILY_API_KEY}",
    "CREWAI_API_KEY": "${CREWAI_API_KEY}",
    "OBOT_BASE_URL": "${OBOT_BASE_URL}",
    "OBOT_IDP_CONFIG": "${OBOT_IDP_CONFIG}",
    "OBOT_ALLOWED_HOSTS": "${OBOT_ALLOWED_HOSTS}",
    "WR_DEFAULT_REPO": "${WR_DEFAULT_REPO}"
  }
}
```

**When to use:** Enable in any repository that follows the revvel-standards WR pipeline. The server lets the agent answer "what credentials does this WR need?" and "what is the canonical orchestration plan for this WR?" without spinning up Composio / Firecrawl / Tavily / Obot first. Wire it into the WR pipeline as soon as `GITHUB_TOKEN`, `OPENROUTER_API_KEY`, and `JULES_API_KEY` are available; add Composio / Firecrawl / Tavily / Obot keys later as the blueprint adoption progresses.

**Research mode selection** (returned by `_control_plane_readiness.research_mode`):

| Mode | Trigger |
|---|---|
| `jules-only` | No URLs detected, or no research credentials beyond Jules |
| `firecrawl-agent` | URLs detected and `FIRECRAWL_API_KEY` configured |
| `tavily-search` | URLs detected and `TAVILY_API_KEY` configured (no Firecrawl) |
| `jules-plus-firecrawl-and-tavily` | URLs detected with both Firecrawl and Tavily configured |
| `jules-plus-firecrawl-pdf` | PDF URLs detected with Firecrawl configured (Firecrawl wins on PDFs) |

**Known v0.1.0 trade-offs** (also exposed at `data://wr-control-plane/architecture` under `v0_1_0_trade_offs`):

| Trade-off | Why intentional | Replaced by |
|---|---|---|
| Substring match for `requested_integrations` (false positives are common, e.g. `github` matches every issue) | Informational signal only; does not flip required-credential flags | Stop-word / URL-host-aware tokenizer in v0.2.0 |
| Unpaginated GitHub REST calls (~30 comments per WR) | Acceptable at intake stage; pagination is best owned by Composio's GitHub toolkit alongside per-user OAuth | Composio GitHub toolkit pagination |
| Per-call `ControlPlaneConfig.from_env` reads | Keeps tools individually importable for tests and trivially auditable under Obot DLP | Process-wide cache shared with the Composio OAuth refresh path |
| `disabled: true` in `.mcp.json` by default | Downstream clones must opt in after installing local Python deps and provisioning credentials | `setup-mcp.sh` flips the flag once the credential check passes |

---

### 4. `chrome-devtools-mcp`

| Field | Value |
|---|---|
| **Repo** | [midnghtsapphire/chrome-devtools-mcp](https://github.com/midnghtsapphire/chrome-devtools-mcp) |
| **Upstream** | Open-source fork (MIT) |
| **Language** | TypeScript (Node.js) |
| **Transport** | stdio |
| **Run** | `node /path/to/chrome-devtools-mcp/dist/index.js` |
| **MCP Status** | ✅ Wired in `.mcp.json` (disabled by default — enable for dev/CI use) |
| **WR** | [#14450](https://github.com/midnghtsapphire/revvel-standards/issues/14450) |

**What it does:**
Exposes Chrome DevTools Protocol (CDP) capabilities as MCP tools. AI agents can navigate, screenshot, inspect DOM, read/write cookies and `localStorage`/`sessionStorage`, intercept network requests, evaluate JavaScript, and control a running Chromium browser — without writing any browser automation glue code.

**⚠️ Security constraint:** Cookie, storage, and network intercept tools must **only** target `localhost` or test origins the operator owns. Never use against a production user session. See `wr/issues/issue-14450-wire-in-chrome-devtools-mcp.md` for the full security boundary.

**Prerequisites:**
1. Start Chrome: `google-chrome --remote-debugging-port=9222 --user-data-dir=/tmp/cdp-test-profile`
2. Clone the fork and `npm install`
3. Set `CHROME_DEVTOOLS_MCP_PATH` and `CHROME_DEBUG_PORT=9222` in `.env`
4. Remove `"disabled": true` from the `.mcp.json` entry

**Tools (15):**

| Tool | CDP Domain | What it returns / does |
|---|---|---|
| `cdp_navigate` | Page | Navigate active tab to a URL |
| `cdp_screenshot` | Page | Return base64 PNG screenshot of the viewport |
| `cdp_evaluate` | Runtime | Execute a JS expression and return the result |
| `cdp_get_cookies` | Network | Return all cookies for the current origin (name, value, domain, secure, httpOnly, expiry) |
| `cdp_set_cookie` | Network | Write or overwrite a cookie |
| `cdp_get_local_storage` | Runtime (JS) | Return all `localStorage` keys and values for the current origin |
| `cdp_get_session_storage` | Runtime (JS) | Return all `sessionStorage` keys and values |
| `cdp_network_intercept` | Network | Capture request/response headers including `Authorization: Bearer` tokens |
| `cdp_get_indexed_db` | IndexedDB | Enumerate databases, object stores, and records |
| `cdp_service_worker_cache` | CacheStorage (JS) | List Service Worker cache keys and entries |
| `cdp_dom_query` | DOM | CSS selector → list of matching nodes + attributes |
| `cdp_click` | Input | Simulate a mouse click on a page element |
| `cdp_type` | Input | Type text into the focused element |
| `cdp_wait_for_selector` | Runtime | Poll until a CSS selector resolves (timeout configurable) |
| `cdp_close_tab` | Target | Close the active tab |

**Token / Secret Retrieval Use Cases:**

| Scenario | Tool | Revvel Product |
|---|---|---|
| Retrieve session cookie after login for CI auth flow | `cdp_get_cookies` | All auth-gated products |
| Read JWT from `localStorage` after OAuth callback | `cdp_get_local_storage` | GrowlingEyes, Lead Engine, Music Video Creator |
| Capture `Authorization: Bearer` header on API calls | `cdp_network_intercept` | Any product with REST API auth |
| Read OAuth refresh token from `sessionStorage` | `cdp_get_session_storage` | Products using Google/GitHub sign-in |
| Verify `window.__ENV__` secret injection at runtime | `cdp_evaluate` | Prompt Generation App, any product using env injection |
| Inspect Service Worker cached auth manifest | `cdp_service_worker_cache` | PWA products; offline-mode auth debugging |

**`.mcp.json` entry:**
```json
"chrome-devtools-mcp": {
  "command": "node",
  "args": ["${CHROME_DEVTOOLS_MCP_PATH}"],
  "env": {
    "CHROME_DEBUG_PORT": "${CHROME_DEBUG_PORT:-9222}",
    "CHROME_DEBUG_HOST": "${CHROME_DEBUG_HOST:-localhost}"
  },
  "disabled": true
}
```

**When to use:** Any time an AI agent needs to inspect browser state — auth tokens, cookies, DOM content, or network traffic — during local development or CI E2E test runs against products in the Revvel portfolio.

---

## Group B: MCT Microservice Modules (InTheWild Platform)

These 20 modules are the building blocks of the InTheWild platform. Each is an Express REST API microservice + Docker container. Most include an `@modelcontextprotocol/sdk` layer that can expose their business logic as MCP tools.

### MCP SDK Implementation Tiers

| Tier | Definition | Modules |
|---|---|---|
| ✅ **Implemented** | MCP SDK connected, tools registered and functional | ANALYTICS, SUBSCRIPTION, CONTENT-CALENDAR, ADMIN-DASHBOARD, CUSTOMER-SUPPORT, USER-DASHBOARD, WEBSITE-GENERATOR |
| 🔶 **Partial** | MCP SDK present, tools stubbed or incomplete | SEO-ACCESSIBILITY, AD-CAMPAIGN, AUTH, PAYMENT, AFFILIATE, EMAIL-MARKETING, BRANDING, AB-TESTING, CODE-REVIEW, DATA-MANAGEMENT |
| ❓ **Unknown** | Not yet audited | REPORTS, KUBERNETES, LOCALIZATION, SOFTWARE-DISCOVERY |

---

### MCT Module Reference

#### MCP-AUTH
| | |
|---|---|
| **Repo** | [midnghtsapphire/MCP-AUTH](https://github.com/midnghtsapphire/MCP-AUTH) |
| **npm name** | `mct-auth` |
| **Database** | PostgreSQL (TypeORM) |
| **MCP Status** | 🔶 Partial (MCT layer is placeholder) |
| **REST Endpoints** | `POST /api/register`, `POST /api/login` |
| **Domain** | User registration, bcrypt password hashing, JWT token issuance |
| **Dependencies** | express, typeorm, pg, bcryptjs, jsonwebtoken |

**MCP Tools (needed):** `register_user`, `authenticate_user`, `validate_token`

**`.mcp.json` entry (Docker):**
```json
"mct-auth": {
  "command": "docker",
  "args": ["run", "--rm", "-p", "3001:3000",
    "-e", "DATABASE_URL=${DATABASE_URL}",
    "-e", "JWT_SECRET=${JWT_SECRET}",
    "midnghtsapphire/mcp-auth"]
}
```

---

#### MCP-PAYMENT
| | |
|---|---|
| **Repo** | [midnghtsapphire/MCP-PAYMENT](https://github.com/midnghtsapphire/MCP-PAYMENT) |
| **npm name** | `mct-payment` |
| **Database** | MongoDB (Mongoose) |
| **MCP Status** | 🔶 Partial |
| **REST Endpoints** | `POST /api/payment`, `GET /api/payment/:id` |
| **Domain** | Payment CRUD — create payment records, check payment status |

**MCP Tools (needed):** `create_payment`, `get_payment_status`, `list_payments`

---

#### MCP-ANALYTICS
| | |
|---|---|
| **Repo** | [midnghtsapphire/MCP-ANALYTICS](https://github.com/midnghtsapphire/MCP-ANALYTICS) |
| **npm name** | `mct-analytics` |
| **Database** | MongoDB (Mongoose) |
| **MCP Status** | ✅ Implemented |
| **MCP Tool** | `get_analytics_data` — fetch all analytics events |
| **REST Endpoints** | `GET /api/analytics` |
| **Domain** | User event tracking — userId, eventData (Map), timestamp |

**`.mcp.json` entry:**
```json
"mct-analytics": {
  "command": "node",
  "args": ["${MCT_ANALYTICS_PATH}/dist/index.js"],
  "env": { "MONGODB_URI": "${MONGODB_URI}" }
}
```

---

#### MCP-SUBSCRIPTION
| | |
|---|---|
| **Repo** | [midnghtsapphire/MCP-SUBSCRIPTION](https://github.com/midnghtsapphire/MCP-SUBSCRIPTION) |
| **npm name** | `mct-subscription-module` |
| **Database** | PostgreSQL (TypeORM) |
| **MCP Status** | ✅ Implemented |
| **MCP Tool** | `getSubscriptions` — fetch all subscriptions |
| **REST Endpoints** | `GET /subscriptions`, `POST /subscriptions` |
| **Domain** | Subscription lifecycle — userId, serviceId, startDate, endDate |

---

#### MCP-AFFILIATE
| | |
|---|---|
| **Repo** | [midnghtsapphire/MCP-AFFILIATE](https://github.com/midnghtsapphire/MCP-AFFILIATE) |
| **npm name** | `mct-affiliate` |
| **Database** | MongoDB (Mongoose) |
| **MCP Status** | 🔶 Partial (MCT layer is stub) |
| **REST Endpoints** | `GET/POST/PUT/DELETE /affiliates` |
| **Domain** | Affiliate partner management — name, email, URL, campaigns |
| **Note** | Separate from `rvvel-affiliate-links-mcp`. This manages affiliate *partners*; that manages affiliate *links*. |

---

#### MCP-BRANDING
| | |
|---|---|
| **Repo** | [midnghtsapphire/MCP-BRANDING](https://github.com/midnghtsapphire/MCP-BRANDING) |
| **npm name** | `mct-branding` |
| **Database** | MongoDB (Mongoose) |
| **MCP Status** | 🔶 Partial (MCT layer is stub) |
| **REST Endpoints** | `GET/POST/PUT/DELETE /api/brands` |
| **Domain** | Dynamic brand management — name, logoUrl, timestamps |

---

#### MCP-SEO-ACCESSIBILITY
| | |
|---|---|
| **Repo** | [midnghtsapphire/MCP-SEO-ACCESSIBILITY](https://github.com/midnghtsapphire/MCP-SEO-ACCESSIBILITY) |
| **npm name** | `mct-seo-accessibility` |
| **Database** | MongoDB (Mongoose) |
| **MCP Status** | 🔶 Partial (basic tool stubs present) |
| **MCP Tools** | `seo` (get SEO data for URL), `accessibility` (get accessibility report for URL) |
| **REST Endpoints** | `GET /seo?url=`, `GET /accessibility?url=` |
| **Domain** | SEO metadata and accessibility reports for any URL |

---

#### MCP-EMAIL-MARKETING
| | |
|---|---|
| **Repo** | [midnghtsapphire/MCP-EMAIL-MARKETING](https://github.com/midnghtsapphire/MCP-EMAIL-MARKETING) |
| **npm name** | `mct-email-marketing` |
| **Database** | MongoDB (Mongoose) |
| **MCP Status** | 🔶 Partial (MCT layer is placeholder) |
| **REST Endpoints** | `GET/POST/PUT/DELETE /api/campaigns` |
| **Domain** | Email campaign management — name, subject, body, status (draft/sent/scheduled), sentDate |
| **Dependencies** | nodemailer (email sending) |

---

#### MCP-AD-CAMPAIGN
| | |
|---|---|
| **Repo** | [midnghtsapphire/MCP-AD-CAMPAIGN](https://github.com/midnghtsapphire/MCP-AD-CAMPAIGN) |
| **npm name** | `mct-ad-campaign` |
| **Database** | PostgreSQL (TypeORM) |
| **MCP Status** | 🔶 Partial (tools present but use non-standard `mcp-core` package) |
| **MCP Tools** | `getCampaigns`, `createCampaign` |
| **REST Endpoints** | `GET/POST/PUT/DELETE /api/campaigns` |
| **Domain** | Ad campaign management — name, startDate, endDate, budget |

---

#### MCP-CONTENT-CALENDAR
| | |
|---|---|
| **Repo** | [midnghtsapphire/MCP-CONTENT-CALENDAR](https://github.com/midnghtsapphire/MCP-CONTENT-CALENDAR) |
| **npm name** | `mct-content-calendar` |
| **Database** | MongoDB (Mongoose) |
| **MCP Status** | ✅ Connected (StdioServerTransport active, tools not yet registered) |
| **REST Endpoints** | `GET/POST /api/events` |
| **Domain** | Content scheduling — title, description, date |

---

#### MCP-ADMIN-DASHBOARD
| | |
|---|---|
| **Repo** | [midnghtsapphire/MCP-ADMIN-DASHBOARD](https://github.com/midnghtsapphire/MCP-ADMIN-DASHBOARD) |
| **npm name** | `mct-admin-dashboard` |
| **Database** | MySQL (TypeORM) |
| **MCP Status** | ✅ Implemented |
| **MCP Tools** | `getUsers`, `addUser` |
| **REST Endpoints** | `GET/POST /api/users` |
| **Domain** | Admin user management — name, role |

---

#### MCP-AB-TESTING
| | |
|---|---|
| **Repo** | [midnghtsapphire/MCP-AB-TESTING](https://github.com/midnghtsapphire/MCP-AB-TESTING) |
| **npm name** | `mct-ab-testing` |
| **Database** | SQLite (TypeORM) |
| **MCP Status** | 🔶 Partial (MCT layer is stub) |
| **REST Endpoints** | `GET /tests/results`, `POST /tests/create`, `PUT /tests/update/:id` |
| **Domain** | A/B test tracking — variantA, variantB, result counts |

---

#### MCP-CODE-REVIEW (MCT module — different from `code-review-mcp-server`)
| | |
|---|---|
| **Repo** | [midnghtsapphire/MCP-CODE-REVIEW](https://github.com/midnghtsapphire/MCP-CODE-REVIEW) |
| **npm name** | `mct-code-review` |
| **Database** | MongoDB (Mongoose) |
| **MCP Status** | 🔶 Partial |
| **REST Endpoints** | `GET /api/reviews`, `POST /api/review` |
| **Domain** | Code review records — codeSnippet, comments, reviewer, date |
| **Note** | This is a *data store* for review records. `code-review-mcp-server` is the *automated scanner*. |

---

#### MCP-AI-CHAT
| | |
|---|---|
| **Repo** | [midnghtsapphire/MCP-AI-CHAT](https://github.com/midnghtsapphire/MCP-AI-CHAT) |
| **npm name** | `mct-ai-chat` |
| **Database** | Unknown |
| **MCP Status** | ❓ Unknown |
| **Domain** | AI chat interface — full MCP-based chat application |

---

#### MCP-WEBSITE-GENERATOR
| | |
|---|---|
| **Repo** | [midnghtsapphire/MCP-WEBSITE-GENERATOR](https://github.com/midnghtsapphire/MCP-WEBSITE-GENERATOR) |
| **npm name** | `mct-website-generator` |
| **Database** | MongoDB (Mongoose) |
| **MCP Status** | ✅ Implemented |
| **MCP Tool** | `generateWebsite` — create website from content string, returns URL |
| **REST Endpoints** | `GET /websites`, `POST /websites`, `PUT /websites/:id` |
| **Domain** | Website generation and management — name, url, content |

---

#### MCP-CUSTOMER-SUPPORT
| | |
|---|---|
| **Repo** | [midnghtsapphire/MCP-CUSTOMER-SUPPORT](https://github.com/midnghtsapphire/MCP-CUSTOMER-SUPPORT) |
| **npm name** | `mct-customer-support` |
| **Database** | PostgreSQL |
| **MCP Status** | ✅ Implemented |
| **MCP Tool** | `fetchCustomerData` — retrieve customer record by ID |
| **REST Endpoints** | `GET /health` |
| **Domain** | Customer support — customer data retrieval, AI-assisted support queries |

---

#### MCP-USER-DASHBOARD
| | |
|---|---|
| **Repo** | [midnghtsapphire/MCP-USER-DASHBOARD](https://github.com/midnghtsapphire/MCP-USER-DASHBOARD) |
| **npm name** | `mct-user-dashboard` |
| **Database** | MongoDB (Mongoose) |
| **MCP Status** | ✅ Implemented |
| **MCP Tools** | `getUserData`, `updateUserData` |
| **REST Endpoints** | `GET/POST/PUT/DELETE /users` |
| **Domain** | User profile management — username, email |

---

#### MCP-DATA-MANAGEMENT
| | |
|---|---|
| **Repo** | [midnghtsapphire/MCP-DATA-MANAGEMENT](https://github.com/midnghtsapphire/MCP-DATA-MANAGEMENT) |
| **npm name** | `mct-data-management` |
| **Database** | SQLite (TypeORM) |
| **MCP Status** | 🔶 Partial (MCT layer routes to REST, not MCP SDK) |
| **REST Endpoints** | `GET/POST/PUT/DELETE /projects` |
| **Domain** | Project data CRUD — name, description |

---

#### MCP-REPORTS
| | |
|---|---|
| **Repo** | [midnghtsapphire/MCP-REPORTS](https://github.com/midnghtsapphire/MCP-REPORTS) |
| **npm name** | Unknown |
| **MCP Status** | ❓ Not audited |
| **Domain** | Report generation for the InTheWild platform |

---

#### MCP-KUBERNETES
| | |
|---|---|
| **Repo** | [midnghtsapphire/MCP-KUBERNETES](https://github.com/midnghtsapphire/MCP-KUBERNETES) |
| **npm name** | Unknown |
| **MCP Status** | ❓ Not audited |
| **Domain** | Kubernetes cluster management |

---

#### MCP-LOCALIZATION
| | |
|---|---|
| **Repo** | [midnghtsapphire/MCP-LOCALIZATION](https://github.com/midnghtsapphire/MCP-LOCALIZATION) |
| **npm name** | Unknown |
| **MCP Status** | ❓ Not audited |
| **Domain** | Internationalization and translation management |

---

#### MCP-SOFTWARE-DISCOVERY
| | |
|---|---|
| **Repo** | [midnghtsapphire/MCP-SOFTWARE-DISCOVERY](https://github.com/midnghtsapphire/MCP-DISCOVERY) |
| **npm name** | Unknown |
| **MCP Status** | ❓ Not audited |
| **Domain** | Software and tool discovery |

---

## Wiring Into Projects

### The Two Must-Have Custom Servers

Every Revvel project `.mcp.json` **must include** these two regardless of project type:

```json
"rvvel-affiliate-links": {
  "command": "npx",
  "args": ["rvvel-affiliate-links-mcp"]
},
"code-review": {
  "command": "node",
  "args": ["${CODE_REVIEW_MCP_PATH}/dist/index.js"]
}
```

### MCT Modules — Add Per Project Need

For MCT modules, clone the repo and build it, then reference from `.mcp.json`:

```bash
# One-time setup: clone and build the MCT modules you need
git clone https://github.com/midnghtsapphire/MCP-ANALYTICS ~/mct/analytics
cd ~/mct/analytics && npm install && npm run build
```

Then in `.mcp.json`:
```json
"mct-analytics": {
  "command": "node",
  "args": ["/Users/yourname/mct/analytics/dist/index.js"],
  "env": { "MONGODB_URI": "${MONGODB_URI}" }
}
```

Or via Docker (once images are published):
```json
"mct-analytics": {
  "command": "docker",
  "args": ["run", "--rm", "-i",
    "-e", "MONGODB_URI=${MONGODB_URI}",
    "midnghtsapphire/mcp-analytics"]
}
```

---

## Action Items / Known Issues

| Module | Issue | Priority |
|---|---|---|
| `code-review-mcp-server` | Needs `npm publish` so it can be run via `npx` without a local clone | P1 |
| MCP-AUTH | MCT layer is placeholder — needs MCP SDK tools implemented | P1 |
| MCP-PAYMENT | MCT layer is placeholder | P1 |
| MCP-AFFILIATE | MCT layer is stub | P2 |
| MCP-EMAIL-MARKETING | MCT layer is placeholder | P2 |
| MCP-BRANDING | MCT layer is stub | P2 |
| MCP-AB-TESTING | MCT layer is stub | P2 |
| MCP-CODE-REVIEW | MCT layer is stub | P2 |
| MCP-DATA-MANAGEMENT | MCT layer uses REST, not MCP SDK | P2 |
| MCP-CONTENT-CALENDAR | MCP connected but no tools registered | P2 |
| MCP-REPORTS | Not audited | P3 |
| MCP-KUBERNETES | Not audited | P3 |
| MCP-LOCALIZATION | Not audited | P3 |
| MCP-SOFTWARE-DISCOVERY | Not audited | P3 |
| All MCT modules | No Docker images published to registry | P1 |
| All MCT modules | Hardcoded localhost DB credentials in schema files | P0 — fix before any deployment |

---

## Environment Variables for Custom Servers

Add these to `.env` (see `templates/mcp/.env.mcp.example`):

```bash
# rvvel-affiliate-links-mcp (no env vars — self-contained SQLite)

# code-review-mcp-server
CODE_REVIEW_MCP_PATH=/absolute/path/to/code-review-mcp-server

# MCT modules — paths to local builds
MCT_ANALYTICS_PATH=/absolute/path/to/MCP-ANALYTICS
MCT_SUBSCRIPTION_PATH=/absolute/path/to/MCP-SUBSCRIPTION
MCT_AUTH_PATH=/absolute/path/to/MCP-AUTH
MCT_PAYMENT_PATH=/absolute/path/to/MCP-PAYMENT
MCT_AFFILIATE_PATH=/absolute/path/to/MCP-AFFILIATE
MCT_BRANDING_PATH=/absolute/path/to/MCP-BRANDING
MCT_SEO_ACCESSIBILITY_PATH=/absolute/path/to/MCP-SEO-ACCESSIBILITY
MCT_EMAIL_MARKETING_PATH=/absolute/path/to/MCP-EMAIL-MARKETING
MCT_AD_CAMPAIGN_PATH=/absolute/path/to/MCP-AD-CAMPAIGN
MCT_CONTENT_CALENDAR_PATH=/absolute/path/to/MCP-CONTENT-CALENDAR
MCT_ADMIN_DASHBOARD_PATH=/absolute/path/to/MCP-ADMIN-DASHBOARD
MCT_AB_TESTING_PATH=/absolute/path/to/MCP-AB-TESTING
MCT_CODE_REVIEW_PATH=/absolute/path/to/MCP-CODE-REVIEW
MCT_AI_CHAT_PATH=/absolute/path/to/MCP-AI-CHAT
MCT_WEBSITE_GENERATOR_PATH=/absolute/path/to/MCP-WEBSITE-GENERATOR
MCT_CUSTOMER_SUPPORT_PATH=/absolute/path/to/MCP-CUSTOMER-SUPPORT
MCT_USER_DASHBOARD_PATH=/absolute/path/to/MCP-USER-DASHBOARD
MCT_DATA_MANAGEMENT_PATH=/absolute/path/to/MCP-DATA-MANAGEMENT

# Not-yet-audited MCT modules (npm names TBD — add when repos are audited)
MCT_REPORTS_PATH=/absolute/path/to/MCP-REPORTS
MCT_KUBERNETES_PATH=/absolute/path/to/MCP-KUBERNETES
MCT_LOCALIZATION_PATH=/absolute/path/to/MCP-LOCALIZATION
MCT_DISCOVERY_PATH=/absolute/path/to/MCP-SOFTWARE-DISCOVERY
```
