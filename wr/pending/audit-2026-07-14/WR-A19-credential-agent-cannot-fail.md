# [WR] P1 — credential-autonomy-agent.yml runs hourly and structurally CANNOT report failure

## Title
[WR] Make credential-autonomy-agent capable of failing — hourly green means nothing today

## Description
**Problem (found by parallel Claude Code session, 2026-07-14; verify against live HEAD before fixing).** `credential-autonomy-agent.yml` executes hourly but its job structure can never exit non-green (swallowed errors / unconditional success paths), so credential drift, mint failures, or expiry NEVER surface. Combined with WR-A17's findings (32 silent-bail workflows; ADMIN_GITHUB_TOKEN referenced 247×) this is the most dangerous shape: a watchdog that always wags.

**Fix.** (1) Audit every step: remove `|| true` / unconditional-success patterns on checks that matter; let real failures fail. (2) Distinguish outcomes with labels per WR-A17 taxonomy: `credentials-missing` vs `credentials-invalid` vs `install-failure`. (3) On failure: one deduped [SELF-HEAL] issue naming the credential (WR-A12 marker pattern). (4) Add a seeded-failure test: point at a deliberately bogus secret name in a test mode and assert the run goes red + files the issue. (5) Hourly is 24 runs/day of a watchdog — evaluate folding to the WR-A8 dispatcher at 4-6h cadence.

**Acceptance.** Seeded bogus credential turns the run red and files exactly one labeled issue; legitimate pass stays green; cadence decision recorded.

## Agent learning note
A monitor that cannot fail is a decoration burning quota. Every watchdog needs a falsifiability test: prove it CAN go red before trusting its green. Same lesson as WR-A2's empty-but-valid state file — assert content invariants, and assert alarm capability, not just execution.

Assignee: Dragnet | Labels: P1, credentials, watchdog, self-healing
