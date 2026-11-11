---
name: github-read-write-admin
description: >-
  Use when an in-repo agent (cloud agent, Cursor IDE, or CI) reads or changes
  GitHub with git, gh, or the REST/GraphQL APIs: repos, files, history,
  issues, pull requests, reviews, merges, checks, discussions, collaborators,
  rulesets, branch protection, webhooks, Actions secrets, and repo settings.
  Picks the lowest tier that does the job and enforces identity, merge gates,
  and the never-delete rules.
---

# GitHub read / write / admin

**Skill Name:** `github-read-write-admin`
**Version:** 1.0.0
**Date:** 2026-11-11
**Status:** Active
**Category:** Developer Workflow
**Type:** Operational
**Persona:** none

## Purpose

One recipe for every GitHub job an agent does from inside a checkout. Three tiers. Always use the lowest tier that does the job.

## Where this file lives

Decision, 2026-11-11. Owner: Audrey Evans. Recorded by TriageChief.

Audrey asked for this playbook under `docs/skills/` so agents working in her repos can find it. The skills vault (`skills/README.md`, `docs/SKILL_CREATION_GUIDE.md`, and `tests/skills-vault-structure.test.js`) still requires `skills/<name>/SKILL.md` plus `skills/<name>/<name>.skill.yml`. A new folder that has only `SKILL.md` fails that test.

Two layouts were set aside. A single copy under `skills/` would miss the path Audrey named. A full copy in both places would drift, and the next edit would replace one of them. This file is the canonical text. `skills/github-read-write-admin/SKILL.md` is a loader that points here. The machine config is `skills/github-read-write-admin/github-read-write-admin.skill.yml`.

Removing this file leaves agents on the path Audrey named with nothing to load, and they invent connector calls that do not exist on the box. Removing the loader or the `.skill.yml` fails `tests/skills-vault-structure.test.js` and leaves the vault index pointing at a folder with no machine config.

## Who runs it

Cloud agents with a git checkout and the `gh` CLI, Cursor IDE agents in the working tree, and CI bots on GitHub Actions. CI uses the job token and the workflow `permissions:` block.

These agents do not have a GitHub connector. Translate a connector tool name with the table at the end of this file. Do not invent a connector call.

## Dependencies

Check once per task, before the first call that matters.

### Install

