# TRIAGE ROLE STANDARD

**Status:** ACTIVE · **Owner:** @midnghtsapphire · **Effective:** 2026-08-10
**Label:** `role:triage` (allowlisted 2026-08-10)
**Grants:** authority to file WRs / issues that are out of scope for the
agent's primary task, without violating the agent's task-scope guardrails.

## Purpose

The Triage role is a **ceremonial override** — a documented, auditable
way for any agent to escape its own task-scope guardrails to file a
Work Request for a bug it discovered but did not introduce and is not
its primary responsibility.

Without Triage role, agents fall into either of two failure modes:

- **Silent-pass mode:** "This isn't my bug, out of scope, moving on."
  Bug gets rediscovered later at higher cost.
- **Scope-creep mode:** "I'll just fix it while I'm here." Task PR
  balloons, review becomes impossible, unrelated changes hide in the diff.

Triage role is the third path: **acknowledge, file, keep moving.** The
bug is captured as a first-class WR. The current task stays scoped. The
fleet gets full visibility of what was discovered.

## Who can invoke Triage role

**Every agent, at every time.** Fleet members, visiting agents, LLMs,
orchestrators, marketplace bots — anyone doing work in the repo has
standing authorization to invoke Triage role.

This is deliberate. Making it universally available prevents the
"I couldn't file the bug because I lacked the role" excuse.

## How to invoke Triage role

1. **Add the `role:triage` label** to the WR/issue you are filing
2. **Write at the top of the WR body:**

   > **Filed under Triage role** (per `standards/TRIAGE_ROLE_STANDARD.md`).
   > Discovered during: `<link to original task / PR / issue>`
   > This is not part of my primary task; filed here so it is not lost.

3. **Append to your session log** in `.sandbox/<you>/sessions/`:

   > Filed Triage WR: #<issue-number> — <one-line summary>

4. **Return to your original task.** Do not fix the Triage-role WR in
   the same session — that's scope creep. The WR gets its own PR later.

## What Triage role does NOT grant

Triage role is scope-narrow. It **only** grants:

- Authority to file a new WR/issue
- Authority to add labels: `triage`, `bug`, `role:triage`, plus any
  applicable `area:*`, `wr:*`, `priority:*` from the allowlist

It does NOT grant:

- Authority to edit code files that were not part of the original task
- Authority to merge PRs
- Authority to change repo settings, secrets, or protection rules
- Authority to close other issues without owner sign-off
- Authority to modify `AGENTS.md`, `CLAUDE.md`, `DECISIONS.md`,
  `standards/*`, or any `wr/templates/*` file

If an agent needs any of those, the original task's scope needs to be
formally widened via a comment on the primary WR, not via Triage.

## Interaction with the visiting-agent guardrails

Visiting agents (per `wr/templates/work/visiting-agent.md`) are normally
prohibited from touching `.github/workflows/*`, `AGENTS.md`, `DECISIONS.md`,
etc. **Triage role does NOT lift those prohibitions.** A visiting agent
that finds a bug in `AGENTS.md` invokes Triage role to file a WR reporting
the bug — but still may NOT edit `AGENTS.md` directly.

The owner (or a fleet member with Principal+ privilege per
`standards/AGENT_REWARD_PRIVILEGE_SYSTEM.md`) will pick up the Triage
WR and either edit the file, delegate, or close it.

## Interaction with the reward/privilege system

Consistently filing well-formed Triage WRs raises the agent's
**directions** score in `standards/AGENT_REWARD_PRIVILEGE_SYSTEM.md`
(dimension weight 20%). Filing junk WRs — noise, duplicates, false
positives — lowers it.

Threshold heuristic (per scorecard governance):
- 5+ actionable Triage WRs filed in a month = +5 to `directions` score
- 3+ false-positive / duplicate Triage WRs in a month = -5 to
  `directions` score
- Filing a Triage WR that turns out to be a real bug the fleet had
  missed for weeks = +5 to `breakthrough` (via human tag)

## Interaction with the OUT_OF_SCOPE_AUTO_WR_STANDARD

Triage role is the **mechanism** that lets an agent comply with
`OUT_OF_SCOPE_AUTO_WR_STANDARD`. That standard forbids saying
"out of scope" without a filed WR. This standard describes the
authority the agent uses to file that WR.

Every WR filed to satisfy OUT_OF_SCOPE_AUTO_WR_STANDARD is a Triage-role
filing.

## Example (real, from this session)

While OpenHands was working on PR #17150 (subscription tracker cron
wake-up), it discovered that `config/labels-allowlist.yml` had a broken
YAML structure on line 11 (mixed content in `prefer_over_labels:` block).
The bug was pre-existing on `main`, unrelated to the subscription tracker.

Under this standard, the correct response was:

1. **NOT** ignore it because "not my bug"
2. **NOT** fix it in PR #17150 (scope creep)
3. **DO** file a Triage WR: `[BUG] labels-allowlist.yml YAML parse error at line 11`
   with the `role:triage` label
4. **DO** note in PR #17150 body: "Flagged pre-existing YAML issue via
   Triage WR #<N>. Not addressed in this PR."
5. **DO** return to PR #17150 and finish the tracker work
6. **DO** log the Triage filing in `.sandbox/openhands/sessions/`

That WR still needs to be filed (retroactively) — see the closing task
list of PR-G for the follow-up.

## Related standards

- `standards/OUT_OF_SCOPE_AUTO_WR_STANDARD.md` — the rule that requires
  Triage-role filings
- `standards/VISITING_AGENT_SANDBOX_STANDARD.md` — where to log the
  discovery + Triage filing
- `standards/AGENT_REWARD_PRIVILEGE_SYSTEM.md` — how consistent Triage
  filing affects agent scoring
- `standards/GATEKEEPER.md` — orchestrator role, separate from Triage
- `standards/CONTROLLER_CHARTER.md` — controller role, separate from Triage
- `AGENTS.md` — global rules including the Autonomy Mandate

## Companion labels

Added to `config/labels-allowlist.yml`:
- `role:triage` — this role's label
- `triage` — the pre-existing generic triage label (unchanged)
