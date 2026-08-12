# DECISIONS

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
