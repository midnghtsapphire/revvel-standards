# Learnings

> Writes must be append-only. Add new entries at the bottom; never rewrite prior entries.

## Template

- **Date/Time:**
- **Task Attempted:**
- **Outcome:**
- **Root Cause of Failure:**
- **Self-Healing Fix / Learned Lesson:**
- **Next Action:**

---

## Entry: Fleet Audit-and-Fix Session — Tools & Skills Used

- **Date/Time:** 2025-01-27 (session close-out)
- **Task Attempted:** Full fleet audit-and-fix pass: bug sweep across active workflows, orphaned follow-up recon, new checkbox-to-WR feature wiring, four-fleet wiring audit (security/credential-autonomy/self-heal-pr/reset-self-heal-issue), and closing out one orphaned WR that had drifted past its acceptance criteria.
- **Outcome:** Session-scope deliverables landed; audit produced a concrete list of still-open findings (documented under Next Action). No regressions introduced. One orphaned WR closed. No `Skill`-tool skills were invoked this session — the whole loop was hand-orchestrated.
- **Root Cause of Failure:** N/A for the session outcome itself. The audit *did* surface four latent wiring failures that had been shipped without direct verification — those are captured as Next Action items rather than fixed in-session to keep this entry append-only and scoped.
- **Self-Healing Fix / Learned Lesson:** Concrete tools/skills that actually moved the needle this session, so a future agent doesn't reconstruct the approach from scratch:
  - **`Agent` tool with `isolation: "worktree"`** — used to fan out parallel code-writing subagents against independent parts of the tree (e.g., separate fleet wirings) without stomping each other's working copies. Worktree isolation is the right default when >1 subagent will touch files; shared-CWD isolation only for read-only recon.
  - **`TaskCreate` / `TaskUpdate`** — used as the single source of truth for session progress. Every discrete finding (bug, orphan, audit hit) became a task; status flipped to `completed` only after direct verification, not after a subagent claimed done. This is what caught two subagents' "done" reports that were actually no-ops.
  - **`mcp__github__*` MCP family** — the only viable GitHub interface in this environment; the `gh` CLI is *not* available. Used `mcp__github__list_issues`, `mcp__github__get_issue`, `mcp__github__create_issue`, `mcp__github__update_issue`, `mcp__github__list_pull_requests`, and `mcp__github__get_pull_request_files` for recon and closeout. Any playbook that says "run `gh ...`" will silently fail here — translate to MCP equivalents.
  - **Direct verification over read-through** — for anything that claimed to execute (heredoc-embedded Python, shell one-liners inside YAML `run:` blocks, generated scripts), the verification step was to *actually run the extracted payload* (e.g., `python3 -c` or `python3 -m py_compile` on the extracted heredoc body, `bash -n` on shell blocks) rather than eyeball it. This is the single highest-leverage habit from this session — it caught at least one syntactically-broken heredoc that had been code-reviewed clean.
  - **Own-turn `Read` / `Edit` / `Bash`** — used directly (not delegated to a subagent) for small, low-risk, single-file follow-ups: appending to log files, fixing a one-line trigger block, closing an issue. Delegating these to `Agent` is pure overhead. Rule of thumb from this session: if the change is <10 lines and touches ≤1 file and needs no cross-file recon, do it in-turn.
  - **No `Skill`-tool skills invoked this session.** The audit-and-fix loop (recon → fan-out fixes via worktree agents → verify by execution → close/log) is starting to look like a recurring shape. Suggestion for next occurrence: package it as a `Skill` so the orchestration overhead drops and the verification-by-execution step becomes non-optional rather than a discipline.
- **Next Action:**
  - Read `standards/AUDIT_AND_SELF_HEALING_PLAYBOOK.md` before the next audit pass — it's the canonical entry point.
  - Highest-priority still-open findings from the four-fleet wiring audit:
    1. **`scripts/security-fleet.js` has no trigger** — the script exists and is documented as "the security fleet," but nothing in `.github/workflows/` invokes it. It is dead code until a workflow (schedule + workflow_dispatch at minimum) is wired up.
    2. **`credential-autonomy-agent.yml` can never report failure** — every step is guarded such that non-zero exits are swallowed (`|| true`, `continue-on-error: true`, or trailing `echo`). A red run is structurally impossible, so the green checkmark is meaningless. Remove the swallowing on the actual validation step.
    3. **`self-heal-pr.yml` is 100% manual despite docs claiming automatic** — trigger is `workflow_dispatch` only. Either add the documented `pull_request` / `issue_comment` triggers, or fix the docs. Current state is a silent lie.
    4. **`reset-self-heal-issue.yml` is 100% manual despite docs claiming automatic** — same failure mode as (3). Same fix: wire the real trigger or correct the docs.

---
