# BIOME — Biomimetic Independent Operations & Monitoring Engine

A **credit-free, additive** self-healing crew for `revvel-standards`. BIOME runs
*alongside* the existing ~70-workflow fleet. It edits, renames, and deletes
nothing (per `standards/COMMENT-DONT-DELETE.md` (RVS-AGENT-001) and
`standards/PRESERVE_GOALS_AND_HISTORY.md` (RVS-PRESERVE-001)).

## Why it exists

The existing self-healing loop leans on AI lanes (OpenRouter / Anthropic /
Perplexity). When Doppler rotates or wipes those secrets, the AI lanes go dark and
triage collapses to a dead "static-fallback · rule-based" stub that pings
`needs-human`. BIOME is the layer that **keeps healing when the keys are gone**:
every worker runs on deterministic rules + the free, built-in `GITHUB_TOKEN`.

> **Credit-free invariant:** no BIOME worker ever requires a paid API key. Missing
> AI keys are *informational*, never a degradation of the crew.

## The metaphor (sheaves + biomimicry)

- **Sheaf** — each worker emits a *local* status section; `sheaf` glues them into
  one globally-consistent fleet-health object (local sections → global section,
  exactly as a sheaf glues). That global object is the monitor feed.
- **Biomimic** — each worker is a biological self-healing *reflex* that fires
  without external dependencies, the way an immune response doesn't wait for
  permission.

## The crew

| Worker | Biomimetic role | Schedule | What it does (rule-based, no AI) |
|--------|-----------------|----------|----------------------------------|
| `biome-sentinel` | nociceptor (pain sensor) | every 2h | Scans recent runs + open issues; files one deduped `[BIOME-SENTINEL]` incident when failures or stuck items cross threshold. Ongoing incidents are **refreshed quietly** (issue body/title edited in place — no comment spam) and **auto-resolved** (one resolution comment + close) when the fleet recovers. |
| `biome-medic` | macrophage (immune cell) | every 6h | Re-surfaces stuck items (`self-heal` label + comment); when AI lanes are offline, clears dead `openrouter:needs-key` blocks. Storm-safe; never deletes content. |
| `biome-homeostat` | homeostasis regulator | every 6h | Detects missing AI keys (the Doppler-wipe case); posts ONE consolidated, deduped status note and auto-resolves it when keys return. No `needs-human` spam. |
| `biome-sheaf` | connective tissue | hourly | Glues every worker's local section into `biome-status.json` + `biome-status.html` and commits them (single committer — no commit races). |
| `biome-inspector` | proprioception (is it alive?) | every 6h | HTTP-checks every app's live URL from `docs/app-deployments.yml` (2xx = testable-live), publishes `app-completion.json` (+ `.html`), and files a deduped worklist of missing/unreachable projects so they get finished. Enforces DEFINITION_OF_DONE #1. |

## The loop (detect → remediate → regulate → monitor → inspect → reset)

