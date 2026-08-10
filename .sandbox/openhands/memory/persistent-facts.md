# OpenHands persistent memory for revvel-standards

Facts that should survive session boundaries. Append-only.

## Owner context

- **Owner:** @midnghtsapphire (Audrey Evans, MIDNGHTSAPPHIRE org)
- **Goal cadence:** $2000+/mo starting 2026-05-01 → $10M by 2030
- **Constraints:** frequently rate-limited on Copilot / Cursor credits;
  overwhelmed by GitHub notification volume; wears every hat solo
- **Preferences:**
  - COMMENT-DONT-DELETE always
  - Fail-loud > fail-silent
  - Small focused PRs > monolithic ones
  - No new topics when they're overwhelmed
  - Verify before spending money on tools

## Fleet map (as of 2026-08-10)

### Actively commenting on this repo (verified by bot activity)

- `github-actions[bot]` — 368 comments/30 PRs
- `vercel[bot]` — 30
- `cubic-dev-ai[bot]` — 20 (undocumented — should be added to fleet roster)
- `google-labs-jules[bot]` — 19
- `github-advanced-security[bot]` — 13 (undocumented — should be added to roster)
- `copilot-pull-request-reviewer[bot]` — 13
- `octopus-review[bot]` — 12
- `dependabot[bot]` — 3

### Installed but silent on this repo (needs repo-scope check)

- Bito Code Review — free forever
- RecurseML — $10/2wk or $250/yr paid

### Cut but should be reconsidered (D006/D007 was measurement error)

- Bito (D006 cut) — reverse when repo scope verified working
- RecurseML (D007 cut) — reverse when repo scope + billing verified

### Discontinued (do not revive)

- Roo Code — archived 2026-05-15, use Cline or Kilo Code instead

## Repo-specific gotchas

- Label allowlist is a common blocker — every workflow that applies a
  new label must add it to `config/labels-allowlist.yml` or Governance
  gates go red on that PR's own label (fixed cases: `ready-to-merge`
  #17091, `has-conflicts` #17097, `review:stuck` #17150)
- Neon preview branches exhaust project quota — 90+ open PRs will
  perpetually fail `Create Neon Branch` until backlog closes
- 254 dependabot alerts on main (2 crit / 159 high / 82 mod / 11 low)
  — noted, not tackled, would need dedicated session
- Secret cap is 100; currently at 99 with 72 zero-ref candidates

## Standards that must load at session start (in order)

1. `AGENTS.md` (this loads automatically for OpenHands)
2. `standards/VISITING_AGENT_SANDBOX_STANDARD.md` (this PR)
3. `standards/OUT_OF_SCOPE_AUTO_WR_STANDARD.md` (this PR)
4. `standards/TRIAGE_ROLE_STANDARD.md` (this PR)
5. `learnings.md` — apply past lessons before starting
6. `SYSTEM_STATE.md` — know what's in production
7. Relevant standard for the task type

## Standing WRs / open questions (as of 2026-08-10)

- Wake up trust-score system (already built, dormant) — ~50-line PR
- Reviewer synthesis workflow — not yet built anywhere
- Slash-command router (`/rescue` `/plan` `/deploy` `/conflict-reviewer`)
- Verify Bito + RecurseML app scopes in browser (owner action)
- 11 obvious duplicate secrets ready to delete (owner action)
