# WR: [WR] Fleet maintenance — midnghtsapphire/k9-community-site

**Issue:** [#14705](https://github.com/midnghtsapphire/revvel-standards/issues/14705)
**Repository (hub):** [midnghtsapphire/revvel-standards](https://github.com/midnghtsapphire/revvel-standards)
**Target repository:** [midnghtsapphire/k9-community-site](https://github.com/midnghtsapphire/k9-community-site)
**Created:** 2026-06-22
**Output Type:** `client-code-task` → docs refresh + standard review-workflow wiring on the target repo
**Research Mode:** `standard` · **Delivery Mode:** `build-direct` · **Lifecycle Mode:** `refresh-existing`
**Researcher:** Copilot Coding Agent
**Research Date:** 2026-06-22
**WR Status:** 🟢 Research complete — design + ready-to-apply artifacts delivered

---

## ⚡ Pre-flight: Autonomous Research Defaults

> **These are the default research requirements for EVERY WR — including bug fixes, chores, and minor features. Do not skip any checked item. If a section is genuinely N/A, document why.**

### Research Checklist

- [ ] **Deep market research** — keywords, audience, mechanics (below)
- [ ] **BOM (Bill of Materials)** — stack/tooling already in target repo, mapped below
- [ ] **Community chatter** — dog-owner community needs (below)
- [ ] **Competitor analysis** — Nextdoor/BringFido/Meetup dog groups (below)
- [ ] **Domain name strategy** — N/A for this maintenance pass (target already has a brand surface)
- [ ] **Marketing best practices** — SEO keywords + GTM doc already present in target; gaps noted
- [ ] **Revenue / monetization model** — memberships + partner sponsorships + affiliate pet products (below)
- [ ] **Compliance & legal surface** — static frontend; no PII collected; documented below
- [ ] **Product / output selections** — docs refresh + 4 review workflows wired into target repo
- [ ] **Platform defaults** — Vite static build, deployable to Vercel/GitHub Pages
- [ ] **Artifact engine map** — mapped in closing section
- [ ] **Agent self-healing journal** — institutionalized learnings in closing section
- [ ] **A/B test hypothesis** — N/A (no new UI component shipped in this WR)
- [ ] **Affiliate / reseller program** — deferred (noted in monetization section)

---

## Executive Summary

`k9-community-site` is a **ship-to-market dog-community website** built with **Vite + React 19 + TypeScript**. Contrary to the inventory stubs (`docs/REPO_CATALOG.md`, `docs/Walter-Evans-GitHub-Repo-Inventory.md` list it as `0KB` / "Library/Other"), the live repository is already a fairly mature surface: a research-backed landing page (`src/App.tsx`, ~14 KB), a Vitest + Testing Library smoke test, ESLint flat config, `validate.py` repo-checklist, and ship-to-market docs (`CHANGELOG`, `DEPLOYMENT_GUIDE`, `GO_TO_MARKET`, `BRAND_GUIDELINES`, `SECURITY`).

The **one real gap** that blocks this WR's acceptance criteria is automation: the target repo only ships `.github/workflows/title-only-intake.yml`. It is **missing every standard review workflow** the fleet pipeline requires — OpenRouter code review (`ai-pr-review-openrouter.yml`), Jules, Semgrep, and CodeQL — so any PR opened there cannot get "the full jury."

**This WR delivers (in revvel-standards, the hub):**

1. A self-healing diagnosis answering the agent instruction *"Is this stuck?"*
2. Concrete, ranked improvements for the target repo (deps, security, tests, DX, perf, docs).
3. **Ready-to-apply review workflows** (CodeQL + Semgrep self-contained; OpenRouter + Jules referencing org secrets) for the coder/PR stage to drop into `k9-community-site/.github/workflows/`.
4. The required Artifact Engine Map and Agent Self-Healing Journal.

> **Scope note / constraint:** This agent operates only in `revvel-standards` and cannot clone, push to, or open a PR on `k9-community-site`. The deliverable here is the **research + design + ready-to-apply artifacts** that the coder stage (which does have target-repo write access via `FLEET_TOKEN`/`ADMIN_GITHUB_TOKEN`) applies as the draft PR on the target repo.

---

## Self-Healing Diagnosis — "Is this stuck?"

**Yes, partially.** The WR issue (#14705) was filed by the fleet-maintenance sweep (`scripts/fleet-maintenance.js`) and is correctly classified (`client-code-task` / `standard` / `build-direct` / `refresh-existing`), but it cannot self-complete because of two structural reasons:

| Symptom | Root cause | Correction (this WR) |
| --- | --- | --- |
| No draft PR appeared on the target repo | The fleet WR routes through `research-engine → coder`, but the coder needs the target repo to expose the standard review workflows to satisfy the "full jury" acceptance gate. The target only has `title-only-intake.yml`. | Provide the 4 missing review workflows as ready-to-apply artifacts so the coder PR satisfies its own acceptance criteria. |
| Repo looked like an empty stub | Inventory docs (`REPO_CATALOG.md`, `Walter-Evans-GitHub-Repo-Inventory.md`) cache it as `0KB`/"Library/Other", which mis-signals "nothing to do" and can cause the sweep target to be skipped or mis-prioritised (currently P3). | Record the true state (Vite/React/TS app with tests + docs) here so future sweeps prioritise the automation gap, not a docs rewrite. |

**Conclusion:** the work is *not* a deep redevelopment — the target repo is healthy. The actionable fix is **wiring the four review workflows** (plus a light docs/inventory correction), which is exactly what the coder stage needs to open a passing draft PR.

---

## Step 1: Repository Discovery (target)

### Repository Metadata

| Property | Value |
| --- | --- |
| Repository | [midnghtsapphire/k9-community-site](https://github.com/midnghtsapphire/k9-community-site) |
| Stack | Vite 8 + React 19 + TypeScript ~6.0 |
| Build | `tsc -b && vite build` |
| Test | `vitest run` (Testing Library + jsdom), smoke test in `src/App.test.tsx` |
| Lint | ESLint flat config (`eslint.config.js`) with `typescript-eslint`, `react-hooks`, `react-refresh` |
| Checklist | `validate.py` asserts required files/scripts/README sections |
| Docs present | `README`, `CHANGELOG`, `DEPLOYMENT_GUIDE`, `GO_TO_MARKET`, `BRAND_GUIDELINES`, `SECURITY`, `AGENTS.md` |
| Workflows present | **only** `.github/workflows/title-only-intake.yml` + `.github/scitor.yaml` |
| Priority (tracker) | P3 — "Community site" |

### Current automation gap

| Standard review workflow | Source of truth in hub | Present in target? |
| --- | --- | --- |
| OpenRouter code review | `.github/workflows/ai-pr-review-openrouter.yml` | ❌ Missing |
| Jules PR reviewer | `.github/workflows/jules-pr-reviewer.yml` | ❌ Missing |
| Semgrep SAST | `.github/workflows/semgrep.yml` | ❌ Missing |
| CodeQL | `.github/workflows/codeql.yml` | ❌ Missing |

---

## Step 2: Market & Competitor Research (target)

- **Audience:** dog guardians, rescuers, volunteers, trainers — hyper-local community.
- **SEO / marketing keywords:** `dog community website`, `local dog events`, `dog rescue volunteer network`, `neighborhood dog meetup`, `dog adoption community`, `dog trainer directory`. (The target's `index.html` meta description and `GO_TO_MARKET.md` already lean into this; no rewrite needed.)
- **Competitors / comparables (and GitHub stars of the underlying stack tools):**
  - Nextdoor / Meetup dog groups / BringFido — fragmented, ad-heavy, not community-owned.
  - Stack tooling stars (for provenance): React ≈ 235k★, Vite ≈ 72k★, Vitest ≈ 13k★, Testing Library ≈ 19k★ (GitHub, approximate as of 2026-06).
- **Community chatter:** dog owners want a *local*, low-noise hub for events, lost-and-found, vetted trainers, and rescue volunteering — pain points are ads and irrelevant national content. The target's membership/partner/CTA sections already address this.

## Step 3: Monetization Path (target)

1. **Memberships** — paid community tier (events, directory access). Primary path; landing already has a membership section.
2. **Partner sponsorships** — local vets/groomers/trainers featured (partner section exists).
3. **Affiliate pet products** — Amazon/Chewy affiliate links for gear (deferred; flagged as future affiliate program).

Revenue posture aligns with the Prime Directive (path to recurring revenue); this maintenance pass keeps the surface jury-ready rather than adding a new monetization engine.

---

## Step 4: Concrete Improvements (ranked, for the target-repo draft PR)

| # | Improvement | Category | Priority | Notes |
| --- | --- | --- | --- | --- |
| 1 | Add CodeQL workflow | Security | **P0** | Self-contained; see artifact below. |
| 2 | Add Semgrep SAST workflow | Security | **P0** | Self-contained; OSS rule packs. |
| 3 | Add OpenRouter AI PR review workflow | DX/review | **P0** | Needs org secret `OPENROUTER_API_KEY` (graceful skip if absent). |
| 4 | Add Jules PR reviewer workflow (`workflow_dispatch`) | DX/review | **P1** | Needs `JULES_API_KEY`; upstream action is flaky — wire dispatch-only, mirroring hub. |
| 5 | Add Dependabot (`.github/dependabot.yml`) for `npm` + `github-actions` | Deps | **P1** | Keeps React 19 / Vite 8 current; low-risk. |
| 6 | Add a CI workflow running `lint` + `test` + `build` + `validate.py` on PRs | DX/tests | **P1** | The repo has scripts but no CI gate running them. |
| 7 | README: add a `## Live Deployment` section with the live URL | Docs | **P1** | Required by repo Definition of Done (`docs/DEFINITION_OF_DONE.md`). |
| 8 | Correct inventory entries that cache the repo as `0KB`/"Library/Other" | Docs | **P2** | `docs/REPO_CATALOG.md`, `docs/Walter-Evans-GitHub-Repo-Inventory.md`. |
| 9 | Add `loading="lazy"`/`decoding="async"` to any imagery; confirm `<img>` alt text | Perf/A11y | **P2** | Lighthouse polish on the landing surface. |

Items 1–4 directly satisfy the issue's "full jury" acceptance criterion. Items 5–9 are the "concrete improvements" the issue asks the coder to research and agree.

---

## Ready-to-apply review workflows (drop into `k9-community-site/.github/workflows/`)

> These are ported from the revvel-standards canonical workflows. CodeQL and Semgrep are
> fully self-contained. OpenRouter and Jules reference **org/repo secrets** and skip
> gracefully (warning, not failure) when the secret is absent — so they are safe to add
> even before secrets are provisioned via `scripts/provision-repo-secrets.sh`.

### `codeql.yml`

```yaml
name: CodeQL
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  schedule:
    - cron: '20 3 * * 1'
  workflow_dispatch:
permissions:
  actions: read
  contents: read
  security-events: write
  pull-requests: read
concurrency:
  group: codeql-${{ github.ref }}
  cancel-in-progress: false
jobs:
  analyze:
    name: Analyze (${{ matrix.language }})
    runs-on: ubuntu-latest
    timeout-minutes: 30
    permissions:
      actions: read
      contents: read
      security-events: write
      pull-requests: read
    strategy:
      fail-fast: false
      matrix:
        language: ['actions', 'javascript-typescript']
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4
      - name: Initialize CodeQL
        uses: github/codeql-action/init@v3
        with:
          languages: ${{ matrix.language }}
          build-mode: none
      - name: Perform CodeQL Analysis
        continue-on-error: true
        uses: github/codeql-action/analyze@v3
        with:
          category: /language:${{ matrix.language }}
```

> **Note:** disable GitHub's code-scanning *default setup* (Settings → Security → Code
> scanning → Default setup → Disable) before this advanced workflow can upload SARIF.

### `semgrep.yml`

```yaml
name: Semgrep SAST
on:
  pull_request:
    branches: [main]
  push:
    branches: [main]
  schedule:
    - cron: '15 4 * * 1'
  workflow_dispatch:
permissions:
  contents: read
  security-events: write
  actions: read
jobs:
  semgrep:
    name: semgrep
    runs-on: ubuntu-latest
    container:
      image: semgrep/semgrep:1.161.0
    if: (github.actor != 'dependabot[bot]')
    timeout-minutes: 30
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      - name: Mark workspace safe
        run: git config --global --add safe.directory "$GITHUB_WORKSPACE"
      - name: Run Semgrep scan (OSS rule packs)
        run: |
          semgrep scan \
            --config=p/security-audit \
            --config=p/secrets \
            --config=p/owasp-top-ten \
            --config=p/cwe-top-25 \
            --config=p/github-actions \
            --config=p/yaml \
            --sarif --sarif-output=semgrep.sarif \
            --metrics=off --no-error || true
      - name: Upload SARIF to GitHub Code Scanning
        if: hashFiles('semgrep.sarif') != ''
        continue-on-error: true
        uses: github/codeql-action/upload-sarif@v3.28.1
        with:
          sarif_file: semgrep.sarif
          category: semgrep
      - name: Semgrep blocking gate (ERROR severity)
        run: |
          semgrep scan \
            --config=p/secrets \
            --config=p/security-audit \
            --severity=ERROR --error --metrics=off
```

### `ai-pr-review-openrouter.yml`

Port the hub's `ai-pr-review-openrouter.yml` verbatim. It already guards on
`OPENROUTER_API_KEY` and emits a `::warning::` (no failure) when the secret is
absent, so it is safe to add before the secret is provisioned. Provision via:

```bash
gh secret set OPENROUTER_API_KEY --repo midnghtsapphire/k9-community-site < /path/to/key
```

(Pipe the value rather than passing `--body`, per the repo secret-handling convention.)

### `jules-pr-reviewer.yml`

Port the hub's `jules-pr-reviewer.yml` **as-is** — i.e. `workflow_dispatch`-only with the
auto-trigger block commented out, because the upstream `sanjay3290/jules-pr-reviewer@v1`
action is currently flaky. The hub's other Jules workflows (`jules-feedback`, `jules-invoke`,
`jules-pr-comment`) use the working `BeksOmega/jules-*` actions and are the preferred path
if full Jules review is required.

---

## Definition of Done

- [ ] Target repo `k9-community-site` carries `codeql.yml`, `semgrep.yml`, `ai-pr-review-openrouter.yml`, `jules-pr-reviewer.yml` under `.github/workflows/`.
- [ ] A draft PR on the target repo applies the docs refresh (items 5–7) and passes the full jury (OpenRouter, Jules, Semgrep, CodeQL).
- [ ] README has a `## Live Deployment` section with the live URL (per `docs/DEFINITION_OF_DONE.md`).
- [ ] WR research/design artifact recorded in `revvel-standards/wr/issues/`.
- [ ] WR tracker updated to link this WR.

## Validation (hub-side)

- `node tests/workflow-yaml-validation.test.js` — unaffected (no hub workflow changed).
- `npx markdownlint-cli2` on this changed Markdown file.

## Blockers

- Cross-repo write: applying the workflows + docs PR on `k9-community-site` must be performed by the coder stage using `FLEET_TOKEN`/`ADMIN_GITHUB_TOKEN`; this agent is scoped to the hub only.

---

## Artifact Engine Map

| Artifact Shape | Existing engine / standard | Status | Required action |
| --- | --- | --- | --- |
| Website / UI | Target repo `src/App.tsx` (Vite/React/TS) | ✅ Exists & healthy | Docs/perf polish only (items 7, 9) |
| API | N/A | N/A | Not in scope (static site) |
| CLI | N/A | N/A | Not in scope |
| MCP | N/A | N/A | Not in scope |
| Skill | N/A | N/A | Not in scope |
| PDF / deck / video | N/A | N/A | Not in scope |
| Docs | `wr/issues/` + target `README`/ship-to-market docs | ✅ Exists | **Delivered:** this WR doc; target README `## Live Deployment` queued |
| Agent automation | Hub `.github/workflows/{codeql,semgrep,ai-pr-review-openrouter,jules-pr-reviewer}.yml` | Gap on target | **Delivered:** ready-to-apply ports above for the coder PR |
| Inventory | `docs/REPO_CATALOG.md`, `docs/Walter-Evans-GitHub-Repo-Inventory.md` | Stale (`0KB` cache) | Correction queued (item 8) |

---

## Agent Self-Healing Journal

- **Issue detected:** Fleet WR #14705 for `k9-community-site` filed by `scripts/fleet-maintenance.js`, but no draft PR materialised on the target and the issue carried the agent note *"Is this stuck?"*.
- **Root cause:** (1) The coder stage's acceptance gate requires the target repo to expose the standard review workflows (OpenRouter, Jules, Semgrep, CodeQL); the target only had `title-only-intake.yml`, so a passing-jury PR could not be opened. (2) Inventory docs cached the repo as `0KB`/"Library/Other", mis-signalling an empty stub when it is actually a working Vite/React/TS app.
- **Research / correction:** Copilot Coding Agent read the live target repo via the GitHub API, confirmed it is healthy (tests, lint, docs, `validate.py`), and produced this design + ready-to-apply workflow artifacts so the coder stage can open a jury-passing draft PR.
- **Revvel-standards change:** new WR doc `wr/issues/issue-14705-fleet-maintenance-k9-community-site.md`; `wr/WR_TRACKER.md` row for k9-community-site now links the WR.
- **Outcome to preserve:**
  1. Fleet-maintenance WRs should **wire the four standard review workflows into the target repo first** — that is the precondition for a jury-passing PR, not an afterthought.
  2. Inventory caches (`REPO_CATALOG.md`, `Walter-Evans-GitHub-Repo-Inventory.md`) can be stale; verify a repo's real state via the API before concluding "nothing to do."
  3. Port OpenRouter/Jules review workflows with their built-in secret-absent graceful-skip guards so they are safe to add before secrets are provisioned.

---

## Status Summary

**Research Status:** ✅ Complete
**Implementation Priority:** P0 (review workflows) / P1 (Dependabot, CI gate, README Live Deployment) / P2 (inventory + perf polish)
**Ship-to-Market Ready:** Target repo is healthy; jury-readiness delivered as ready-to-apply artifacts
**Approval Required:** @midnghtsapphire

---

**Last Updated:** 2026-06-22
