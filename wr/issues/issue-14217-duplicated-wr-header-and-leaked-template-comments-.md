# WR: [WR] Duplicated WR header and leaked template comments in issue-14067 WR doc

**Issue:** #14217  
**Repository:** midnghtsapphire/revvel-standards
**Created:** 2026-06-02
**WR Status:** ✅ Complete

## Bug Report
The WR document for issue #14067 contains two stacked header blocks, including leaked template scaffolding comments and conflicting metadata. This is the same generator scaffolding-leak pattern previously observed in issue-13802 and issue-13894 WRs and must be cleaned up to leave a single canonical header.

Lines 1-9 already declare a valid WR header for Issue #14067 with Researcher 'Jules + OpenRouter' and Research Date 2026-05-30. Lines 13-30 then re-declare the WR header, including raw template comment lines such as '# Otherwise, use WR_TEMPLATE_BASIC.md instead (recommended)' and '# ─────────────────────────────────────────────────────────────────────────────', a duplicate '# WR: midnghtsapphire/revvel-standards' heading, and a second metadata block listing a different Researcher ('Copilot Coding Agent'). The duplication indicates the generator concatenated the template verbatim rather than substituting into it, producing inconsistent metadata and polluting the document with internal template guidance that should never appear in a finalized WR.

Location:
File: wr/issues/issue-14067-wr-doc-retains-unfilled-template-placeholders-use-.md, around line 13 (duplicated block spans roughly lines 11-21 / 13-30).
PR: #14184 — [WR] WR doc retains unfilled template placeholders — use basic template or mark N/A (https://github.com/midnghtsapphire/revvel-standards/pull/14184)

## Summary
The WR generator erroneously concatenated template scaffolding into the generated WR document for issue #14067 instead of properly substituting values, leading to duplicated metadata blocks, a duplicated header, and leaked scaffolding comments.

## Objective
Remove the duplicated header block and the leaked template comment lines from the `issue-14067` WR document. Ensure the document has exactly one valid `# WR: ...` header and no template scaffolding comments, retaining the correct researcher and date. Audit and apply generator fixes similar to those for issue-13802 to prevent further verbatim template concatenation.

## Required Bundle
N/A — docs-only/bug-fix change, no external bundles required.

## Definition of Done
- The duplicated header block and leaked template comment lines (lines 11-21/13-30) are removed from the `issue-14067` WR document.
- The `issue-14067` WR document contains exactly one `# WR:` header.
- The document has a single canonical metadata block with the correct Researcher (`Jules + OpenRouter`) and Research Date (`2026-05-30`).
- The `wr-lint.mjs` linter runs cleanly on the file without raising scaffolding or double-header violations.

## Validation
- Run `node wr/scripts/wr-lint.mjs wr/issues/issue-14067-wr-doc-retains-unfilled-template-placeholders-use-.md` and verify it passes.
- Inspect the file manually to ensure exactly one H1 header at line 1.

## Blockers
N/A — no known blockers.
