# WR: Issue body nested in Repository Metadata table cell breaks Markdown rendering

**Issue:** #14216  
**Repository:** [midnghtsapphire/revvel-standards](https://github.com/midnghtsapphire/revvel-standards)  
**Research Date:** 2026-06-02  
**Researcher:** Jules (Google) + OpenRouter  
**WR Status:** ✅ Complete

## Issue Context
The full issue body (Summary, Details, Location, Suggested Action) is embedded inside the Description cell of the Repository Metadata table, causing the table to render incorrectly in most Markdown viewers.

Starting at line 94 of the issue file `issue-14067-wr-doc-retains-unfilled-template-placeholders-use-.md`, approximately 22 lines of content — including headings and pipe characters — are placed inside a single `| Description |` table cell. Because Markdown tables do not support multi-line content, headings, or unescaped pipe characters within a cell, renderers will either treat the embedded pipes as new column delimiters or terminate the table prematurely. The result is a broken metadata table and poorly formatted issue content, which undermines readability and the document's usefulness as a standards artifact.

## Repository Metadata
| Property | Value |
| --- | --- |
| Stars | N/A |
| Open Issues | N/A |
| Private | N/A |
| Archived | N/A |

## Research Checklist
<!-- Mark [x] ONLY when the matching section below is actually filled. Otherwise [ ] or "N/A — reason". -->
- [ ] Deep market research N/A — Formatting issue only.
- [ ] BOM N/A — Formatting issue only.
- [ ] Community chatter N/A — Formatting issue only.
- [ ] Competitor analysis N/A — Formatting issue only.
- [ ] Domain strategy N/A — Formatting issue only.
- [ ] Monetization N/A — Formatting issue only.

## Executive Summary
This Work Request defines the remediation for the table rendering bug in generated Work Request documents. The generator scripts and templates must be updated to move the full issue body out of table cells and into dedicated top-level sections (e.g., `## Issue Context`).

## Step 1A — Product/Output Selections
N/A

## Step 2 — Deep Web Research
N/A

## Step 3 — Requirements
- Document the root cause of the Markdown table rendering failures.
- Record the adopted standard: The full issue body must never be injected into a Markdown table cell.
- Ensure that the generated WR documents place the issue context into its own dedicated section to prevent syntax breakage.

## Recommendations
- Update `wr/WR_TEMPLATE_FULL.md` and `wr/WR_TEMPLATE_BASIC.md` templates to use dedicated `## Issue Context` sections.
- Update generator scripts (`wr/scripts/generate-wr.sh`) to map the issue body out of the table structure.
- Improve linter rules (`wr/scripts/wr-lint.mjs`) to catch and reject any future instances of headers inside table cells.

## Risks
N/A — Standard process improvement with minimal risk to existing workflows.
