# WR: [WR] Dose_table_780-860nm_for_Low_Level_Laser_Therapy_WALT-2010.pdf tool or app for laser therapy

**Issue:** #15217  
**Repository:** midnghtsapphire/revvel-standards  
**Created:** 2026-07-06  
**Researcher:** Copilot (GitHub)  
**Research Date:** 2026-07-06  
**WR Status:** 🟡 In Progress  

## Issue Context

### Output Type (required)

production-app

### PDF pipeline batch

None

### Research Mode

standard

### Delivery Mode

build-direct

### Lifecycle Mode

new-build

### Commercial Mode

digital-product

### Assign To / Decision Team

OpenRouter orchestrator + Copilot implementation lane

### Summary

Build a tool/app for laser therapy practitioners using the WALT 2010 780-860nm dose table as the source reference.

### Objective

Create a practitioner-ready calculator that converts WALT guideline inputs into recommended treatment parameters for low-level laser therapy.

Source PDF: <https://waltpbm.org/wp-content/uploads/2021/08/Dose_table_780-860nm_for_Low_Level_Laser_Therapy_WALT-2010.pdf>

### Required Bundle

- Dose calculation engine for 780-860nm protocol inputs
- Clear output with units and treatment guidance notes
- Basic safety disclaimer (not a replacement for clinical judgment)

### Definition of Done

- The WR defines the calculator scope, constraints, and validation expectations
- The WALT PDF link is preserved as the primary source input
- Research checklist and downstream implementation sections are available for execution

### Do Not Under-Scope

Include both clinical-accuracy and commercialization considerations (distribution and monetization path).

### Explicit Exclusions

No medical diagnosis functionality.

### Delivery Shape

Web app with optional CLI companion.

### Sellable Artifact Bundle

Web calculator + documentation + launch copy.

### Purchase Validation (functions-as-purchased)

A practitioner can enter treatment parameters and receive a usable dosing output aligned to the cited WALT table.

### Expected Scope

Single-product implementation with strong citations and market validation.

### Validation Expectations

- Unit-level verification of dose calculations against sample values from the WALT table
- UX check for input/output clarity
- Basic disclaimer and safety language review

### Blocker Rule

Block implementation if required PDF values cannot be extracted and verified.

### Acknowledgements

- [ ] This WR defines a bundled outcome, not just a minimum acceptable patch.
- [ ] Explicitly requested secondary items should not be silently deferred.
- [ ] If the PR is partial, the blocker must be documented.
- [ ] The PR should reflect the WR's required bundle and definition of done.
- [ ] After implementation, open a PR and continue the loop (reset routing labels / trigger downstream workflows) instead of stopping at the issue.

## Repository Metadata

| Property | Value |
| --- | --- |
| Stars | N/A |
| Open Issues | N/A |
| Private | No |
| Archived | No |

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

## Research Findings

<!-- revvel-research-findings -->
N/A

## Executive Summary

N/A — initial WR created from issue intake.

## Step 1A — Product/Output Selections

N/A — to be filled during research execution.

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

N/A — pending dedicated research pass.

## Step 3 — Requirements

N/A — pending implementation planning.

## Recommendations

N/A — pending implementation planning.

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

N/A — pending implementation planning.
