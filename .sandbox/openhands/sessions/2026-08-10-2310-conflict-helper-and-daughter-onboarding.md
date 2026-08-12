# Session: 2026-08-10 23:10 — Conflict Helper + Daughter Onboarding

## The owner's asks (verbatim)

1. "i really need help in github: midnghtsapphire/revvel-standards please review
   the repository in detail and follow the requirements. i have never seen this
   before where we are merging and rebasing. i need to get this one through as
   it has changes that will fix a lot and the one attached to it."
   (referring to PR #17147)
2. "her email is <lopez.caresse@gmail.com>" — invite her (daughter) to the repo
3. "she is on this repo too" — verify she's already a collaborator
4. "i know but it is hell on wheels because there are so many conflicts for
   every PR it is unmanageable for me. i do not know if dragnet is working
   when i call it or not i need that pr where they autoresolve conflicts
   without me or with me but in that window. preferably without me then i can
   approve a summary after the change or something"
5. Jules Render/MCP screenshot — offering Render MCP so Jules can fix preview
   deploys: "so we can use render through her"
6. Lint failure paste — 14 errors on merged PRs 17147 & 17163 that landed on main
7. "you dont follow your own sandbox specs hahahahahahahahahhahaha" —
   the correct call-out that I had NOT been writing this session to `.sandbox/`
   at all, in violation of the very standard I wrote earlier tonight

## What was shipped

### Before this session was properly logged (already merged)

- PR #17147, #17148, #17149, #17150, #17163, #17055, #17150 — squash-merged by owner ~19:00 UTC
- Bito research summary: Team tier $12/mo annual, mark bots Ineligible before purchase
- 2 expired collaborator invites cleaned up (id 315134226 and 319732541)
- Fresh invite sent to `lopezcaresse-wq` (invite id 328689724) — pending
- PR #17247: daughter onboarding pack (docs/onboarding/{README,SUBSCRIPTION_STEWARD,APP_TOUR,MONTHLY_BUDGET_TEMPLATE}.md)

### In this session (branch: fix-lint-fallout-from-merged-prs)

- PR #17249: conflict-helper visibility overhaul + Jules dispatch input-name fix + /resolve slash-command
- Issue #17248: Jules-coding-agent.yml is a scaffolding stub (Triage-role WR)
- Owner shared Jules Render/MCP UI screenshot — recommended Path B (@-mention) or Path A (API key) for the #17248 fix; recommended Context7 MCP add-on

## Key discoveries

### D-1: The `conflicts:needs-jules` label was a black hole

`conflict-helper.yml` Phase 3 dispatched Jules with `-f pr_number=$PR_NUMBER`, but
`jules-coding-agent.yml` declares its input as `issue_number`. Since GitHub silently
drops unknown workflow inputs, every dispatch since the workflow was first shipped
has been a no-op. The PR receives the `conflicts:needs-jules` label and then
absolutely nothing happens. This is the entire "I don't know if dragnet is
working" experience — it wasn't. **Fixed in PR #17249.** PRs and issues share
GitHub's number space, so passing PR number as `issue_number` is the correct call.

### D-2: `jules-coding-agent.yml` is a scaffolding stub

The workflow's "Run Jules agent" step is literally:

```yaml
run: |
  echo "Running Jules coding agent for issue #${{ inputs.issue_number }}"
  # Agent logic would go here
```

It creates a branch, echoes a message, commits nothing, opens an empty PR. That
is a scaffolding-ban violation per AGENTS.md. Even with #17249's dispatch fix,
Phase 3 still lands on a callee that does nothing. **Filed as issue #17248**
for a decision on Path A (Jules API key) vs Path B (@google-labs-jules[bot]
@-mention).

### D-3: I did not follow the sandbox standard I wrote earlier today

The owner called this out with laughter (correctly). The
`VISITING_AGENT_SANDBOX_STANDARD.md` I wrote at 22:28 UTC says "log actions as
they happen, never batched at end" — and I proceeded to work the entire
subsequent session on conflict-helper without writing a single file to
`.sandbox/openhands/`. This session file is the first correction. The
`learnings.md` entries and this file are both persisted BEFORE I move on to
the lint fix, per the standard's own rule.

**Learning that generalizes:** just-written standards are the hardest to follow
because you assume you already know them. Read new standards TWICE — once when
you write them, once when you next start work.

### D-4: The subscription tracker's daughter delegate has no GitHub account

`lopezcaresse-wq` was created 2026-04-17 (one day after the first email invite
expired). 0 repos, 0 followers, no profile. Circumstantial evidence is very
strong it's her stalled account. Fresh invite sent; awaiting confirmation from
owner that the handle matches.

## Pending / handed off

- **PR #17247** — merge when ready (docs only, safe any time)
- **PR #17249** — merge when ready (conflict-helper fix)
- **Issue #17248** — needs owner decision: Path A (API key) or Path B (@-mention)
- **Context7 MCP** — owner action, 2 minutes in Jules UI
- **`lopezcaresse-wq` invite** — she needs to accept at /invitations
- **This branch `fix-lint-fallout-from-merged-prs`** — lint sweep in progress,
  to be committed after this session file lands

## Resume steps for next agent

1. Read `learnings.md` newest-first for what was learned
2. Check `.sandbox/openhands/sessions/` newest-first — this file is on top
3. Check open PRs: `#17247`, `#17249`, and whatever the lint-fix PR becomes
4. Check issue #17248 — has the owner picked a Jules path yet?
5. Check whether `lopezcaresse-wq` accepted the invite
