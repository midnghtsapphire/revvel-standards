# Lint Rule: No Pending Placeholders

**Rule number:** 12  
**Enforced by:** `wr/scripts/wr-lint.mjs`  
**Status:** Active — hard failure

---

## What This Rule Bans

The following phrases are **forbidden** in all WR documents:

| Phrase | Why it's banned |
| --- | --- |
| `N/A — pending Jules refinement` | Agent stopped instead of researching |
| `N/A — pending human review` | Agent deferred to a human instead of completing the work |
| `pending refinement` | Section was never filled |
| `TBD` | Placeholder left in the doc |
| `TODO` | Unfinished work item left exposed |
| `_No response_` | GitHub issue-form blank-field artifact (also caught by rule 7) |

---

## Why

Every WR gets a PR. No exceptions. The above phrases are signs that an agent
submitted a WR without completing the research loop. They are **not** acceptable
section content — they are deferrals that block downstream agents and waste
reviewer cycles.

---

## What Agents Must Do Instead

1. **Search until filled.** Use web search, OpenRouter, the research engine, or
   whatever tools are available to populate the section with real content.
2. **Scope explicitly.** If a section is genuinely out of scope, write
   `N/A — <specific reason>` (e.g., `N/A — no external dependencies`).
3. **Open a blocker issue.** If the section cannot be filled without external
   access or human knowledge, open a `[WR-BLOCKER]` issue that names exactly
   what's missing and why the agent cannot resolve it alone. Then reference it
   in the WR section.

---

## False-Completion Guard (Rule 7)

All deferral phrases are also added to the `FORBIDDEN_FOR_CHECKLIST` detector
in rule 7. A `[x]` acknowledgement item alongside any deferral phrase is treated
as a false-completion signal and fails lint, regardless of how many other items
are checked.

---

## Exceptions

- Phrases inside fenced code blocks (` ``` `) are **not** flagged. This allows
  WR docs to document the rule itself or include example snippets.
- The policy only applies to WR markdown files linted by `wr-lint.mjs`.

---

## References

- Issue context: #15538 (ban pending-refinement placeholders)
- Related rule: rule 7 — false-completion checklist
- Related rule: rule 6 — full-template bracket placeholders
