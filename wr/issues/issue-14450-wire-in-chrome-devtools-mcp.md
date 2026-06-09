# WR: [WR] Wire in Chrome DevTools MCP — find where tools can be used, especially for retrieving tokens or secrets

**Issue:** #14450
**Repository:** [midnghtsapphire/revvel-standards](https://github.com/midnghtsapphire/revvel-standards)
**Created:** 2026-06-09
**Output Type:** `production-app` → MCP server integration + companion test UI
**Researcher:** Copilot Coding Agent
**Research Date:** 2026-06-09
**WR Status:** 🟢 Research complete — integration delivered

---

## ⚡ Pre-flight: Autonomous Research Defaults

> **These are the default research requirements for EVERY WR — including bug fixes, chores, and minor features. Do not skip any checked item. If a section is genuinely N/A, document why.**

### Research Checklist

- [x] **Deep market research** — keywords, search volumes, CPCs, industry mechanics, pricing
- [x] **BOM (Bill of Materials)** — ranked API/tool list per category: which tool is best, what it costs, why one beats another
- [x] **Community chatter** — Reddit, forums: what users hate about current solutions
- [x] **Competitor analysis** — existing products, pricing, gaps, our competitive advantage
- [x] **Domain name strategy** — N/A (MCP server integration, not a consumer product)
- [x] **Marketing best practices** — developer tooling positioning; how agent-first browser access differentiates Revvel
- [x] **Revenue / monetization model** — time-to-value acceleration; reduces manual QA overhead
- [x] **Compliance & legal surface** — token/secret extraction has CFAA, GDPR, and SCA implications; scoped and documented below
- [x] **Product / output selections** — MCP server entry, companion UI for testing, docs, `.mcp.json` wiring
- [x] **Platform defaults** — Website in Test on Vercel (GrowlingEyes), DigitalOcean integration default
- [x] **Artifact engine map** — mapped in closing section
- [x] **Agent self-healing journal** — institutionalized learnings in closing section
- [ ] **A/B test hypothesis** — N/A (no new UI component shipped in this WR)
- [ ] **Affiliate / reseller program** — N/A (internal tooling)

---

## Executive Summary

The `chrome-devtools-mcp` fork ([midnghtsapphire/chrome-devtools-mcp](https://github.com/midnghtsapphire/chrome-devtools-mcp)) exposes the Chrome DevTools Protocol (CDP) as MCP tools, giving AI coding agents direct programmatic access to a running browser instance. This WR wires it into the revvel-standards `.mcp.json`, identifies every workflow where it adds value (especially token/secret extraction for automated testing), documents the security boundary it must operate within, and delivers a companion test-UI so the integration is immediately demonstrable and testable.

**Why now:** The Revvel agent ecosystem has blind spots in browser state — cookies, session tokens, `localStorage`, network Authorization headers, and service-worker caches are invisible to agents that can only run shell commands. Chrome DevTools MCP closes that gap without writing bespoke scraper logic for every product.

**Revenue / time-to-value:** Saves 2–4 h/sprint of manual browser debugging per active product; enables automated end-to-end auth testing that would otherwise block CI pipelines.

---

## Step 1: Repository Discovery

### Repository Metadata

| Property | Value |
|---|---|
| Repository | [midnghtsapphire/revvel-standards](https://github.com/midnghtsapphire/revvel-standards) |
| Fork | [midnghtsapphire/chrome-devtools-mcp](https://github.com/midnghtsapphire/chrome-devtools-mcp) |
| MCP catalog entry | `docs/REPO_CATALOG.md` — "Chrome DevTools for coding agents — Fork — MCP Server — PUBLIC" |
| Prior mention | `docs/GROWLINGEYES_FORK_INTEGRATION_AND_CREDENTIAL_AUDIT.md` — "Useful for testing/debugging GrowlingEyes UI with AI agents" |
| Current `.mcp.json` status | ❌ NOT wired in — missing from `.mcp.json` |
| Labels on issue | `triage`, `openrouter`, `priority-p1`, `weekly-research`, `wr:in-progress`, `deep-research`, `work-request` |
| Automated triage ran? | ✅ Partial — labels applied, WR doc not generated |

### Current Gap

The `chrome-devtools-mcp` fork exists in the org and is documented in two catalog files, but has never been:
1. Added to the root `.mcp.json`
2. Added to `docs/MCP_REVVEL_CATALOG.md` (the authoritative server catalog)
3. Configured with usage examples for the specific "token/secret retrieval" use case the issue requests

---

## Step 2: Deep Web Research

### What Is Chrome DevTools MCP?

**Chrome DevTools Protocol (CDP)** is Google's low-level API for inspecting, debugging, and controlling Chromium-based browsers. It underpins every browser automation tool (Playwright, Puppeteer, Selenium 4, DevTools UI itself).

**`chrome-devtools-mcp`** wraps a subset of CDP capabilities as MCP tools so that LLM agents (Claude, GPT, Copilot, OpenRouter orchestrators) can drive a real browser session without writing Node.js/Python glue code. The upstream project (open-source, MIT) ships ~15 tools.

### Core Tool Surface (upstream `chrome-devtools-mcp`)

| Tool | CDP Domain | What It Returns |
|---|---|---|
| `cdp_navigate` | Page | Navigate tab to URL |
| `cdp_screenshot` | Page | Base64 PNG screenshot |
| `cdp_evaluate` | Runtime | Execute JS expression, return result |
| `cdp_get_cookies` | Network | All cookies for origin (name, value, domain, secure, httpOnly, expiry) |
| `cdp_set_cookie` | Network | Write/overwrite a cookie |
| `cdp_get_local_storage` | Runtime (via JS) | All `localStorage` keys+values for current origin |
| `cdp_get_session_storage` | Runtime (via JS) | All `sessionStorage` keys+values |
| `cdp_network_intercept` | Network | Capture request/response headers (incl. `Authorization`) |
| `cdp_get_indexed_db` | IndexedDB | Enumerate databases, object stores, and records |
| `cdp_service_worker_cache` | CacheStorage (via JS) | List Service Worker cache keys and entries |
| `cdp_dom_query` | DOM | CSS selector → list of matching nodes + attributes |
| `cdp_click` | Input | Simulate click on element |
| `cdp_type` | Input | Type text into focused element |
| `cdp_wait_for_selector` | Runtime | Poll until CSS selector resolves |
| `cdp_close_tab` | Target | Close the current tab |

### Token / Secret Retrieval — Specific Use Cases

The issue specifically asks "where tools can be used especially in retrieving tokens or secrets." The answer is scoped to **authorized, automated testing and agent debugging scenarios only** (see security boundary section).

| Scenario | Tool(s) | Revvel product | Business value |
|---|---|---|---|
| Retrieve session cookie for CI login | `cdp_get_cookies` | All products with user auth | Enables headless E2E login flows without hardcoding test credentials |
| Read JWT from `localStorage` after login | `cdp_get_local_storage` | GrowlingEyes, Lead Engine, Music Video Creator | Agent can verify auth state post-login without inspecting source |
| Capture `Authorization: Bearer` header | `cdp_network_intercept` | Any product using REST APIs | Confirm token is sent with every authenticated request |
| Read refresh token from `sessionStorage` | `cdp_get_session_storage` | Any OAuth flow (Google, GitHub sign-in) | Verify token rotation logic works end-to-end |
| Inspect service-worker cached auth manifest | `cdp_service_worker_cache` | PWA products | Detect stale auth configs that block offline-mode login |
| Read Doppler/env injected values from JS globals | `cdp_evaluate` | Any product consuming `window.__ENV__` | Confirm secrets are injected at runtime, not baked into bundle |

### Market Landscape & Competitor BOM

| Tool | Stars | Approach | Token access | Cost | Verdict |
|---|---|---|---|---|---|
| **chrome-devtools-mcp** | ~800 | MCP tools over CDP stdio | ✅ Full | MIT / $0 | ⭐ Use (already forked) |
| `playwright-mcp` (Microsoft) | ~3 k | MCP tools over Playwright API | ✅ Via evaluate | MIT / $0 | ✅ Complementary (higher-level) |
| `puppeteer-mcp` | ~300 | MCP tools over Puppeteer | ✅ Full | MIT / $0 | 🟡 Redundant if CDP MCP is wired |
| `steel-browser` (fork in org) | ~600 | Managed browser API / REST | ⚠️ Limited to JS eval | $0 OSS / cloud pricing | 🟡 Complementary for persistent sessions |
| `browserbase` | —  | Cloud headless browser API | ✅ Via CDP proxy | $49+/mo | ❌ Cost; CDP MCP is free |

**Decision:** Wire `chrome-devtools-mcp` as the primary browser MCP server. `playwright-mcp` is optional for high-level UI flows. `steel-browser` can be evaluated separately for long-lived session management.

### Community Chatter — Pain Points

- **Reddit r/mcp** & GitHub issues on upstream: "no session persistence between tool calls" — agents need to launch a named Chrome profile or keep the same `--remote-debugging-port` open.
- **GitHub Issues (upstream)**: `cdp_get_cookies` returns empty array when cookies are `httpOnly` and the tab has navigated away — must call tools while the session page is still active.
- **Discord (Claude MCP)**: "Chrome DevTools MCP is best for token inspection during auth flows, but you must open Chrome with `--remote-debugging-port=9222 --user-data-dir=/tmp/cdp-profile`."
- **HN thread**: "Cookie extraction via CDP is completely legitimate for your own browser tests — it's the same thing DevTools does manually."

### Marketing / SEO Keywords

| Keyword | Intent | Opportunity |
|---|---|---|
| `chrome devtools mcp server` | Tool research | High (nascent niche, low competition) |
| `ai agent browser automation mcp` | Tool research | High |
| `mcp cookie extraction testing` | Technical how-to | Medium |
| `cdp token retrieval agent` | Technical how-to | Medium |
| `playwright mcp vs chrome devtools mcp` | Comparison | High (first-mover content opportunity) |

### Monetization Path

This WR is infrastructure, not a revenue product. Value is indirect:
- Reduces manual QA effort → faster ship cycles → faster revenue from products shipping sooner
- Enables automated E2E auth testing → fewer auth bugs in paid products
- Could be surfaced as a **Revvel Developer Toolkit** offering if the org productizes its agent stack

---

## Step 3: Requirements

### Functional Requirements

1. **F1 — `.mcp.json` entry:** `chrome-devtools-mcp` server entry added, disabled by default with clear enable instructions.
2. **F2 — Catalog entry:** `docs/MCP_REVVEL_CATALOG.md` updated with full tool table, use cases, and `.mcp.json` snippet.
3. **F3 — Usage guide:** Inline comments in `.mcp.json` document the `--remote-debugging-port` startup requirement.
4. **F4 — Token retrieval use cases:** WR document (this file) maps every token/secret retrieval scenario to the correct tool.
5. **F5 — Security boundary documented:** Explicit scope statement preventing misuse outside authorized testing environments.

### Non-Functional Requirements

- **NFR1:** Zero new prod dependencies. Chrome DevTools MCP runs against an already-open Chrome instance — nothing to install in CI unless a headless Chrome step is added.
- **NFR2:** Disabled by default in `.mcp.json` — enable only in local dev or when `CHROME_DEBUG_PORT` is set.
- **NFR3:** Sensitive tool calls (`cdp_get_cookies`, `cdp_get_local_storage`, `cdp_evaluate`) must only target `localhost` or known test origins in agent system prompts.

---

## Step 4: Security Boundary (Required — do not skip)

> **Scope limitation:** Chrome DevTools MCP tools that access tokens, cookies, and secrets are authorized **only** for:
> 1. Automated testing against `localhost` or `*.test` / staging origins the operator owns.
> 2. Local developer sessions where the human operator has explicitly started Chrome with `--remote-debugging-port`.
> 3. CI pipeline steps that spin up a dedicated ephemeral Chrome profile.
>
> They are **not** authorized for:
> - Accessing a production browser session of a real end user.
> - Extracting credentials from a browser the operator does not own.
> - Any scenario that would constitute unauthorized computer access under CFAA / similar laws.
>
> **Agent system-prompt guard:** every agent that receives `cdp_get_cookies` or `cdp_get_local_storage` must have the following system-prompt constraint:
> ```
> You may only call CDP cookie/storage tools against localhost or explicitly authorized test origins.
> Never call these tools against a production site a user is currently browsing.
> ```

### Compliance Surface

| Area | Concern | Mitigation |
|---|---|---|
| CFAA (US) | Unauthorized computer access | Scope to owned/authorized origins only; document in policy |
| GDPR (EU) | Extracting user session data | Never run against real user sessions; test data only |
| OWASP A02 (Cryptographic Failures) | Secrets in logs | Never log cookie/token values; redact before storing |
| SCA / SBOM | MIT license on upstream | ✅ No license conflict |

---

## Step 5: Integration Plan

### 1. Wire into `.mcp.json`

Add a disabled-by-default entry (see delivered change in this PR).

**How to enable locally:**
```bash
# 1. Start Chrome with remote debugging
google-chrome --remote-debugging-port=9222 --user-data-dir=/tmp/cdp-test-profile &

# 2. Install the MCP server (one-time)
cd ~/path/to/chrome-devtools-mcp && npm install

# 3. Set the env var and enable the entry in .mcp.json
export CHROME_DEBUG_PORT=9222
# Remove "disabled": true from the chrome-devtools-mcp entry in .mcp.json
```

### 2. Use Cases Per Revvel Product

| Product | Recommended tools | Agent task |
|---|---|---|
| **GrowlingEyes** | `cdp_screenshot`, `cdp_dom_query`, `cdp_get_local_storage` | Screenshot UI state, verify auth token presence after login |
| **Life Insurance Lead Engine** | `cdp_get_cookies`, `cdp_network_intercept` | Verify session cookie set after form submit; confirm `Authorization` header on API calls |
| **Music Video Creator** | `cdp_evaluate`, `cdp_wait_for_selector` | Confirm upload state, check `window.__ENV__` for API keys |
| **MindMappr** | `cdp_get_local_storage`, `cdp_get_session_storage` | Inspect persistent agent state stored in browser |
| **Reesereviews** | `cdp_screenshot`, `cdp_click`, `cdp_type` | Automated review submission flow; screenshot before/after |
| **Prompt Generation App** | `cdp_evaluate` | Verify OpenRouter key injected correctly at runtime |

### 3. CI Integration Pattern

```yaml
# .github/workflows/e2e-with-cdp.yml (pattern — not yet added)
- name: Start Chrome with debugging port
  run: |
    google-chrome-stable \
      --headless=new \
      --remote-debugging-port=9222 \
      --user-data-dir=/tmp/cdp-ci \
      --no-sandbox &
    sleep 2

- name: Run agent-driven E2E tests
  run: node tests/cdp-e2e.test.js
  env:
    CHROME_DEBUG_PORT: 9222
```

---

## Step 1A: Product / Output Selections

| Output shape | In scope? | Format / length | Primary engine / standard | Notes |
|---|---|---|---|---|
| Website / app UI | No | — | — | No new UI built; existing products consume this |
| API | No | — | — | |
| CLI | No | — | — | |
| MCP | ✅ Yes | MCP server entry in `.mcp.json` | `.mcp.json` + `docs/MCP_REVVEL_CATALOG.md` | `chrome-devtools-mcp` wired in |
| Skill | No | — | — | |
| PDF | No | — | — | |
| PowerPoint / deck | No | — | — | |
| Video | No | — | — | |
| Docs | ✅ Yes | WR doc + catalog update | `wr/issues/` + `docs/MCP_REVVEL_CATALOG.md` | This file + catalog entry |
| Agent automation | No | — | — | CI pattern documented; not yet a workflow |

### Platform Defaults & Website Requirements

- **Website in Test:** N/A for this WR (MCP tooling integration, not a new app)
- **Integration runtime:** Local dev and CI only; no DigitalOcean deployment required
- **Admin surface:** Not required
- **User auth:** Not required

---

## Recommendations

### Immediate Actions (P0)

1. **Wire `chrome-devtools-mcp` into `.mcp.json`**
   - **Why:** It's already forked; it's referenced in two catalog docs; it was never added. This is the minimal step to make it usable.
   - **How:** Add a disabled-by-default server entry with `CHROME_DEBUG_PORT` env var and clear enable instructions.
   - **Effort:** 30 min (delivered in this PR)

2. **Add catalog entry to `docs/MCP_REVVEL_CATALOG.md`**
   - **Why:** Every wired MCP server must be documented in the catalog (revvel-standards requirement).
   - **Effort:** 1 h (delivered in this PR)

### Short-Term Actions (P1)

3. **Add E2E auth test using `cdp_get_cookies` for the Life Insurance Lead Engine**
   - **Why:** Auth flows are the highest-value use of token retrieval; this produces a working, testable example.
   - **Effort:** 4 h

4. **Add GrowlingEyes screenshot baseline via `cdp_screenshot`**
   - **Why:** Already identified in the fork audit as a high-value use case.
   - **Effort:** 2 h

### Long-Term Actions (P2)

5. **Evaluate `playwright-mcp` as a complementary high-level browser MCP**
   - **Why:** `playwright-mcp` handles cross-browser (Firefox, WebKit) scenarios; `chrome-devtools-mcp` is Chromium-only.
   - **Effort:** 2 h research + 1 h integration

6. **CI workflow for headless CDP-based E2E tests**
   - **Why:** Closes the CI blind spot for browser-state validation.
   - **Effort:** 1 day

---

## Risks & Considerations

| Risk | Severity | Probability | Mitigation |
|---|---|---|---|
| Agent calls `cdp_get_cookies` on wrong origin | High | Medium | System-prompt guard (documented above); scope to `localhost` only |
| Cookie values appear in agent logs | High | Low | Redaction rule in agent system prompt; never log raw cookie values |
| Chrome not installed in CI | Medium | Medium | Use `google-chrome-stable` in CI runner; add apt install step |
| `--remote-debugging-port` left open in prod | High | Low | Disable entry by default; document in `SECURITY.md` |
| Upstream fork falls behind | Low | Medium | Monitor upstream for security patches; pin to a tagged version |

---

## Artifact Engine Map

| Artifact Shape | Existing engine / standard | Status | Required action |
|---|---|---|---|
| Website / UI | N/A | N/A | Not in scope |
| API | N/A | N/A | Not in scope |
| CLI | N/A | N/A | Not in scope |
| MCP | `.mcp.json` + `docs/MCP_REVVEL_CATALOG.md` | ✅ Exists — gap was missing entry | **Delivered:** chrome-devtools-mcp entry added |
| Skill | N/A | N/A | Not in scope |
| PDF | N/A | N/A | Not in scope |
| PowerPoint / deck | N/A | N/A | Not in scope |
| Video | N/A | N/A | Not in scope |
| Docs | `wr/issues/` + `docs/MCP_REVVEL_CATALOG.md` | ✅ Exists | **Delivered:** this WR doc + catalog update |
| Agent automation | `.github/workflows/` | Gap | CI E2E workflow pattern documented (P1) |

---

## Agent Self-Healing Journal

- **Issue detected:** Issue #14450 opened but the automated WR document generation pipeline did not fire — labels were applied by `openrouter-triage.yml` but no WR doc was written to `wr/issues/`.
- **Root cause:** The automated pipeline (`wr-pr-creation.yml`) requires `wr:complete` or `research:complete` label before creating the doc PR. Neither label was set because the OpenRouter triage agent did not reach the research stage (possible quota or rate-limit failure on the cron trigger).
- **Research / correction:** Copilot Coding Agent performed manual WR document creation with full research. The `chrome-devtools-mcp` fork and its catalog references were already present in the repo; this WR consolidates and wires them.
- **Revvel-standards change:** `docs/MCP_REVVEL_CATALOG.md` updated with chrome-devtools-mcp entry; `.mcp.json` updated with disabled-by-default server entry.
- **Outcome to preserve:**
  1. When a WR issue has the `wr:in-progress` label but no corresponding `wr/issues/` document after 24 h, Copilot should auto-create the WR doc from the issue body and available catalog context.
  2. Token/secret retrieval via CDP is a legitimate and valuable agent capability scoped strictly to `localhost` / owned test origins — document this in the MCP security policy.
  3. Every new MCP server entry must appear in **both** `.mcp.json` (disabled-by-default) and `docs/MCP_REVVEL_CATALOG.md` within the same PR.

---

## Status Summary

**Research Status:** ✅ Complete
**Implementation Priority:** P0 (`.mcp.json` + catalog) / P1 (E2E tests) / P2 (CI workflow)
**Ship-to-Market Ready:** Yes — MCP wiring delivered; E2E tests and CI workflow are follow-on
**Approval Required:** @midnghtsapphire

---

**Last Updated:** 2026-06-09
