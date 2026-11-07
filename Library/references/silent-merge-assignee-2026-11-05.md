# Silent-merge assignee lock — 2026-11-05

Source: Audrey via Pedal + 1-Git-Triage, 2026-11-05. Exact lock: "Make sure the code has been assigned and done before merge."

Tracking: Refs [#18269](https://github.com/midnghtsapphire/revvel-standards/issues/18269). This note implements the RulesSteward encode on that process WR. Issue #18269 stays open. Secret's Whiteboard and hooks half for #18266 stays on #18269. Drafts #18262, #18263, and #18267 stay untouched. Merged #18264 and #18266 stay as they are.

Draft: [#18272](https://github.com/midnghtsapphire/revvel-standards/pull/18272) into `daily/2026-11-05`. Stays draft. Agents do not merge it.

Canonical rule: [`docs/governance/SILENT_MERGE.md`](../../docs/governance/SILENT_MERGE.md).

## Three gates

Silent-merge only when all three are true:

1. **Assignee set.** The GitHub PR assignee is not empty.
2. **Work complete / acceptance met.** The linked work item was assigned and is done. Acceptance criteria are met.
3. **Clean green.** Required checks are green. No failing CI.

Plan-only drafts stay draft. "No bots until green-light" drafts stay draft. Agents never merge their own PRs.

## When metal spine #18263 lands

Fold one line into its "Draft PRs only" section and its Proofy section: silent-merge only when assignee + done + green; canonical text is `docs/governance/SILENT_MERGE.md`. Do not edit #18263 from the lock that records this note.
