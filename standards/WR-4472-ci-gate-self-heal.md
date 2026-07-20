# WR-4472 — CI Gate Self-Heal

**Band:** 4470 (Validation Gate)
**Status:** DRAFT — rev 0
**Depends:** WR-4470, WR-4380 (Self-Healer), WR-4471

## Directive
A failed CI check on an open PR is a work item, not a notification. The assigned agent root-causes and pushes a fix commit to the SAME PR — no new branch, no new PR.

## Flow
1. GitHub Actions check fails → webhook/poll picks up run ID.
2. Agent pulls failing job logs (last 200 lines minimum + first error block).
3. Classify: `lint` → defer to WR-4471 loop | `build` | `test` | `infra/flake`.
4. `infra/flake` (network, runner, rate-limit): retry once. Second identical failure → treat as real.
5. Real failure → fix commit `fix(ci):` to PR branch → CI re-runs automatically.
6. **Max heal attempts per PR: 2.** Exhausted → label `needs-human`, halt, FAILURE-LEDGER entry with classification + attempted fixes.

## Rules
- Never force-push over reviewer commits.
- Never edit the workflow file itself to make the check pass (gate-tampering = prohibited; workflow changes require standalone PR).
- Dragnet sentinel verifies heal commits against EWMA trust score before merge eligibility.

## Acceptance
- [ ] Log-pull tooling wired (Octokit / gh CLI)
- [ ] Flake-retry vs real-failure split tested
- [ ] Gate-tamper rule enforced by Dragnet review persona
