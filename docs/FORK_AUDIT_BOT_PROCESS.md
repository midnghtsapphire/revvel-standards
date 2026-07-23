# Fork-Audit Bot — Process

**Issue reference:** *"Improving my trust and presence I want to create an auto
system that forks existing github repositories, emphasising ones with high
value to my goals to assist and run through my process and create evals and
audits based on what is good and what is bad. Assign a score... create an Issue
in their system or PR... update my authority in github and www the world using
the metrics they use to up my presence... use a swarm... what ever is required
for this cron job?"*

**Follow-up comment:** *"I am wondering if you handle the pull request with
required label and create the compliant PR can you then assign to openrouter
so it actually works."* — yes, see §Compliant-PR routing below.

---

## TL;DR

1. A **daily cron** runs [`scripts/fork-audit-bot.js`](../scripts/fork-audit-bot.js)
   over a curated list of upstream repositories in
   [`fork-audit/candidates.json`](../fork-audit/candidates.json).
2. For every candidate the bot fetches public metadata, computes a
   **transparent 0‑100 score** against a fixed rubric, and decides on an action.
3. **Every scored repo gets a mirror audit issue** opened inside
   `midnghtsapphire/revvel-standards`. The mirror issue already carries the
   **required routing labels** (`openrouter`, `auto-fix`, `copilot`,
   `role:orchestrator`, `fork-audit`, `upstream-contribution`) and is assigned
   to **`@Copilot`** — which is exactly the routing signal
   [`openrouter-assignee.yml`](../.github/workflows/openrouter-assignee.yml)
   consumes. The OpenRouter orchestrator therefore picks up the audit without
   any extra glue.
4. When the score is high enough the bot **also opens an issue upstream** with
   the same routing labels, giving you a public contribution (which feeds the
   presence metrics in §GitHub Presence & Authority below).
5. A swarm is already in place — this bot is the **entry-point**, and the
   existing Ralph / OpenRouter / Jules / Codex routing is the **swarm** (see
   [`skills/openrouter-swarms/SKILL.md`](../skills/openrouter-swarms/SKILL.md)).

---

## Architecture

```text
 ┌──────────────────────────────────────┐
 │ Cron 13:15 UTC daily                 │
 └──────────────┬───────────────────────┘
                ▼
  .github/workflows/fork-audit-bot.yml
                │  runs
                ▼
      scripts/fork-audit-bot.js
                │
   ┌────────────┴────────────┐
   ▼                         ▼
 GET /repos/{cand}     loadConfig(candidates.json)
   │                         │
   └───────► scoreRepo() ◄───┘
                │
                ▼
     ┌──────────┴──────────┐
     ▼                     ▼
 mirror issue in     (score ≥ 70) upstream
 revvel-standards    issue in candidate repo
     │                     │
     │                     └─► carries routing labels
     ▼                         so any OpenRouter-aware
 openrouter-assignee.yml       automation upstream picks
     │                         it up as well
     ▼
 ralph-loop.yml ▸ Copilot / OpenRouter / Jules / Codex (the swarm)
```

---

## Scoring rubric

Deterministic, pure-function, unit-tested in
[`tests/scripts/fork-audit-bot.test.js`](../tests/scripts/fork-audit-bot.test.js).
Each signal is capped so no single metric can dominate.

| Signal | Max | Source |
|---|---:|---|
| Stars (÷100) | 20 | `stargazers_count` |
| Forks (÷50) | 10 | `forks_count` |
| Issue health | 10 | `open_issues_count` (inverted, capped) |
| OSS license | 10 | `license.spdx_id` (zero if `NOASSERTION`) |
| Recency of push | 15 | `pushed_at` (15 ≤ 30 d, 10 ≤ 90 d, 5 ≤ 365 d) |
| Strategic value | 20 | `candidates.json` × 2 |
| Goal-tag alignment | 15 | overlap of `goal_tags` with topics / description |
| Archived penalty | −25 | `archived === true` |
| Fork-of-fork penalty | −10 | `fork === true` |
| Disabled penalty | −25 | `disabled === true` |

