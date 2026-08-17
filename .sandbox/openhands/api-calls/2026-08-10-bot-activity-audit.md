# API calls — 2026-08-10 — Bot activity audit on revvel-standards

Captured API calls that ground-truth the "who is actually reviewing our PRs"
question. Used to debunk D006/D007 (which measured workflow output, not
GitHub App bot activity).

## Call 1: fetch last 30 PRs

```text
GET https://api.github.com/repos/midnghtsapphire/revvel-standards/pulls
  ?state=all&per_page=30&sort=updated&direction=desc
Header: Authorization: Bearer <user PAT>
```text

Response: 30 PRs (878831 bytes JSON). Saved to /tmp/prs.json during the session.
Not committed — contains full PR bodies which include user quotes and are
noisy for the sandbox.

## Call 2 (per PR): fetch issue comments

```text
GET https://api.github.com/repos/midnghtsapphire/revvel-standards/issues/<PR_NUMBER>/comments
  ?per_page=100
```text

## Call 3 (per PR): fetch reviews

```text
GET https://api.github.com/repos/midnghtsapphire/revvel-standards/pulls/<PR_NUMBER>/reviews
  ?per_page=100
```text

## Analysis logic

For each returned item, check `.user.login`. If it contains `[bot]`,
increment a Counter keyed on the bot login. Track most-recent timestamp
per bot from `.created_at` or `.submitted_at`.

## Result table (30 PRs sampled)

| Bot | Comments/reviews | Most recent |
|---|---|---|
| github-actions[bot] | 368 | 2026-08-10T01:35:47Z |
| vercel[bot] | 30 | 2026-08-09T23:26:54Z |
| cubic-dev-ai[bot] | 20 | 2026-08-09T05:48:35Z |
| google-labs-jules[bot] | 19 | 2026-08-09T03:51:10Z |
| github-advanced-security[bot] | 13 | 2026-08-09T05:04:17Z |
| copilot-pull-request-reviewer[bot] | 13 | 2026-08-09T05:02:55Z |
| octopus-review[bot] | 12 | 2026-08-09T04:59:20Z |
| dependabot[bot] | 3 | 2026-08-09T21:27:14Z |
| **recurse-ml[bot]** | **0** | — |
| **bito-code-review[bot]** or **bito-ai[bot]** | **0** | — |

## Conclusion

Recurse and Bito are NOT posting on this repo's PRs. Both are installed at
the org level but neither has activity in the last 30 PRs. Most likely cause:
repository-access scope on the app-installation is set to "Only select
repositories" without `revvel-standards` in the list.

Cubic and GitHub Advanced Security are active reviewers not documented in
the fleet roster. They should be added to `data/subscriptions.yml` (for
GHAS free-tier tracking) and `data/reviewer-fleet.yml` (if that file
exists) or wherever the reviewer roster is maintained.

## Reusable script

The reusable version of this audit lives at
`.sandbox/openhands/scripts/count-reviewer-bot-comments.py` — takes owner,
repo, and --prs count as arguments. Should be promoted to the fleet as
a scheduled workflow that runs monthly and files an issue if any tool
listed in `data/subscriptions.yml` with type `github_app` has zero bot
activity in the sample. (Not built yet — pending future WR.)