| Tool | Role | Install |
| --- | --- | --- |
| `git` | Local history, branches, commits, union merges | Debian/Ubuntu: `sudo apt-get update && sudo apt-get install -y git`. macOS: `brew install git`. Windows: `winget install Git.Git`. |
| `gh` | REST, GraphQL, pull requests, issues, checks, secrets | [GitHub CLI install](https://github.com/cli/cli#installation). macOS: `brew install gh`. Windows: `winget install GitHub.cli`. Linux block below when `command -v gh` fails. |
| `jq` | Read JSON fields without printing secrets | `sudo apt-get install -y jq`, or `brew install jq`, or `winget install jqlang.jq`. |

Official apt source for `gh`, from the GitHub CLI install docs. Run it only when `gh` is missing. Install `wget` first if `command -v wget` fails.

```bash
sudo apt-get update
sudo apt-get install -y wget
sudo mkdir -p -m 755 /etc/apt/keyrings
out=$(mktemp)
wget -nv -O "$out" https://cli.github.com/packages/githubcli-archive-keyring.gpg
cat "$out" | sudo tee /etc/apt/keyrings/githubcli-archive-keyring.gpg >/dev/null
sudo chmod go+r /etc/apt/keyrings/githubcli-archive-keyring.gpg
sudo mkdir -p -m 755 /etc/apt/sources.list.d
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list >/dev/null
sudo apt-get update
sudo apt-get install -y gh
```

### Auth

`gh` uses `GH_TOKEN` or `GITHUB_TOKEN` when one of those is set. Otherwise it uses its credential store.

```bash
gh auth login
gh auth status
```

`gh auth status` prints the account and the scope names, and it masks the token. That is the auth check.

Do not run `gh auth token`. That command prints the secret. Do not echo `GH_TOKEN` or `GITHUB_TOKEN`. Do not run `bash -x` or `set -x` around `gh` while either variable is set, because the trace prints the value. Do not put a token in a command argument. If a log, a response body, or a check line contains a token, stop quoting it and report the URL or the job id only.

A 401 means the login is missing or expired. Run `gh auth status` and log in again. A 403 means a permission from the table below is missing. Name that permission and stop. Do not search the repo for a different token. A 404 on a repository the owner says exists usually means a fine-grained token was not granted that repository.

### Scopes

Request the lowest access that does the job. Do not request `delete_repo`.

Classic scopes are documented in [Scopes for OAuth apps](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/scopes-for-oauth-apps). Fine-grained permissions are documented in [permissions required for fine-grained personal access tokens](https://docs.github.com/en/rest/authentication/permissions-required-for-fine-grained-personal-access-tokens).

| Tier | Classic scopes | Fine-grained repository permissions | Actions `permissions:` |
| --- | --- | --- | --- |
| 1 Read | `repo` on a private repo, or `public_repo` on a public repo. Add `read:org` when a collaborator or team read returns 403. | Metadata Read. Contents Read. Pull requests Read. Issues Read. Discussions Read. Actions Read. | `contents: read`, `pull-requests: read`, `issues: read`, `discussions: read`, `actions: read`, `checks: read`, `statuses: read` |
| 2 Write | `repo`, plus `workflow` when the commit touches `.github/workflows/`. | Contents Read and write. Pull requests Read and write. Issues Read and write. Discussions Read and write. Workflows Read and write only if the diff touches workflows. | Add `contents: write`, `pull-requests: write`, `issues: write`, `discussions: write`. |
| 3 Admin | `repo`, plus `admin:repo_hook` for webhooks. Org rulesets also need org admin. | Administration Read and write. Secrets Read and write, only for Actions secrets. Webhooks Read and write, only for hooks. | The job token cannot change rulesets, branch protection, or Actions secrets. Use a PAT or a GitHub App with Administration, and still get the owner's yes. |

Classic tokens list scopes in `x-oauth-scopes`. Fine-grained tokens and GitHub App installation tokens leave that header empty. The repository permission flags are the check that still works:

```bash
gh api user -i | awk 'BEGIN{IGNORECASE=1} /^x-oauth-scopes:/ { print }'
gh api repos/OWNER/REPO --jq '{admin:.permissions.admin,maintain:.permissions.maintain,push:.permissions.push,triage:.permissions.triage,pull:.permissions.pull}'
```

Tier 3 needs `admin: true` on that repo and the owner's explicit yes. `admin: true` without the yes is not permission to change anything.

### Self-check

```bash
bash docs/skills/github-read-write-admin/self-check.sh midnghtsapphire/revvel-standards
```

`--offline` checks that `git`, `gh`, and `jq` are on `PATH` and skips the network. The default also checks `gh auth status`, the login, the scope header, and the repo permission flags. The script exits non-zero when a tool or the login is missing, or when the named repo cannot be read. A GitHub App token that gets 403 on `/user` still passes when `gh auth status` names an account. All-false permission flags are printed as a note: that credential cannot do Tier 2 or Tier 3 on that repo. The script does not print a token.

## House rules

### Identity

Many bots share one GitHub login. Every issue body, discussion post, pull request title, pull request body, review, comment, and commit message starts with the bot's name in bold and ends with `— BotName`.

```bash
BOT=TriageChief
signed_line() { printf '**%s** %s — %s\n' "$BOT" "$1" "$BOT"; }
signed_body() { printf '**%s** %s\n\n— %s\n' "$BOT" "$1" "$BOT"; }
```

Use `signed_line` for a pull request title and for a one-line subject. Use `signed_body` for a commit message, a pull request body, a comment, or a review. The conventional type (`docs:`, `feat:`, `fix:`, `chore:`, `ci:`, `test:`, `refactor:`) stays in the subject so the audit log can read it.

```bash
git commit -m "$(signed_body "docs: short conventional subject")"
```

### Default repository

When the request does not name a repository, use `midnghtsapphire/revvel-standards`. Pass `--repo midnghtsapphire/revvel-standards` on `gh` issue and pull request commands. Do not let `gh` pick a repository by alphabet.

### Daily branch

Open the pull request into the daily branch the owner named. If they named `daily/YYYY-MM-DD` and `git ls-remote --heads origin 'daily/*'` shows that ref, use it. If it does not exist, use the newest `daily/*` ref from that list. Do not open the pull request into `main` unless the owner named `main` in the same request.

### Search, pages, and polling

Prefer one search over many list calls.

```bash
gh search prs --repo "$FULL" --state open --limit 50 --json number,title,author,url
gh search issues --repo "$FULL" --state open --limit 50 --json number,title,author,url
```

Always pass `--paginate` on `gh api` list calls. Stop when you have the answer. Do not poll, and do not pass `--watch` to `gh pr checks`.

### Rate limit

```bash
gh api rate_limit --jq '.resources.core | {remaining,reset}'
```

When `remaining` is near zero, stop and report the reset time. Do not loop.

## Tier 1 — Read

No approval needed. Read the remote when the local checkout may be stale. Read the local checkout when you are about to edit it.

```bash
OWNER=midnghtsapphire
REPO=revvel-standards
FULL="$OWNER/$REPO"
```

### Repos, files, and history

```bash
gh repo view "$FULL" --json name,url,defaultBranchRef,isPrivate,description
gh api --paginate "repos/$FULL/branches" --jq '.[].name'
gh api "repos/$FULL/branches/BRANCH" --jq '{name,sha:.commit.sha}'
gh api --paginate "repos/$FULL/tags" --jq '.[].name'
gh release list --repo "$FULL"
gh api "repos/$FULL/contents/PATH" -f ref="BRANCH" --jq .content | base64 -d
gh api "repos/$FULL/git/trees/HEAD" -f recursive=1 --jq '.tree[].path'
gh api --paginate "repos/$FULL/commits" -f sha="BRANCH" --jq '.[] | {sha:.sha[0:7], title:.commit.message|split("\n")[0]}'
gh api "repos/$FULL/commits/SHA"
gh api "repos/$FULL/compare/${BASE_REF}...${HEAD_REF}" --jq '{ahead:.ahead_by,behind:.behind_by,files:[.files[].filename]}'
gh search commits "repo:$FULL KEYWORD" --limit 20
```

Local checkout, after a fetch that exited 0:

```bash
git status -sb
git log --oneline -20
git show HEAD:PATH
```

Do not decode a path that holds a secret, such as `.env`, a key file, or credential JSON. If the content looks like a token, stop quoting it.

### Issues and pull requests

```bash
gh issue view NUMBER --repo "$FULL" --json number,title,state,author,assignees,labels,url,body
gh api --paginate "repos/$FULL/issues/NUMBER/comments" --jq '.[] | {user:.user.login,url,body}'
gh pr view NUMBER --repo "$FULL" --json number,title,state,isDraft,author,assignees,baseRefName,headRefName,headRefOid,url
gh pr diff NUMBER --repo "$FULL"
gh api --paginate "repos/$FULL/pulls/NUMBER/files" --jq '.[] | {filename,status,additions,deletions}'
gh api --paginate "repos/$FULL/pulls/NUMBER/reviews" --jq '.[] | {user:.user.login,state,body}'
gh api --paginate "repos/$FULL/pulls/NUMBER/comments" --jq '.[] | {user:.user.login,path,body,url}'
```

### Checks and logs

Read the head SHA, then the checks on that SHA. A green check on an older SHA does not count.

```bash
HEAD_SHA=$(gh pr view NUMBER --repo "$FULL" --jq .headRefOid)
gh pr checks NUMBER --repo "$FULL" --required --json name,bucket,state,link
gh api "repos/$FULL/commits/$HEAD_SHA/status" --jq '{state, statuses:[.statuses[]|{context,state}]}'
gh api --paginate "repos/$FULL/commits/$HEAD_SHA/check-runs" --jq '.check_runs[] | {name,status,conclusion}'
gh run list --repo "$FULL" --commit "$HEAD_SHA" --limit 20
gh run view RUN_ID --repo "$FULL" --log-failed
```

`gh pr checks` exits 0 when the selected checks passed, 8 when any are still pending, and 1 when any failed (`gh pr checks --help` on gh 2.103.0). Pending is not green. Do not watch in a loop. Job logs can contain a secret someone echoed. If you see one, quote the job id only.

Required check names come from the active rules on the branch. A 404 from classic branch protection does not mean the branch is unprotected. Read rulesets too.

```bash
gh api "repos/$FULL/rules/branches/BRANCH" --jq '.[] | select(.type=="required_status_checks") | .parameters'
```

### Discussions and collaborators

Discussions are GraphQL. Keep the query fixed and pass names as variables.

```bash
gh api graphql -f owner="$OWNER" -f name="$REPO" -f query='
query($owner:String!, $name:String!) {
  repository(owner:$owner, name:$name) {
    discussions(first:20) {
      pageInfo { hasNextPage endCursor }
      nodes { number title url }
    }
  }
}'
```

One discussion, including the id you need in order to comment:

```bash
gh api graphql -f owner="$OWNER" -f name="$REPO" -F number=18238 -f query='
query($owner:String!, $name:String!, $number:Int!) {
  repository(owner:$owner, name:$name) {
    discussion(number:$number) {
      id title url
      comments(first:50) { nodes { author { login } url body } }
    }
  }
}'
```

```bash
gh api --paginate "repos/$FULL/collaborators" --jq '.[] | {login, role:.role_name, permissions}'
```

## Tier 2 — Write

Do the write when the task asks for it. Then say what changed and link it. Stage by path. Do not `git add -A` on a checkout another agent shares.

In a workflow, pass an untrusted title or body through `env:` and use `"$VAR"` in the script. Do not paste `${{ github.event.pull_request.title }}` into the shell command. A title can contain quotes.

### Branches and commits

```bash
git fetch origin
git switch -c cursor/short-name origin/daily/YYYY-MM-DD
git add path/to/file
git commit -m "$(signed_body "docs: short conventional subject")"
git push -u origin HEAD
```

Push the feature branch. Do not push to `main`. If the push is rejected, fetch and merge. Do not rebase commits that have been pushed. Do not `git push --force`. Do not `git push --force-with-lease`.

Append-only files (ledgers, receipts, `wr/memory/decisions.jsonl`, and anything the repo calls append-only) use a union merge so both sides' lines survive:

<!-- 2026-11-11 TriageChief: retired. Git has no strategy named union, so `git merge -s union origin/the-other-branch` exits with "Could not find merge strategy 'union'". Use `git merge-file --union` below. `CHANGELOG.md`, `AUTHORS`, and `CONTRIBUTORS` already have `merge=union` in `.gitattributes`, so a normal `git merge` keeps both sides of those files. -->

For a whole-branch merge, run a normal `git merge`. Do not run `git merge -s union`. `CHANGELOG.md`, `AUTHORS`, and `CONTRIBUTORS` already have `merge=union` in `.gitattributes`, so that merge keeps both sides of those files. Any other append-only file uses `git merge-file --union` below.

For one file that is already in conflict, read the index stages into a temp directory. Stage 1 is the base, stage 2 is ours, stage 3 is theirs. Do not redirect `git merge-file` onto the conflicted path. The shell truncates the target of `>` before the command runs.

```bash
CONFLICTED=path/from/git-status
STAGE=$(mktemp -d)
git show ":2:$CONFLICTED" > "$STAGE/ours" &&
git show ":1:$CONFLICTED" > "$STAGE/base" &&
git show ":3:$CONFLICTED" > "$STAGE/theirs" || {
  echo "Could not read index stages for $CONFLICTED. Do not stage it."
  exit 1
}
rc=0
git merge-file --union --stdout "$STAGE/ours" "$STAGE/base" "$STAGE/theirs" > "$STAGE/merged" || rc=$?
if [ ! -s "$STAGE/merged" ] || grep -q '^<<<<<<<' "$STAGE/merged" || grep -q '^>>>>>>>' "$STAGE/merged"; then
  echo "Union merge of $CONFLICTED left conflict markers or an empty file (merge-file exit $rc). Do not stage it."
  exit 1
fi
cp "$STAGE/merged" "$CONFLICTED"
git add "$CONFLICTED"
```

`git merge-file --union` exits with the conflict count when hunks overlap, even if the output is usable. `|| rc=$?` keeps that count and does not skip the marker check. Copy and `git add` run only when the result is non-empty and has no conflict markers. Otherwise stop. Never stage an unresolved file. Union can reorder lines. Confirm both sides' new lines are present. Do not `git checkout --ours` or `--theirs` on a ledger. That drops a side.

### Pull requests, comments, and reviews

```bash
gh pr create --repo "$FULL" --base daily/YYYY-MM-DD --head "$(git branch --show-current)" \
  --assignee LOGIN \
  --title "$(signed_line "docs: subject")" \
  --body "$(signed_body "What changed and why.")"
```

```bash
gh pr comment NUMBER --repo "$FULL" --body "$(signed_body "What you found.")"
gh issue comment NUMBER --repo "$FULL" --body "$(signed_body "What you found.")"
gh api -X POST "repos/$FULL/pulls/NUMBER/comments/COMMENT_ID/replies" -f body="$(signed_body "Reply.")"
```

```bash
gh pr review NUMBER --repo "$FULL" --comment --body "$(signed_body "Review notes.")"
gh pr review NUMBER --repo "$FULL" --request-changes --body "$(signed_body "What must change.")"
gh pr review NUMBER --repo "$FULL" --approve --body "$(signed_body "Approved.")"
```

GitHub refuses `APPROVE` from the pull request's author account. When that call returns 422, post a comment review and say so. Do not look for a second token to approve your own pull request.

A review you finish later:

```bash
gh api -X POST "repos/$FULL/pulls/NUMBER/reviews" -f event=PENDING -f body="$(signed_body "Notes.")" --jq .id
gh api -X POST "repos/$FULL/pulls/NUMBER/reviews/REVIEW_ID/events" -f event=COMMENT
```

Discussion comment, after you have the discussion id from Tier 1:

```bash
gh api graphql -f discussionId="$DISCUSSION_ID" -f body="$(signed_body "Question or answer.")" -f query='
mutation($discussionId:ID!, $body:String!) {
  addDiscussionComment(input:{discussionId:$discussionId, body:$body}) { comment { url } }
}'
```

`gh pr edit` changes only the flags you pass. A REST PATCH that includes a `labels` or `assignees` array replaces the whole set. Prefer the additive flags:

```bash
gh pr ready NUMBER --repo "$FULL"
gh pr edit NUMBER --repo "$FULL" --add-assignee LOGIN --add-label NAME
```

`gh pr ready` marks a draft ready for review. Do not mark a pull request draft unless the task said to.

Update a branch only when asked, and pin the SHA you read. If the head moved, the call is refused. Read the new SHA and stop unless you were asked to try again.

```bash
gh api -X PUT "repos/$FULL/pulls/NUMBER/update-branch" -f expected_head_sha="$HEAD_SHA"
```

### Issues and labels

```bash
gh issue create --repo "$FULL" --title "$(signed_line "short title")" --body "$(signed_body "Body.")" --assignee LOGIN
gh issue edit NUMBER --repo "$FULL" --add-label NAME --add-assignee LOGIN
gh label create NAME --repo "$FULL" --description "what it means" --color "ededed"
gh label edit OLD --repo "$FULL" --name NAME --description "updated meaning"
gh issue close NUMBER --repo "$FULL" --reason completed --comment "$(signed_body "Why it is closed.")"
```

`--add-label` and `--add-assignee` add. Do not pass `--remove-label` or `--remove-assignee`. If you PATCH the issue and send `labels`, read the current labels first and send the union, including every label that was already there.

Closing an issue is allowed when the task says the work is finished. Deleting an issue is not.

### Merge gates

Merge only when the task explicitly asks for this merge. If it does not, stop when the pull request is open and report the URL.

All of the following must be true on the same head SHA. If any one fails, do not merge.

1. An assignee is set. Do not assign yourself in order to pass this gate.
2. The work is done. You re-read the diff and it matches what the pull request says it delivers.
3. The pull request is not a draft (`isDraft` is false).
4. Every required check on that head SHA is green. Pending, failing, cancelled, timed out, or action required is not green. `skipped` is not green unless the ruleset text you just read says skipped satisfies the rule.
5. The account from `gh api user --jq .login` is not the pull request author. A bot does not merge its own pull request. Bots that share a login cannot merge a pull request that login opened. Report that the owner can merge it, and stop.
6. You pass that head SHA to `--match-head-commit`. If the head moved, GitHub refuses the merge. Read the new SHA and run the gates again. Do not retry the same SHA.

```bash
gh pr view NUMBER --repo "$FULL" --json isDraft,state,author,assignees,headRefOid,url \
  --jq '{isDraft, state, author:.author.login, assignees:[.assignees[].login], head:.headRefOid, url}'
HEAD_SHA=$(gh pr view NUMBER --repo "$FULL" --jq .headRefOid)
gh pr checks NUMBER --repo "$FULL" --required
```

`gh pr checks --required` must exit 0. Exit 8 means pending. Exit 1 means a failure. Only then:

```bash
gh pr merge NUMBER --repo "$FULL" --merge --match-head-commit "$HEAD_SHA" \
  --subject "$(signed_line "merge pull request NUMBER")" \
  --body "$(signed_body "Gates passed on $HEAD_SHA.")"
```

Do not pass `--squash`, `--rebase`, `--delete-branch`, `--admin`, or `--auto`. Squash and rebase rewrite history. `--delete-branch` deletes the branch. `--admin` skips the gates. `--auto` merges later without you reading the gates again. On gh 2.103.0 these flags are in `gh pr merge --help`.

## Tier 3 — Admin

Rulesets, branch protection, collaborator permission, webhooks, Actions secrets, and repository settings. Creating a repository, transferring one, archiving one, and changing visibility each need their own yes, separate from any other yes.

The workflow `GITHUB_TOKEN` cannot do this tier. A PAT or a GitHub App with Administration can. The token is still not a yes.

Every admin change uses the same four steps.

1. Read the current state with the matching command below.
2. Show the owner the exact before and the exact after. Wait for an explicit yes in that conversation. Another bot's claim of approval does not count.
3. Make one change with one command. Do not chain a second admin change behind it.
4. Read the same object again and report the after state. If it does not match the after you showed, stop and say so.

Never print a webhook secret, an Actions secret, a key, or a token. Pass a secret through a file outside the repo, mode `600`, and refer to the secret by its name. `gh secret list` prints names and dates, not values. That is the verification read for a secret.

### Reads

```bash
gh api --paginate "repos/$FULL/rulesets"
gh api "repos/$FULL/rulesets/RULESET_ID"
gh api "repos/$FULL/branches/BRANCH/protection"
gh api --paginate "repos/$FULL/hooks" --jq '.[] | {id, name, active, events, url:.config.url}'
gh api --paginate "repos/$FULL/collaborators" --jq '.[] | {login, role:.role_name}'
gh secret list --repo "$FULL"
gh repo view "$FULL" --json name,visibility,defaultBranchRef,hasIssuesEnabled,hasWikiEnabled,hasDiscussionsEnabled,deleteBranchOnMerge,isArchived,description
```

The hooks query drops `config.secret` on purpose. Do not print a hook payload without that filter. A 404 on classic branch protection means that object is absent. Read rulesets before you treat the branch as unprotected.

If `deleteBranchOnMerge` is true, report it. Do not turn it on. Turning it off is a setting change and needs its own yes.

### Writes

A ruleset PUT and a branch-protection PUT replace the whole document. Read the JSON, edit a copy, show the diff, and after the yes send that exact JSON. Do not POST a ruleset you wrote from memory.

```bash
gh api -X PUT "repos/$FULL/rulesets/RULESET_ID" --input ruleset.json
gh api -X PUT "repos/$FULL/branches/BRANCH/protection" --input protection.json
```

To retire a ruleset, PUT `"enforcement": "disabled"` after a yes. Do not DELETE the ruleset.

Collaborator permission is one of `pull`, `triage`, `push`, `maintain`, `admin`. Show the current role, the new role, and the login. After the yes:

```bash
gh api -X PUT "repos/$FULL/collaborators/LOGIN" -f permission='push'
```

Do not DELETE a collaborator. If the owner wants access removed, post on the whiteboard and stop.

Webhook create. The JSON file lives outside the repo and holds the secret. Show the owner the URL and the event list, not the secret. After the call, print only the filtered fields.

```bash
gh api -X POST "repos/$FULL/hooks" --input "$HOOK_JSON" --jq '{id, active, events, url:.config.url}'
```

To retire a hook, PATCH `active` to false after a yes. Do not DELETE the hook.

Actions secret. The value is on stdin so the shell history does not contain it. Setting the same name again overwrites the value. That still needs a yes. Do not run `gh secret delete`.

```bash
gh secret set NAME --repo "$FULL" < /path/outside/the/repo/secret-file
gh secret list --repo "$FULL"
```

Repository settings. Change only the flag the owner named. Read `gh repo edit --help` on the box, run that one flag, then read the JSON view again.

```bash
gh repo view "$FULL" --json visibility,hasIssuesEnabled,hasDiscussionsEnabled,deleteBranchOnMerge,defaultBranchRef
```

This skill does not delete repositories. If the request is to delete a repository, stop and post on the whiteboard.

Organization rulesets (`gh api orgs/ORG/rulesets`) stay unread unless the owner names the org and the yes names that org.

## Never delete and never rewrite

Do not delete branches, issues, comments, labels, files, hooks, rulesets, secrets, collaborators, or repositories. Close an issue, disable a ruleset or a hook, comment a file out, or supersede a document with a dated note. Append-only files get a union merge.

Do not rewrite history. No `git rebase` of commits that have been pushed. No `git commit --amend` of a commit that has been pushed. No `git push --force`. No `git push --force-with-lease`. No squash merge and no rebase merge. No `--delete-branch` on `gh pr merge`.

`git reset --hard` and `git stash` on a shared checkout discard another agent's work. Do not run them.

## When you are unsure

Post the question on the whiteboard and stop. Do not guess an admin change.

Whiteboard: [Discussion #18238](https://github.com/midnghtsapphire/revvel-standards/discussions/18238).

```bash
gh api graphql -f owner="midnghtsapphire" -f name="revvel-standards" -F number=18238 -f query='
query($owner:String!, $name:String!, $number:Int!) {
  repository(owner:$owner, name:$name) { discussion(number:$number) { id url } }
}'
```

Then the `addDiscussionComment` mutation from Tier 2, signed with `signed_body`, and stop.

## Report back

Report what you read or changed. Include the link for each issue, pull request, discussion, and commit, the head SHA you verified, the check result on that SHA, and anything still blocked plus who can unblock it. For an admin change, include the before and the after you read back.

## Connector names to git and gh

A draft of this skill addressed a chat connector. Use the command in the right column.

| Connector name | Use instead |
| --- | --- |
| `get_repository`, `list_branches`, `get_branch`, `list_tags`, `list_releases` | `gh repo view`, `gh api repos/OWNER/REPO/branches`, `.../tags`, `gh release list` |
| `get_file_contents`, `get_git_tree` | `gh api repos/OWNER/REPO/contents/PATH`, `.../git/trees/SHA` |
| `list_commits`, `get_commit`, `compare_commits`, `search_commits` | `gh api .../commits`, `.../compare/BASE...HEAD`, `gh search commits` |
| `search_issues`, `get_issue`, `list_issue_comments` | `gh search issues`, `gh issue view`, `gh api .../issues/N/comments` |
| `search_pull_requests`, `get_pull_request`, `list_pull_request_files`, `get_pull_request_diff` | `gh search prs`, `gh pr view`, `gh pr diff`, `gh api .../pulls/N/files` |
| `list_pull_request_reviews`, `list_pull_request_review_comments` | `gh api .../pulls/N/reviews` and `.../pulls/N/comments` |
| `list_check_runs_for_ref`, `get_commit_combined_status` | `gh pr checks --required`, `gh api .../commits/SHA/check-runs` and `.../status` |
| `list_workflow_runs`, `list_workflow_run_jobs`, `get_job_logs` | `gh run list`, `gh run view`, `gh run view RUN_ID --log-failed` |
| `list_repository_collaborators` | `gh api .../collaborators` |
| `list_discussions`, `get_discussion`, `get_discussion_comments` | the GraphQL queries in Tier 1 |
| `add_issue_comment`, `add_discussion_comment`, `reply_to_pull_request_review_comment` | `gh issue comment`, `addDiscussionComment`, `POST .../pulls/N/comments/ID/replies` |
| `create_issue`, `update_issue`, create or update a label | `gh issue create`, `gh issue edit --add-label`, `gh label create`, `gh label edit` |
| `create_branch`, `create_pull_request`, `update_pull_request` | `git switch -c`, `git push`, `gh pr create`, `gh pr edit` |
| `create_pull_request_review` | `gh pr review` |
| `merge_pull_request` | `gh pr merge --merge --match-head-commit SHA` after the gates |
| rulesets, branch protection, hooks, secrets | the Tier 3 reads and writes |

## Trigger keywords

```text
github read, github write, github admin, gh pr, gh issue, open a pull request,
merge a pull request, ruleset, branch protection, actions secret, webhook,
discussion 18238, never delete, never force-push
```
