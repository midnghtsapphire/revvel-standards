# /moneycrew-team — MoneyCrew (💲 bots)

> Backed up 2026-11-10 by Proofy. Call the whole team with `/moneycrew-team`; it goes to the lead.

| Field | Value |
|---|---|
| Team | MoneyCrew (💲 bots) |
| Call name | `/moneycrew-team` |
| Lead | [`/quickwin-rainmaker`](../quickwin-rainmaker/README.md) |
| Members | 6 |

## Purpose

Income-focused pipeline for Audrey's money-earning projects and contract jobs.

## Routing

Flow: Rainmaker (picks quick wins) → Playbook (launch plan) → Builder (builds in one repo per project) → TestHarness (nothing ships until it passes). DBArchitect designs databases; MoneyCrew git controller has no description on the box. No formal lead recorded: Rainmaker is listed first by flow (confirm with Audrey).

## Members

| Call name | Bot | Role |
|---|---|---|
| [`/quickwin-rainmaker`](../quickwin-rainmaker/README.md) | QuickWinRainmaker (box name: 💲-Rainmaker) | MoneyCrew rainmaker; ranks fastest-earning opportunities |
| [`/quickwin-playbook`](../quickwin-playbook/README.md) | QuickWinPlaybook (box name: 💲-Playbook) | MoneyCrew playbook writer; turns quick wins into launch plans |
| [`/quickwin-builder`](../quickwin-builder/README.md) | QuickWinBuilder (box name: 💲🛠️Builder⚡) | MoneyCrew builder for contract/earning projects |
| [`/quickwin-testharness`](../quickwin-testharness/README.md) | QuickWinTestHarness (box name: 💲-Test Harness) | MoneyCrew test harness; nothing ships until it passes |
| [`/dbarchitect`](../dbarchitect/README.md) | DBArchitect (box name: 💲-DBArchitect) | Database architect (Supabase/Postgres schemas) |
| [`/moneycrew-git-controller`](../moneycrew-git-controller/README.md) | 💲- GIT - Controlller (MoneyCrew git controller) | MoneyCrew git controller (profile has NO description on the box) |

## Rules

All members follow [BOT-COMMON-RULES.md](../BOT-COMMON-RULES.md) plus each bot's own rules in its README.

## How to re-create the team

1. Re-create each member from its README ("How to re-create"), lead first.
2. Tell every member who the lead is and where to report.
3. Point Audrey's requests for this team at `/quickwin-rainmaker`.
