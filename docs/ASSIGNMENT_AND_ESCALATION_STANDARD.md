# Assignment & Escalation Standard

**Version:** 1.0.0  
**Status:** Active  
**Owner:** @midnghtsapphire  
**Last Updated:** 2026-06-14

---

## Purpose

Assignments are easy to overuse and can create inbox debt, false escalation,
and stalled automation. This standard defines when assignment is allowed and
what must happen first.

---

## Default Rule

No workflow may auto-assign a human, `@Copilot`, `@oaudrey`, or any other user
by default for systemic failures, malformed artifacts, or recurring automation
issues.

Default behavior must be:

- label first,
- comment with actionable context,
- write audit records,
- trigger deterministic repair or autoheal where possible,
- create a fix-first PR when the problem is systemic.

---

## Assignment Is Not Routing

Use labels and routing metadata to express:

- who should work the lane,
- which automation should pick something up,
- whether review, repair, or quarantine is needed,
- whether the issue is blocked or unsafe.

Assignment should not be used as a substitute for proper automation routing.

---

## Human Escalation Rule

Human assignment is allowed only after all of the following are true:

1. automation or autoheal failed safely,
2. the item is explicitly marked as requiring a human decision,
3. an explanatory comment identifies the exact reason, artifact, and suggested
   next action.

Examples of explicit decision labels:

- `decision:unsafe-autofix`
- `decision:merge-strategy-needed`

---

## Required Escalation Context

When escalation is unavoidable, the comment should include:

- affected file or artifact,
- why automation could not continue safely,
- what checks already ran,
- what likely action is needed,
- whether a fix-first PR already exists or should be created.

---

## Preserve History Rule

When replacing older assignment logic in workflows, prefer to preserve the
historical behavior with short deprecation comments where practical rather than
silently erasing the prior intent.

Example pattern:

- deprecated assignment behavior,
- why it was harmful,
- what replaced it,
- date and incident reference.

---

## Cross-References

- `docs/AUTOMATION_AND_AUTOHEAL_STANDARD.md`
- `docs/AUTOMATION_EXECUTION_STANDARD.md`
- `docs/DOCS_FRESHNESS_STANDARD.md`
