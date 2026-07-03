<!-- WR_TEMPLATE_FULL.md — product/sellable WRs only. For bug/chore/docs use WR_TEMPLATE_BASIC.md. -->
<!-- Generator must substitute every {TOKEN} and fill or N/A every [placeholder] before commit. -->
# WR: {TITLE}

**Issue:** {ISSUE_REF}  
**Repository:** {REPO}  
**Created:** {DATE}  
**Researcher:** {RESEARCHER}  
**Research Date:** {RESEARCH_DATE}  
**WR Status:** {STATUS}  

## Issue Context

{ISSUE_BODY}

## Repository Metadata

| Property | Value |
| --- | --- |
| Stars | {STARS} |
| Open Issues | {OPEN_ISSUES} |
| Private | {IS_PRIVATE} |
| Archived | {IS_ARCHIVED} |

## Research Checklist

<!-- Mark [x] ONLY when the matching section below is actually filled. Otherwise [ ] or "N/A — reason". -->
- [ ] Deep market research
- [ ] BOM
- [ ] Community chatter
- [ ] Competitor analysis
- [ ] Domain strategy
- [ ] Monetization

## Executive Summary

{EXECUTIVE_SUMMARY}

## Step 1A — Product/Output Selections

{PRODUCT_SELECTIONS}

## Step 2 — Deep Web Research

{DEEP_WEB_RESEARCH}

## Step 3 — Requirements

{REQUIREMENTS}

## Recommendations

{RECOMMENDATIONS}

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
| `depends_on` (prerequisite WRs) | {DEPENDS_ON} |
| Blocked by | {BLOCKED_BY} |
| Blocks (downstream WRs) | {BLOCKS} |

{DEPENDENCIES}

## Risks

{RISKS}
