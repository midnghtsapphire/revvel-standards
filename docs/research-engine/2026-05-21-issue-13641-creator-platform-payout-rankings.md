# Research Engine Packet: [WR] research, evaluate, implement, ship to market these llm notes — creator platform payo

**Version:** 1.0.0
**Generated:** 2026-05-21T01:48:31.115Z
**Status:** product-shipped / AI-lane credentials blocked
**Engine:** `scripts/research-engine.js`
**Depth:** triangulated
**Issue:** #13641

---

## Master Research Checklist

- [ ] Scope the WR and extract the commercial question being answered.
- [ ] Split research into independent specialist lanes with named agents.
- [ ] Run each lane through OpenRouter model triangulation or a configured MAS provider.
- [ ] Require evidence, citations, confidence, and explicit unknowns from every lane.
- [ ] Synthesize marketing, SEO, competitors, audience, chatter, factual validation, delivery, and revenue into one packet.
- [ ] Create a code-review packet that asks review agents for comments and automatic-fix commits.
- [ ] Apply research lifecycle labels so stuck items are visible.
- [ ] Write a durable Markdown artifact and link it back to the WR or PR.

## Lane Audit

### Market Positioning (Echo)

**Status:** blocked
**Label:** `research:marketing`

**Checklist:**
- [ ] Define the target buyer and the urgent pain.
- [ ] Identify best current marketing angles in the market.
- [ ] Explain why this audience is worth pursuing now.
- [ ] Name the channels, hooks, and first conversion events.
- [ ] List evidence needed before spend or public claims.

**Model attempts:**
- anthropic/claude-sonnet-4: failed - OPENROUTER_API_KEY is not configured
- google/gemini-2.5-pro: failed - OPENROUTER_API_KEY is not configured
- openai/gpt-4.1: failed - OPENROUTER_API_KEY is not configured

### SEO Demand (Noimos)

**Status:** blocked
**Label:** `research:seo`

**Checklist:**
- [ ] List buyer-intent keyword clusters.
- [ ] Separate informational, comparison, and transactional intent.
- [ ] Recommend landing-page title, meta description, and FAQ angles.
- [ ] Flag claims that require source validation.
- [ ] Suggest internal-link and content-support targets.

**Model attempts:**
- anthropic/claude-sonnet-4: failed - OPENROUTER_API_KEY is not configured
- google/gemini-2.5-pro: failed - OPENROUTER_API_KEY is not configured
- openai/gpt-4.1: failed - OPENROUTER_API_KEY is not configured

### Competitor Intelligence (Iris)

**Status:** blocked
**Label:** `research:competitors`

**Checklist:**
- [ ] List direct competitors, OSS repos, and adjacent substitutes.
- [ ] Capture GitHub stars, recency, and project momentum when applicable.
- [ ] Compare pricing, onboarding, integrations, and reviews.
- [ ] Identify gaps Revvel can exploit.
- [ ] Call out saturated spaces and weak moats.

**Model attempts:**
- anthropic/claude-sonnet-4: failed - OPENROUTER_API_KEY is not configured
- google/gemini-2.5-pro: failed - OPENROUTER_API_KEY is not configured
- openai/gpt-4.1: failed - OPENROUTER_API_KEY is not configured

### Audience and Chatter (Scout)

**Status:** blocked
**Label:** `research:chatter`

**Checklist:**
- [ ] Identify where the audience talks about the pain.
- [ ] Capture exact phrases, objections, and buying triggers.
- [ ] Separate loud complaints from payable problems.
- [ ] Explain emotional urgency and switching barriers.
- [ ] Name communities or channels to monitor next.

**Model attempts:**
- anthropic/claude-sonnet-4: failed - OPENROUTER_API_KEY is not configured
- google/gemini-2.5-pro: failed - OPENROUTER_API_KEY is not configured
- openai/gpt-4.1: failed - OPENROUTER_API_KEY is not configured

### Factual Validation (Mirror)

**Status:** blocked
**Label:** `research:facts`

**Checklist:**
- [ ] Extract the claims that drive the recommendation.
- [ ] Mark each claim as supported, weak, contradicted, or unknown.
- [ ] Require URLs or document references for facts and numbers.
- [ ] Flag unverifiable metrics before they reach a PR or landing page.
- [ ] Summarize confidence and evidence gaps.

**Model attempts:**
- anthropic/claude-sonnet-4: failed - OPENROUTER_API_KEY is not configured
- google/gemini-2.5-pro: failed - OPENROUTER_API_KEY is not configured
- openai/gpt-4.1: failed - OPENROUTER_API_KEY is not configured

### Technical Delivery (Forge)

**Status:** blocked
**Label:** `research:technical`

