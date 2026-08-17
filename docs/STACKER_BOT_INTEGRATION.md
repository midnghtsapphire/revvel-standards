# Stacker Bot — Integration Guide

**Version:** 1.0.0
**Date:** 2026-08-08
**Status:** Active
**Related:**
[`STACKER_BOT_INSTALLATION.md`](./STACKER_BOT_INSTALLATION.md) ·
[`GRAPHITE_INTEGRATION.md`](./GRAPHITE_INTEGRATION.md) ·
[`skills/stacker-bot/SKILL.md`](../skills/stacker-bot/SKILL.md) ·
[Issue #16874](https://github.com/midnghtsapphire/revvel-standards/issues/16874)

---

## Why Stacker is here

Large agent-authored PRs are hard to review. Stacker splits one logical change
into a **stack** of smaller PRs (A → B → C) so each review stays scoped.

The GitHub App **stacker-bot** is already installed
(installation ID `150619571`). No secret is required.

---

## Labels

Defined in `.github/labels.yml`:

| Label | When to apply |
| --- | --- |
| `stacker` | Any PR the bot or a human marks as stack-related |
| `stacker:stacked` | PR is one item in a multi-PR stack (N ≥ 2) |

Automation and humans may apply these; the bot itself primarily uses status
checks and PR body TOC edits.

---

## Human / agent workflow

### Option A — Stacker CLI (when installed)

```bash
# one-time
brew tap stackedpr/stacker && brew install stacker

git checkout -b feature/user-dashboard
# ... commit base work ...
stacker --new
# answer prompts: stack name + main PR title
# → opens the main (bottom) stack PR

# add next layer
stacker --add
# title e.g. "Server API"
# → opens a child PR based on the previous branch
```

### Option B — Manual stacked branches (no CLI)

1. Branch `stack/base` from `main`, open PR #1 → `main`.
2. Branch `stack/mid` from `stack/base`, open PR #2 → `stack/base`.
3. Branch `stack/top` from `stack/mid`, open PR #3 → `stack/mid`.
4. Label each PR `stacker` + `stacker:stacked`.
5. In PR #1 body, keep a TOC linking #2 and #3 (the bot will refresh this when
   it detects the stack).

### Merge order (critical)

1. Review and approve **every** stack item.
2. Squash-merge from the **top** of the stack downward
   (top → mid → base/main).
3. Never merge a non-top PR first — Stacker's failing check exists to stop that.
4. After each merge, the next PR becomes the new top; its check should go green.

---

## What agents must do

When an agent would otherwise open one huge PR:

1. Prefer **2–5 stacked PRs** by layer (e.g. labels → docs → tests → workflow).
2. Apply `stacker` + `stacker:stacked` labels.
3. Mention the stack topology in the first PR comment
   (`Parent: #N / Children: #M, #K`).
4. Do **not** enable auto-merge on non-top stack items.
5. Do **not** treat a failing Stacker status check on a non-top PR as a CI bug.

When Graphite (`gt`) is available and preferred, use Graphite instead — see
[`GRAPHITE_INTEGRATION.md`](./GRAPHITE_INTEGRATION.md). Stacker remains the
free installed lane when Graphite is not configured.

---

## Orchestrator hand-off

Same idea as Graphite R-GT-05: when a PR carries `stacker:stacked`, first-line
routing comments SHOULD mention parent/child PR numbers so the orchestrator
fixes the correct branch in the stack.

---

## Failure modes

| Symptom | What to check |
| --- | --- |
| No Stacker check on PR | Install access (§2 of installation doc); re-push |
| Every stack PR fails Stacker check | Stack linkage broken — bases must point at parent branches |
| TOC missing on main stack PR | Bot permissions (issues + pull_requests write) |
| Want modern merge queue | Move to Graphite Free tier; keep Stacker or uninstall |

---

## Definition of done for #16874

- [x] App installed (installation `150619571`)
- [x] Connections registry entry (`stacker-bot`)
- [x] Subscription inventory row (free / active)
- [x] Installation + integration docs
- [x] Skill for agents
- [x] Labels `stacker`, `stacker:stacked`
- [x] Regression tests for the wiring
