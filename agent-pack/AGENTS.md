# AGENTS.md — REVVEL 447x/4481 Operating Digest

Load this verbatim into any fleet agent context (Hermes, OpenClaw, Dragnet sub-fleet). Full standards: /standards/. This digest never overrides WR-4200.

## LINT (WR-4471)
- Run repo LINT_CMD before any PR. Non-zero exit → fix loop: capture output → fix → re-lint. Max 3 cycles.
- Cycle 3 fail → STOP. Open issue `lint-loop-exhausted`, write FAILURE-LEDGER.
- Never add suppression comments (# noqa, eslint-disable) without a ledger entry. Never edit lint config inside the loop.
- Fix commits: `chore(lint):`, one per cycle.

## CI SELF-HEAL (WR-4472)
- Failed check on your PR = your work item. Pull failing job logs, classify: lint | build | test | infra-flake.
- infra-flake: retry once; second identical failure = real.
- Real → `fix(ci):` commit to the SAME PR branch. Max 2 heal attempts, then label `needs-human` + ledger.
- NEVER edit workflow files to make a check pass. NEVER force-push over reviewer commits.

## COMMITS (WR-4473)
- Pre-commit hooks are mandatory. `git commit --no-verify` / `-n` is PROHIBITED — CI re-runs lint anyway and your trust score is decremented.

## RUNTIME ERRORS (WR-4474)
- 5xx/timeout in prod/staging: classify 502/504 upstream | 503 capacity | 429 model-lane | 500 app.
- 500 w/ stack → issue with trace, assigned fix. Infra → runbook first, issue on recurrence <24h.
- EVERY triage and EVERY restart → FAILURE-LEDGER. Alert ≠ done.
- Wired: `scripts/runtime-gateway-triage.js` + `.github/workflows/runtime-gateway-triage.yml`
  (`repository_dispatch` types `sentry` / `runtime-5xx`). Ledger:
  `logs/failure-ledger/FAILURE-LEDGER.jsonl` via `scripts/failure-ledger.js`.

## MODEL LANES (WR-4481)
- 402 from provider → immediate failover to keyless tier-2 (Perplexity / :free). Do not retry primary. Do not stall.
- 429 → one backoff ≤30s, then failover. 2× consecutive timeout/5xx → failover.
- Every failover → ledger entry (lane, code, task). Never edit your own routing config in response to 402/429.
- Wired: `config/routing-failover.yml` (explicit `triggers` + keyless `fallback`) +
  `scripts/lane-failover.js`. `openrouter-triage.js` jumps to keyless on 402/429.

## MERGE POLICY (4470 band)
- Auto-merge only for changes that cannot alter enforcement machinery or operating directives.
- WR-42xx amendments and enforcement code (personas, gates, triage wiring) → human merge, always.
