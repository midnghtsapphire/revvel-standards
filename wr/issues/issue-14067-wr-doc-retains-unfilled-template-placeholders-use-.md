# WR: [WR] WR doc retains unfilled template placeholders — use basic template or mark N/A

**Issue:** #14067  
**Repository:** [midnghtsapphire/revvel-standards](https://github.com/midnghtsapphire/revvel-standards)  
**Created:** 2026-06-02
**WR Status:** ✅ Complete

## Issue Context
N/A

## Summary
WR documents generated for issues were keeping unfilled template placeholders (such as STARS, OPEN_ISSUES, IS_PRIVATE, IS_ARCHIVED) from the WR_TEMPLATE_FULL.md if they were not populated with actual values. This was occurring because the bug-fix/chore issues were being mistakenly assigned the full product template instead of the basic template.

## Objective
The objective is to fix the WR document for issue #14067 to adhere to the basic template `wr/WR_TEMPLATE_BASIC.md`, and replace any empty template placeholders with `N/A`. The WR status is also updated to "✅ Complete".

## Required Bundle
N/A

## Definition of Done
- WR doc for issue #14067 uses `WR_TEMPLATE_BASIC.md` structure.
- All empty template variables (e.g. STARS, IS_PRIVATE) are removed or replaced with `N/A`.
- WR Status is "✅ Complete".
- Document passes `wr-lint.mjs`.

## Validation
Run `node wr/scripts/wr-lint.mjs wr/issues/issue-14067-wr-doc-retains-unfilled-template-placeholders-use-.md` to verify the rewritten document passes all linting rules.

## Blockers
N/A

<!-- Market research, BOM, SEO, monetization sections are intentionally absent: BASIC template is for bug/chore/docs/refactor WRs with no product/market surface. Use WR_TEMPLATE_FULL.md only for new products or sellable assets. -->
