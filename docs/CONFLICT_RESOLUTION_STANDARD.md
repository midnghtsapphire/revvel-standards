# Conflict Resolution Standard

## 1. Purpose

This document defines how merge conflicts are resolved across PRs in this repo, and how the automated conflict-helper workflow behaves.

## 2. Triggers

The `conflict-helper.yml` workflow runs on:

- `pull_request` open / synchronize / reopen / label
- `issue_comment` with `/resolve-conflicts` or `/resolve` (author must be `OWNER`, `MEMBER`, or `COLLABORATOR`)
- Manual `workflow_dispatch` with a `pr_number` input

## 3. Phases

1. **Phase 1 — annotate**: gather PR context.
2. **Phase 2 — mechanical**: attempt a plain `git merge` from base. If clean, push. If unclean, try trivial patterns (lockfiles → prefer incoming). If any conflict remains, abort.
3. **Phase 3 — Jules**: if Phase 2 surrendered, dispatch `jules-coding-agent.yml` with `issue_number=<PR number>` (PRs and issues share the number space).

## 4. Outcomes

Exactly one of the following labels is applied per run:

| Label | Meaning | Your action |
|---|---|---|
| `conflicts:auto-resolved` | Phase 2 pushed a fix commit. | Wait for CI, merge. |
| `conflicts:needs-jules` | Phase 3 dispatched. | Wait for Jules. |
| `conflicts:needs-human` | Both phases failed. | Resolve manually. |

## 5. Sticky comment anatomy

Every run edits a single sticky comment (marker `<!-- conflict-helper-sticky -->`) containing:

- `### Conflict Helper — outcome` header
- Emoji + one-line headline
- **Your job:** explicit next action
- Collapsed `<details>` block with phase exit codes, dispatch state, run link

## 6. Manual retry

Comment `/resolve-conflicts` (alias `/resolve`) on the PR. The workflow will re-run against the current head. Non-privileged authors are ignored.

## 7. Filtering PRs by outcome

Bookmark:

```
?q=is%3Apr+is%3Aopen+label%3Aconflicts%3Aneeds-human
```

for a one-click view of PRs the workflow gave up on.

## 8. Slash-command reference

- `/resolve-conflicts` — canonical.
- `/resolve` — alias.
- Author must be `OWNER` / `MEMBER` / `COLLABORATOR`. All other commenters are ignored silently.

## 9. Outcome labels

Created on first run if missing. Prior outcome labels are removed before the new one is applied — a PR never carries two outcome labels at once.

## 10. Interpreting the sticky comment

- ✅ **Auto-resolved** — a commit named `chore: auto-resolve mechanical conflicts` (or a clean merge) was pushed. No further action beyond CI + merge.
- 🟡 **Handed to Jules** — the `jules-coding-agent.yml` workflow was dispatched with `issue_number=<PR>`. If nothing lands, escalate manually.
- 🔴 **Surrendered** — no automated attempt succeeded. Rebase locally.

## 11. When the workflow surrenders

1. Check out the branch: `gh pr checkout <PR>`.
2. `git fetch origin && git merge origin/<base>`.
3. Resolve manually, keeping both sides where possible (additive), preferring incoming for lockfiles.
4. Push. The workflow will re-run on the synchronize event and (if clean) flip the label to `conflicts:auto-resolved`.

## 12. Known caveats

- `jules-coding-agent.yml` is currently a scaffolding stub (tracked in #17248). Phase 3 dispatch is wired correctly, but the callee does not yet call any Jules API. Expect `conflicts:needs-jules` labels to sit until #17248 lands.
