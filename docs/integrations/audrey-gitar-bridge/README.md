# Audrey saved replies → Gitar → audreybuildsai

`midnghtsapphire/revvel-standards` is the confirmed governance and execution repository. This integration extends its existing saved-reply router, reuses the canonical WR-to-PR workflow, records GitHub-visible Gitar activity on PRs and linked work requests, and prepares completed summaries for Facebook Page **audreybuildsai**.

This is an internal script, not a new website, a replacement agent fleet, or an arbitrary comment-code executor. No Facebook browser cookies are copied into GitHub. The Page connection uses Meta's official Page authorization and a securely stored Page access token.

## Current status

The original standalone implementation passed 26 offline tests. The current repository integration is complete on an additive review branch: **70 offline Python tests, 11 router tests and six exact-pinned workflow lint checks pass**. Delivery is a **draft PR**, not a main-branch merge or activation; remote receipt is recorded after creation. See [TEST_RESULTS.md](TEST_RESULTS.md) for the unchanged baseline guard finding and exact limits. No work dispatch, Facebook post, Slack message, or connected-account acceptance is claimed. Existing automation is not reconfigured or disabled by this work.

The earlier source bundle and research are preserved in [history/2026-11-14](history/2026-11-14). Historical statements that the target was unconfirmed describe the earlier stage, not the current confirmed target. [REPOSITORY_FINDINGS.md](REPOSITORY_FINDINGS.md) records the actual input contracts and known integration boundaries.

## Saved replies

Create a GitHub saved reply whose entire body is:

```text
/audrey run
```

Submit it as a new issue/PR conversation comment. The existing router maps the `audrey` alias to the local `gitar-bridge` adapter; the adapter re-fetches and validates the real source comment and current repository write permission. Other agent aliases retain their original routes. The existing gateway does not deliver the same Gitar bridge request a second time.

On a **PR**, the adapter sends the trusted repository-owned `gitar-task.txt` to Gitar. On an **issue/work request**, it dispatches the existing `wr-pr-creation.yml` on the trusted default branch with `issue_number`, `draft_only=true`, and `suppress_direct_jules=true`. The author and comment-derived request ID remain in the audit trail rather than unsupported workflow inputs.

The WR workflow produces the WR document/skeleton PR. Actual implementation still follows the repository's research, viability, approval, and coding-engine handoff. An accepted or skipped workflow dispatch is not completed code, and the bridge does not invent implementation results or add approval/reset/delivery labels. Invoke the PR-side saved reply on the approved implementation PR, or use its separately authorized automatic intake when the author and upstream event path qualify. GitHub token-generated events may suppress downstream workflow starts; an issue dispatch alone is not proof that Gitar ran.

To re-process a missed current-head Gitar completion, use this saved reply on its PR, replacing the numeric ID with the real Gitar conversation comment ID:

```text
/audrey finish 123456789
```

This validates an existing completion; it cannot declare unfinished work done or bypass publication review. Edits and arbitrary trailing code do not execute as commands. Merely inserting a saved reply does nothing until the comment is submitted.

## Files and existing routes

Executable and tests are under [`scripts/audrey-gitar-bridge`](../../../scripts/audrey-gitar-bridge). `audrey_bridge.py` and `gitar-task.txt` remain side by side. Python 3.10+ is the runtime; the offline tests require Python 3.11+ and use mocked network calls.

The existing `.github/agent-router.json`, `.github/scripts/agent-command-router.mjs`, and `agent-command-window.yml` still own comment intake. `agent_requested` delivers a request; `agent_status` updates its existing window. `agent-request-delivery.yml` retains other gateway deliveries. The existing `agent-command-window-ci.yml` is extended with bridge checks, rather than adding a second general-purpose CI pipeline.

The new observer/adapter, fork-review relay, and protected publisher workflows use trusted default-branch code. They do not execute PR-head code or downloaded event artifacts with repository credentials. Source event JSON is untrusted data, and relay records are independently re-fetched from GitHub.

## Activate only after review and connection checks

Do not treat a draft PR or an environment name as activation or human approval. The owner reviews and merges code separately. Repository quiet-mode, cloud/coding-agent switches, viability and launch policy remain in force; do not create `exit-quiet-mode`, set reset/approval labels, or turn on existing agents just to make a demonstration run.

The following repository Variables control the bridge:

| Variable | Purpose and baseline |
| --- | --- |
| `ENABLE_AUDREY_BRIDGE` | Explicit activation; absent/false keeps privileged bridge work off. |
| `AUTO_START` | Optional eligible issue/PR-opened start; false by default. |
| `WORK_REQUEST_WORKFLOW` | Approved workflow filename; use `wr-pr-creation.yml` for this repository after reviewing the additive inputs. |
| `GITAR_LOGINS` | Exact actual Gitar GitHub author allowlist, not a substring or a human impersonation. |
| `FACEBOOK_PAGE_ID` | Confirmed numeric ID of audreybuildsai; required for signed destination binding. |
| `QUEUE_FACEBOOK_PUBLICATION` | Optional automatic publisher queueing; false by default. Queueing is not approval. |
| `FACEBOOK_PUBLISH_ENABLED` | Live publication switch; false by default, enable only after protected review and Page setup. |

Work starts additionally respect the existing `REVVEL_LLM_ALLOW_CLOUD` and `REVVEL_SWITCH_CODING_AGENTS` settings. Do not widen their permissions or paid lane. The bridge itself makes no direct LLM-provider call.

