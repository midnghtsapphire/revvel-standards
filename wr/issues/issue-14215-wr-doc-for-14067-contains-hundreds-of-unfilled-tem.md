# WR: [WR] WR doc for #14067 contains hundreds of unfilled template placeholders

**Issue:** #14215  
**Repository:** midnghtsapphire/revvel-standards
**Created:** 2026-06-02
**WR Status:** ✅ Complete

## Issue Context

```
### Summary
The WR document created to track issue #14067 (WR docs retaining unfilled template placeholders) itself exhibits the exact anti-pattern it is meant to address. It was generated from WR_TEMPLATE_FULL.md and ships with hundreds of unresolved placeholder tokens, undermining the credibility and purpose of the tracking document.

### Details
The document retains numerous unfilled tokens such as {STARS}, {OPEN_ISSUES}, {IS_PRIVATE}, {IS_ARCHIVED}, [Yes/No], [engine], [notes], [$CPC], [$amount], [volume], and [Vercel URL or documented gap], among others. WR_TEMPLATE_FULL.md explicitly recommends (around line 6) switching to WR_TEMPLATE_BASIC.md for docs-only or trivial changes: 'Otherwise, use WR_TEMPLATE_BASIC.md instead (recommended)'. Because this WR is a docs-only artifact, the full template is inappropriate, and leaving placeholders unfilled directly contradicts the issue this WR is supposed to track.

### Location
File: wr/issues/issue-14067-wr-doc-retains-unfilled-template-placeholders-use-.md, line 87
Pull Request: #14184 — [WR] WR doc retains unfilled template placeholders — use basic template or mark N/A
URL: https://github.com/midnghtsapphire/revvel-standards/pull/14184

### Suggested Action
1. Regenerate the WR document using WR_TEMPLATE_BASIC.md, which is the recommended template for docs-only or trivial changes.
2. Alternatively, if WR_TEMPLATE_FULL.md must be retained, fill in every placeholder with a real value, or explicitly mark it N/A with a brief rationale.
3. Add a pre-commit or CI check that scans WR documents for unresolved placeholder patterns (e.g., {UPPER_CASE}, [bracketed], $TOKEN) and fails the build when any are detected, preventing recurrence of the issue tracked by #14067.
```

## Summary
The Work Request document created to address issue #14067 incorrectly utilized the WR_TEMPLATE_FULL.md template without properly populating or removing the template placeholders. This resulted in a polluted document filled with unresolved template tokens, directly contradicting the goal of #14067. This Work Request defines the remediation to convert the offending WR document to the appropriate basic template and ensure no placeholder artifacts remain.

## Objective
1. Refactor the WR document for issue #14067 to use the correct WR_TEMPLATE_BASIC.md format since it tracks a documentation/process change.
2. Ensure all placeholder tokens in the target file are fully resolved, either with factual data or explicit 'N/A' markings with clear rationales.
3. Confirm the fix complies with the automated `wr-lint.mjs` checks to prevent regression.

## Required Bundle
- Modified file: `wr/issues/issue-14067-wr-doc-retains-unfilled-template-placeholders-use-.md` (or equivalent file modified by #14184)
- Existing CI validation logic: `.github/workflows/wr-lint.yml` and `wr/scripts/wr-lint.mjs`

## Definition of Done
- The WR document for #14067 is completely rewritten using the basic template structure.
- Zero occurrences of unfilled template placeholders exist in the revised WR document.
- The `wr-lint.mjs` script runs successfully against the rewritten WR document.
- The WR Status of this Work Request is set to `✅ Complete`.

## Validation
1. Run `node wr/scripts/wr-lint.mjs wr/issues/issue-14067-wr-doc-retains-unfilled-template-placeholders-use-.md` to verify no lint errors.
2. Visually inspect the document to ensure the narrative is clear and follows the basic template.

## Blockers
N/A
