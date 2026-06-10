# WR: Add section to revvel-standards that embodies METR stands out for it. Where I actually learn when I code review it

**Issue:** #14467  
**Repository:** midnghtsapphire/revvel-standards
**Created:** 2026-06-10
**WR Status:** ✅ Complete

## Issue Context
The user requests adding a section to `revvel-standards` that embodies findings from METR (Model Evaluation and Threat Research) regarding AI coding productivity. Specifically, the goal is to incorporate insights that improve code review learning and address the "perception gap" where developers feel faster but are actually slower due to reviewing and correcting AI output.

Original Issue Context from `#14467`:
```json
{
  "Output Type": "production-app",
  "PDF pipeline batch": "None",
  "Research Mode": "None",
  "Delivery Mode": "None",
  "Lifecycle Mode": "None",
  "Commercial Mode": "None"
}
```

## Summary
The `docs/neurooz/AGENT_SHIPPING_FAILURE_ANALYSIS.md` document currently references a 2025 METR study noting a 39-44% perception gap in AI coding productivity (developers felt 20% faster but measured 19% slower due to review overhead). The objective is to extract these insights into actionable standards within `revvel-standards` to enhance the code review process, ensuring that human reviewers actually learn and catch silent failures introduced by AI agents.

## Objective
To update `revvel-standards` with explicit METR-driven guidelines that mandate deep human comprehension during code reviews, combating "Comprehension Debt" and the 80% problem where AI speeds through the first 80% but creates significant cognitive load in reviewing the remaining 20%.

## Required Bundle
- Updates to documentation incorporating METR study findings on AI code review.
- Integration of these guidelines into the overarching `revvel-standards`.

## Recommendations & Implementation Steps
1. **Create or Update `CODE_REVIEW_STANDARD.md`:**
   - Add a new section called "Mitigating AI Comprehension Debt (The METR Rule)".
   - Mandate that reviewers must physically type out or narrate what complex AI-generated blocks do, to enforce active reading.
2. **Implement an "AI-Generated Code Review Checklist":**
   - **Check Error Handling:** Verify that error blocks actually log and recover correctly (silent failures are common in AI code).
   - **Check Business Logic:** Compare the code against the explicit bounds in the prompt/spec, not just for compilation success.
   - **Check Resource/Dependency Usage:** Ensure the AI hasn't hallucinated I/O operations or introduced unneeded concurrency.
3. **Update `AGENT_SHIPPING_FAILURE_ANALYSIS.md`:**
   - Link directly to the new `CODE_REVIEW_STANDARD.md` section to close the loop on the METR findings already documented.

## Definition of Done
- Documentation is updated with METR-based insights.
- A clear, actionable checklist for reviewing AI-generated code is provided.
- The WR document passes `wr-lint.mjs`.

## Validation
- Run `node wr/scripts/wr-lint.mjs` against this WR document.
- Verify that the proposed documentation updates align with the METR findings cited in `AGENT_SHIPPING_FAILURE_ANALYSIS.md`.

## Blockers
N/A
