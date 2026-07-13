# Learnings

> **Usage:** Writes must be append-only. Each entry follows the template below so future agents/humans can scan session history without reconstructing context.
>
> **Template:**
>
> - **Date/Time:** ISO timestamp
> - **Task Attempted:** what was tried
> - **Outcome:** success/failure summary
> - **Root Cause of Failure:** if applicable
> - **Self-Healing Fix / Learned Lesson:** tools, skills, patterns
> - **Next Action:** concrete follow-up

---

## Entry: Fleet audit-and-fix session

- **Date/Time:** 2025-01-27T00:00:00Z
- **Task Attempted:** Multi-part fleet session: (1) bug sweep across active workflows, (2) recon on orphaned follow-up issues/WRs, (3) implement new checkbox-to-WR feature, (4) four-fleet wiring audit (security, credential-autonomy, self-heal-pr, reset-self-heal-issue), (5) close out one orphaned WR that had already been delivered upstream.
- **Outcome:** Partial success. Bug sweep, recon, checkbox-to-WR feature, and orphaned-WR closeout landed cleanly. Four-fleet audit surfaced concrete wiring defects (documented below under Next Action) but the fixes themselves were deferred to a follow-up pass — the audit output is the deliverable for this session.
- **Root Cause of Failure:** N/A for the parts that landed. For the deferred fleet fixes: the four workflows were originally shipped as "automatic" per their own docs, but on inspection each had a distinct wiring gap (missing trigger, unreachable failure branch, manual-only dispatch) that requires per-workflow reasoning rather than a single sweep — too much scope for one session without risking a bad batch edit.
- **Self-Healing Fix / Learned Lesson:**
  - **`Agent` tool with `isolation: "worktree"`** — used to fan out parallel code-writing subagents for the independent parts of the session (bug sweep vs. checkbox feature vs. audit). Worktree isolation meant each subagent could edit without stepping on the others' working tree; results were merged on the orchestrator turn. This is the right default whenever ≥2 independent code changes are in flight.
  - **`TaskCreate` / `TaskUpdate`** — used as the single source of truth for session progress. Every fan-out got a task; every merge-back updated it. Made it trivial to see at a glance what was done vs. deferred without re-reading the whole transcript.
  - **`mcp__github__*` MCP family** — used for all GitHub interaction (issue read, PR create, comment, label). Note for future agents: **the `gh` CLI is not available in this environment**; do not attempt `Bash(gh ...)`, use the MCP tools directly.
  - **Direct verification over trust** — for any "is this code actually reachable / does it actually parse" question, verified directly against the live tree: `grep` for callers, `Read` the target file end-to-end, and where a heredoc or embedded script was in play, **extracted it and ran `python -m py_compile` (or equivalent) on the extracted body** rather than eyeballing it. Caught at least one "looks fine on read-through, actually broken on execute" case this session.
  - **Own-turn `Read`/`Edit`/`Bash`** — used directly (no `Agent` delegation) for small, low-risk follow-ups: single-line edits, closing an issue, appending to this file. Rule of thumb: if the change is <10 lines and touches one file with no cross-file reasoning, do it on the orchestrator turn; delegate only when parallelism or isolation actually buys something.
  - **No `Skill`-tool skills were invoked this session.** The audit loop (enumerate workflows → check trigger → check failure branch → check dispatch mode → report) is repetitive enough that if it comes up again it should be packaged as a `Skill` rather than re-improvised.
- **Next Action:** Work the deferred fleet fixes against `standards/AUDIT_AND_SELF_HEALING_PLAYBOOK.md`. Highest-priority still-open findings from the four-fleet wiring audit:
  1. **`scripts/security-fleet.js` has no trigger** — the script exists and is wired to do useful work, but nothing invokes it (no workflow `on:` entry, no schedule, no dispatch). Either add a `schedule:` trigger in a workflow that calls it, or delete it.
  2. **`credential-autonomy-agent.yml` can never report failure** — the failure branch is unreachable (guarded by a condition that is always false given the preceding steps). Rewrite the condition or restructure so real failures surface.
  3. **`self-heal-pr.yml` is 100% manual despite being documented as automatic** — only `workflow_dispatch` is wired; add the `pull_request` / `check_suite` trigger the docs promise, or update the docs to match reality.
  4. **`reset-self-heal-issue.yml` is 100% manual despite being documented as automatic** — same shape as #3; add the documented trigger or correct the docs.

  Recommend packaging the audit loop itself as a `Skill` before starting the fixes, so the verification pass after each fix is mechanical.
