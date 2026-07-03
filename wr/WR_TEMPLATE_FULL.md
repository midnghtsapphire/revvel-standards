<!-- WR_TEMPLATE_FULL.md — product/sellable WRs only. For bug/chore/docs use WR_TEMPLATE_BASIC.md. -->
<!-- Generator must substitute every {TOKEN} and fill or N/A every [placeholder] before commit. -->
<!-- Source-packet convention: when the research engine runs, it prepends a "## Research Findings"
     block containing a line like `Source packet: docs/research-engine/run-<run-id>.md`. That
     run-<run-id>.md path points to an external research-engine CI artifact (the run that produced
     the packet) and is intentionally NOT a committed file in this repo. Reviewers should not flag
     it as a missing/broken link — the reference is a pointer to the CI run, not a repo file.
     See scripts/research-engine.js (buildFindingsComment) for where the line is emitted. -->
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

## Risks

{RISKS}
