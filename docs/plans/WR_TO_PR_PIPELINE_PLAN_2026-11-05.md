# Plan: Every Request Becomes a WR Issue and a Draft PR

- **Status:** Plan only. Nothing in this document is built yet. No bots are created by it.
- **Requested by:** Audrey Evans, 2026-11-05 (relayed through Grok Bot and TriageChief).
- **Written by:** Grok Bot (executor subagent), 2026-11-05 09:10 MST (UTC-7).
- **Branch / PR:** `task/wr-to-pr-pipeline-plan-20261105` → `daily/2026-11-05`, draft.
- **Sources:** `Library/references/wr-to-pr-pipeline-sources.md`.

## 0. Read this first: Jules is being shut down

Google posted on 2026-10-29 that Jules winds down on **2026-12-31**. Sessions can be
started and finished only until **2026-11-11**. After that date Jules is read-only
([Jules changelog, "Jules Turndown"](https://jules.google/docs/changelog/)).

This plan uses Jules as the default rewriter and PR opener because Audrey asked for it.
It also puts Jules behind one adapter (§4.2) with lanes that do not depend on Jules, so the
pipeline keeps working after 2026-11-11. Audrey needs to decide which lane is the default
after that date (Open question Q1). Google also offers a full export of Jules settings,
sessions, and memories. Whether to run that export is Audrey's call (Q2). This plan does
not run it.

**SUPERSEDED (Q1/Q2 left open):** The paragraph above. **Audrey lock 2026-11-05** (PR #18267
comment, via 1-Git-Triage widget t83s308):
- **Until 2026-11-11:** Jules remains the default WR rewriter (lanes 1–3 above stay as written).
- **From 2026-11-11:** the default WR rewriter is **Roo or Roomote** (Jules successor).
- **Jules data export:** Yes — Secret runs Google's Jules export into the **vault only**
  (includes stored secrets). Never commit export contents to any repo.
- **Free-tier first;** any paid option needs its own WR/PR for Audrey's approval only. No bot
  creation from this lock alone.

**Addendum (RulesSteward, 2026-11-05):** The lock above is Audrey Evans's, exact via
1-Git-Triage widget t83s308 → Proofy, already commented on PR #18267. Q1 and Q2 are locked.
Both **Roo and Roomote** are the post-2026-11-11 rewriter options. Audrey did not pick only
one. If Roo and Roomote are unavailable, lane 4 (repo model chain) and then lane 5
(verbatim) are the fallbacks. Jules lanes 1, 2, and 3 stay historical / pre-11-11. The
export may include secrets. This addendum does not add a call path, script, or bot.

## 1. Goal

Every request Audrey makes becomes two things at once, automatically:

1. A **WR**: a GitHub issue with a clearer rewrite of her request, plus her original words
   verbatim.
2. A **draft PR** on `task/<wr-id>-<slug>` into `daily/YYYY-MM-DD`. Its first commit holds a
   starter plan file, the `Library/` entry, the `CHANGELOG.md` line, and the ledger entry.

There is **no worthiness gate**. The pipeline never rejects, defers, or ranks a request
out of existence. The older line in `WR_TEMPLATE.md` ("will be rejected or reshaped by the
research engine") does not apply to this pipeline. Under the owner rule in `AGENTS.md`
("Owner-authored instructions override earlier agent-authored notes"), the older text stays
in place as history.

## 2. Constraints this plan follows

| Constraint | Source |
| --- | --- |
| Never delete. Retire by commenting out, or by renaming to `.disabled`, with a dated note. | `AGENTS.md` OWNER RULE (2026-10-30); `wr/memory/decisions.jsonl` (HUSK rename policy) |
| Never rewrite existing work wholesale. Make additions next to it. | `AGENTS.md` OWNER RULE §3, §5 |
| Ledger, CHANGELOG, and Library entries go in the same commit as the work. | `WRITE_AS_YOU_GO_STANDARD.md`, `standards/LEDGER_STANDARD.md` |
| Sources go in `Library/` and are listed in `Library/README.md`. | `REPO_LIBRARY_STANDARD.md` |
| Draft PRs, Conventional Commits, no files in the repo root, no secrets in the diff. | `VISITING_AGENTS.md` §2, §7; `AGENTS.md` |
| No GitHub-hosted Actions. Everything runs from scripts and has manual steps. | Audrey 2026-11-05; `decisions.jsonl` "GitHub Actions locked by billing" |
| No LLM spend without the gate. Local models come first. | `AGENTS.md` Layer 0; `scripts/local_llm.py`; `scripts/llm-spend-gate.js` |
| Labels must already be on the allowlist. | `config/labels-allowlist.yml` (cap 80) |
| Pull-only architecture | Audrey via TriageChief, 2026-11-05 (§9) |

## 3. Intake sources

All three sources feed one intake step, `scripts/wr-pipeline/wr_intake.py`. Each item gets
a stable **intake key**, so running the step twice never creates a second WR.

| Source | How the pipeline gets it (pull-only) | Intake key |
| --- | --- | --- |
| **Chat with any bot** | The bot does not hand the request to another bot in chat. It files Audrey's words verbatim as an issue in `Freedom-Angel-Corp/brain-dump` (label `status:brain-dump`, plus a hidden marker `<!-- wr-intake: source=chat bot=<name> -->`). The poller picks it up there. If the bot can run code on the box, it can instead call `wr_intake.py --text-file <file> --source chat:<bot>`. | `chat:<bot>:<sha256 of verbatim text + timestamp>` |
| **Brain-dump issues** in `Freedom-Angel-Corp/brain-dump` | The poller lists issues updated since its cursor (§9.2). It skips issues that already carry the marker `<!-- wr-linked: ... -->`. | `brain-dump:<issue node_id>` |
| **Direct issues** in `midnghtsapphire/revvel-standards` (or any target repo) | The poller lists `[WR]` issues and `work-request` issues since its cursor. A direct issue is already the WR, so the pipeline rewrites it in place (§4.4) and opens only the PR. | `issue:<owner/repo>#<n>` |

Each item is first written to the intake journal at `wr/intake/journal/YYYY-MM-DD.jsonl`
(append-only). The entry holds the timestamp, source, intake key, the verbatim text, its
sha256, and the target repo. That journal entry is what guarantees nothing is lost: if every
later step fails, the request is still recorded and the next run retries it.

**Target repo.** If the request names a repo, the WR goes there. Otherwise it goes to
`midnghtsapphire/revvel-standards`. The repo must be connected to Jules, or the run falls
back to the scripted lane (§4.2).

## 4. The WR rewrite step

### 4.1 What the rewrite produces

| Field | Rule |
| --- | --- |
| **Title** | `[WR] <imperative, under 80 characters>`, as required by `WR_TEMPLATE_BASIC.md` |
| **Goal** | One or two sentences, taken from what Audrey said she wants |
| **Acceptance criteria** | A checklist. Each item quotes the phrase in her text it comes from (`← "her words"`). An item with no quote is not allowed. |
| **Scope / Out of scope** | Only what she said. Anything unclear goes to **Open questions**, not into scope. |
| **Open questions** | Anything she implied but did not state. These are listed, not answered. |
| **Original request (verbatim)** | Her exact text in a fenced block, byte for byte, with `sha256:` beside it |
| **PR description** | Mirrors the WR field for field (`MASTER.md` step 6, Jules normalize) |

**No inventing requirements.** The checker (`wr_verify.py`) enforces this in code:

1. The verbatim block's sha256 must match the journal entry. If it does not, the rewrite is
   discarded and the verbatim text is reinserted from the journal.
2. Every acceptance criterion must carry a quote that appears in the verbatim text, as a
   case- and whitespace-insensitive substring. Any criterion without one moves to
   Open questions with the note `moved: no source phrase`.
3. No new numbers, dates, money amounts, repo names, or people. Any token in the rewrite of
   one of those kinds that is missing from the verbatim text gets flagged, and the line moves
   to Open questions.
4. The checker never rejects the request. It only moves lines. The WR is always created.

### 4.2 Who rewrites: the Jules adapter, in code

The rewrite runs **in code**. A script calls Jules directly and parses the result. It is
never a chat handoff between bots. `scripts/wr-pipeline/wr_rewrite.py --lane <lane>` tries
the lanes in order:

| Order | Lane | How it is called | Auth | Notes |
| --- | --- | --- | --- | --- |
| **1 (default until 2026-11-11)** | **Jules REST API** | `POST https://jules.googleapis.com/v1alpha/sessions` with `sourceContext.source = sources/github/<owner>/<repo>`, `githubRepoContext.startingBranch = daily/YYYY-MM-DD`, `automationMode = AUTO_CREATE_PR`, `title`, `prompt`. Then `GET /sessions/{id}` and `GET /sessions/{id}/activities?createTime=<cursor>` until `outputs[].pullRequest` appears. | Header `X-Goog-Api-Key` from env `JULES_API_KEY`, which is never printed, logged, or written to a file | Can run unattended from cron. The API is alpha, so the request shape is pinned in one function. |
| 2 | **Jules CLI** (`@google/jules`) | `jules remote new --repo <owner>/<repo> --session "$(cat prompt.md)"`, then `jules remote list --session` and `jules remote pull --session <id>` | OAuth from an interactive `jules login`, kept in the OS keyring. Scripts never read the keyring. | Good for manual runs from Audrey's machine. Less suited to cron, because the token expires after about an hour. |
| 3 | **Jules through MCP** | The `gemini-cli-extensions/jules` extension ships an MCP server that wraps the CLI (tools such as `start_new_jules_task`). The script runs it over stdio JSON-RPC as an MCP client. | Same CLI login | [VERIFY] Jules has no first-party MCP server for driving Jules; its own MCP feature is for Jules calling other services. This lane adds nothing over lane 2 unless an MCP host is already in use. |
| 4 (~~default after 2026-11-11, pending Q1~~ — **SUPERSEDED 2026-11-05**) | **Repo model chain** | `python3 scripts/local_llm.py ask` (LM Studio → Ollama → OpenRouter, with the paid lane refused unless `REVVEL_LLM_ALLOW_CLOUD=1`), then the no-key Perplexity bridge `scripts/perplexity-no-key-bridge.js` | No new keys | Kept as a fallback lane. No longer the post-11-11 default (see row 4b). The script then opens the PR itself (§5, mode S). Free-tier / local first. |
| **4b (default from 2026-11-11)** | **Roo or Roomote** | [VERIFY] Wire via RulesSteward / GIT Controller into `wr_rewrite.py` as the Jules-successor lane. Prefer free tier. | Free-tier credentials only unless a paid WR/PR is approved | Audrey lock 2026-11-05: Jules successor for WR rewrite. Any paid option needs its own WR/PR. |
| 5 | **Verbatim only** | No model. Title = first line of her text, trimmed. The body holds the verbatim block plus "Rewrite pending". | None | Used only when every lane is down. The poller retries the rewrite later and adds it as a new comment. It never overwrites. |

**Default:** lane 1, the Jules REST API, until 2026-11-11. After that the default is whatever
Audrey picks in Q1. Until she picks, lane 4 is used, because it needs no new key.

**SUPERSEDED (pending Q1):** The three sentences above. **Locked 2026-11-05:** until
2026-11-11, lane 1 (Jules REST API) remains the default; **from 2026-11-11, lane 4b (Roo or
Roomote)** is the default WR rewriter. Free-tier first; any paid option needs its own WR/PR.
Jules export is owned by Secret and lands in the vault only, never a repo.

**Addendum (same lock, RulesSteward recording Audrey via Proofy):** Row 4b names **Roo or
Roomote**, both of them, as the default from 2026-11-11. Audrey did not narrow that to one
name. Its "how it is called" cell (`[VERIFY] Wire via RulesSteward / GIT Controller into
wr_rewrite.py`) is not Audrey's lock. This plan does not authorize that wiring, a script, or
a bot. Lane 4 and lane 5 stay the fallbacks when Roo and Roomote are unavailable.

**What the Jules prompt pins.** The prompt is a versioned file,
`scripts/wr-pipeline/prompts/jules-wr.md`. Jules also reads `AGENTS.md`. The prompt says:

- Rewrite under the rules in §4.1 and keep the verbatim block byte for byte.
- Use the branch name `task/<wr-id>-<slug>` and base `daily/YYYY-MM-DD`. Open the PR as a draft.
- Make one commit that contains exactly the files in §5.2.
- Any code Jules writes that calls an AI model must go through `scripts/local_llm.py` or the
  no-key Perplexity bridge. It must not add API keys, `.env` values, or new provider SDKs.
  `tests/llm-spend-gate-coverage.test.js` already fails any new ungated call site.
- No deletions, no force-push, no changes to `.github/workflows/`.

### 4.3 Fallback when Jules is down (manual, no bot needed)

Treat Jules as down on a 5xx, a timeout, no session progress for 30 minutes, a quota error,
or any date after 2026-11-11. After the 2026-11-05 lock, the commands below are the manual
fallback when Roo and Roomote are unavailable. This lock does not add Roo or Roomote commands.

```bash
# 1. Record the request (always works; no network needed)
python3 scripts/wr-pipeline/wr_intake.py --text-file request.txt --source manual
# 2. Rewrite with the repo model chain (local first; cloud only if the gate allows it)
python3 scripts/wr-pipeline/wr_rewrite.py --lane chain --intake-key <key> --out rewrite.json
#    ...or, with no model at all:
python3 scripts/wr-pipeline/wr_rewrite.py --lane verbatim --intake-key <key> --out rewrite.json
# 3. Create the issue and the draft PR together (mode S, §5)
python3 scripts/wr-pipeline/wr_open.py --rewrite rewrite.json --mode script
```

Fully by hand with `gh`, if no script works:

```bash
D=$(date +%F); ID=wr-$(date +%Y%m%d)-<8-char-hash>; SLUG=<short-slug>
gh api repos/<owner>/<repo>/branches/daily/$D >/dev/null 2>&1 || \
  gh api repos/<owner>/<repo>/git/refs -f ref=refs/heads/daily/$D \
    -f sha=$(gh api repos/<owner>/<repo>/git/ref/heads/main -q .object.sha)
git fetch origin daily/$D && git switch -c task/$ID-$SLUG origin/daily/$D
# add docs/plans/$ID-$SLUG.md, Library/requests/$ID.md, Library/README.md line,
# CHANGELOG.md line, wr/memory/decisions.jsonl line; then ONE commit:
git add -A && git commit -m "docs(wr): open $ID $SLUG"
git push -u origin task/$ID-$SLUG
gh issue create --repo <owner>/<repo> --title "[WR] <title>" --body-file wr-body.md --label work-request
gh pr create --repo <owner>/<repo> --draft --base daily/$D --head task/$ID-$SLUG \
  --title "docs(wr): <title>" --body-file pr-body.md
```

### 4.4 Direct issues

A direct issue already has a number. The pipeline does not overwrite Audrey's body. It posts
the rewrite as the first pipeline comment (marker `<!-- wr-rewrite: v1 sha256=... -->`), with
the verbatim text quoted in it. It changes the title only if it lacks the `[WR]` prefix, and
then only by adding the prefix. A later rewrite is a new comment (`v2`), never an edit.

## 5. Creating the WR issue and the draft PR together

### 5.1 WR id and names

- **WR id:** `wr-YYYYMMDD-<first 8 hex of sha256(intake key)>`, for example `wr-20261105-3fa9c21b`.
  It is deterministic, so it is known before the issue exists, and the branch, file names, and
  PR can be created in the same run. The issue number is linked once it exists.
- **Slug:** lowercase ASCII words from the rewritten title, joined with `-`, at most 40 characters.
- **Branch:** `task/<wr-id>-<slug>`, based on `daily/YYYY-MM-DD` (box-local date, America/Denver).
- **Daily branch:** If `daily/YYYY-MM-DD` is missing, create it from `main` through
  `POST /git/refs`, and only after `GET` returns 404. Never use `--force`, and never update a
  ref that already exists.

### 5.2 The one commit

| File | Contents |
| --- | --- |
| `docs/plans/<wr-id>-<slug>.md` | Starter plan: the rewritten WR, Open questions, the verbatim block, and links to the issue and PR |
| `Library/requests/<wr-id>.md` | Audrey's verbatim request as a source document, with source, timestamp, and sha256 |
| `Library/README.md` | One line appended: `Audrey Evans, YYYY-MM-DD, <title>, requests/<wr-id>.md` |
| `CHANGELOG.md` | One line under today's date: `- YYYY-MM-DD — <actor> — Opened <wr-id> (#issue, #PR): <title>` |
| `wr/memory/decisions.jsonl` | One JSON line: `{"ts","topic":"<wr-id>","decision":"WR opened","intake_key","source","issue","pr","actor","lane"}` |
| `LEDGER.md` (if it exists on the base branch) | A newest-first entry in the `standards/LEDGER_STANDARD.md` template |

### 5.3 Two modes

**Mode J (Jules opens the PR). This is the default while lane 1 works.**

1. `wr_rewrite.py` starts the Jules session (§4.2) with the WR id and branch name in the prompt.
2. The poller watches the session (§9.2). When `outputs[].pullRequest.url` appears, `wr_open.py`:
   - creates the WR issue (rewrite plus verbatim) and gets its number;
   - checks the PR: is the base `daily/YYYY-MM-DD`, is the file set exactly §5.2, does the
     verbatim sha256 match, are there zero deleted lines and no removed files?
   - repairs what it can without force. If the PR is not a draft, it runs
     `gh pr ready --undo <n>`. If Jules used its own branch name, it renames the branch with
     `POST /repos/{o}/{r}/branches/{old}/rename` to `task/<wr-id>-<slug>`; GitHub retargets
     the open PR. It adds `Refs #<issue>` to the PR as a comment and links the PR from the
     issue as a comment;
   - for anything it cannot repair (for example, extra files), comments on the PR and reports
     to TriageChief (§7). It does not close or delete anything.
3. If no PR appears within 30 minutes, or the session fails, the run switches to mode S using
   the same WR id. If Jules's PR arrives later, the poller links it as a duplicate in a comment
   and leaves both open for TriageChief. It does not close either.

**Mode S (script opens the PR). Used after 2026-11-11, when Jules is down, and for manual runs.**
`wr_open.py --mode script` writes the §5.2 files, makes one commit, pushes the task branch,
creates the issue, and opens the draft PR through `gh` within one run. Then it cross-links them.

**"Together" means one run.** In both modes, the issue and the draft PR are created by the
same `wr_open.py` invocation, within minutes of each other. If either step fails, the journal
marks the item `half-open`, and the next poll finishes the missing half. It never creates a
second copy of the half that exists.

### 5.4 Labels and markers

Only labels already on the allowlist are used: `work-request` and `wr` on the issue, `draft`
on the PR. Pipeline state lives in hidden HTML comments in issue and PR bodies and comments,
such as `<!-- wr-pipeline: id=... state=open|assigned|in-progress|ready|merged -->`, and in the
journal. No new labels are created.

## 6. Assignment

**TriageChief (1-Git-Triage) owns WR assignment.** The pipeline does not choose owners.

1. For each new WR, `scripts/wr-pipeline/wr_assign.py` builds a candidate list: one option per
   agent that can own work. Evidence comes from the agent's scorecard history
   (`scripts/agent-scorecard/`, `logs/agent-audit/`), past WRs of the same Output Type, and
   the routing policy (`docs/AGENT_ROUTING_POLICY.md`).
2. It runs the deterministic confidence scorer:
   `python3 scripts/confidence_scorer.py --json < candidates.json`. That means fixed weights,
   threshold 70, margin 10, and ties broken by `id` (`docs/standards/confidence-scorer.md`).
3. **`proceed`:** TriageChief records the owner. There is no `[VERIFY]` GitHub assignee,
   because the bots share the `midnghtsapphire` account. The owner goes in an
   `Owner: <agent>` line in a pipeline comment and in the journal.
   **`gather_more_evidence_or_escalate`:** TriageChief decides, and the scorer input and output
   are attached so the decision can be replayed. It is not escalated to Audrey.
   **`ask_owner`:** Only for the five Audrey topics in §7. Flags map as follows:
   `spends_money` → money, `destructive` → deletion, force-push, or visibility change; the
   pipeline adds a `secrets` reason line for anything that touches a credential.
4. The scorer input JSON and output JSON are posted in the assignment comment and appended to
   the journal. Same input, same owner, every time.

**Dependency:** `scripts/confidence_scorer.py` was merged into `daily/2026-11-04` (PR #18249).
It is not on `main` or `daily/2026-11-05` yet. Assignment cannot run on branches cut from
`main` until that daily branch reaches `main` (Q6).

## 7. Status reporting

- **Status goes to Proofy and 1-Git-Triage, not Audrey.** `wr_status.py` appends one JSON line
  per state change to `wr/status/YYYY-MM-DD.jsonl` and posts a short pipeline comment on the WR
  issue. Proofy and 1-Git-Triage **pull** those (§9). Nothing is pushed to them.
- A daily roll-up, `wr/summaries/YYYY-MM-DD-wr-pipeline.md`, is committed through a normal
  draft PR into the daily branch. It lists opened, assigned, in progress, ready, merged, and
  stuck items.
- **Audrey is asked only about:** (1) money, (2) deletions, (3) force-pushes, (4) visibility
  changes, (5) secrets. Those questions are collected in one place (Q7 asks where) with the
  exact change spelled out. Everything else is decided by TriageChief or the assigned owner.
- Bots must not tag Audrey on routine status. `wr_status.py` refuses to write `@` mentions of
  her account unless the reason is one of the five.

## 8. Merge rule, and append-only

### 8.1 Silent merge

Owner direction, verbatim (Audrey, 2026-11-05): *"can you approve those or from now on act
silently and approve everything"*.

`scripts/wr-pipeline/wr_merge_sweep.py`, run by cron or by hand, merges a PR without asking or
notifying anyone when **all** of these hold:

1. The PR is **not** a draft. The owner marks it ready when the work is done; pipeline PRs
   start as drafts.
2. Its mergeable state is `clean`: no conflicts, and every required check that reports is green.
3. **No deletions:** `deletions == 0` across the PR, and no file has status `removed`. A
   rename to `.disabled` with no content change passes.
4. The base is a `daily/YYYY-MM-DD` branch, or another base Audrey has already approved for
   silent merge.
5. The PR does not touch any of the five Audrey topics in §7.

It uses the repo's default merge method (Q5). It never uses admin bypass, force, or a branch
deletion after merge, and it never rebases someone else's branch. Each merge gets a journal
line and a `wr/status` line.

**Conflicts to resolve (recorded, not decided here):** `AGENTS.md` OWNER RULE §6 says "Agents
never merge their own PRs", and `process/wr-pr-pipeline.md` says enforcement machinery always
needs a human merge. Audrey's 2026-11-05 direction is later, and owner-authored, so it is
treated as controlling, as `AGENTS.md` says. Both older texts stay in place. Q4 asks her to
confirm the scope.

### 8.2 Append-only

- Never delete a file, line, branch, issue, PR, comment, or label.
- Retire code by commenting it out in place with
  `# RETIRED YYYY-MM-DD by <agent> — <reason> — <WR/PR>`. Retire a whole file by renaming it
  to `<name>.disabled` and adding a dated note to `CHANGELOG.md` and the ledger saying what it
  did and what replaced it.
- Corrections are new entries that reference the old one (`standards/LEDGER_STANDARD.md` §5).
- Existing workflows (`wr-pr-creation.yml`, `brain-dump-intake.yml`, `wr-rewrite.yml`, and
  others) are **not** touched by this plan. If one is later retired, it is renamed to
  `.disabled` only with a go (Stage 6), because that is a workflow change.

## 9. Pull-only architecture and efficient pull paths

**Rule (Audrey via TriageChief, 2026-11-05):** Scrapers and processors keep all their work on
their own servers. This pipeline **pulls** results from them. It never pushes to them, and it
takes no inbound webhooks. GitHub, Jules, the brain-dump repo, and every scraper are read by
polling. The only writes go to our own targets: issues, PRs, and commits in Audrey's repos.

These pull paths may later become APIs that Audrey hosts and sells, so each one is designed as
if it were already a product endpoint.

### 9.1 The contract a pull source should offer

| Feature | Requirement |
| --- | --- |
| **Since-cursor** | `GET /results?since=<opaque cursor>&limit=<n>` returns items in a stable order (`updated_at`, then `id`) plus `next_cursor`. The cursor is opaque, so its meaning can change without breaking clients. |
| **Conditional requests** | Every response carries a strong `ETag` and `Last-Modified`. `If-None-Match` or `If-Modified-Since` returns `304` with no body. |
| **Batching** | Up to 100 items a page. A batch read takes many ids in one call (`?ids=a,b,c`). NDJSON for large pages. |
| **Compression** | `gzip` or `br` on every response over 1 KB |
| **Immutability** | Results are append-only events with ids that never change (the same model as Jules activities), so clients can cache them forever |
| **Rate limits** | `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset` headers, plus `Retry-After` on 429 or 503 |
| **Idempotency** | Re-reading a cursor gives the same items, so a crash mid-run loses nothing |
| **Auth** | A read-only key per client, sent in a header and never in the URL, so it is never logged |

### 9.2 How the poller pulls today's sources

`scripts/wr-pipeline/wr_poll.py` is stdlib Python. It shells out to `gh api` for GitHub, and
uses `urllib` with an opener that ignores the system proxy for loopback (`AGENTS.md` gotcha).

| Source | Call | Efficiency |
| --- | --- | --- |
| Brain-dump issues | `GET /repos/Freedom-Angel-Corp/brain-dump/issues?state=all&sort=updated&direction=asc&since=<cursor>&per_page=100` | Since-cursor stored per repo. `If-None-Match` with the stored ETag; GitHub does not count an authorized `304` against the primary rate limit. Only new or changed issues are fetched. |
| Direct WR issues | The same call on each target repo, or **one GraphQL query** that batches every target repo (`repository(owner,name){ issues(filterBy:{since:...}, first:100) }`) | One request for N repos instead of N |
| PR state (for merge sweep and status) | GraphQL `search(query:"is:pr is:open base:daily/<date> repo:...")` with `isDraft`, `mergeable`, `mergeStateStatus`, `deletions`, `files(first:100){ changeType }` | One query per sweep. Pages through `pageInfo.endCursor`. |
| Notifications (optional cheap wake-up) | `GET /notifications?since=<cursor>` with `If-Modified-Since` | Obeys `X-Poll-Interval`. A `304` means nothing to do, so the heavier calls are skipped. |
| Jules sessions | `GET /v1alpha/sessions/{id}` and `GET /v1alpha/sessions/{id}/activities?createTime=<last seen>` | Activities are immutable, and the `createTime` filter is a range cursor, so only new activities cross the wire. Cached forever on disk. `sources` is cached for 24 hours. |
| Future scrapers and processors | The §9.1 contract | Same cursor, ETag, and cache code path. A new source is a config entry, not new code. |

**State and cache.** Cursors, ETags, and the response cache are kept locally at
`~/.revvel/wr-pipeline/state.json` and `~/.revvel/wr-pipeline/cache/`. They are outside the
repo because they change every minute. The daily roll-up commits a snapshot of the cursors to
`wr/status/` so a new machine can resume (Q8).

**Rate-limit discipline.**

- GitHub REST: 5,000 requests an hour for the token. Check `x-ratelimit-remaining`, and stop
  the run cleanly below 200.
- GitHub secondary limits on content creation: about 80 a minute and 500 an hour for
  issues, comments, and PRs ([VERIFY] against current GitHub docs in Stage 0). Write calls are
  queued at 1 a second, at most 1 in flight, with exponential backoff on 403 or 429 that obeys
  `Retry-After`.
- Jules: daily task and concurrency limits depend on Audrey's plan. Read them in Stage 0, and
  cap sessions started per run under them. Over the cap, queue the request in the journal and
  use mode S. Never upgrade a plan, because that is money (§7).
- Jitter every cron run by 0 to 60 seconds so machines do not poll in lockstep.

**Why this sells later.** The poller's source adapter and the §9.1 contract are the same
interface. When Audrey hosts a source as an API, its clients get cursor plus ETag reads that
cost almost nothing when idle. That is the cheapest and most cacheable way to serve pull
clients.

## 10. Execution with no GitHub-hosted Actions

### 10.1 Scripts (to be written in Stage 2; nothing exists yet)

All of these go under `scripts/wr-pipeline/`. They are stdlib Python 3, use the `gh` CLI, and
need no new dependencies.

| Script | Job |
| --- | --- |
| `wr_intake.py` | Append to the journal. Dedupe by intake key. |
| `wr_rewrite.py` | The lane adapter (§4.2) |
| `wr_verify.py` | The no-inventing checker (§4.1) |
| `wr_open.py` | Mode J verification and repair, or mode S creation (§5) |
| `wr_poll.py` | Every pull path (§9.2). Calls the others. |
| `wr_assign.py` | Builds candidates and calls `scripts/confidence_scorer.py` (§6) |
| `wr_status.py` | Status lines and the daily roll-up (§7) |
| `wr_merge_sweep.py` | Silent merge (§8.1) |
| `README.md` | The manual runbook for every step |

Every script supports `--dry-run`, which prints the API calls it would make and makes none.
Every script exits non-zero with a plain reason. Every script masks secrets: env values are
never echoed, and `gh` runs with `GH_PROMPT_DISABLED=1`.

### 10.2 Where it runs

- **Audrey's machine or the box, from cron.** Linux or macOS example:
  `*/5 * * * * cd ~/revvel-standards && python3 scripts/wr-pipeline/wr_poll.py >> ~/.revvel/wr-pipeline/poll.log 2>&1`
  and `15 * * * * ... wr_merge_sweep.py`.
- **Windows:** Task Scheduler, every 5 minutes, running
  `py scripts\wr-pipeline\wr_poll.py` with the repo as the working directory.
- **Self-hosted runner:** The repo's `runs-on: self-hosted` pattern can also call the same
  scripts. Billing for that runner [VERIFY] is a money question for Audrey before use.
- **One lock file** (`~/.revvel/wr-pipeline/lock`) stops overlapping runs.

### 10.3 Manual operation

Every automated step has a manual command in §4.3. Running `python3 scripts/wr-pipeline/wr_poll.py --once`
does one full cycle by hand. Running `wr_poll.py --once --dry-run` shows what a cycle would
do without doing it.

## 11. Open questions for Audrey

Q1 and Q2 are answered and locked as of 2026-11-05 (§0). Q3 through Q10 stay open.

1. **Q1. After 2026-11-11, which lane is the default rewriter?** Options: the repo model chain
   (lane 4), another coding agent with an API, or a Google successor such as Antigravity
   [VERIFY whether it has an API].
   **ANSWERED 2026-11-05 (supersedes the open options above):** **Roo or Roomote**. Free-tier
   first; any paid option needs its own WR/PR.
   **Locked, both options (RulesSteward, same day, 1-Git-Triage widget t83s308 → Proofy):**
   Audrey did not pick only one. Lane 4 and lane 5 (verbatim) are the fallbacks if Roo and
   Roomote are unavailable. No call path is specified.
   **Resolved 2026-11-05:** Q1 is answered. See "Decisions 2026-11-05" at the end of this plan.
2. **Q2. Run the Jules data export before 2026-11-11?** It saves sessions, memories, settings,
   and environment variable values. The export contains secrets, so it must stay out of every
   repo, and storing it is a secrets decision.
   **ANSWERED 2026-11-05 (supersedes the open ask above):** **Yes.** Secret runs Google's Jules
   export into the **vault only** (includes stored secrets). Never commit export contents to
   any repo.
   **Locked (same source):** The export may include secrets. Free-tier first. Anything paid
   needs its own WR/PR for Audrey's approval. No bot is created from this note alone. No
   export contents go in this repo.
   **Resolved 2026-11-05:** Q2 is answered. See "Decisions 2026-11-05" at the end of this plan.
3. **Q3. Where do chat bots file requests?** The plan uses `Freedom-Angel-Corp/brain-dump`
   issues. Is that right for every bot, including ones without GitHub access?
4. **Q4. Silent merge scope.** Does the 2026-11-05 "approve everything" direction cover
   enforcement machinery (gates, triage wiring, Dragnet), which `process/wr-pr-pipeline.md`
   reserved for a human merge? Does it cover the `daily/*` → `main` merge, or only
   task → daily?
   **Resolved 2026-11-05:** Q4 is answered. See "Decisions 2026-11-05" at the end of this plan.
5. **Q5. Merge method:** squash, merge commit, or rebase? `CHANGELOG.md` records that a squash
   merge once dropped six commits (PR #17913), which argues for merge commits.
6. **Q6.** `scripts/confidence_scorer.py` and the root `LEDGER.md` exist only on
   `daily/2026-11-04`. When does that branch reach `main`? Until then, this PR records its
   ledger entry in `wr/memory/decisions.jsonl` only, rather than creating a second root
   `LEDGER.md` that would collide with the one on `daily/2026-11-04`.
   **Resolved 2026-11-05:** Q6 is answered. See "Decisions 2026-11-05" at the end of this plan.
7. **Q7. Where do the five Audrey questions go?** Options: one pinned Discussion, a single
   issue, or chat with one named bot.
8. **Q8.** Is a daily snapshot of cursors in `wr/status/` enough to satisfy "everything in the
   repo", or should the full poll cache be committed too?
9. **Q9.** TriageChief and 1-Git-Triage do not appear anywhere in this repo yet. Where is their
   identity and permissions row (as the `revvel-hail` `AGENT-PERMISSIONS.md` rule asks)?
   **Resolved 2026-11-05:** Q9 is answered. See "Decisions 2026-11-05" at the end of this plan.
10. **Q10.** Who gives the go for each stage below: Audrey, or TriageChief on her behalf?

## 12. Rollout (each stage starts only after a go)

| Stage | What happens | Exit check | Go needed from |
| --- | --- | --- | --- |
| **0. Decide and verify (urgent, before 2026-11-11)** | Answer Q1, Q2, Q4, Q10. Run one Jules API session against a throwaway branch to confirm: branch naming, draft state, `AUTO_CREATE_PR` output shape, quota. Confirm GitHub branch-rename permission and secondary limits. **Update 2026-11-05:** Q1 (Roo or Roomote) and Q2 (Secret → vault only; free-tier first) are locked; Q4 and Q10 remain. | Findings recorded in this plan as a dated addendum | Audrey |
| **1. Manual runbook only** | `scripts/wr-pipeline/README.md` with the §4.3 commands. Audrey or any bot can open a WR and draft PR by hand. | One real request goes from intake to issue plus draft PR by hand | Audrey / TriageChief |
| **2. Scripts, run by hand** | Write the §10.1 scripts with tests (stdlib `unittest`, as the scorer does). Run `--dry-run` first, then for real on three requests. | Tests green. Three WR and PR pairs that pass `wr_verify.py`. | Audrey / TriageChief |
| **3. Polling from cron** | Turn on `wr_poll.py` every 5 minutes on one machine | 48 hours with no duplicate WRs, no missed brain-dump items, and rate-limit headroom above 50% | Audrey / TriageChief |
| **4. Assignment** | `wr_assign.py` and the scorer for TriageChief | Assignments replay byte-identically from the journal | TriageChief |
| **5. Status to Proofy and 1-Git-Triage** | `wr_status.py` and the daily roll-up | A full day in which Audrey receives no routine status | TriageChief |
| **6. Silent merge** | Turn on `wr_merge_sweep.py` | One week with every merge meeting §8.1, and no deletion merged | Audrey (Q4, Q5 answered) |
| **7. Pull APIs** | Harden the §9.1 contract into a hosted, sellable endpoint | Load test: idle polling cost less than 1 KB per `304` | Audrey (money and visibility) |

## 13. Handoff

- **Finished:** This plan (docs only), its Library sources file, a `CHANGELOG.md` line, and a
  `wr/memory/decisions.jsonl` entry, all in one commit on a draft PR into `daily/2026-11-05`.
- **Not done, on purpose:** No scripts, no bots, no workflow edits, no labels, no merges.
- **Next owner:** Audrey, for the Stage 0 decisions. Then TriageChief (1-Git-Triage) to
  schedule Stage 1.
- **2026-11-05 update:** Q1 and Q2 are locked (§0). Still need Audrey in Stage 0: Q4, Q10,
  one Jules API session on a throwaway branch, GitHub branch-rename permission, and secondary
  limits. No bot was created by this lock.

## Decisions 2026-11-05

Audrey Evans answered these through 1-Git-Triage's question card on 2026-11-05. They are
resolved. Text earlier in this plan is kept as written; where it disagrees, this section
controls.

- **Q1 (resolved).** After 2026-11-11 the WR/PR rewriter is Roo or Roomote (Roo Code's cloud
  agent). Jules stays primary until 2026-11-11. Roo/Roomote plugs into the same in-code
  rewrite step (§4.2) as the Jules adapter did: `wr_rewrite.py` calls a Roo adapter with the
  same input (raw request plus WR id) and expects the same output (WR body, branch name,
  draft PR text). The adapter uses Roomote's cloud API to start a task against the WR branch
  and poll it, or the Roo Code CLI in headless mode on the runner machine for local runs.
  Keys stay in the vault, never in the repo. If Roo and Roomote are both unavailable, the
  repo model chain (lane 4: LM Studio → Ollama → OpenRouter with the paid gate, then the
  no-key Perplexity bridge) and then verbatim stay the fallbacks. Wiring needs its own WR/PR.
- **Q2 (resolved).** Yes to the Jules data export. Secret runs it into the vault only, never
  a repo.
- **Q4 (resolved).** Silent merges of clean PRs are fine. A bot never merges its own PR.
- **Q6 (resolved).** Land `scripts/confidence_scorer.py` and the root `LEDGER.md` from
  `daily/2026-11-04` (#18249) once it is green.
- **Q9 (resolved).** TriageChief = 1-Git-Triage. It gets added to the `AGENTS.md` roster later
  (separate WR/PR).
- **New merge gate.** Audrey's exact words: "Make sure the code has been assigned and done
  before merge." Before a PR merges, its WR/issue must be assigned to a bot and marked done,
  and the PR must deliver that work. This applies on top of §8.1.
