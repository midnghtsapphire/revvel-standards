# Analysis: `openrouter:triage-failed` Recovery Coverage

**Version:** 1.0.0
**Date:** June 18, 2026
**Author:** Devin Review (AI assistant)
**Status:** Analysis / reference — no code change required

---

## TL;DR

The `openrouter:triage-failed` label **is** recovered automatically — but only by
the triage workflow (`.github/workflows/openrouter-triage.yml`), **not** by the
assignee/routing workflow (`.github/workflows/openrouter-assignee.yml`). The
assignee workflow has no recovery path for previously-failed items. This was
analysed during PR #14677 and found to be **non-blocking**, because the assignee
workflow only applies labels/assignees and never runs the LLM triage that the
recovery actually depends on.

---

## Background

When triage fails (e.g. an OpenRouter `402` because the account is out of
credits), `scripts/openrouter-triage.js` labels the item
`openrouter:triage-failed` so it does not sit silently:

- Failure labelling: `scripts/openrouter-triage.js:24` (`TRIAGE_FAILED`) applied
  via `reportTriageFailure()` at `scripts/openrouter-triage.js:397-433`.
- Success self-clear: `scripts/openrouter-triage.js:512` removes the failure
  labels once a later run succeeds.

The risk is a **dead-end**: routing applies the `openrouter` label *before*
triage runs, and both sweep workflows use `openrouter` as their idempotency key.
A failed item therefore still carries `openrouter` and looks "already routed"
forever.

---

## Where recovery IS handled

`.github/workflows/openrouter-triage.yml` closes the dead-end explicitly:

- `sweep-discover` lists open items labelled `openrouter:triage-failed`
  (`.github/workflows/openrouter-triage.yml:124-126`) and `openrouter:needs-key`
  (`.github/workflows/openrouter-triage.yml:127-129`).
- It re-queues those items **regardless of the `openrouter` label** — which is
  the whole point — at `.github/workflows/openrouter-triage.yml:147-153`.
- `sweep-triage` re-runs `scripts/openrouter-triage.js` per item
  (`.github/workflows/openrouter-triage.yml:168-192`) on the hourly cron
  (`.github/workflows/openrouter-triage.yml:12-13`).

The in-code comment at `.github/workflows/openrouter-triage.yml:117-123`
documents this dead-end and states it is the reason the recovery branch exists.

## Where recovery was LEFT OUT

`.github/workflows/openrouter-assignee.yml` has no equivalent recovery branch:

- Its event-driven job skips anything already carrying the `openrouter` label
  (`.github/workflows/openrouter-assignee.yml:106-110`).
- Its hourly cron sweep treats the `openrouter` label as the **sole** idempotency
  key and pushes such items to `alreadyRouted`, skipping them
  (`.github/workflows/openrouter-assignee.yml:270-273`); the routing pass filters
  them out the same way (`.github/workflows/openrouter-assignee.yml:336-339`).
- It never queries for `openrouter:triage-failed` or `openrouter:needs-key`, so a
  failed item is invisible to this workflow forever.

---

## Why it does NOT matter (non-blocking)

The assignee workflow only **applies routing labels and assigns `@oaudrey`** — it
does not invoke `scripts/openrouter-triage.js`. The LLM work that a parked item
needs is performed exclusively by `.github/workflows/openrouter-triage.yml`,
which *does* recover failed items. So the missing recovery branch in the assignee
workflow has no functional impact on whether stuck Work Requests get
re-processed.

The genuine dependency is **funding**: per `AGENTS.md:166-172`, an unfunded
OpenRouter key returns `401/402/403/429` — a billing/ops issue, not a code bug.
Once credits are restored, the next hourly run of
`.github/workflows/openrouter-triage.yml` re-triages parked items and the
failure labels self-clear.

---

## Recommendation

1. **No code change required** to recover parked WRs — dispatch
   `.github/workflows/openrouter-triage.yml` (or wait for the hourly cron).
2. **Optional hardening:** if the assignee workflow should ever own recovery too,
   add a `openrouter:triage-failed` / `openrouter:needs-key` query to its sweep
   that bypasses the `openrouter` idempotency check — mirroring
   `.github/workflows/openrouter-triage.yml:147-153`. Documented here so the
   decision is auditable; not implemented because it is redundant today.
3. The recovery behaviour is owned by the `self-healer` skill
   (`skills/self-healer/SKILL.md`).
