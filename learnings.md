# Learnings Log

> **Usage note:** Writes must be append-only. Never rewrite prior entries;
> future agents rely on the full history to avoid repeating mistakes.
>
> **Template per entry:**
>
> - **Date/Time:** ISO-8601 timestamp
> - **Task Attempted:** what was being tried
> - **Outcome:** success / partial / failure
> - **Root Cause of Failure:** if applicable
> - **Self-Healing Fix / Learned Lesson:** what changed, what to remember
> - **Next Action:** concrete follow-up pointer

---

## 2025-01-27T00:00:00Z — Fleet audit-and-fix session

- **Date/Time:** 2025-01-27T00:00:00Z
- **Task Attempted:** Multi-part fleet audit-and-fix session covering: bug
  sweep across the four automation fleets, recon on orphaned follow-up
  issues/WRs, a new checkbox-to-WR feature, a full four-fleet wiring audit,
  and closing out one orphaned work request.
- **Outcome:** Partial success. Bug sweep, recon, new feature, and audit
  landed. Audit surfaced four still-open wiring findings that were not
  fixed in-session and are queued as the next action.
- **Root Cause of Failure:** N/A for the completed work. The unfixed audit
  findings are pre-existing wiring bugs (missing triggers, swallowed
  failure signals, workflows documented as automatic but wired manual-only)
  that were out of scope for the audit pass itself.
- **Self-Healing Fix / Learned Lesson:**
  - Orchestration pattern that worked: spin up parallel code-writing
    subagents via the `Agent` tool with `isolation: "worktree"` so each
    branch of work edits a clean checkout and cannot stomp another
    subagent's tree. Reserve own-turn `Read`/`Edit`/`Bash` for small,
    low-risk follow-ups (single-file doc appends, quick greps, running a
    linter) rather than delegating those.
  - Progress tracking: use `TaskCreate` / `TaskUpdate` up front for every
    parallel branch of work; without them the session state is not
    recoverable if a subagent stalls.
  - GitHub interaction: this environment does **not** have the `gh` CLI
    available. All issue/PR/label/comment operations must go through the
    `mcp__github__*` MCP tool family. Do not draft `gh` invocations in
    plans — they will not run.
  - Direct verification beats read-through trust. Concrete examples that
    caught real bugs this session: grepping the live tree for a workflow
    name instead of trusting the doc that referenced it, and extracting
    an inline heredoc'd Python block from a workflow and running
    `python -m py_compile` on it to prove the indentation actually parses
    before claiming the workflow is healthy. "Looks right on read" is not
    a validation step.
  - No `Skill`-tool skills were invoked this session. If the
    audit-and-fix loop recurs (and the wiring findings below suggest it
    will), package it as a first-class skill so the orchestration steps
    above are not re-derived from scratch each time.
- **Next Action:** Work `standards/AUDIT_AND_SELF_HEALING_PLAYBOOK.md`
  against the highest-priority still-open findings from the four-fleet
  wiring audit:
  1. `scripts/security-fleet.js` has no trigger wired — nothing invokes
     it on a schedule or on-event, so the security fleet never actually
     runs.
  2. `credential-autonomy-agent.yml` can never report failure — its
     terminal step swallows non-zero exits, so a broken run is
     indistinguishable from a healthy run in the Actions UI.
  3. `self-heal-pr.yml` and `reset-self-heal-issue.yml` are 100% manual
     (`workflow_dispatch`-only) despite being documented as automatic
     self-healing entry points; either wire the documented triggers or
     correct the docs so operators stop assuming coverage that isn't
     there.

---
