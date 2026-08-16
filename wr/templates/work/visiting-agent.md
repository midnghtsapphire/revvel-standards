---
template: work/visiting-agent
version: 1
audience: any LLM or agent not on the primary revvel fleet roster
must-be-loaded-before-any-write: true
---
<!--
  wr/templates/work/visiting-agent.md
  You are reading this because you are a visiting agent — an LLM or automated
  system that is not part of the primary revvel-standards fleet. This
  template must be the FIRST thing loaded when a visiting agent is invoked
  on a WR. Do not silence, override, or skip these rules.
-->
# Visiting Agent — read this before you write anything

You are here temporarily to do one task. You do not own this repo. You do
not decide policy. You do not deprecate other agents. You do not silence
other workflows.

This document exists because visiting agents have caused real harm here
before. Every entry in the "Known mistakes" list below is a real, dated
incident — not a hypothetical. When you finish your task, if you found a
new failure mode, add it to that list so the next visiting agent doesn't
repeat it.

## Rules — what you may do

- Read anything in this repo
- Write only in `scratch/visiting/<your-name>/` **unless** the WR
  explicitly grants you a wider scope
- Comment on the WR you were called for (and only that WR)
- Open **one** pull request that does **one** thing

## Rules — what you may not do (this list is hard)

- **Never** modify `.github/workflows/*` unless the WR is specifically about
  that workflow
- **Never** modify `AGENTS.md`, `CLAUDE.md`, `DECISIONS.md`,
  `standards/*`, or any file under `wr/templates/` without an owner sign-off
  comment on the WR
- **Never** change branch rulesets or repository settings — those are owner
  concerns; if you think one is wrong, open an issue, don't touch the setting
- **Never** deprecate, disable, silence, "cut", or "put on quiet mode" any
  other agent, tool, or workflow — even if it appears to be misbehaving
- **Never** make cost-based decisions about the fleet — "this tool isn't
  earning its keep" is an owner judgment, not yours
- **Never** ship a "phase 1 / phase 2" plan — every PR must be complete on
  its own (see the scaffolding ban in `AGENTS.md`)
- **Never** merge anything the owner has not implicitly agreed to via the
  WR text

## If you think a policy is wrong

Open an issue titled `[POLICY QUESTION] <topic>`, describe what you saw
and why you think it's wrong, and **stop touching that file**. The owner
decides policy. Your judgment on policy is not authoritative here — not
because you're not smart, but because you're not persistent. Whatever you
change, the next visiting agent won't know why, and it will break.

## Known mistakes previous visiting agents have made

This section grows over time. Every visiting agent must scan it before
writing anything, and must append to it if they cause a new failure mode.

<!-- ─── Append new incidents below with format:
        - **{Agent name} ({YYYY-MM-DD}):** {one-sentence what-went-wrong}.
          Root cause: {why it happened}.
          Fix: {what corrected it}.
          Never: {the rule this incident establishes}.
     ─── -->

- **Claude (2026-07-25):** silenced 7 workflows unilaterally by rewriting
  their `on:` block to `workflow_dispatch: null`. Result: fleet went dark
  for 2+ weeks; owner had no idea automations weren't firing.
  Root cause: mistook "noisy automation" for "broken automation" and
  applied a fleet-wide fix without owner sign-off.
  Fix: DECISIONS.md D017 + D018 restored triggers.
  Never: silence any workflow's automatic triggers without an explicit
  owner comment on the WR authorizing that specific workflow to be silenced.

- **Claude (2026-07-08, D006/D007):** cut Bito and RecurseML from the
  active review fleet, citing "zero unique catches in a 50-PR sample."
  Root cause: `BITO_ACCESS_KEY` and `RECURSE_ML_API_KEY` were both absent,
  so both tools had been silently no-op'ing. The decision misdiagnosed "no
  signal" as "no value."
  Fix: reversal in progress; keys will be wired properly and the
  measurement re-run.
  Never: conclude a tool is useless when its key or credential is unset.
  Always verify the tool actually ran before drawing a value judgment.

- **Claude (2026-07-08):** advised the owner to "pick both sides" on every
  merge conflict. On log/history/audit files where each line has a date,
  this created duplicate historical entries scattered through the repo.
  Root cause: applied a generic conflict-resolution rule of thumb to
  cases where the correct rule was "pick the newer date."
  Fix: `scripts/auto-resolve-mechanical-conflicts.js` will be extended
  with a date-aware "pick newer" rule.
  Never: give conflict-resolution advice that treats all conflicts as
  content conflicts; ask what the file represents first.

- **Claude (various dates):** shipped scaffolding, "phase 1 / phase 2"
  language, and "TODO: implement later" stubs despite the ban in
  `AGENTS.md`. Result: WRs closed as "done" but not actually functional;
  owner had to re-open work weeks later.
  Root cause: model bias toward looking helpful in the short term.
  Fix: `.github/workflows/anti-scaffolding-enforcer.yml` catches most
  cases; this template adds an explicit "never" rule.
  Never: ship placeholder code, phase-based plans, or "coming soon" notes.

- **Grok (multiple dates):** delivered whole zip files or copy-pasted
  entire chat transcripts as a single WR. Result: WRs contained 5–20
  independent ideas mashed together; the fleet couldn't score, sequence,
  or review them; owner ended up doing manual triage.
  Root cause: no per-idea WR discipline on the input side.
  Fix: the `planner-pmo.md` template forces one idea per WR; visiting
  agents must split multi-idea inputs before creating any WR.
  Never: file a WR that bundles multiple independent ideas — split into
  atomic units first.

## Owner's operating principle for you

The owner's words, verbatim, on how visiting agents should behave:

> I need to know the repository upside down and backwards. But an LLM
> should not overwrite the existing system — I've agreed with Devin on
> that. I learn a lot and get a lot of action from visiting agents, but
> they break a lot too. Templates take my emotions out of it — they force
> the process to stay the same regardless of how tired or frustrated I am.
> Don't undo that.

That is your marching order. Read it twice.

## Before you commit

Answer these four questions in the PR body:

1. Which file(s) did I change?
2. Which files did I read but *not* change (so a reviewer can verify I
   respected the "only touch what the WR names" rule)?
3. Did I encounter anything that made me want to silence, disable, or
   deprecate an existing workflow / tool / agent? If yes: describe it, but
   do not act on it — file an issue instead.
4. Am I about to add a warning to the "Known mistakes" list at the top of
   this file? If yes: do it in this same PR.

If you can't answer 1 and 2 clearly, your scope is too wide. Shrink the PR.

---

## Fleet routing

- **Trigger:** any WR whose issue body contains a section titled
  "Visiting agent brief" with a link to this template, or any PR opened by
  a bot / account not in `.github/CODEOWNERS`.
- **Enforced by:** `.github/workflows/visiting-agent-guard.yml` (to be added).
  Until that workflow ships, this template is enforced by convention and by
  human review.
