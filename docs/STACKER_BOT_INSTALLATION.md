# Stacker Bot — Installation Verification

**Date:** 2026-08-08
**Status:** Active (installed)
**Installation ID:** `150619571`
**App slug:** `stacker-bot`
**Bot login:** `stacker-bot[bot]`
**Repository:** `midnghtsapphire/revvel-standards`
**Issue:** [#16874](https://github.com/midnghtsapphire/revvel-standards/issues/16874)

---

## 1. What this is (plain English)

**Stacker** helps you split one giant pull request into a **stack** of smaller
PRs that depend on each other. Reviewers get short diffs; agents stop dumping
500-file changes in one PR.

There are two pieces:

1. **stacker-bot** — the GitHub App already installed on this account
   (installation `150619571`). It watches PRs, keeps a table of contents on the
   main stack PR, and puts a **failing status check** on every PR that is *not*
   at the top of the stack so nobody merges out of order.
2. **stacker CLI** — optional local tool that creates the stack branches/PRs
   for you (`stacker --new`, `stacker --add`).

Homepage: <https://stacker-site.now.sh>
App page: <https://github.com/apps/stacker-bot>
Marketplace: <https://github.com/marketplace/stacked-pull-requests>
CLI repo: <https://github.com/stackedpr/stacker-cli> (1★, last push 2021 —
treat as free/legacy; Graphite is the modern paid alternative — see
[`GRAPHITE_INTEGRATION.md`](./GRAPHITE_INTEGRATION.md)).

**Cost:** Free. No API key. No secret to add.

---

## 2. Confirm the install (click-by-click)

Do this once after install, or any time you suspect the app lost access:

1. Open <https://github.com/settings/installations> while logged in as
   `midnghtsapphire`.
2. Find **stacker-bot** (or "Stacked Pull Requests") in the list.
3. Click **Configure**.
4. Confirm the URL ends with `/installations/150619571`
   (full link:
   <https://github.com/settings/installations/150619571>).
5. Under **Repository access**, either:
   - **All repositories**, or
   - **Only select repositories** and make sure
     `midnghtsapphire/revvel-standards` is checked.
6. Under **Permissions**, you should see at least:
   - Pull requests: Read & write
   - Issues: Read & write
   - Checks: Read & write
   - Statuses: Read & write
   - Contents: Read
   - Deployments: Read & write
   - Metadata: Read
7. Click **Save** if you changed anything.

**Success looks like:** the Configure page loads without 404, the installation
ID is `150619571`, and `revvel-standards` is in the repo list.

If the install is missing, reinstall from
<https://github.com/apps/stacker-bot> → **Install** → pick the
`midnghtsapphire` account → select `revvel-standards` → **Install**.

---

## 3. Repo files that wire Stacker in

| File | Purpose | Status |
| --- | --- | --- |
| `config/connections.yml` (`id: stacker-bot`) | SSOT connections registry entry | ✅ |
| `data/subscriptions.yml` (`Stacker (stacker-bot)`) | Free subscription inventory | ✅ |
| `docs/STACKER_BOT_INSTALLATION.md` | This verification doc | ✅ |
| `docs/STACKER_BOT_INTEGRATION.md` | How agents/humans use stacks | ✅ |
| `skills/stacker-bot/SKILL.md` | Agent skill playbook | ✅ |
| `.github/labels.yml` (`stacker`, `stacker:stacked`) | Labels for stacked PRs | ✅ |
| `tests/stacker-bot-installation.test.js` | Regression tests | ✅ |

Regenerate the human-readable connections views after editing the SSOT:

```bash
npm run connections
npm run connections:html
```

---

## 4. Optional CLI install (local machine)

Stacker works from the GitHub App alone once PRs are linked as a stack. The CLI
is only needed when *you* want to open stacks from a terminal.

**macOS (Homebrew):**

```bash
brew tap stackedpr/stacker
brew install stacker
stacker --help
```

**Success looks like:** `stacker --help` prints usage with `--new` and `--add`.

If Homebrew is unavailable, clone
<https://github.com/stackedpr/stacker-cli> and follow its README. The CLI last
shipped in 2021 — if install fails, fall back to manual stacked branches
(branch B based on branch A) and let the bot manage the TOC/status checks, or
use Graphite (`gt`) instead.

---

## 5. Smoke test (prove the bot is alive)

1. Open any non-draft PR on `revvel-standards` that is part of a stack
   (or create a tiny test stack — see
   [`STACKER_BOT_INTEGRATION.md`](./STACKER_BOT_INTEGRATION.md)).
2. Watch the PR **Checks** tab for a check named something like
   `stacker` / `Stacker` from `stacker-bot[bot]`.
3. On the **bottom** (oldest) stack PR, the bot should keep a table of contents
   listing the other stack PRs.
4. On every PR that is **not** the top of the stack, the Stacker check should
   **fail** (that is intentional — it blocks out-of-order merges).
5. On the **top** stack PR only, the Stacker check should **pass**.

**If nothing appears:**

1. Re-check repository access (section 2).
2. Confirm the PR was opened *after* the install.
3. Comment on the PR mentioning it is part of a stack, or re-push a commit to
   re-trigger the bot.
4. Check <https://github.com/midnghtsapphire/revvel-standards/settings/installations>
   for suspended/denied state.

---

## 6. How this fits the review fleet

| Tool | Role | Cost |
| --- | --- | --- |
| **stacker-bot** (this doc) | Free stacked-PR TOC + merge-order guard | $0 |
| **Graphite** ([`GRAPHITE_INTEGRATION.md`](./GRAPHITE_INTEGRATION.md)) | Modern stacking + merge queue (recommended long-term) | Free tier / paid |
| OpenRouter PR review | AI review comments | API usage |
| Mergify | Merge queue policies | limited free |

Stacker does **not** replace CI, CodeQL, or AI reviewers. It only structures
PRs. Keep existing required checks. Do not mark Stacker's own status check as
a *required* branch-protection check until a full release cycle of observation
(same advisory posture as Graphite R-GT-08).

---

## 7. Uninstall / rollback

1. <https://github.com/settings/installations/150619571> → **Uninstall**.
2. Remove the `stacker-bot` entry from `config/connections.yml` and the
   Stacker row from `data/subscriptions.yml`.
3. Run `npm run connections && npm run connections:html`.
4. Optionally delete `stacker` / `stacker:stacked` labels after open PRs no
   longer use them.

No secrets to rotate. No workflow secrets to delete.
