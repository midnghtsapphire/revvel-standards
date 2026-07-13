# Learnings

This file tracks lessons learned from failures, self-healing fixes, and process improvements across the automated pipeline.
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
> **Usage:** Writes must be append-only. Each entry follows the template below.
> Do not edit or delete prior entries; future agents rely on the historical record.

## [Template Entry]

**Date:** YYYY-MM-DD
**Issue/PR:** #N
**Agent:** (openrouter | openhands | manual)

**What Happened:**
Brief description of what went wrong or what was learned.
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
# Goap Agent Memory & Self-Healing Log

## [Template Entry]

**Date:** YYYY-MM-DD

**Context:** What was being attempted.

**Root Cause of Failure (If any):** Why it went wrong.

**Self-Healing Fix / Learned Lesson:** What was changed or learned, including tools and skills actually used, for whoever runs the next one of these.

---
**Date/Time:**

**Task Attempted:** [e.g., n8n email parse for angelreporters@gmail.com]

**Outcome:** [Success / Failed]

**Root Cause of Failure (If any):** [e.g., IMAP connection timed out after 30s]

**Self-Healing Fix / Learned Lesson:** [e.g., Added an automatic 3-minute retry node in n8n; switched Apify actor to use residential proxies]

**Next Action:** [e.g., Proceed to Video Generation step]

---

## [Auto-Generated Entries Begin Below]

---

**Date/Time:** 2026-07-13T17:15:00Z

**Task Attempted:** CodeQL workflow `Analyze (actions)` matrix job failed with GitHub API rate limit exceeded during SARIF upload and telemetry gathering (run 29263568406, job 86862858087)

**Outcome:** Success — mitigated via `max-parallel: 1` and a retry-with-backoff step in `codeql.yml`.

**Root Cause of Failure (If any):** Three CodeQL matrix jobs (`actions`, `javascript-typescript`, `python`) ran in parallel, each making API calls during SARIF fingerprinting/upload and telemetry reporting. The combined API load exceeded the GitHub App installation's rate limit (shared across all concurrent workflows in the repo). The `actions` language job hit HTTP 403 "API rate limit exceeded for installation" at the SARIF upload phase and again during telemetry — the latter is internal to `github/codeql-action` and not retryable by user code. Error: `request ID 4C50:33198C:73D136F:18A32DE5:6A5509FD, timestamp 2026-07-13 15:53:33 UTC`.

**Self-Healing Fix / Learned Lesson:** (1) Added `max-parallel: 1` to the CodeQL matrix strategy — serializes the three language scans so their API-heavy upload phases don't overlap, drastically reducing peak API demand. (2) Added a retry step: if the first SARIF upload fails, wait 60s (rate-limit reset window) then retry once. The analyze step already had `continue-on-error: true`, so PR gating is unaffected, but the retry improves the odds of findings actually reaching the Security tab. Lesson: any workflow with a fan-out matrix that touches the GitHub REST API during post-processing (upload, telemetry, status checks) should either serialize via `max-parallel` or add exponential-backoff retry — the installation rate limit is shared across ALL concurrent runs in the repo, not per-workflow.

**Tools Used:** GitHub Actions job logs (`get_job_logs`), CodeQL action v4, `github/codeql-action/upload-sarif@v4`, `max-parallel` strategy key, `wait-for-processing` input.

**Next Action:** Monitor the next CodeQL run on main to confirm all three language scans upload SARIF successfully without rate-limit errors.

---

**Date/Time:** 2026-07-10T00:30:00Z

**Task Attempted:** Stop the changed-Markdown lint gate from failing nearly every PR (recurring `MD012`/`MD025`/`MD003`/`MD004`/… findings on generated `wr/issues/*.md`)

**Outcome:** Success — auto-heal loop shipped (PR #15623): `scripts/heal-markdown.js` + `markdown-lint-auto-heal.yml` + a heal step at WR generation time in `wr-pr-creation.yml`. Verified on the 5 worst backlog files: 362 findings → 2.

**Root Cause of Failure (If any):** Two structural generation artifacts plus mechanical noise. (1) `wr-pr-creation.yml` prepends its own `# WR: <title>` H1 above template/findings bodies that already carry H1s → `MD025` on essentially every generated WR (362 instances across the 259-file backlog). (2) Issue bodies pasted verbatim bring setext `===`/`---` headings (`MD003`), asterisk bullets, stacked blank lines. ~85% of all findings are auto-fixable by `markdownlint-cli2 --fix`; the two biggest non-fixable rules (`MD025`, `MD003`) are exactly the structural ones.

**Self-Healing Fix / Learned Lesson:** Don't hand-fix lint and don't weaken the gate — heal the file before the gate judges it. `npm run markdown:heal -- <files>` converts setext→ATX, demotes extra H1s to H2 (both code-fence-aware and idempotent), then runs `--fix`. The PR-time workflow pushes a `[md-auto-heal]` commit back to the branch (loop-safe: idempotent healer + push-only-on-diff + skip own commits); WR PRs are additionally healed at generation so they are born lint-clean. Lesson: when a lint failure recurs on every PR, measure the rule distribution across the accumulated corpus first — it splits cleanly into "machine fixes this" vs "generator bug" and both are automatable.

**Next Action:** None for lint. Remaining non-fixable findings (e.g. `MD055` malformed tables) surface in the healer's output and still fail the real gate for a human.

---

**Date/Time:** 2026-07-10T00:30:00Z

**Task Attempted:** Fix GitHub Copilot cloud-agent runs dying with `fatal: ambiguous argument 'main'` (cca-engine "Failed to compute changed paths", run cancelled)

**Outcome:** Success — fixed in `copilot-setup-steps.yml` (PR #15623).

**Root Cause of Failure (If any):**
Why did it fail? What was missing?

**Self-Healing Fix / Learned Lesson:**
What was changed to prevent recurrence, or what heuristic should future agents apply?

---

## Entries

**Date:** 2025-01-15
**Issue/PR:** #15852 follow-up (#15873)
**Agent:** openrouter

**What Happened:**
A `learnings.md` entry added in #15852 deviated from the file's established template format. The `Self-Healing Fix / Learned Lesson` heading was extended with inline clarifying text (`— tools and skills actually used, for whoever runs the next one of these`) instead of matching the template's verbatim `**Self-Healing Fix / Learned Lesson:**` form. A Copilot review comment flagged this.

**Root Cause of Failure (If any):**
When writing the entry, clarifying context was appended directly to the header rather than placed in the body. This broke exact-string greppability of the log by field name.

**Self-Healing Fix / Learned Lesson:**
Tools and skills actually used, for whoever runs the next one of these: when adding entries to `learnings.md`, keep the four heading lines (`Date:`, `Issue/PR:`, `Agent:`, and the three bolded field headers) byte-for-byte identical to the `[Template Entry]` block at the top of the file. All clarifying prose, caveats, and context belong in the body paragraph beneath each header — never inline in the header itself. This preserves `grep -F '**Self-Healing Fix / Learned Lesson:**' learnings.md` as a reliable way to enumerate every lesson recorded.

---
