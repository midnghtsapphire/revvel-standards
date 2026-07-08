# WR Lint Rule: No Pending-Refinement Placeholders

## Rule

A Work Request document must not contain any of the following deferral phrases:

- `N/A — pending Jules refinement`
- `N/A — pending human review`
- `pending refinement`
- `TBD`
- `TODO` (unless it is a tracked task with an owner and due date)
- `_No response_` in any issue-form-derived field

## Rationale

WRs are automation-facing contract documents, not drafts. Every section must either:

1. Contain researched, cited content, or
2. Be explicitly marked `N/A — <reason>` with a **concrete reason** (e.g., `N/A — no public pricing published`) and a **fallback action** (e.g., `blocked on vendor response, escalate if not resolved in 48h`).

"Pending Jules refinement" is not a reason — it is a handoff that may never complete.

## Enforcement

`wr/scripts/wr-lint.mjs` MUST treat any of the above phrases as a lint error.
The `wr-pr-creation.yml` workflow MUST NOT open a PR for a WR that fails this rule.

## Einstein Override

If an agent cannot fill a section after a reasonable research loop, it must:

1. Invoke the `einstein` skill/persona for a deeper search pass.
2. If still blocked, file a `[WR-BLOCKER]` issue with:
   - The exact section
   - What was searched
   - What source is missing
   - A request for human input with a 24-hour SLA
3. Only then may the WR remain open with the section marked `BLOCKED — see #<issue>`.
