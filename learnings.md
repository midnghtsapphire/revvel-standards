# Learnings

> Writes must be append-only. Add new entries at the bottom; never edit or remove prior entries.

## Entry Template

- **Date/Time:** ISO 8601 timestamp
- **Task Attempted:** What was being done
- **Outcome:** What happened
- **Root Cause of Failure:** Why (if failed)
- **Self-Healing Fix / Learned Lesson:** How to avoid/handle next time
- **Next Action:** Concrete follow-up

---

- **Date/Time:** 2025-01-27T00:00:00Z
- **Task Attempted:** Fleet-wide audit-and-fix session covering a bug sweep, orphaned-follow-up reconnaissance, a new checkbox-to-WR feature, a four-fleet workflow wiring audit, and closing out one orphaned WR.
- **Outcome:** Session completed successfully. Bug sweep closed, new checkbox-to-WR feature landed, four-fleet audit produced concrete findings, and one orphaned WR was closed. Several high-priority wiring defects remain open (see Next Action).
- **Root Cause of Failure:** N/A (session succeeded); however, several pre-existing workflow wiring defects were surfaced (workflows documented as automatic but wired as manual-only, a fleet script with no trigger, and an agent workflow that can never report failure).
- **Self-Healing Fix / Learned Lesson:**
  - Used the `Agent` tool with `isolation: "worktree"` to run parallel code-writing subagents against the same repo without stomping on each other's working trees — essential for fanning out independent edits across the fleet audit.
  - Tracked multi-step progress with `TaskCreate` / `TaskUpdate` so the plan stayed visible and each subtask had an explicit status; this prevented losing track of the five parallel workstreams.
  - GitHub interaction went exclusively through the `mcp__github__*` MCP tool family (issues, PRs, comments, workflow runs). The `gh` CLI is **not** available in this environment — do not attempt to shell out to it; reach for the MCP tools instead.
  - Direct verification beat trust-the-read-through: grepped and `Read` against the live tree, and for anything executable (e.g. a suspect heredoc-embedded Python block) actually extracted it and ran `python -m py_compile` on it rather than eyeballing the source. Reading is not verifying; executing is.
  - For small, low-risk follow-ups the main turn used `Read` / `Edit` / `Bash` directly instead of delegating to a subagent — delegation has overhead and is only worth it when the task is either large, parallelizable, or needs isolation.
  - No `Skill`-tool skills were invoked this session. If this audit-and-fix loop (bug sweep → orphan recon → wiring audit → close-out) becomes a recurring cadence, it is a strong candidate to be packaged as a reusable Skill so the orchestration pattern doesn't have to be reconstructed from `learnings.md` each time.
- **Next Action:** Consult `standards/AUDIT_AND_SELF_HEALING_PLAYBOOK.md` and address the still-open findings from the four-fleet wiring audit, in priority order:
  1. `scripts/security-fleet.js` has no workflow trigger — it never runs. Wire it into a scheduled or event-driven workflow.
  2. `credential-autonomy-agent.yml` cannot report failure (its failure path is unreachable / swallowed). Fix the failure surface so real failures actually fail the run.
  3. `self-heal-pr.yml` and `reset-self-heal-issue.yml` are 100% `workflow_dispatch`-only despite being documented as automatic. Add the documented automatic triggers (event/schedule) or update the docs to match reality — but the intent is automation, so fix the workflows.