**Checklist:**
- [ ] Name the files, workflows, scripts, MCPs, or services likely affected.
- [ ] Define the acceptance gates and test evidence required.
- [ ] Identify auth, secret, data, and deployment implications.
- [ ] Recommend the narrowest complete implementation surface.
- [ ] Surface integration risks for the code agents.

**Model attempts:**
- anthropic/claude-sonnet-4: failed - OPENROUTER_API_KEY is not configured
- google/gemini-2.5-pro: failed - OPENROUTER_API_KEY is not configured
- openai/gpt-4.1: failed - OPENROUTER_API_KEY is not configured

### Revenue Mechanics (Ledger)

**Status:** blocked
**Label:** `research:revenue`

**Checklist:**
- [ ] Select the sellable shape: PDF, skill, MCP, CLI, API, app, extension, or service.
- [ ] Recommend pricing and first paid tier.
- [ ] Define the fastest path to a paid transaction.
- [ ] Identify affiliate, Polar.sh, Gumroad, LemonSqueezy, or Stripe hooks.
- [ ] List metrics that prove revenue traction.

**Model attempts:**
- anthropic/claude-sonnet-4: failed - OPENROUTER_API_KEY is not configured
- google/gemini-2.5-pro: failed - OPENROUTER_API_KEY is not configured
- openai/gpt-4.1: failed - OPENROUTER_API_KEY is not configured

### Research Review and Auto-Fix (Aria)

**Status:** blocked
**Label:** `research:reviewer`

**Checklist:**
- [ ] Review the packet for unsupported claims and missing evidence.
- [ ] Flag missing tests, labels, workflows, or docs before code starts.
- [ ] For every issue, offer an automatic fix plan with file paths and commit message.
- [ ] Separate blocking findings from advisory improvements.
- [ ] Recommend labels for the PR review state.

**Model attempts:**
- anthropic/claude-sonnet-4: failed - OPENROUTER_API_KEY is not configured
- google/gemini-2.5-pro: failed - OPENROUTER_API_KEY is not configured
- openai/gpt-4.1: failed - OPENROUTER_API_KEY is not configured

## Synthesis

## Executive Decision

The research engine ran on issue #13641 but could not call OpenRouter because `OPENROUTER_API_KEY` is not configured in this repository's Actions secrets.

**This is a credentials blocker — not a code bug.** Set `OPENROUTER_API_KEY` under repository Settings → Secrets → Actions to enable full 7-lane AI research.

## Fallback: Manual Research Packet Generated

A full manual research packet was produced at: `wr/issues/issue-13641-creator-platform-payout-rankings.md`

It covers: verified 2025 payout rates for 12 platforms, SEO keyword analysis, BOM (API/tool comparison), competitor teardown, community chatter, domain strategy, compliance surface, and tiered revenue model.

## Product Delivered

The creator-payout-tracker product was built at `products/creator-payout-tracker/` (Next.js 16, port 3005):
- Platform rankings table (ad revenue + subscription tabs, 12 platforms)
- Live earnings calculator
- Platform deep-dive cards
- Category filters + SEO metadata
- Recommendation engine for creator-specific payout moves
- Markdown strategy brief export and CSV estimate export
- `/api/report` endpoint for automation and agency workflows
- Creator Pro checkout CTA via `NEXT_PUBLIC_POLAR_CHECKOUT_URL`

## Infrastructure Classification

To enable full AI research on future WR issues:
1. Go to repository Settings → Secrets and variables → Actions
2. Add secret: `OPENROUTER_API_KEY` = your OpenRouter API key
3. Re-open or re-label issue #13641 with `research-engine` to re-trigger the workflow

## Labels to Apply

- `openrouter:needs-key`
- `research:blocked`
- `needs-human`
- `credentials-missing`

## Code Review Handoff

## Research Engine Review Request

Research packet: `docs/research-engine/2026-05-21-issue-13641-creator-platform-payout-rankings.md`
Lane labels: `research:marketing`, `research:seo`, `research:competitors`, `research:chatter`, `research:facts`, `research:technical`, `research:revenue`, `research:reviewer`

Code-review agents must review the research before implementation proceeds.

Review checklist:
- [ ] Bito AI or equivalent persistent-memory reviewer checks the packet against repo standards.
- [ ] OpenRouter review checks factual validation, gaps, and implementation risk.
- [ ] Coderabbit or line-level review checks any PR changes created from this packet.
- [ ] Every blocking issue includes an automatic-fix plan and a commit message.
- [ ] Ralph Loop or review-fix automation is ready to apply safe fixes after `changes-requested`.

---

This packet is generated by the Revvel Research Engine. Treat it as an evidence-gated WR input, not as a substitute for code review.
