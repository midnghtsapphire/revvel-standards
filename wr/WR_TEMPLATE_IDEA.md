<!-- WR_TEMPLATE_IDEA.md — lightweight idea/spec suggestion capture.
     Use this when you want to park an idea for later without doing a full WR.
     Fill ONLY the fields you know right now; leave the rest as-is.
     When the idea gets prioritized, promote it to WR_TEMPLATE_FULL.md. -->
# IDEA: {TITLE}

**Status:** Queued
**Priority:** P2
**Source:** {SOURCE}
**Created:** {DATE}
**Linked Full WR:** <!-- fill once promoted, e.g. wr/issues/issue-NNNNN-....md -->

---

## Summary

<!-- 1-3 sentences. What is the idea? -->
{SUMMARY}

## Why This Matters

<!-- How does this align with the Prime Directive ($10k/month → $10M/year-3)?
     Revenue path, user pain point, or strategic advantage. -->
{PRIME_DIRECTIVE_ALIGNMENT}

## Known Context

<!-- Any screenshots, Reddit links, quotes, or data signals that prompted this.
     Paste links or attach files. Vague is fine — capture it now, refine later. -->
{CONTEXT}

## Open Questions

<!-- What needs to be answered before this can be fully scoped?
     Mark [x] as each question gets answered. -->
- [ ] {QUESTION_1}
- [ ] {QUESTION_2}

## Promote Path

<!-- Leave this section as-is; it is a workflow reminder, not a placeholder. -->
When this idea is ready to develop, run these steps:

1. **Create a full WR** — copy `wr/WR_TEMPLATE_FULL.md` to
   `wr/issues/issue-{ISSUE_NUMBER}-{slug}.md` and fill all sections.
2. **Update the queue** — change the row in `wr/WR_QUEUE.md` to status
   `Promoted` and add the link to the full WR.
3. **File a GitHub issue** — title `[WR] {TITLE}` so the WR pipeline picks it up.
4. **Apply label `wr:reset`** to trigger a fresh deep-research pass if needed.
