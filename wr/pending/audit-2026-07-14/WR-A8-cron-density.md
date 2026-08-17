# [WR] P2 — 78 scheduled workflows: quota, cost, and thundering-herd risk

## Title
[WR] Consolidate cron workflows behind a single dispatcher with a budget ledger

## Description
**Problem.** 78 of 200 workflows carry `schedule:` triggers. On a personal plan this burns Actions minutes fast, causes queue contention, and makes "why did X not run" undebuggable. Octopus quota exhaustion (wr/pending/07) is a symptom of the same unbudgeted-consumption pattern.

**Fix.** (1) Inventory crons via automation-doctor (post WR-A1). (2) Merge low-frequency jobs into one dispatcher workflow (matrix by task, staggered). (3) Add wr/memory/actions-budget.md ledger: minutes/month per workflow, hard monthly cap mirroring the $150 OpenRouter cap discipline. (4) Disable crons whose downstream script is dead (see WR-A3) until repaired.

**Acceptance.** Scheduled workflow count ≤ 15; budget ledger committed; no cron invokes a missing script.

## Agent learning note
Every autonomous system needs a metabolism budget. Compute spend without a ledger always trends to quota death — same failure whether it's OpenRouter dollars or Actions minutes.

Assignee: GOAP | Labels: P2, cost, reliability
