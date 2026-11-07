# Make sure the code has been assigned and done before merge

Audrey lock, exact, via Pedal + 1-Git-Triage, 2026-11-05:

> Make sure the code has been assigned and done before merge.

Silent-merge only when every gate below is true.

## Gates

1. **Assignee set.** The GitHub PR assignee is not empty.
2. **Work complete / acceptance met.** The linked work item was assigned and is done. Acceptance criteria are met.
3. **Clean green.** Required checks are green. No failing CI.

Any false gate: do not silent-merge.

## Stay draft

Plan-only drafts stay draft.

"No bots until green-light" drafts stay draft.

## Never self-merge

Agents never merge their own PRs. Authors never merge their own PRs. `AGENTS.md` OWNER RULE item 6 stands.

## Report, then escalate

The silent-merge actor (for example Proofy) still reports.

Escalate. Do not silent-merge:

- Money.
- Irreversible deletes without a prior yes.
- Personal secrets.

This rule does not weaken those escalations.

## Recorded because

On 2026-11-05, midnghtsapphire/oaudrey #2, #3, #4, and others merged with empty assignees. That must not happen again under silent-merge.

## Canonical home

This file is the standing rule. It survives a metal-spine archive of `AGENTS.md` (draft #18263). `AGENTS.md` points here. Docs only. No bot script, label, Action, or merge automation.

## Tracking

Refs #18269. This file is the RulesSteward encode of that process WR. Issue #18269 stays open. Secret's Whiteboard and hooks half stays on the issue. Draft record: #18272 into `daily/2026-11-05`. Stays draft. Agents do not merge it.
