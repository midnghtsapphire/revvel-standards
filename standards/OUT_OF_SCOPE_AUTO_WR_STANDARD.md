# OUT-OF-SCOPE AUTO-WR STANDARD

**Status:** ACTIVE · **Owner:** @midnghtsapphire · **Effective:** 2026-08-10
**Applies to:** every agent (fleet, visiting, LLM, orchestrator, marketplace
bot) that finds a bug, defect, misconfiguration, orphaned artifact, or
suspicious behavior while working on any other task.

## Prime rule

**"Out of scope" is not a valid reason to ignore a bug.**

The moment an agent discovers a bug, orphan, or defect that it did not
introduce and that is not part of its current task, the agent MUST
immediately open a **Work Request (WR)** for it — even if triaging that
WR later reveals it was already known. Filing a duplicate WR is cheap;
losing a real bug is expensive.

Words that USED to be acceptable and are now BANNED as final answers
without a filed WR:

- "That's out of scope."
- "Not my bug."
- "Pre-existing."
- "Someone else's problem."
- "Won't touch — different area."
- "N/A to this task."

Every one of those phrases must now be followed by a WR link. No WR, no
"out of scope."

## Why

Every bug discovered and not filed is a bug that gets rediscovered later —
usually by a different agent, in a different context, at a higher cost. The
"not my bug" pattern in this repo has directly caused:

- The subscription tracker cron never being wired (an agent noticed the
  header/body mismatch, decided it was out of scope, moved on — the tracker
  stayed dormant, RecurseML trial lapsed silently)
- Bito/RecurseML being cut on a bad measurement (an agent noticed the
  workflow was silent, concluded "no value", never checked whether the
  actual GitHub App was doing work — cost the fleet 30+ days of coverage)
- 72 zero-reference secrets accumulating in Actions secrets (each was
  someone else's abandoned wiring; no one filed the "clean this up" WR)
- The chaosmender 5-line lookahead false-positive persisting silently
  through multiple sessions

Every one of these could have been prevented by filing a WR the moment
the anomaly was noticed.

## The rule — verbatim, in three parts

### Part 1 — What triggers an auto-WR

An agent MUST file a WR when it observes ANY of the following, even if it
is outside the current task's scope:

- A file whose header/comment describes behavior that the code does not
  implement (e.g., "runs weekly on cron" but no `schedule:` block)
- A config key, secret, label, or artifact with zero references anywhere
  in the active codebase
- A workflow that references a script/skill/file that does not exist
- A skill or workflow that has been "cut" or "disabled" without an
  archive-in-place comment explaining why (RVS-PRESERVE-001)
- A test file that asserts behavior the code does not implement
- A DECISIONS.md entry contradicting current code state
- A dependency (npm, pip, action) that is archived, deprecated, or
  single-authored with a stale last release
- A duplicate label name, secret name, workflow file, or standard
- Any bot or automation posting error comments on 3+ PRs without a
  filed tracking issue for the underlying cause

### Part 2 — Scope is deterministic, and it takes a WR to prove it

**Scope is not a judgment call.** An agent may only conclude a bug is
"out of scope for full analysis" AFTER filing a WR and doing enough
research on it to characterize the risk. Until that WR exists and has
been triaged, the bug is treated as CRITICAL by default — because the
fleet does not know yet whether it is critical or not, and unknown ≠ safe.

The WR body may say "This appears to be low-severity because X, but full
analysis is deferred pending Y." That is acceptable. What is NOT
acceptable is an agent silently deciding "eh, small bug, moving on"
without a filed WR to prove that judgment was documented.

### Part 3 — Triage role has override authority to file

Sometimes an agent is constrained by its own guardrails or role scope
from filing a WR ("your task was only to fix X"). To handle this, every
agent has, at all times, access to the **Triage** role — a ceremonial
override that lets the agent file an out-of-scope WR without violating
its primary task boundaries.

See `standards/TRIAGE_ROLE_STANDARD.md` for the full description of
Triage role, its label, and its allowed actions.

An agent invoking Triage role writes at the top of the WR:

> **Filed under Triage role** (per OUT_OF_SCOPE_AUTO_WR_STANDARD.md).
> Discovered during work on `<original task>` (see `<PR/issue link>`).
> This is not part of my primary task; it is filed here so it is not lost.

## The WR itself — minimum acceptable form

A WR filed under this standard MUST contain:

1. **Title:** `[BUG] <short description>` — no vague titles like
   "issue found" or "look into this"
2. **Discovered during:** link to the original task / PR / issue
3. **Filed by:** agent identity (e.g., `openhands`, `copilot-swe-agent`,
   `jules`, `cursor`)
4. **Filed under Triage role:** yes/no
5. **Symptom:** what was observed
6. **Suspected root cause:** best current hypothesis (or "unknown, needs
   analysis")
7. **Risk if ignored:** what happens if nothing is done
8. **Suggested next step:** research direction, not necessarily a fix

Add the labels: `triage`, `bug`, and if applicable `wr:research`.

## What NOT to do

- **Do NOT delete the bug you found.** Even if you're "sure" you know
  the fix, file the WR first, do the fix in a separate PR that references
  the WR. This preserves the discovery trail.
- **Do NOT silently work around it.** A silent workaround adds tech debt
  without a paper trail. If you must work around it to complete your
  task, note the workaround in your task's PR body AND file the WR.
- **Do NOT wait to see if someone else notices.** Nobody else is looking.
  You noticed. File the WR.
- **Do NOT batch multiple unrelated bugs into one WR.** One WR per bug,
  even if that means filing three at once. Bug tracking works because bugs
  are individually addressable.

## When it IS OK not to file

- When the bug is already filed (search issues before filing to avoid
  duplicates; link the existing issue in your task PR body)
- When the "bug" is an active in-progress WR (check open PRs before filing)
- When your task IS the fix for that bug (file the fix, not a redundant WR)

## Meta note — this rule is proportional, not tyrannical

If you find a bug in every file you look at, the correct response is
still to file every one — but also to file one meta-WR proposing the
class of fix (e.g., "systemically add `.catch` handlers to all
removeLabel calls" instead of 30 individual WRs). The class-level fix
resolves all instances at once.

## Related standards

- `AGENTS.md` — global fleet operating rules (the Autonomy Mandate says
  "never stop at blockers"; this standard says "never silently pass
  bugs either")
- `standards/TRIAGE_ROLE_STANDARD.md` — override authority
- `standards/VISITING_AGENT_SANDBOX_STANDARD.md` — where to log the
  discovery + reasoning in your sandbox before filing
- `learnings.md` — every out-of-scope bug that turns out to be a
  pattern gets promoted to a training module
- `wr/WR_TEMPLATE_BASIC.md` — the template to use when filing
