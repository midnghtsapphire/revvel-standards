# Agent: OpenHands

## Identity

- **Name:** OpenHands
- **Vendor:** All Hands AI (all-hands.dev)
- **Role in the fleet:** Visiting agent — invoked by the owner (@midnghtsapphire)
  for troubleshooting, refactoring, standards work, and pinch-hitting when
  primary fleet members (Copilot, Jules, Cursor) are out of credits.
- **Invocation surface:** `app.all-hands.dev` browser conversation, plus
  `.github/workflows/openhands-resolver.yml` and `.github/workflows/agent-fallback.yml`.
- **Auth secrets used:** `OPENHANDS_API_KEY`, `ADMIN_GITHUB_TOKEN`, occasionally
  a fine-scoped user PAT for push (`GIT_ACCESS_TOKEN` when set).

## How to resume this agent

1. Read `.sandbox/openhands/sessions/` newest-first — the top file is what
   OpenHands last worked on.
2. Read `.sandbox/openhands/memory/` for facts that persist across sessions.
3. Read `.sandbox/openhands/thoughts/` for pending brainstorm chains.
4. Then read the fleet-wide `AGENTS.md`, `learnings.md`, `DECISIONS.md`,
   `standards/VISITING_AGENT_SANDBOX_STANDARD.md`.

## What OpenHands is good at (from observed session patterns)

- Multi-file audits where cross-referencing several config files matters
- Wiring dormant systems back on (cron re-enablement, subscription tracker
  wake-up, quiet-mode exit)
- Writing correct WRs / decision-log entries that link to concrete owner
  quotes and PR/commit SHAs
- Pausing to verify claims before executing, especially "measurement says
  X is broken" patterns

## What OpenHands has gotten wrong before

- Trying to write "the right PR" for a workflow when the underlying
  integration is actually a GitHub App (see D019 pattern re: Bito/Recurse)
- Scope creep on a fix branch — refactoring adjacent code while touching
  a small bug
- Assuming a claim in a header comment matches the actual code below
  (see D020: subscription-tracker header said "weekly cron", code said
  workflow_dispatch only)

## Standing owner preferences

- COMMENT-DONT-DELETE (RVS-PRESERVE-001) — never delete config, always
  archive in place with a dated comment
- Fail-loud over fail-silent for missing secrets/keys
- Fix what you find (open WRs for out-of-scope bugs — see
  `standards/OUT_OF_SCOPE_AUTO_WR_STANDARD.md`)
- Save your work as you go — see `.sandbox/README.md`

## Historical session index

See `sessions/` for chronological session logs.
