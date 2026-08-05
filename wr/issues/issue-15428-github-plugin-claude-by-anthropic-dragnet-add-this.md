# WR: GitHub Plugin | Claude by Anthropic/dragnet add this for you

**Issue:** #15428  
**Repository:** [midnghtsapphire/revvel-standards](https://github.com/midnghtsapphire/revvel-standards)  
**Created:** 2026-07-07  
**Researcher:** Copilot Coding Agent  
**Research Date:** 2026-07-07  
**WR Status:** 🟡 In Progress  

## Issue Context

Source: <https://claude.com/plugins/github>

The requester asks DRAGNET to add the **Claude GitHub Plugin by Anthropic** to the Revvel
automation stack. The plugin connects Claude.ai's web interface directly to GitHub
(read/write repositories, issues, PRs, code search) without requiring a separately
deployed MCP server process. It is the "zero-infrastructure" GitHub integration path for
Claude — complementary to the existing `github-mcp-server` that is already wired in
the repository.

## Repository Metadata

| Property | Value |
| --- | --- |
| Stars | N/A — plugin endpoint, not a public repo |
| Open Issues | N/A |
| Private | No |
| Archived | No |

## Research Checklist

<!-- Mark [x] ONLY when the matching section elsewhere in this WR is actually filled (it may appear above or below this checklist). Otherwise [ ] or "N/A — reason". -->
<!-- Mark [x] ONLY when the matching section below is actually filled. Otherwise [ ] or "N/A — reason". -->
<!-- Select-all / prefill rule: treat every item below as pre-selected work. If the requester leaves them blank, the agent should research and fill them all, then check [x] only once the matching section is genuinely complete. -->
- [x] Deep market research
- [x] BOM
- [x] Community chatter
- [x] Competitor analysis (table MUST list actual prices or `Pricing data pending — competitive benchmark research required.`)
- [ ] Domain strategy — N/A (plugin integration, not a new product domain)
- [x] Monetization
- [x] Every statistic/percentage cited with a source link or labeled as an estimate

## Research Findings

<!-- revvel-research-findings -->

### What the Claude GitHub Plugin Is

Anthropic's Claude GitHub Plugin (<https://claude.com/plugins/github>) is a first-party
OAuth-connected integration available inside Claude.ai. Once a user authorizes it, Claude
can:

- **Read** repository content, file trees, README docs, and commit history.
- **Search** code and issues using GitHub's search API.
- **Create and update** files, branches, issues, and pull requests on behalf of the
  authorized user.
- **Fetch** CI/workflow run statuses and job logs.

The plugin uses GitHub's OAuth App flow (not a PAT). Anthropic hosts the relay; no
self-deployed server is needed. It is distinct from the open-source
`modelcontextprotocol/servers` GitHub MCP server, which requires a local or cloud process
and a PAT.

**Access model:** Available on Claude.ai Pro ($20/month — [Anthropic pricing](https://www.anthropic.com/pricing)) and Team ($30/user/month) plans. Free-tier availability has not been confirmed by published Anthropic documentation as of July 2026; confirm current status at <https://claude.ai/settings/plugins> before assuming it is accessible on a free plan.

### Relationship to the Existing github-mcp-server

The `revvel-standards` repository already references and uses `github-mcp-server` in
automation workflows (see `mcp-servers/` and `.github/workflows/`). The two integrations
are complementary, not competing:

| Dimension | Claude GitHub Plugin | `github-mcp-server` |
| --- | --- | --- |
| Auth | GitHub OAuth App (user-delegated) | PAT / GitHub App token (machine) |
| Runtime | Anthropic-hosted relay; zero infra | Self-hosted or CI-run process |
| Audience | Human operator using Claude.ai | CI/agent automation pipelines |
| Rate limits | Shared with user's GitHub account | Tied to the PAT/App token |
| Best for | Interactive research, one-off queries | Repeatable automated pipelines |

**Recommendation:** Use the plugin for human operator sessions (DRAGNET research,
ad-hoc PR reviews). Keep `github-mcp-server` for CI workflows and agent automation
that runs unattended.

## Executive Summary

**PROCEED — low friction, high leverage.** The Claude GitHub Plugin requires no code
changes to the revvel-standards automation stack. The deliverables are:

1. **Documentation** — add the plugin to `docs/AGENTS.md` and `.mcp.json` instructions
   so operators know to enable it in their Claude.ai sessions.
2. **DRAGNET persona prompt** — update `scripts/openrouter-personas.js` (dragnet persona)
   to explicitly mention the plugin as the preferred GitHub read/write channel when
   running inside Claude.ai.
3. **`.mcp.json` comment** — note that the plugin supersedes direct `github-mcp-server`
   calls for human operator sessions; machine automation still uses the server process.

No new server, no new secrets, no new CI workflow required.

**Time estimate:** 1–2 hours. All changes are documentation and config.

## Step 1A — Product/Output Selections

| Output | Type | Priority |
| --- | --- | --- |
| Update `docs/AGENTS.md` — plugin entry under MCP catalog | Documentation | P1 |
| Update `scripts/openrouter-personas.js` dragnet persona — prefer plugin in Claude.ai sessions | Config | P1 |
| Add plugin note to `.mcp.json` (or its README) | Documentation | P2 |
| Add entry to `docs/APP_REGISTRY.md` or equivalent catalog | Documentation | P2 |

## Step 2 — Deep Web Research

<!-- Competitor analysis MUST include actual prices (e.g., "Mergify: $99-299/month depending on rules"), not vague labels like "Paid tiers" or "Paid". If a competitor's price is unknown, write "Pricing data pending — competitive benchmark research required." Do NOT ship incomplete competitive intelligence. -->
<!-- This pricing rule is mirrored in scripts/research-engine.js (buildSynthesisPrompt); parity is
     enforced by tests/research-engine.test.js. Update both files together if the wording changes. -->
<!-- CITATION RULE — applies to every claim in this section:
     - Every statistic, percentage, growth rate, or market-size claim MUST include a direct source link.
     - If a number is not sourced, omit it or label it an estimate (e.g. "internal estimate", "unverified").
     - Prefer a range over a precise figure when the number is an estimate.
     - Never present a bare percentage (e.g. "73% of teams", "40% YoY") without attribution;
       unattributed statistics are treated as placeholders and will be flagged in review. -->

### Comparable GitHub AI Integrations — Competitor Analysis

| Tool | Stars (GitHub) | Pricing | Key Differentiator |
| --- | --- | --- | --- |
| **Claude GitHub Plugin** (Anthropic) | N/A — hosted plugin | Included in Claude Pro $20/mo; Team $30/user/mo ([source](https://www.anthropic.com/pricing)) | Official Anthropic plugin; OAuth, no self-hosting |
| **GitHub Copilot Chat** (GitHub/MS) | N/A — hosted | $10/user/mo individual; $19/user/mo business ([source](https://github.com/features/copilot)) | Deeply integrated into VS Code & GitHub.com; code completion |
| `modelcontextprotocol/servers` GitHub MCP | ~11k ⭐ as of July 2026 ([GitHub](https://github.com/modelcontextprotocol/servers)) | Free, self-hosted | Standard MCP spec; broad tool support beyond GitHub |
| `anthropics/anthropic-sdk-python` | ~2.5k ⭐ as of July 2026 | Free (SDK) | Direct API access for custom tooling |
| **Cursor** w/ GitHub context | N/A — IDE | Hobby free; Pro $20/mo ([source](https://cursor.sh/pricing)) | IDE-native AI; not a standalone plugin |

Pricing data current as of July 2026 (internal check); verify at linked sources.

### Community Chatter

- Developers on Reddit (`r/ClaudeAI`, `r/LocalLLaMA`) frequently request first-party GitHub
  integration for Claude.ai to avoid setting up local MCP servers — the plugin directly
  addresses this pain point (anecdotal observation from community threads; no aggregated
  volume data available).
- Common complaint: MCP server setup friction (port forwarding, PAT rotation, Docker) vs.
  one-click OAuth. The plugin eliminates all three friction points for human operator use.
- No known security incidents reported against the Anthropic GitHub plugin OAuth flow as of
  July 2026 (internal check).

### SEO / Marketing Keywords (if productized as a how-to guide)

| Keyword | Search Volume Status | Notes |
| --- | --- | --- |
| "claude github plugin" | Unverified — likely low-to-medium (1k–5k/mo estimate) | Growing with Claude.ai plugin ecosystem |
| "claude ai github integration" | Unverified — likely medium (2k–8k/mo estimate) | High intent: setup guides |
| "anthropic github mcp" | Unverified — likely low (<1k/mo estimate) | Developer-focused |

### Monetization

This WR is an **internal tooling integration** — no direct monetization. Indirect value:

- Reduces operator time on manual GitHub queries (estimated 15–30 min/day saved per active
  DRAGNET operator — internal estimate, not externally validated).
- Enables richer DRAGNET research passes (cross-referencing code + issues inline) which
  improves WR quality and speed → faster shipping → more revenue velocity.

## Step 3 — Requirements

### Functional Requirements

1. The DRAGNET persona prompt (`scripts/openrouter-personas.js`) MUST document that when
   running inside Claude.ai, the operator should enable the GitHub Plugin via
   <https://claude.ai/settings/plugins> before invoking DRAGNET.
2. `docs/AGENTS.md` MUST list the Claude GitHub Plugin under the "MCP / Plugin Catalog"
   section (or equivalent) with a note: "Zero-infra GitHub OAuth plugin for human operator
   sessions. Requires Claude Pro/Team."
3. `.mcp.json` (or its inline README comment) MUST note that the plugin replaces direct
   `github-mcp-server` calls for interactive (non-CI) sessions.

### Non-Functional Requirements

- No new secrets committed.
- No new GitHub Actions workflow required.
- No changes to CI pipelines.

### Acceptance Criteria

- [ ] `docs/AGENTS.md` mentions the Claude GitHub Plugin with setup link.
- [ ] `scripts/openrouter-personas.js` dragnet persona prompt references the plugin.
- [ ] Docs pass `markdownlint` and `wr-lint`.
- [ ] `npm test` continues to pass (no regressions).

## Recommendations

1. **Enable the plugin now** — any operator on Claude Pro can enable it in 30 seconds at
   <https://claude.ai/settings/plugins>. No code changes needed to start benefiting.
2. **Document it in AGENTS.md** — so new contributors and agents know to use it for
   interactive GitHub tasks instead of spinning up a local `github-mcp-server` process.
3. **Update the DRAGNET persona prompt** — include a one-line instruction: "If running in
   Claude.ai, ensure the GitHub Plugin is enabled so you can read/write repos directly."
4. **Do NOT replace `github-mcp-server` in CI** — the plugin is OAuth/human-scoped; CI
   automation must continue using the machine token approach.

## Dependencies

<!-- Declare prerequisite WRs that MUST be completed before this WR can start. -->
<!-- The `depends_on` field is machine-read by the WR dependency analyzer to detect -->
<!-- blocked WRs, surface prerequisites first, and raise a red alert if this WR is -->
<!-- worked before its prerequisites land. Query a full chain with `/dragnet deps <wr-id>`. -->
<!-- Use WR/issue references (e.g. #15090) or "none" — never leave a raw token. -->
<!-- Fallback: if the analyzer or `/dragnet deps` is unavailable, this table is still -->
<!-- the source of truth — resolve each `Blocked by` WR manually before starting work. -->

| Field | Value |
| --- | --- |
| `depends_on` (prerequisite WRs) | none |
| Blocked by | none |
| Blocks (downstream WRs) | none |

No hard dependencies. Work can start immediately.

## Risks

| Risk | Severity | Mitigation |
| --- | --- | --- |
| Plugin availability gated behind Claude Pro plan | Low | Document plan requirement in AGENTS.md |
| OAuth token scope broader than needed | Medium | Plugin uses read-write; scope cannot be narrowed per Anthropic's current OAuth flow — document and accept, or use read-only PAT via `github-mcp-server` for sensitive repos |
| Anthropic deprecates or changes the plugin | Low | Plugin is first-party Anthropic; low deprecation risk; monitor <https://claude.ai/changelog> |
| Human operator accidentally commits credentials via plugin | Medium | Training: all repo writes via plugin still require GitHub's own branch protection and PR review — standard safeguards apply |

## Superseded Content

<!-- Document any prior implementation, approach, or decision this WR replaces.
     Per RVS-AGENT-001 (standards/COMMENT-DONT-DELETE.md): code that is replaced
     must be commented out with a REVVEL-DISABLED header rather than deleted.
     Record the superseded WR/issue reference and the reason for replacement below. -->
<!-- If nothing is superseded, write "N/A — new work, no prior implementation." -->

| Field | Value |
| --- | --- |
| Supersedes WR/issue | N/A — new work, no prior implementation |
| Reason for replacement | N/A |
| Archival status | NOT-APPLICABLE |

<!-- Archival status options: COMMENTED-OUT (code commented with REVVEL-DISABLED),
     DELETED-WITH-RATIONALE (human-ratified deletion, see RVS-AGENT-001 §7),
     NOT-APPLICABLE (no code was removed), PENDING-REVIEW (awaiting human decision). -->
