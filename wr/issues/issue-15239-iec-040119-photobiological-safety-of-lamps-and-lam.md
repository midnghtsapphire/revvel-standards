# WR: IEC-040119 Photobiological Safety of Lamps and Lamp Systems — app or tool

**Issue:** #15239  
**Repository:** midnghtsapphire/revvel-standards  
**Created:** 2026-07-06  
**Researcher:** Copilot  
**Research Date:** 2026-07-06  
**WR Status:** 🟡 In Progress  

## Issue Context

https://www.advancedillumination.com/wp-content/uploads/2023/04/IEC-040119-Photobiological-Safety-of-Lamps-and-Lamp-Systems_042723.pdf

User requests an app or tool to work with the IEC Photobiological Safety of Lamps and Lamp Systems standard (IEC 62471 / IEC-040119).

## Repository Metadata

| Property | Value |
| --- | --- |
| Stars | N/A |
| Open Issues | N/A |
| Private | No |
| Archived | No |

## Research Checklist

<!-- Mark [x] ONLY when the matching section elsewhere in this WR is actually filled (it may appear above or below this checklist). Otherwise [ ] or "N/A — reason". -->
<!-- Mark [x] ONLY when the matching section below is actually filled. Otherwise [ ] or "N/A — reason". -->
<!-- Select-all / prefill rule: treat every item below as pre-selected work. If the requester leaves them blank, the agent should research and fill them all, then check [x] only once the matching section is genuinely complete. -->
- [ ] Deep market research
- [ ] BOM
- [ ] Community chatter
- [ ] Competitor analysis (table MUST list actual prices or `Pricing data pending — competitive benchmark research required.`)
- [ ] Domain strategy
- [ ] Monetization
- [ ] Every statistic/percentage cited with a source link or labeled as an estimate

## Research Findings

<!-- revvel-research-findings -->
N/A

## Executive Summary

Build a web-based compliance tool that parses IEC 62471 / IEC-040119 photobiological safety requirements and helps manufacturers of lamps and lamp systems verify regulatory compliance, calculate exposure limits, and generate audit-ready reports.

## Step 1A — Product/Output Selections

Web application (Next.js). Shippable as a SaaS product targeting medical device OEMs and lighting manufacturers.

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

### Target Market

Medical device manufacturers and commercial lighting companies required to demonstrate IEC 62471 / IEC 60601-1-9 compliance.

### Market Sizing

Compliance software is a large and growing segment — unverified estimate; no sourced figures available at time of writing.

### Competitor Analysis

| Competitor | Price |
| --- | --- |
| Pricing data pending — competitive benchmark research required. | — |

### PDF Parsing Libraries

| Library | GitHub |
| --- | --- |
| PyPDF2 | https://github.com/py-pdf/pypdf |
| pdf-lib | https://github.com/Hopding/pdf-lib |

### SEO Keywords

photobiological safety, IEC 62471, lamp testing, LED safety compliance, optical radiation safety, medical device standards, illumination safety assessment

## Step 3 — Requirements

1. PDF upload and text extraction from IEC standard documents. 2. Safety parameter calculator (exposure limits, emission limits per IEC 62471 risk groups 0–3). 3. Compliance checklist generator. 4. Audit-ready PDF report export. 5. Lamp/LED database with pre-loaded safety thresholds.

## Recommendations

Proceed with Phase 1 MVP: compliance calculator + PDF report export. Target B2B SaaS model at $99–499/month. Integrate with existing products/revvel pipeline. Research IEC 62471 edition 2 (2021) requirements before implementation.

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
| `depends_on` (prerequisite WRs) | N/A |
| Blocked by | N/A |
| Blocks (downstream WRs) | N/A |

N/A

## Risks

1. IEC standard access requires paid license — must obtain or work from public summaries. 2. Regulatory scope may expand (IEC 60601-1-9 for medical devices). 3. Accuracy liability for safety calculations — include disclaimer.
