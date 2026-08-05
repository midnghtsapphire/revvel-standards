# [WR] P1 — Restore the June retirement pair: Cursor tier + llm-router (owner directive)

## Title
[WR] Cursor + llm-router restore, Roo liveness check, Devin confirmed healthy

## Description
**Owner directive on record: Cursor connections are in ACTIVE USE. Do not re-retire.**

**Background (archaeology, WR-A15).** Two removals in one 24-hour window caused the "orchestrator disappeared" experience: `514f92c8` (2026-06-14) retired the Cursor tier and DELETED scripts/call-cursor-api.sh — but agent-fallback.yml still wires the whole tier (health check, RECOMMENDED=cursor, prefer_agent==cursor, script call at ~line 284), so only the script was missing; `bd3c4687` (2026-06-15) deleted .github/workflows/llm-router.yml "temporarily" (141 lines: OpenRouter-first + free no-key Perplexity fallback, workflow_call reusable) and it was never restored. Both violated COMMENT-DONT-DELETE (enforcement: WR-A14).

**Done on this branch:**
- scripts/call-cursor-api.sh restored from 514f92c8^ with RESTORED header (commit 008e4282).
- templates/cicd/llm-router.yml — recovered byte-identical from bd3c4687^ with fleet-action header (push lane lacks workflow scope; see file header).

**Fleet actions:**
1. Set/verify `CURSOR_API_KEY` repo secret; verify endpoint <https://api.cursor.com/v1/agents> against the current Cursor API (retirement commit claimed the old endpoint was a placeholder — owner has real connections; wire them). Smoke-test the tier via workflow_dispatch on agent-fallback with prefer_agent=cursor.
2. Move templates/cicd/llm-router.yml → .github/workflows/llm-router.yml (agent with push access or owner via UI). Verify OPENROUTER_API_KEY + model policy vs SSOT, then re-enable callers that used the workflow_call interface.
3. **Roo liveness check:** the Cursor retirement justified itself with "already covered by free Roo + OpenRouter", but issue-13587 records Roo Code shutting down. Verify whether any Roo execution path is live (skills/roo-cline/SKILL.md exists; is anything calling it?). If Roo is dead upstream, record it in learnings.md and let the restored Cursor tier absorb its slot — with a REVVEL-DISABLED marker on Roo wiring, not deletion.
4. **Devin: no action** — confirmed healthy (devin-code-review.yml SHA-pinned, devinci-debug.yml, Reminders Action #15733). Do not touch.

**Acceptance.** Cursor tier passes a live smoke test; llm-router.yml active in .github/workflows/ with green run; Roo status recorded; zero deletions performed in the course of this WR (comment-out only).

## Agent learning note
A tier is wiring + script + credential — removing any ONE limb kills it while the corpse still looks wired. Retirements must remove or REVVEL-DISABLE the WHOLE tier atomically, or restore it atomically. And a justification like "covered by X" is a dependency claim: verify X is alive before deleting what it covers.

Assignee: Dragnet + Devin | Labels: P1, restore, fleet, cursor, owner-directive
