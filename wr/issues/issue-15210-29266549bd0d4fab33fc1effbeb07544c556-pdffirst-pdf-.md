# WR: photobiomodulation mobile app or tool (issue #15210)

**Issue:** #15210  
**Repository:** midnghtsapphire/revvel-standards  
**Created:** 2026-07-06  
**Researcher:** GitHub Copilot Coding Agent  
**Research Date:** 2026-07-06  
**WR Status:** 🟡 In Progress  

## Issue Context

https://pdfs.semanticscholar.org/0bb8/29266549bd0d4fab33fc1effbeb07544c556.pdf

## Repository Metadata

| Property | Value |
| --- | --- |
| Stars | N/A |
| Open Issues | N/A |
| Private | N/A |
| Archived | N/A |

## Research Checklist

<!-- Mark [ ] ONLY when the matching section elsewhere in this WR is actually filled (it may appear above or below this checklist). Otherwise [ ] or "N/A — reason". -->
<!-- Select-all / prefill rule: treat every item below as pre-selected work. If the requester leaves them blank, the agent should research and fill them all, then check [ ] only once the matching section is genuinely complete. -->
- [ ] Deep market research
- [ ] BOM
- [ ] Community chatter
- [ ] Competitor analysis (table MUST list actual prices or `Pricing data pending — competitive benchmark research required.`)
- [ ] Domain strategy
- [ ] Monetization
- [ ] Every statistic/percentage cited with a source link or labeled as an estimate

Status note: this document currently records initial scope framing only; all checklist items remain pending until full evidence-backed research is completed.

## Research Findings

<!-- revvel-research-findings -->
Pending detailed evidence extraction from the source PDF. Deep market and competitor research is deferred until treatment constraints and safety-relevant clinical claims are extracted and citation-mapped. **Owner:** orchestration lane delegates this extraction to a research specialist agent via OpenRouter routing. **Provenance to record:** delegated agent name + model route used for extraction run. **Target:** complete extraction before implementation PR kickoff.

## Executive Summary

Request captured for a mobile-first red-light therapy / photobiomodulation tool derived from the provided source paper. Scope is currently constrained to one PDF URL, so implementation should proceed only after extracting clinically safe treatment constraints, audience definition, and explicit acceptance gates.

## Step 1A — Product/Output Selections

- Output shape: production mobile app (iOS + Android or cross-platform).
- Core mode: guided treatment planner + session tracker.
- Research input currently provided: single source PDF (Semantic Scholar URL in Issue Context).

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

- Primary source provided by requester: Semantic Scholar-hosted paper (see Issue Context URL).
- Additional clinical, regulatory, and market validation research is still required before shipping therapeutic recommendations.

## Step 3 — Requirements

1. Parse and summarize key treatment parameters from the provided paper (wavelength ranges, exposure timing, contraindications).
2. Provide safe default session templates with user-adjustable settings and explicit safety notices.
3. Add treatment/session logging so users can track protocol adherence and subjective outcomes.
4. Include source-linked evidence cards inside the app for every treatment recommendation.
5. Define acceptance gates for medical-safety review before public release.

## Recommendations

- Run a focused evidence extraction pass on the provided PDF and attach citations to each protocol claim.
- Define a non-diagnostic positioning statement to avoid unsupported medical claims.
- Build MVP as a cross-platform app with protocol library + tracking before adding advanced automation.

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

## Risks

- Clinical-safety risk if recommendations are emitted without source-backed dosage/contraindication constraints.
- Regulatory/compliance risk for medical-claim language in app-store listings and in-app copy.
- Product risk from limited source breadth if only one paper is used for protocol design.
