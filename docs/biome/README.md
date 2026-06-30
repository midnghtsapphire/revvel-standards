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
| `biome-sentinel` | nociceptor (pain sensor) | every 2h | Scans recent runs + open issues; files/updates one deduped `[BIOME-SENTINEL]` incident when failures or stuck items cross threshold. |
| `biome-medic` | macrophage (immune cell) | every 6h | Re-surfaces stuck items (`self-heal` label + comment); when AI lanes are offline, clears dead `openrouter:needs-key` blocks. Storm-safe; never deletes content. |
| `biome-homeostat` | homeostasis regulator | every 6h | Detects missing AI keys (the Doppler-wipe case); posts ONE consolidated, deduped status note and auto-resolves it when keys return. No `needs-human` spam. |
| `biome-sheaf` | connective tissue | hourly | Glues every worker's local section into `biome-status.json` + `biome-status.html` and commits them (single committer — no commit races). |
| `biome-inspector` | proprioception (is it alive?) | every 6h | HTTP-checks every app's live Vercel URL from `docs/app-deployments.yml` (2xx = testable-live), publishes `app-completion.json` (+ `.html`), and files a deduped worklist of missing/unreachable projects so they get finished. Enforces DEFINITION_OF_DONE #1. |

## The loop (detect → remediate → monitor → reset)

1. **Detect** — `biome-sentinel` finds failures/stuck items via the GitHub API and
   files a deduped incident labeled `biome`, `scorecard`, `self-heal`.
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

`biome-sheaf` commits a stable, machine-readable feed:

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
- **Narrow permissions** — least privilege per worker; only `biome-sheaf` gets
  `contents: write` (it is the single committer of the feed).
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