Final total is clamped to 0‑100 and placed in one of four bands:

| Band | Score | Action |
|---|---|---|
| A | ≥ 80 | Mirror audit issue **+ upstream PR/issue** |
| B | 70‑79 | Mirror audit issue **+ upstream issue** |
| C | 40‑69 | Mirror audit issue only |
| D | < 40 | Skip |

Bands A and B are the two that generate upstream contributions — the
presence-boost half of the task.

---

## Compliant-PR routing (answering the issue comment)

> *"if you handle the pull request with required label and create the
> compliant PR can you then assign to openrouter so it actually works."*

Yes. The chain is:

1. The bot creates every in-repo mirror issue **already carrying** the full
   set of routing labels:
   - `openrouter`
   - `auto-fix`
   - `copilot`
   - `role:orchestrator`
   - `fork-audit`
   - `upstream-contribution`

2. The bot does **not** set any `assignees` — routing is driven by the
   `openrouter` / `role:orchestrator` / `triage:new` labels. Assigning
   `@Copilot` / `copilot-swe-agent` is explicitly out of policy (see
   [`OPENROUTER_TRIAGE_PROCESS.md`](./OPENROUTER_TRIAGE_PROCESS.md)).

3. [`openrouter-triage.yml`](../.github/workflows/openrouter-triage.yml)
   idempotently re-applies routing labels on issue/PR open and on the hourly
   cron sweep, and invokes `scripts/openrouter-triage.js` to post the
   OpenRouter triage comment.

4. When the mirror issue gets promoted to a PR (by the OpenRouter-driven
   orchestrator, by `ralph-loop.yml` after CI, or manually), the PR inherits
   the routing labels via the PR template / branch-issue wiring
   (`.github/workflows/create-issue-branch.yml`) — which means the PR is
   **compliant the moment it is opened** and is picked up by the same
   orchestrator.

5. Upstream issues carry the same labels on a best-effort basis (the bot
   swallows label-404s so it still works against repos that don't yet have
   our routing vocabulary). Any upstream repo that installs
   `openrouter-triage.yml` gets the same routing behaviour for free.

No new secret is required; `GITHUB_TOKEN` (or `ADMIN_GITHUB_TOKEN` for
cross-repo writes) is all the bot uses.

---

## GitHub Presence & Authority — metrics this bot moves

The user mentioned *"we just built it in yesterday and I forgot what we
called it"* — none of these are **one** name, they're a family of signals
that collectively define "GitHub authority". This bot moves them all:

