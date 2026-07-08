# Goap Agent Memory & Self-Healing Log

*This file tracks autonomous executions, failures, root causes, and locked-in solutions so mistakes are never repeated.*

Agents (and the Gatekeeper recovery agent) read and append to this file to get smarter over time. Every autonomous run that fails — and every recovered run — should leave an entry below using the template.

## How to use

1. Before starting an autonomous task, read the most recent entries to check for known failures and locked-in fixes for similar work.
2. After every run (success or failure), append a new entry under **Auto-Generated Entries** using the template below.
3. Never delete or rewrite past entries. Supersede them by adding a newer entry that references the older one in **Self-Healing Fix / Learned Lesson**.
4. If a fix has been validated, mark it "locked-in" so future agents trust and reuse it without re-deriving the solution.

## [Template Entry - Do not delete]
**Date/Time:**
**Task Attempted:** [e.g., n8n email parse for name@example.com]
**Outcome:** [Success / Failed]
**Root Cause of Failure (If any):** [e.g., IMAP connection timed out after 30s]
**Self-Healing Fix / Learned Lesson:** [e.g., Added an automatic 3-minute retry node in n8n; switched Apify actor to use residential proxies]
**Next Action:** [e.g., Proceed to Video Generation step]

---

## [Auto-Generated Entries Begin Below]

---

**Date/Time:** 2026-07-08 ~05:30 UTC

**Task Attempted:** Restore the `main` test gate: 6 test files red (390 pass / 6 fail) — generate-wr ×2, work-request-form-sync, wr-pr-creation, workflow-yaml-validation, openrouter-personas.

**Outcome:** Success — suite now 403 pass / 0 fail (branch `claude/agent-creation-dashboard-nu90lb`, PR #15497; WRs #15499–#15502).

**Root Cause of Failure (If any):** One disease behind all six: OVERLAPPING PARALLEL-AGENT MERGES on a red base. Multiple agents fixed the same bug simultaneously; each merge interleaved one variant into another mid-expression. Because the gates were already red, nothing blocked and nobody looked. Hidden damage found once repaired: `wr/scripts/generate-wr.sh` did not run at all (6 stacked awk variants, 5 unterminated `$(`); `wr-auto-classify.yml`'s `if:` carried 7 orphaned condition fragments (errored on every issue event); `wr-pr-creation.yml` had 2 github-script blocks that no longer compiled (9 interleaved route-tag variants; 6 Output-Type fallback variants); plus one stale hardcoded persona count (8 vs 9). A prior learnings entry had even flagged the generate-wr failures and deferred them — deferral is how red became ambient.

**Self-Healing Fix / Learned Lesson:** LOCKED-IN — see `standards/GREEN_MAIN_STANDARD.md`. (1) A red gate on main outranks all WR work; never build on red. (2) Before fixing anything, check whether a fix already landed — reconcile, don't append; one implementation per behavior, delete the losers. (3) Make assertions drift-proof: derive counts/lists from the source of truth (`Object.keys(REGISTRY).length`, never `8`). (4) Never weaken a gate to get green — reconstruct intent and verify against the current implementation. (5) The interleave signature to grep for in review: redeclared `const`, repeated `return`, stacked comment headers citing different issue numbers. Every repaired site carries an inline `RECONSTRUCTED 2026-07-08` comment so the lesson lives where it applies.

**Next Action:** Keep `main` at 0 fail. Reviewers treat "CI was already failing" as a blocker, not an excuse.
