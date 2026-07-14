# Learnings

> **Usage note:** Writes must be append-only. Each entry follows the template
> below (Date/Time, Task Attempted, Outcome, Root Cause of Failure,
> Self-Healing Fix / Learned Lesson, Next Action). Do not rewrite prior
> entries; add new ones at the bottom.

---

## Entry Template

- **Date/Time:** YYYY-MM-DD HH:MM TZ
- **Task Attempted:** _What was being done._
- **Outcome:** _What actually happened._
- **Root Cause of Failure:** _If applicable._
- **Self-Healing Fix / Learned Lesson:** _What was changed / what to remember._
- **Next Action:** _Follow-up pointer._

---

## Session: Fleet Audit-and-Fix — Tools & Skills Used

- **Date/Time:** 2025-01-27 (session log)
- **Task Attempted:** Full-fleet audit-and-fix pass covering (1) a bug sweep
  across the workflow fleet, (2) reconnaissance for orphaned follow-up
  issues/WRs, (3) implementation of a new checkbox-to-WR feature, (4) a
  four-fleet wiring audit (security, credential-autonomy, self-heal-pr,
  reset-self-heal-issue), and (5) closing out one orphaned WR discovered
  during recon.
- **Outcome:** Bug sweep and recon completed; new checkbox-to-WR feature
  wired and merged; four-fleet wiring audit surfaced concrete
  still-open findings (documented below); one orphaned WR closed. Audit
  loop itself is reproducible but not yet packaged as a reusable Skill.
- **Root Cause of Failure:** N/A (session was net-positive; findings are
  pre-existing wiring gaps in the fleet, not regressions introduced
  here).
- **Self-Healing Fix / Learned Lesson:**
  - Used the `Agent` tool with `isolation: "worktree"` to fan out
    parallel code-writing subagents across independent fleet areas
    without cross-contaminating working trees. This is the right
    default whenever more than one file-touching task can run
    concurrently.
  - Used `TaskCreate` / `TaskUpdate` to track the multi-phase session
    (sweep → recon → feature → audit → cleanup) so no phase silently
    dropped. Keep tasks small enough that each maps to one
    verify-then-fix cycle.
  - GitHub interactions went through the `mcp__github__*` MCP family
    (issues, PRs, workflow runs, file contents). The `gh` CLI is **not**
    available in this environment — do not attempt `Bash(gh ...)`; go
    straight to MCP.
  - Direct-verification practices that paid off: `grep`/`Read` against
    the live tree instead of trusting summaries; and for suspected
    broken code paths, actually executing them (e.g. extracting an
    embedded heredoc and running `python -m py_compile` on it) rather
    than eyeballing the surrounding YAML.
  - Own-turn `Read` / `Edit` / `Bash` were used directly (not delegated
    to a subagent) for small, low-risk follow-ups — single-line edits,
    quick greps, single-file appends like this one. Delegate to `Agent`
    when the change is multi-file or needs isolation; keep it in-turn
    otherwise.
  - No `Skill`-tool skills were invoked this session. If the
    audit-and-fix loop (sweep → recon → wire → audit → cleanup) recurs,
    it should be packaged as a Skill so the orchestration overhead
    stops being re-derived each time.
- **Next Action:** See `standards/AUDIT_AND_SELF_HEALING_PLAYBOOK.md`, and
  address the highest-priority still-open findings from the four-fleet
  wiring audit:
  - `scripts/security-fleet.js` — has no trigger; nothing invokes it.
  - `.github/workflows/credential-autonomy-agent.yml` — control flow
    can never report failure (exit status is masked), so failing runs
    look green.
  - `.github/workflows/self-heal-pr.yml` — documented as automatic but
    is 100% manual (`workflow_dispatch`-only).
  - `.github/workflows/reset-self-heal-issue.yml` — same: documented as
    automatic, actually manual-only.

---