1. **Detect** — `biome-sentinel` finds failures/stuck items via the GitHub API and
   files a deduped incident labeled `biome`, `scorecard`, `self-heal`. While the
   pain persists, each 2h sweep edits the incident's body/title in place (a
   notification-free PATCH; the previous snapshots stay in the issue's edit
   history). It never posts a per-sweep comment — the old comment-per-sweep
   behavior turned long incidents into notification storms (see incident #15491).
   When the fleet recovers, sentinel posts one resolution comment and closes the
   incident, fulfilling the body's "auto-resolves" promise.
2. **Remediate** — `biome-medic` applies rule-based, storm-safe fixes (re-label +
   comment; clear dead key-blocks). Re-running failed runs is **off by default**.
3. **Regulate** — `biome-homeostat` keeps the crew "healthy" even with AI lanes
   offline and surfaces a single, calm status note.
4. **Monitor** — `biome-sheaf` publishes the glued status feed every hour.
5. **Inspect** — `biome-inspector` HTTP-checks every app's live Vercel URL, publishes
   the completion scoreboard, and files a worklist of projects that aren't
   testable-live yet so the loop drives them to done.
6. **Reset** — incidents/status notes/worklists auto-resolve (close) when the fleet
   recovers; nothing is force-deleted.

## The monitor feed (for Lovable)

Two workers commit stable, machine-readable feeds: `biome-sheaf` writes the
fleet-health status, and `biome-inspector` writes the app-completion scoreboard.

- `docs/biome/biome-status.json` — schema `biome-status/v1` (fleet health)
- `docs/biome/biome-status.html` — self-contained human view
- `docs/biome/app-completion.json` — schema `biome-app-completion/v1` (which apps are
  testable-live right now — written by `biome-inspector`)
- `docs/biome/app-completion.html` — self-contained human view

Lovable (or any external monitor) can poll the raw JSON, e.g.:

```text
https://raw.githubusercontent.com/midnghtsapphire/revvel-standards/main/docs/biome/biome-status.json
```

Feed shape:

```json
{
  "schema": "biome-status/v1",
  "generated_at": "<ISO-8601>",
  "credit_free": true,
  "overall": "healthy | degraded | down",
  "workers": {
    "sentinel":  { "status": "...", "summary": "...", "counts": {}, "detail": {} },
    "homeostat": { "status": "...", "summary": "...", "counts": {}, "detail": {} },
    "medic":     { "status": "...", "summary": "...", "counts": {}, "detail": {} },
    "sheaf":     { "status": "...", "summary": "...", "counts": {}, "detail": {} }
  }
}
```

`overall` is the worst severity across workers (the sheaf gluing rule). A missing
AI key keeps `overall` healthy by design.

## Standards adherence

- **No-delete / preserve** — workers only add labels/comments and close resolved
  ops issues; they never delete code or content. Removing a stale *label* is
  metadata, not a content deletion.
- **Token-with-fallback** — every worker uses
  `secrets.ADMIN_GITHUB_TOKEN != '' && secrets.ADMIN_GITHUB_TOKEN || secrets.GITHUB_TOKEN`.
- **`GH_REPO`** — set so `gh`/API calls resolve the repo without a remote.
- **Narrow permissions** — least privilege per worker. Only `biome-sheaf` and
  `biome-inspector` get `contents: write`, and each commits its *own* feed file
  (`biome-status.*` vs `app-completion.*`) on offset schedules (sheaf hourly at
  :00, inspector every 6h at :30); `biome-inspector` also rebases before pushing,
  so the two never race.
- **No untrusted interpolation** — no `${{ github.event.* }}` is interpolated into
  any `run:` shell.

## Files

```text
.github/workflows/biome-sentinel.yml
.github/workflows/biome-medic.yml
.github/workflows/biome-homeostat.yml
.github/workflows/biome-sheaf.yml
scripts/biome/gh.js          # shared credit-free GitHub REST helper
scripts/biome/sentinel.js    # detection rules
scripts/biome/homeostat.js   # AI-lane assessment
scripts/biome/medic.js       # remediation rules
scripts/biome/sheaf.js       # status gluing + HTML render
docs/biome/crew.yml          # worker registry (frontmatter per worker)
docs/biome/README.md         # this file
docs/biome/biome-status.json # generated feed (bootstrap committed; refreshed hourly)
docs/biome/biome-status.html # generated human view
tests/biome-*.test.js        # unit tests for the rule-based logic + workflow lint
```

## Tests

```bash
npm ci
node --test tests/biome-sentinel.test.js tests/biome-homeostat.test.js \
  tests/biome-medic.test.js tests/biome-sheaf.test.js tests/biome-workflows.test.js
```

## Status

**Bootstrap (2026-06-30).** Workflows are scheduled and the feed path is seeded
with a bootstrap snapshot; the first scheduled `biome-sheaf` run replaces it with
live data.

## Field notes / known pain signatures

- **PR Lifecycle failing in bulk (dozens per sweep):** the dominant signature in
  incident #15491 was `403 API rate limit exceeded for installation`
  (`x-ratelimit-used: 5000`) on `GET /pulls?state=open&per_page=100`. That is the
  shared 5,000 req/h installation budget for `GITHUB_TOKEN` being exhausted by the
  fleet as a whole, not a bug in the failing workflow itself. If sentinel reports
  waves of `PR Lifecycle` / `PR State Orchestrator` failures, check the failing
  job's log for `x-ratelimit-remaining: 0` before changing any workflow code —
  the fix is reducing fleet-wide API pressure (fewer triggers, caching, backoff),
  not patching the reporter.
- **Sentinel itself feeling "chatty":** by design it edits the incident in place;
  if you see repeated sentinel comments on one incident again, the quiet-refresh
  PATCH in `scripts/biome/sentinel.js` has regressed
  (guarded by `tests/biome-sentinel.test.js`).