| Signal | What it is | How this bot moves it |
|---|---|---|
| **Contribution graph** | Daily commit / issue / PR squares on `github.com/<user>` | Every mirror + upstream issue = a square |
| **GitHub Achievements** | Badges like *Pull Shark*, *Galaxy Brain*, *Pair Extraordinaire*, *Quickdraw*, *YOLO*, *Public Sponsor* ([ref](https://docs.github.com/en/account-and-profile/setting-up-and-managing-your-github-profile/customizing-your-profile/personalizing-your-profile#displaying-badges-on-your-profile)) | Upstream merged PRs → *Pull Shark*; answering upstream issues → *Galaxy Brain*; fast responses from the bot → *Quickdraw* |
| **Followers / Stars received** | First-order social signal | Upstream activity surfaces you in the "Contributors" sidebar of each target repo |
| **[OpenRank](https://open-digger.x-lab.info/openrank)** (X-lab, CHAOSS) | Network-effect authority score derived from commits, PRs, issues, reviews across repos | Contributions across many repos compound the OpenRank graph |
| **[GitRank](https://gitrank.io/)** | Third-party dev-rank service | Driven by public contribution volume + reach |
| **[CHAOSS Community Health](https://chaoss.community/metrics/)** metrics | Academic standard for open-source contribution quality | Our scoring rubric above is deliberately aligned |
| **Search ranking (github.com code/issue search)** | Influenced by activity recency + breadth | Daily cron keeps both fresh |

**Attribution.** Every issue / PR the bot opens is authored by the
`GITHUB_ACTOR` whose token runs the workflow — i.e. you (or a machine user
you own). The bot does **not** impersonate; it adds an authorship footer
linking back to this doc so upstream maintainers see exactly how the audit
was produced, which is also good-faith etiquette.

---

## Cadence & cost

- Default schedule: `cron: "15 13 * * *"` (once a day, 13:15 UTC).
- The cron itself does **not** spend OpenRouter tokens — it only routes.
  OpenRouter spend happens downstream when the orchestrator picks the
  mirror issue up. This is the same cost model documented in
  [`OPENROUTER_ASSIGNEE_PROCESS.md`](./OPENROUTER_ASSIGNEE_PROCESS.md)
  § "Tuning the cadence".
- `max_candidates_per_run` (default 5, in `candidates.json`) bounds each
  run so a 100-item candidate list doesn't open 100 issues in one burst.

Cadence suggestions:

| Goal | Cron expression |
|---|---|
| **Default — daily, budget safe** | `"15 13 * * *"` |
| Weekly audit (very cheap) | `"15 13 * * 1"` |
| Twice a day | `"15 1,13 * * *"` |
| Every 4h (aggressive presence-boost) | `"15 */4 * * *"` |

---

## Dry-running the bot

```bash
# Local, no GitHub writes, just print intended actions:
DRY_RUN=1 GITHUB_TOKEN="$(gh auth token)" node scripts/fork-audit-bot.js

# From CI:
gh workflow run "Fork-Audit Bot" -f dry_run=true
```

---

## Adding a candidate repo

Append to [`fork-audit/candidates.json`](../fork-audit/candidates.json):

```json
{
  "repo": "octo-org/some-repo",
  "goal_tags": ["ai", "observability"],
  "strategic_value": 8,
  "notes": "Why we care"
}
```

- `repo` — `owner/name` slug (required).
- `goal_tags` — lowercase tokens that are matched against the upstream
  repo's topics and description for the alignment bonus.
- `strategic_value` — integer 0‑10; the single most important knob you
  own. Doubled in the rubric.
- `notes` — free-form context captured in the mirror issue body.

Malformed entries are logged and skipped; the run continues.

---

## Escalation & failure modes

| Symptom | What the bot does | Your action |
|---|---|---|
| `GITHUB_TOKEN` missing | Hard-exits with `::error::` | Re-run via `workflow_dispatch` once configured |
| Upstream repo 404 | Logs, skips, moves on | Remove or fix the candidate entry |
| Upstream repo archived | Scored + mirrored, `archivedPenalty=-25` | Usually band D → skipped automatically |
| Label 404 upstream | Swallowed warning; issue still created | Optionally sync labels upstream via `sync-labels.yml` |
| Duplicate mirror | Detected via search; second run is a no-op | None |
| Search rate-limit during dedup | Dedup skipped, issue may be reopened | Raise `max_candidates_per_run` only after confirming quota |

For any anomaly not covered above, the existing
[`ralph-loop.yml`](../.github/workflows/ralph-loop.yml) escalates after 5
failed auto-fix attempts by pinging `@midnghtsapphire` and applying
`needs-human` + `blocked`.

---

## See also

- [`skills/fork-audit-bot/SKILL.md`](../skills/fork-audit-bot/SKILL.md) — loadable skill for any Revvel agent
- [`skills/openrouter-swarms/SKILL.md`](../skills/openrouter-swarms/SKILL.md) — the downstream swarm
- [`OPENROUTER_ASSIGNEE_PROCESS.md`](./OPENROUTER_ASSIGNEE_PROCESS.md) — the routing contract consumed by this bot
- [`STARRED_REPOS_EVAL_2026-04-20.md`](./STARRED_REPOS_EVAL_2026-04-20.md) — hand-authored precedent for the same evaluation pattern
- [`JULES_ACTION_FORK_AUDIT.md`](./JULES_ACTION_FORK_AUDIT.md) — worked example of a Band C "mirror issue only" audit resolution (`BeksOmega/jules-action`, score 44)
