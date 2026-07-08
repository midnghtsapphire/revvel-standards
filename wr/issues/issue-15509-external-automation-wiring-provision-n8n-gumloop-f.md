# WR: [WR] External automation wiring — provision n8n / Gumloop flows from a WR

**Issue:** #15509  
**Repository:** [midnghtsapphire/revvel-standards](https://github.com/midnghtsapphire/revvel-standards)  
**Created:** 2026-07-08  
**Research Date:** 2026-07-08  
**Researcher:** Jules (Google) + OpenRouter  
**WR Status:** 🟡 In Progress

---

## Issue Context

## Output Type

internal-script-automation

## Objective

WRs whose delivery includes recurring automation should ship the automation itself: (1) the build lane emits a committed n8n flow export (`automations/<wr>/flow.json`) or Gumloop equivalent, gener[…]

## Definition of Done

- One reference WR ships a working n8n flow export that imports cleanly
- Deploy step is secret-gated and skips gracefully when unconfigured
- Charter rules (structured output, spend guards) visible in the flow

_Source: `wr/pending/05-external-automation-n8n-gumloop.md` (PR #15497)._

## Repository Metadata

| Property | Value |
| --- | --- |
| Stars | N/A |
| Open Issues | N/A |
| Private | No |
| Archived | No |

## Research Checklist

<!-- Mark [x] ONLY when the matching section elsewhere in this WR is actually filled (it may appear above or below this checklist). Otherwise [ ] or "N/A — reason". -->
- [ ] Deep market research
- [ ] BOM
- [ ] Community chatter
- [ ] Competitor analysis (table MUST list actual prices or `Pricing data pending — competitive benchmark research required.`)
- [ ] Domain strategy
- [ ] Monetization
- [ ] Every statistic/percentage cited with a source link or labeled as an estimate

## Research Findings

<!-- revvel-research-findings -->
Source packet: `docs/research-engine/run-28922440008.md`

# WR-Ready Research Packet: External Automation Wiring

## 1. Executive Decision

**Proceed with n8n-only implementation** for automated workflow provisioning from Work Requests. Defer Gumloop integration until API availability is confirmed. Build an abstraction layer to enable[…]

**Rationale**: n8n provides a mature, well-documented REST API for workflow management with 40k+ GitHub stars and active development. Gumloop lacks public API documentation, making integration unv[…]

## 12. Confidence Score Summary

**Overall Confidence: 72%**

### Lane Scores:
- Market Positioning (Echo): 75% - Strong problem validation, unclear market size
- SEO Demand (Noimos): 65% - Technical niche, needs volume data
- Competitor Intelligence (Iris): 80% - Clear landscape, Gumloop gap
- Audience Chatter (Scout): 70% - Community validation, limited direct evidence
- Factual Validation (Mirror): 60% - Core claims verified, charter gaps
- Technical Delivery (Forge): 75% - n8n viable, implementation details missing
- Revenue Mechanics (Ledger): 68% - Service model clear, pricing uncertain
- Repository Review (Scout-Web): 85% - n8n well-validated, alternatives identified

**Decision**: Proceed with n8n-only MVP. The community demand is verified, technical path is clear, but implementation requires fleet charter documentation and reference WR before full deployment[…]

## Executive Summary

N/A — pending Jules refinement

## Step 1A — Product/Output Selections

N/A — pending Jules refinement

## Step 2 — Deep Web Research

<!-- Competitor analysis MUST include actual prices (e.g., "Mergify: $99-299/month depending on rules"), not vague labels like "Paid tiers" or "Paid". If a competitor's price is unknown, write "P[…] -->
<!-- This pricing rule is mirrored in scripts/research-engine.js (buildSynthesisPrompt); parity is
     enforced by tests/research-engine.test.js. Update both files together if the wording changes. -->
<!-- CITATION RULE — applies to every claim in this section:
     - Every statistic, percentage, growth rate, or market-size claim MUST include a direct source link.
     - If a number is not sourced, omit it or label it an estimate (e.g., "internal estimate", "unverified").
     - Prefer a range over a precise figure when the number is an estimate.
     - Never present a bare percentage (e.g., "73% of teams", "40% YoY") without attribution;
       unattributed statistics are treated as placeholders and will be flagged in review. -->

N/A — pending Jules refinement

## Step 3 — Requirements

N/A — pending Jules refinement

## Recommendations

N/A — pending Jules refinement

## Dependencies

| Field | Value |
| --- | --- |
| `depends_on` (prerequisite WRs) | N/A — pending Jules refinement |
| Blocked by | N/A — pending Jules refinement |
| Blocks (downstream WRs) | N/A — pending Jules refinement |

N/A — pending Jules refinement

## Risks

N/A — pending Jules refinement

## Superseded Content

| Field | Value |
| --- | --- |
| Supersedes WR/issue | N/A — pending Jules refinement |
| Reason for replacement | N/A — pending Jules refinement |
| Archival status | N/A — pending Jules refinement |
