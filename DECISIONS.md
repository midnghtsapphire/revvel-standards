# DECISIONS

## D019 — 2026-08-16 — Re-enable Bito as active review lane (supersedes D006)

Owner directive: use Bito for PR code review during the fleet cleanup — "use one
of the free github apps to code review or bito as I just paid for higher tier
code review".

Restores the auto-triggers (`pull_request`, `issue_comment` `/review` +
`/explain`) on `.github/workflows/bito-ai.yml` that D006 cut on 2026-07-08.
The D006 evidence ("zero unique catches in the 50-PR sample") was collected
while `BITO_ACCESS_KEY` was absent, so the sample measured a silent no-op, not
Bito. With the paid tier active, the lane is restored.

Prerequisite: `BITO_ACCESS_KEY` must exist in repo secrets (bito.ai → Settings
→ Access Keys). The workflow's verify step comments on the PR instead of
failing when it is missing.

Related: DECISIONS.md D006, PR fleet cleanup 2026-08-16 (228 open PRs:
duplicate chains closed against canonicals, canonicals driven to green with
`auto-merge` label per the mechanism documented in PR #17625 / auto-merge.yml).

## D017 — 2026-08-08 — Exit Quiet Mode

Owner directive: "no more quiet mode" / "i want the agents out of silent mode".

Restores event-driven automation triggers on the four workflows that PR #16805 silenced:

- `.github/workflows/agent-fallback.yml`
- `.github/workflows/auto-approve-clean-prs.yml`
- `.github/workflows/auto-merge.yml`
- `.github/workflows/wr-pr-creation.yml`

`trusted-bot-auto-approve.yml` is restored separately in PR #17091.

Issue #17099 is the standing Quiet Mode gate signal per `wr/specs/01-quiet-mode.md` and MUST remain open — closing it re-enters quiet mode for issue-gated workflows.

Cron generators stripped by #16805 (31 workflows) intentionally stay off. The #16805 rationale (~80 machine PRs/night, ~$400/week OpenRouter) still argues against blanket cron revival; restore selectively in follow-ups.

Related:
- PR #17091 (trusted-bot-auto-approve restore + apisec-scan duplicate-steps fix)
- Issue #17099 (Quiet Mode gate)
- PR #16805 (original quiet-mode enactment)
