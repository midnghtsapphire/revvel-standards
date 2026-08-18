# Skill: Stacker Bot — Stacked Pull Requests

**Version:** 1.0.0
**Date:** 2026-08-08
**Status:** Active
**Platform:** [stacker-bot](https://github.com/apps/stacker-bot) (stackedpr)
**Installation ID:** `150619571`
**Docs:** `docs/STACKER_BOT_INSTALLATION.md`, `docs/STACKER_BOT_INTEGRATION.md`
**Related:** `docs/GRAPHITE_INTEGRATION.md` (modern alternative)

---

## What Stacker Does

Stacker splits large changes into a **stack** of smaller, dependent PRs:

1. **Stacked PRs** — each PR is based on the previous branch, not always on `main`.
2. **TOC on the main stack PR** — bot keeps an up-to-date table of contents.
3. **Merge-order guard** — failing status check on every non-top PR so merges
   happen top-down only.
4. **Optional CLI** — `stacker --new` / `stacker --add` (Homebrew:
   `brew tap stackedpr/stacker && brew install stacker`).

**Cost:** Free. No API key. Bot login: `stacker-bot[bot]`.

---

## When to Load This Skill

Load when the task involves:

- Opening more than one related PR for a single logical change
- Agent work that would otherwise produce a huge unreviewable diff
- Labels `stacker` or `stacker:stacked`
- Keywords: stacker, stacked PR, PR stack, stacker-bot, stacker CLI,
  merge order, stack TOC
- Issue #16874 or installation `150619571`

Prefer **Graphite** (`gt`) when it is configured and the contributor already
uses it. Prefer **Stacker** when you need the free installed bot with no extra
setup.

---

## How It Is Wired in Revvel

| Piece | Path / value |
| --- | --- |
| Connections SSOT | `config/connections.yml` → `id: stacker-bot` |
| Subscription inventory | `data/subscriptions.yml` → `Stacker (stacker-bot)` |
| Labels | `stacker`, `stacker:stacked` in `.github/labels.yml` |
| Install verification | `docs/STACKER_BOT_INSTALLATION.md` |
| Usage guide | `docs/STACKER_BOT_INTEGRATION.md` |
| Tests | `tests/stacker-bot-installation.test.js` |

There is **no** GitHub Actions workflow required for the bot to run — the
GitHub App receives `pull_request` / `check_run` / `status` events directly.

---

## Agent Rules

1. **Split large work.** If the change spans docs + labels + workflow + tests,
   open a stack (or explain why a single PR is still smaller than ~300 lines).
2. **Label stack items** with `stacker` and `stacker:stacked`.
3. **Document topology** in the bottom PR body:
   ```markdown
   ## Stack
   1. #N — base (labels)
   2. #M — docs
   3. #K — tests (TOP — merge first)
   ```
4. **Merge top-down only.** Never enable auto-merge on non-top items.
5. **Do not "fix" a failing Stacker check** on a non-top PR — that failure is
   the product working correctly.
6. **No secrets.** Never invent `STACKER_*` env vars; none are required.

---

## Setup Checklist (New Repo)

1. Install the app: <https://github.com/apps/stacker-bot> → Install → select repo.
2. Note the installation ID from the Configure URL.
3. Add a `stacker-bot` row to that repo's connections / inventory if it has one.
4. Copy labels `stacker` / `stacker:stacked` (or rely on org-level labels).
5. Optional: install CLI via Homebrew.
6. Smoke-test with a two-PR stack (see installation doc §5).

---

## Rollback

Uninstall at
<https://github.com/settings/installations/150619571>.
Remove registry rows. No secrets to revoke.
