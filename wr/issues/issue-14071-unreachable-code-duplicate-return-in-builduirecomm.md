# WR: [WR] Unreachable code: duplicate return in buildUIRecommendationsUserPrompt truncates prompt

**Issue:** #14071  
**Repository:** midnghtsapphire/revvel-standards
**Created:** 2026-06-02
**WR Status:** ✅ Complete

## Issue Context
The function `buildUIRecommendationsUserPrompt` contains two consecutive return statements. The first one exits the function early and returns an incomplete prompt string ending in a literal ellipsis (...), causing all downstream prompt content to be discarded at runtime.

Because the first return statement is reached unconditionally, the second (correct) return is dead code. As a result, the function always emits a truncated prompt that omits the 'Create detailed UI/UX recommendations including:' body along with the design system, component library, page layout, and differentiation sections. These sections are what make the generated UI recommendations meaningful, so their loss silently degrades the quality of every downstream UI recommendation produced by this engine. This is a critical correctness regression introduced by the MCP master prompt pack injection change.

**Location:** File: `scripts/ui-creation-engine.js`, line 504.

## Summary
A duplicate return statement in `buildUIRecommendationsUserPrompt` makes the complete prompt unreachable, causing it to return a truncated prompt instead, losing key UI recommendation sections. The fix is to delete the early truncated return and keep the complete one.

## Objective
Remove the unreachable code block to restore full prompt functionality in UI recommendations. Ensure complete UI design prompts including design system, component library, page layout, and differentiation are returned.

## Required Bundle
N/A — Fixes an existing script.

## Definition of Done
1. Delete the first return statement and its truncated template literal (the one ending in '...').
2. Keep only the complete return statement that includes the full prompt body with all required sections.
3. Verify the file parses without SyntaxError and that generated prompts match expectations end-to-end.
4. Add a unit or snapshot test that asserts the returned prompt contains the key section headers to prevent regressions.

## Validation
Ensure that `buildUIRecommendationsUserPrompt` now returns the full template string, and no trailing `...` or incomplete prompt is emitted. The tests in `tests/ui-creation-engine.test.js` should pass.

## Blockers
N/A — No blockers.
