# Learnings Log

> **Usage note:** Writes must be append-only. Never rewrite or delete prior
> entries. Each new lesson goes at the bottom, using the template below.

## Template

- **Date/Time:**
- **Task Attempted:**
- **Outcome:**
- **Root Cause of Failure:**
- **Self-Healing Fix / Learned Lesson:**
- **Next Action:**

---

## Entries

- **Date/Time:** 2025-01-fleet-audit-session
- **Task Attempted:** Fleet-wide audit-and-fix session covering: general bug
  sweep, orphaned follow-up reconnaissance, a new checkbox-to-work-request
  feature, a four-fleet wiring audit (security, credential-autonomy,
  self-heal-pr, reset-self-heal-issue), and closing out one orphaned work
  request.
- **Outcome:** Session completed with concrete findings and fixes landed for
  the addressable items; four high-priority wiring defects surfaced by the
  audit remain open and are documented for the next agent.
- **Root Cause of Failure:** N/A for the session itself — the audit succeeded.
  For the still-open findings: (1) `scripts/security-fleet.js` has no workflow
  trigger wired to it, so it never runs; (2) `credential-autonomy-agent.yml`
  has no failure-reporting path, so it can never surface a failed run; (3)
  `self-heal-pr.yml` and `reset-self-heal-issue.yml` are documented as
  automatic but are configured 100% manual (`workflow_dispatch` only).
- **Self-Healing Fix / Learned Lesson:** Tools/skills actually used this
  session, and how:
  - `Agent` tool with `isolation: "worktree"` to fan out parallel
    code-writing subagents against independent parts of the tree without
    them stepping on each other's working copies. This was the single
    biggest force multiplier — the audit + fixes would not have fit in one
    session serially.
  - `TaskCreate` / `TaskUpdate` to track each audit target and each
    resulting fix as a first-class item, so nothing got dropped when
    context got long.
  - `mcp__github__*` MCP family for every GitHub interaction (issues, PRs,
    comments, file reads on remote refs). The `gh` CLI is **not** available
    in this environment; do not reach for it. If a step seems to require
    `gh`, translate it to the equivalent `mcp__github__*` call instead.
  - Direct verification over trusting a read-through: when a script or
    workflow looked correct on inspection but behavior was suspect, the
    fix loop was to actually execute the broken path — e.g. extracting
    an embedded heredoc and running `python -m py_compile` on it — rather
    than declaring it fine after reading. Several defects only showed up
    under real execution.
  - Own-turn `Read` / `Edit` / `Bash` were used directly (not delegated to
    a subagent) only for small, low-risk follow-ups where spinning up an
    `Agent` worktree would have cost more than the edit itself. Rule of
    thumb applied: if the change touches >1 file or needs its own
    verification loop, delegate; otherwise do it inline.
  - No `Skill`-tool skills were invoked this session. The audit loop
    itself (enumerate fleet → check trigger wiring → check
    failure-reporting wiring → check docs-vs-reality drift → file
    findings) is a strong candidate to be packaged as a reusable Skill if
    it comes up again, since it was executed the same way four times in
    a row.
- **Next Action:** Read `standards/AUDIT_AND_SELF_HEALING_PLAYBOOK.md`, then
  address the highest-priority still-open findings from the four-fleet
  wiring audit, in this order:
  1. Wire a trigger to `scripts/security-fleet.js` (currently unreachable).
  2. Add a failure-reporting path to `credential-autonomy-agent.yml` so
     failed runs actually surface as issues/alerts.
  3. Reconcile `self-heal-pr.yml` and `reset-self-heal-issue.yml` with
     their docs — either add the automatic triggers the docs promise, or
     update the docs to state that they are manual-only
     (`workflow_dispatch`).
