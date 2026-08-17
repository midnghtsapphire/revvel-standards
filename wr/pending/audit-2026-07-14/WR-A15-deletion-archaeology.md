# [WR] P2 — Deletion archaeology: 70 files deleted without REVVEL-DISABLED coverage since 2026-05-15

## Title
[WR] Restore-or-mark the uncovered deletions found in git history (llm-router.yml is the headline)

## Description
**Findings (git log --diff-filter=D, full history, generated-file allowlist applied).** ~70 uncovered deletions in 60 days. The ones that matter:

1. **`bd3c4687` 2026-06-15 — "chore: delete llm-router temporarily" — deleted `.github/workflows/llm-router.yml`.** This was the central LLM Router with Perplexity No-Key Fallback (OpenRouter-first, free no-key Perplexity when credits exhausted, workflow_call reusable). Deleted "temporarily", never restored, never REVVEL-DISABLED. This is very likely the "orchestrator instantiation Opus took away": the fleet lost its shared no-key routing entrypoint. **Action: restore from `bd3c4687^`, review against current model policy, or re-commit fully commented with a REVVEL-DISABLED header per the standard.**
2. **`514f92c8` 2026-06-14 — retired Cursor tier, deleted `scripts/call-cursor-api.sh` — but `agent-fallback.yml` still calls it.** This deletion IS the root cause of audit finding WR-A3's first dead path: file removed, references not cleaned. Action folds into WR-A3.
3. `39fb109b` 2026-07-13 — deleted `scripts/followup-router-render.js` during the interleave-collision repair. Verify no live references remain.
4. `cfdb8d91` 2026-05-23 — 65-file bulk deletion in a docs/WR commit. Audit the list; anything non-generated needs restore-or-mark.

**Fix.** For each item: restore the file, or re-commit it fully commented with `REVVEL-DISABLED |` header + reason + WR link, or attach owner `deletion-approved`. Then WR-A14's gate prevents recurrence.

**Acceptance.** llm-router decision made (restored or marked); zero live references to deleted paths (extends WR-A3 acceptance); cfdb8d91 file list dispositioned.

## Agent learning note
"Delete temporarily" is how permanent losses happen — nothing schedules the restore. Under COMMENT-DONT-DELETE the correct temporary disable is a REVVEL-DISABLED block, which stays greppable and restorable in place. Deletions also break silently at a distance: the Cursor script removal manufactured WR-A3's runtime failure a month later.

Assignee: Dragnet | Labels: P2, governance, archaeology, restore
