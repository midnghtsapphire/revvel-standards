# WR-4471 — Lint Auto-Fix Loop

**Band:** 4470 (Validation Gate)
**Status:** DRAFT — rev 0
**Depends:** WR-4470 (Validation Gate), WR-4480 (Multi-Model Routing)

## Directive
Any agent producing code MUST run the repo lint command and enter the fix loop on non-zero exit. No PR opens with lint failures.

## Loop
1. Run `LINT_CMD` (repo-defined; e.g. `ruff check .`, `eslint . --max-warnings 0`, `dotnet format --verify-no-changes`).
2. Non-zero exit → capture stdout/stderr as fix context.
3. Agent applies fix (act-not-announce per WR-4380). No suppression comments (`# noqa`, `// eslint-disable`) without a FAILURE-LEDGER entry.
4. Re-run lint. Repeat.
5. **Max cycles: 3.** On third failure → halt, open issue tagged `lint-loop-exhausted`, log to FAILURE-LEDGER.

## Rules
- Lint scope = whole project, not staged files only.
- Fix commits use `chore(lint):` prefix, one commit per cycle (one upward rev per change).
- Model lane: route lint fixes to the cheap/fast lane per WR-4480; escalate lane on cycle 2+.
- Rule-config changes (editing lint config to silence an error) are PROHIBITED inside the loop — config changes require their own PR.

## Acceptance
- [ ] LINT_CMD defined per repo in CI config
- [ ] Loop exhaustion path tested (deliberately unfixable error)
- [ ] FAILURE-LEDGER entries written on suppression or exhaustion
