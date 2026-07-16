# Markdown Linting — Known Issues (Technical Debt)

**Status:** 948 remaining linting errors across the repository (2026-07-16)

**Impact:** These errors do not block functionality or tests. All 634 tests pass. This represents acceptable technical debt pending refactoring.

**Achievement:** Reduced markdown linting errors from **37,586 → 948** (97.5% improvement) via automated `npm run lint:fix`.

## Error Breakdown

| Rule | Count | Category | Cause |
|------|-------|----------|-------|
| MD025 | 514 | Structural Headings | Multiple top-level `#` headings in single files; should use `##` for subsections |
| MD056 | 136 | Table Format | Table column count mismatches between header and body rows |
| MD001 | 94 | Heading Hierarchy | Heading levels do not increment by exactly one (`# → ## → ###`) |
| MD037 | 92 | Emphasis Spacing | Spaces inside emphasis markers (e.g., `* text *` should be `*text*`) |
| MD055 | 46 | Table Pipe Style | Inconsistent table pipe alignment or style |
| MD026 | 46 | Heading Punctuation | Trailing punctuation in headings (e.g., `## Title.` should be `## Title`) |
| MD051 | 5 | Link Fragments | Link fragments not in valid heading format |
| MD028 | 5 | Blockquote Blanks | Blank line inside blockquote (not critical) |
| MD045 | 4 | Image Alt Text | Missing alt text on images |
| MD042 | 3 | Empty Links | Links with no text content |
| MD003 | 3 | Heading Style | Inconsistent heading marker style (e.g., mixing `#` and underline) |

**Total:** 948 errors

## Areas Affected

### High-Impact Structural Issues (>50 errors each)
- **MD025 (514 errors):** Primarily in:
  - `templates/agent-factory/*.md` (PLUGIN_TEMPLATE, VAULT_AGENT_TEMPLATE, etc.)
  - `templates/agent-handoff/*.md`
  - `templates/issue-template-archive/*.md`
  - `templates/linkedin-avatar/*.md`
  - `templates/standards/*.md`
  - Various `.md` files treating every section as a top-level heading

- **MD056 (136 errors):** Primarily in:
  - Table-heavy documentation files with misaligned columns
  - Complex template and standards documentation

### Medium-Impact Issues (20–100 errors)
- **MD001 (94 errors):** Heading levels skipping levels in document hierarchy
- **MD037 (92 errors):** Emphasis spacing in code annotations and descriptions

### Low-Impact Issues (<20 errors)
- **MD055, MD026, MD051, MD028, MD045, MD042, MD003:** Misc. style and formatting issues

## Remediation Strategies

### Option 1: Automated Batch Fixes (Recommended for MD025, MD056)
Files with MD025 errors should have subsection headings converted from `#` to `##`:
```bash
find . -name "*.md" -exec sed -i 's/^# \(.\)$/## \1/' {} \;
# Then manually review heading hierarchy
```

### Option 2: Selective Manual Fixes
- Fix MD045 (image alt text) and MD042 (empty links) by hand — easy wins
- Fix MD026 (punctuation) in high-visibility files (main docs, standards) first
- Defer MD001, MD037 to later sprint

### Option 3: Accept as Architectural Debt
- These errors do not block CI, tests, or builds
- Markdown rendering still works correctly in GitHub
- Refactor on a per-file basis during next doc overhaul
- Monitor for regression (new errors should not exceed 50/month)

## Next Steps

1. **Decide remediation scope:** Will you address all 948, batch-fix structural issues, or accept as debt?
2. **Integrate markdown tooling:** Consider adopting `dprint` or `prettier-markdown` for automatic formatting
3. **Document standards:** Add to `standards/MARKDOWN_STYLE_GUIDE.md` to prevent future violations
4. **Regression tracking:** Add linting check to CI to prevent count growth beyond current baseline

## Historical Context

- **2026-06-15:** Initial audit discovered 37,586 markdown errors
- **2026-07-16:** Auto-fixed via `npm run lint:fix`, reduced to 948 (97.5% improvement)
- **Status:** Awaiting prioritization decision on remaining technical debt