Repository secrets are `BRIDGE_SIGNING_KEY` (32+ characters), optional separately authorized `BRIDGE_GITHUB_TOKEN`, and optional `SLACK_WEBHOOK_URL`. The Actions token is supplied with explicit workflow permissions. Never export a chat connector's account token into this standalone integration. Do not commit real `.env` files, credentials, signing keys, or webhook URLs.

`facebook-publication` must be a GitHub Environment with actual required reviewers and appropriate trusted-branch/bypass protections. Reviewer availability depends on the account plan and repository visibility. Keep the **Page access token only in this protected environment** as `FACEBOOK_PAGE_ACCESS_TOKEN`. Its environment Variables are `APPROVED_FACEBOOK_PAGE_ID` (exact numeric match) and `FACEBOOK_GRAPH_VERSION` (an explicitly chosen supported `vNN.0` version). A name alone is not a protection rule. Repository/Environment signing-key or Page-ID overrides must be identical to the signed draft values.

Repository secrets/Variables were not readable through the current connector. This is an access limitation, not evidence that they are missing or configured correctly. No credential value was retrieved, printed, or copied by this task.

## Connect the real Facebook Page

Authorize the intended Meta app through official Facebook Login. Required permissions for Page posts include `pages_manage_posts` and its documented dependencies `pages_show_list` and `pages_read_engagement`, plus the appropriate Page content-creation task and app access/role/review requirements.

With the authorized User token, read `/me/accounts?fields=id,name,access_token,tasks`, follow pagination, choose the real audreybuildsai Page, and confirm its numeric ID and content task. Store that returned **Page token** in the protected Environment; do not substitute an arbitrary User token or browser session cookie. This discovery/setup is outside the bridge script. Tokens can be invalidated and are not described as permanent.

The publisher sends only the approved text through `POST /{page-id}/feed`. It does not ingest Facebook requests, scrape private comments, copy account data into PRs, or post code/images. Do not paste tokens in chat, PRs, issues, Slack, or Git.

## Gitar completion and exact public approval

Install/authorize Gitar on the confirmed repository, verify the real bot login, and allow the actual workflow-author bot in Gitar's organization settings. An Actions-authored Gitar request will not work merely because Audrey has write permission.

The trusted Gitar task requests bridge-specific completion markers, not a claimed native Gitar webhook:

```text
<!-- AUDREY_DONE sha=<current 40-character PR head SHA> -->
<!-- AUDREY_SUMMARY_BEGIN -->
A public-safe description of the completed, verified work.
<!-- AUDREY_SUMMARY_END -->
```

The configured Gitar author, current head SHA, source body and PR, numeric Page destination, and exact message are validated and bound into a signed draft. Private repositories, stale heads/changed source, bad signatures and some credential-looking text are rejected. Heuristic leak detection is not complete; review the actual public message for confidentiality, accuracy, and the repository's launch requirements.

The preparation job shows the exact `data.message`, Page ID, source, head, and payload SHA-256 before the protected publication job. Approval authorizes that exact payload, not a future edit. Completion markers are not proof of deployment, merge, passed CI, or launch qualification.

## Queue, audit, and uncertain-write recovery

The integrated publisher uses repository-compatible `concurrency` with `cancel-in-progress: false`. It serializes the active publisher but retains only one pending run by default; newer runs can replace a pending run. Their signed drafts remain on GitHub. Review one at a time or inspect/requeue missed drafts through **Actions → Audrey Facebook publication → Run workflow**, entering the real `draft_comment_id`. This is not a lossless queue. The original bundle's newer `queue: max` remains historical; the existing lint gate is not weakened to accept it.

The bridge records observable Gitar comments, current edits/deletions when delivered, reviews, inline comments, attributed commits and checks, and mirrors recognized same-repository WR links from PR bodies such as `Work request: #12` or `Closes #12`. Arbitrary numbers and cross-repository links are not destinations. Reconciliation sees current API state, not every hidden operation or deleted/intermediate version. Concurrent comment deduplication is best effort, not exactly-once history.

Before Facebook POST, a persistent GitHub pending marker is written. On success the Page/post ID and receipt are recorded. An uncertain POST or receipt failure blocks another blind attempt for that payload. Inspect the actual Page and source/digest with the owner; absence of a receipt is not proof that a post was not created. No automatic unlock or marker deletion is supplied. The same cautious policy applies to an uncertain issue workflow dispatch. Direct concurrent CLI publishing is unsupported.

## Optional Slack

The attached chat Slack connection does not supply this runtime with an incoming webhook. Choose the intended channel and authorize its `SLACK_WEBHOOK_URL` separately. Leaving it unset disables outbound notifications. The bridge does not read Slack messages or execute Slack-sourced work requests. Notification failures must not replay work starts or Facebook posts.

## Local checks and handoff

From the repository root, run the offline Python suite after the integration code is in place:

```bash
python3 -B -m unittest discover -s scripts/audrey-gitar-bridge/tests -v
node --test .github/tests/agent-command-router.test.mjs
python3 scripts/audrey-gitar-bridge/audrey_bridge.py --help
```

The CLI omits external writes unless its global `--apply` switch is supplied, although reconciliation/draft preparation can make authenticated reads and preparation can write a local JSON review file. Use the protected Actions publisher rather than a live local CLI shortcut. No live example is executed by this guide.

See [MVI_CONTRACT.md](MVI_CONTRACT.md), [REPOSITORY_FINDINGS.md](REPOSITORY_FINDINGS.md), [TEST_RESULTS.md](TEST_RESULTS.md), and [HANDOFF.md](HANDOFF.md) for scope, verified source contracts, final tests, and connected-setup status. The original detailed official-source notes and standalone docs are kept in the historical ZIP archives.
