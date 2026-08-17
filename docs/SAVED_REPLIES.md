# Saved Replies

This repo keeps a canonical registry of GitHub **saved replies** in
[`config/saved-replies.yml`](../config/saved-replies.yml). GitHub saved
replies are stored per-user in account settings and have **no public write
API**, so the registry here is the source of truth and each person mirrors
the entries into their own GitHub settings once, following the steps below.

## Current replies

| Key | Title | When to use |
| --- | --- | --- |
| `copilot-resolve-merge-conflicts` | Copilot: resolve merge conflicts | PR has conflicts and you want Copilot to rebase and resolve them |
| `owner-request-changes-before-approval` | Owner: request changes before I approve | Owner wants to approve but needs one or two things fixed first |
| `owner-block-until-i-test` | Owner: do NOT merge — I need to test first | Owner needs hands-on before ship — usually new product surface |
| `hand-off-to-openrouter-review` | Hand off: OpenRouter review | Route to OpenRouter review lane for a model-diverse second pass |
| `hand-off-to-devin-deep-review` | Hand off: Devin deep review | Cross-file logic review that stateless reviewers keep missing (paid — opt-in) |
| `escalate-owner-decision-needed` | Escalate: owner decision needed | Any irreversible / ambiguous choice that must go to the owner |
| `rescue-stuck-wr` | Rescue: WR is stuck, diagnose | Force a diagnostic-first pass on any stalled or looping WR |
| `split-multi-idea-wr` | Split: this WR bundles multiple ideas | Grok-style zip / chat-transcript WR that must be split into atomic units |

**When to use `copilot-resolve-merge-conflicts`:** a pull request shows
"This branch has conflicts that must be resolved". Posting this comment on
the PR hands it to the Copilot coding agent, which merges/rebases the base
branch, resolves the conflicts, and pushes back to the same PR branch.

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
