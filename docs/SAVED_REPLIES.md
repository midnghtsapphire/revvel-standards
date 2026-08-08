# Saved Replies

This repo keeps a canonical registry of GitHub **saved replies** in
[`config/saved-replies.yml`](../config/saved-replies.yml). GitHub saved
replies are stored per-user in account settings and have **no public write
API**, so the registry here is the source of truth and each person mirrors
the entries into their own GitHub settings once, following the steps below.

## Current replies

| Key | Title | Body |
| --- | --- | --- |
| `copilot-resolve-merge-conflicts` | Copilot: resolve merge conflicts | `@copilot resolve the merge conflicts in this pull request` |
| `wr-title-regenerate` | WR title: regenerate (/wr-title) | `/wr-title force` |
| `wr-title-fleet` | WR title: Fleet maintenance | `[WR] Fleet maintenance — <org/repo>` |
| `wr-title-wire-in` | WR title: Wire in | `[WR] Wire in <tool-or-service>` |
| `wr-title-ship` | WR title: Ship to market | `[WR] Ship to market — <product>` |
| `wr-title-research` | WR title: Deep research | `[WR] Deep research — <topic-or-url>` |
| `wr-title-fix-ci` | WR title: Fix CI | `[WR] Fix CI — <failing check>` |
| `wr-title-add` | WR title: Add feature | `[WR] Add <capability>` |
| `wr-title-create` | WR title: Create product | `[WR] Create <product-or-engine>` |
| `wr-title-implement` | WR title: Implement | `[WR] Implement <spec-or-feature>` |

**When to use `copilot-resolve-merge-conflicts`:** a pull request shows
"This branch has conflicts that must be resolved". Posting this comment on
the PR hands it to the Copilot coding agent, which merges/rebases the base
branch, resolves the conflicts, and pushes back to the same PR branch.

**When to use the `wr-title-*` replies:** you are opening or fixing a Work
Request title. GitHub saved replies inject into **comment bodies**, not the
issue title field — so:

1. Use `wr-title-regenerate` as a **comment** on an existing WR (`/wr-title force`).
2. Use the other starters as copy-paste into the **title** box, or open
   [WR Title Studio](../products/wr-title-studio/README.md) and click Copy.
3. Full guide: [`docs/WR_TITLE_AUTOCREATE.md`](./WR_TITLE_AUTOCREATE.md).

## How to add these saved replies to your GitHub account (click-by-click)

1. Open <https://github.com/settings/replies> in your browser. (Or: click
   your profile photo in the top-right corner of any GitHub page → click
   **Settings** → in the left sidebar scroll down to the **Code, planning,
   and automation** section → click **Saved replies**.)
2. Under **Add a saved reply**, click the **Saved reply title** text box and
   type exactly: `Copilot: resolve merge conflicts`
3. Click the larger **Write** text box below it and type exactly:

   ```text
   @copilot resolve the merge conflicts in this pull request
   ```

4. Click the green **Add saved reply** button.
5. **Success looks like:** the new reply now appears in the list on the same
   page, showing the title `Copilot: resolve merge conflicts`.

## How to use a saved reply on a pull request

1. Open the pull request that has merge conflicts.
2. Scroll to the comment box at the bottom of the **Conversation** tab.
3. In the comment box toolbar, click the **left-pointing arrow icon**
   (tooltip: "Insert a reply") — it is on the right side of the toolbar.
4. Click **Copilot: resolve merge conflicts** in the dropdown. The body text
   is inserted into the comment box.
5. Click the green **Comment** button.
6. **Success looks like:** your comment `@copilot resolve the merge conflicts
   in this pull request` appears in the thread, and shortly after, Copilot
   reacts with 👀 and starts a session on the PR.

## Tooling

- List registry entries: `node scripts/saved-replies.js --list`
- Print an exact body (for scripts/agents):
  `node scripts/saved-replies.js --body copilot-resolve-merge-conflicts`
- Validate the registry: `node scripts/saved-replies.js --check`
- Tests: `node --test tests/saved-replies.test.js`

To add a new saved reply, append an entry to `config/saved-replies.yml`
(fields: `key`, `title`, `body`, `usage`), run the validator, update the
table above, then mirror it into the GitHub UI using the steps in the first
section.
