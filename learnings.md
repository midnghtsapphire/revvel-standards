# Learnings

> **Usage:** Writes must be append-only. Each entry follows the template below.
> Do not edit or delete prior entries; future agents rely on the historical record.

## Template

- **Date/Time:** ISO-8601 UTC
- **Task Attempted:** what was tried
- **Outcome:** success / partial / failure
- **Root Cause of Failure:** if applicable
- **Self-Healing Fix / Learned Lesson:** what tools/skills worked, what to reuse
- **Next Action:** concrete follow-up

---

- **Date/Time:** 2025-11-24T00:00:00Z
- **Task Attempted:** Fleet audit-and-fix session: bug sweep across the automation fleet, recon on orphaned follow-ups, ship a new checkbox-to-WR feature, four-fleet wiring audit (security / credential-autonomy / self-heal-pr / reset-self-heal-issue), and close out one orphaned WR that had already been superseded.
- **Outcome:** Partial. The checkbox-to-WR feature landed, the orphaned WR was closed, and the four-fleet audit produced concrete findings — but several of those findings (untriggered `scripts/security-fleet.js`, always-green `credential-autonomy-agent.yml`, manual-only `self-heal-pr.yml` / `reset-self-heal-issue.yml`) remain open and need follow-up WRs.
- **Root Cause of Failure:** N/A for the shipped work. For the still-open findings: workflows were merged in a documented-as-automatic state but their `on:` triggers, failure-propagation, and dispatch wiring were never verified end-to-end against the live tree — reading the YAML alone is not enough; the runtime path has to actually be exercised.
- **Self-Healing Fix / Learned Lesson:**
  - **Parallel subagents via `Agent` tool with `isolation: "worktree"`** were the right primitive for code-writing steps that touched disjoint files. Each subagent got a clean worktree, so their edits didn't collide and could be reviewed independently before merge. Reuse this pattern whenever ≥2 independent edits can be described up-front.
  - **`TaskCreate` / `TaskUpdate`** were used as the session's source of truth for progress. Every audit finding and every fix attempt got a task; "still open" vs "done" was never ambiguous. Reuse for any multi-step session — do not rely on chat scrollback.
  - **`mcp__github__*` MCP tools** were the only available GitHub interface this session — the `gh` CLI is **not** installed in this environment. Use `mcp__github__create_issue`, `mcp__github__update_issue`, `mcp__github__create_pull_request`, `mcp__github__get_pull_request`, `mcp__github__list_workflow_runs`, etc. Do not attempt `gh ...` in `Bash`; it will fail and waste a turn.
  - **Direct verification beats read-through review.** The credential-autonomy workflow *looked* fine on read; it only became obvious it could never report failure once its script body was extracted to a temp file and run through `python3 -m py_compile` / actually executed. When a workflow embeds a heredoc script, extract-and-exercise it — don't just eyeball it.
  - **`grep` / `Read` against the live tree** (not memory, not the diff) is required before claiming a finding. Every audit claim in this session was backed by a concrete path + line range from a fresh `Read`.
  - **Own-turn `Read` / `Edit` / `Bash`** (no subagent) were used directly for small, low-risk follow-ups — closing the superseded WR, appending this learnings entry, running `npx markdownlint-cli2`. Delegating those to a subagent would have cost more than it saved. Rule of thumb: if the change is <1 file and <20 lines and reversible, do it in-turn.
  - **No `Skill`-tool skills were invoked this session.** The audit loop (enumerate fleet → read triggers → exercise scripts → file findings → open WRs) is repetitive enough that packaging it as a Skill is worth considering if it recurs — right now it lives only as prose in `standards/AUDIT_AND_SELF_HEALING_PLAYBOOK.md`.
- **Next Action:** Follow `standards/AUDIT_AND_SELF_HEALING_PLAYBOOK.md` and open WRs for the highest-priority still-open findings from the four-fleet wiring audit:
  1. `scripts/security-fleet.js` has no workflow trigger — nothing invokes it. Either wire it into a scheduled workflow or delete it.
  2. `.github/workflows/credential-autonomy-agent.yml` swallows all errors and can never report failure — its embedded script needs `set -e` / explicit non-zero exits, and the job step needs to propagate that exit code.
  3. `.github/workflows/self-heal-pr.yml` and `.github/workflows/reset-self-heal-issue.yml` are documented as automatic but only have `workflow_dispatch` — add the appropriate `on:` triggers (issue/PR events, schedule) or update the docs to match reality.
