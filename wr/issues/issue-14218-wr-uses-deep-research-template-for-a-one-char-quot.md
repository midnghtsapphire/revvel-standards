# WR: [WR] WR uses deep-research template for a one-char quoting chore

**Issue:** #14218  
**Repository:** [midnghtsapphire/revvel-standards](https://github.com/midnghtsapphire/revvel-standards)  
**Created:** 2026-06-02
**WR Status:** ✅ Complete

## Issue Context
The work request for a trivial single-character quoting fix in `jules-pr-comment.yml` was authored using the full deep-research WR template, leaving numerous placeholders unsubstituted and many sections irrelevant to the scope of the change. This violates the repository's own template guidance, which recommends `WR_TEMPLATE_BASIC.md` for chores of this size.

## Summary
The WR document for a simple quote normalization task was generated using the full deep-research template, leaving numerous unfilled placeholders and irrelevant sections. This violates repo guidelines.

## Objective
Regenerate the WR using `WR_TEMPLATE_BASIC.md` so the document structure matches the scope of a one-character quoting fix.

## Required Bundle
- Updated WR document: `wr/issues/issue-14218-wr-uses-deep-research-template-for-a-one-char-quot.md`

## Definition of Done
The WR document matches the BASIC template structure with no raw placeholders or irrelevant sections.

## Validation
Verify the document structure manually and run `node wr/scripts/wr-lint.mjs`.

## Blockers
None
