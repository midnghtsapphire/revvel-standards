# Learnings

> Writes must be append-only. Do not edit or delete prior entries.
> Each entry follows the template: Date/Time, Task Attempted, Outcome,
> Root Cause of Failure, Self-Healing Fix / Learned Lesson, Next Action.

---

## Entry: Fleet Audit-and-Fix Session

**Date/Time:** 2025-11-19

**Task Attempted:**
Run a fleet-wide audit-and-fix session across the repo: bug sweep, orphaned
follow-up reconnaissance, new checkbox-to-WR feature wiring, four-fleet
workflow wiring audit, and closing out one orphaned WR.

**Outcome:**
Session completed. Bugs identified and patched via parallel subagents. Four
systemic wiring findings surfaced from the fleet audit (see Next Action).
One orphaned WR closed. No `Skill`-tool skills invoked this session — the
audit loop was driven by direct tool composition instead.

**Root Cause of Failure:**
N/A for the session itself (goal met). The underlying findings uncovered
during the audit have root causes documented per-finding in the tracking
issues; the recurring pattern is workflows that are *documented* as
automatic but have no `on:` trigger or no failure-reporting path, so they
silently never run or silently never fail.

**Self-Healing Fix / Learned Lesson:**
Concrete tools/skills used and how:

- `Agent` tool with `isolation: "worktree"` — spawned parallel code-writing
  subagents so independent fixes could land without stepping on each
  other's working tree. Preferred over serial `Edit` calls whenever two
  or more changes touched disjoint files.
- `TaskCreate` / `TaskUpdate` — used as the session's todo spine so
  progress across the five workstreams (bugs, orphans, checkbox feature,
  fleet audit, WR closeout) stayed legible and resumable.
- `mcp__github__*` MCP family — used for **all** GitHub interactions
  (issues, PRs, comments, workflow inspection). The `gh` CLI is not
  available in this environment; do not reach for it.
- Direct verification, not read-through trust — when a workflow or script
  was suspected of being broken, the fix path was: `Read` the file,
  `Grep` for the trigger/caller, then **actually execute** the broken
  path (e.g. extract an embedded Python heredoc into a temp file and run
  `python -m py_compile` on it) rather than eyeballing it. Reading alone
  missed at least one indentation bug in a prior session; executing
  catches it.
- Own-turn `Read` / `Edit` / `Bash` — used directly (no subagent) only
  for small, low-risk, single-file follow-ups where spawning an `Agent`
  would have cost more than the edit.
- `Skill` tool — **not invoked this session.** If this audit-and-fix
  loop recurs, it is a strong candidate to be packaged as a Skill so the
  orchestration overhead (todo spine + parallel worktree subagents +
  direct-execution verification + MCP-only GitHub I/O) is captured once
  instead of reconstructed each time.

**Next Action:**
Follow `standards/AUDIT_AND_SELF_HEALING_PLAYBOOK.md` for the next pass.
Highest-priority still-open findings from the four-fleet wiring audit:

1. `scripts/security-fleet.js` has no workflow trigger — it is never
   invoked on push, schedule, or dispatch. Wire it into a workflow or
   delete it.
2. `.github/workflows/credential-autonomy-agent.yml` can never report
   failure — every step swallows its exit code, so a real credential
   incident would look green. Add explicit failure paths.
3. `.github/workflows/self-heal-pr.yml` and
   `.github/workflows/reset-self-heal-issue.yml` are 100% manual
   (`workflow_dispatch` only) despite being documented as automatic
   self-healing. Either add the automatic trigger the docs promise, or
   update the docs to match reality.

---
