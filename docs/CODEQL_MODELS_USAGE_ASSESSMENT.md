# CodeQL Usage Assessment — is CodeQL "under models" being used

Investigation report for WR issue
[#15693](https://github.com/midnghtsapphire/revvel-standards/issues/15693).
Scope started as **assessment only** (per the WR's Explicit Exclusions), then
the maintainer explicitly requested that the identified fixes be implemented in
this PR.

Assessment date: 2026-07-11.

## TL;DR

- **Yes, CodeQL is actively used in this repository** via an advanced-setup
  workflow (`.github/workflows/codeql.yml`). It has ~2,400 recorded runs, runs
  on every push/PR to `main` plus a weekly schedule, and recent runs complete
  successfully.
- **"Models" needed disambiguation.** There is no CodeQL-vs-models coupling
  anywhere in the repo:
  - CodeQL is **not** an LLM "model": it does not appear in any model routing
    config (`.github/agent-models.yml`, `config/model-lookup.json`,
    `config/enterprise-model-matrix.json`, `MODEL_CONFIG.md`). It is cataloged
    only as an external SAST *app* in `config/review-fleet-personas.yml`
    (`external_apps_catalog.canned_apps`).
  - The only `models/` **directory** in the repo is
    `coldtrace/backend/models/` (Python / Pydantic models). It **was not
    covered at assessment time** because the workflow matrix did not include
    `python`; this PR adds `python`, so it is now covered — see
    [Gaps](#4-gaps-and-recommendations).

## 1. Where CodeQL is configured

### 1.1 Workflow: `.github/workflows/codeql.yml`

| Aspect | Value |
| --- | --- |
| Setup type | Advanced (workflow-based), not GitHub default setup |
| Action | `github/codeql-action/init@v3` + `analyze@v3` |
| Languages | `actions`, `javascript-typescript`, `python` |
| Build mode | `none` |
| Triggers | `push` (main), `pull_request` (main), weekly `schedule` (Mon 03:20 UTC), `workflow_dispatch` |
| Query suites | Default (no `queries:` input, no custom `.ql`/`.qls` files in the repo) |
| Path filters | None — scans the whole repository for the configured languages |
| Permissions | `security-events: write` (SARIF upload enabled) |
| Failure posture | `analyze` runs with `continue-on-error: true` to tolerate post-processing/upload API failures after SARIF export, while `Verify SARIF was generated` fails the run if analysis did not emit SARIF |

There is **no** `codeql-config.yml`, no custom queries (`*.ql`), and no custom
query suites (`*.qls`) anywhere in the repository — the workflow relies on the
stock CodeQL query packs.

### 1.2 Run evidence (is it actually running?)

Queried via the GitHub Actions API on 2026-07-11:

- `codeql.yml` has **2,381 total workflow runs** (run number ~2,986 at
  assessment time).
- The most recent completed runs (e.g. runs 2979–2983 on 2026-07-11) all
  concluded `success`.
- Runs fire on every PR branch (e.g. `copilot/*` branches), on `main` pushes,
  and on the weekly schedule — matching the trigger configuration.

Conclusion: **CodeQL scanning is active and healthy**, not dormant.

### 1.3 Other CodeQL touchpoints

- `config/review-fleet-personas.yml` → `external_apps_catalog.canned_apps`
  lists `{ name: CodeQL, purpose: deep-sast, feeds: security, approval:
  repo-owner }`. This is a *catalog entry* describing CodeQL's role in the
  review fleet, not a runtime integration.
- The Copilot coding agent's `parallel_validation` step runs a CodeQL security
  scan on agent-authored PR diffs — an additional, less obvious integration
  layer on top of the repo workflow.
- Companion scanners `semgrep.yml` and `trivy.yml` run alongside CodeQL and
  upload SARIF to the same **Security → Code scanning** tab. (Note:
  `docs/github-project-v2-workflows.md` describes a *different* stack where
  CodeQL was removed in favor of Semgrep/Trivy — that description does not
  reflect this repo, where all three run.)

## 2. The "models" question, resolved

The WR asks whether CodeQL "under models" is being used. Three plausible
readings were checked:

1. **CodeQL as an entry in LLM model configs** — `grep -i codeql` across
   `.github/agent-models.yml`, `config/model-lookup.json`,
   `config/enterprise-model-matrix.json`, and `MODEL_CONFIG.md` returns
   nothing. CodeQL is not routed as a model; it is a static-analysis tool.
2. **A `models/` source directory** — the only match in the repo (excluding
   `node_modules`) is `coldtrace/backend/models/` containing three Python
   files (`__init__.py`, `analysis.py`, `case.py`) of Pydantic data models for
   the ColdTrace backend.
3. **GitHub Models (the AI model marketplace)** — no references or
   integrations found in workflows or scripts.

### 2.1 Coverage of `coldtrace/backend/models/`

The ColdTrace backend (`coldtrace/backend/`) is **Python** (19 `.py` files, a
FastAPI-style app with `models/`, `routers/`, `services/`, `tests/`). At
assessment time, the CodeQL matrix scanned only `actions` and
`javascript-typescript`, so:

> **At assessment time, CodeQL did not analyze
> `coldtrace/backend/models/` (or any Python code in the repo).**

Post-change in this PR, `python` is now in the matrix, so
`coldtrace/backend/models/` is included in CodeQL scanning.

Mitigating coverage: `semgrep.yml` runs `p/security-audit`, `p/owasp-top-ten`,
`p/cwe-top-25`, and `p/secrets` packs with language auto-detection, so the
Python code is not entirely unscanned — but it lacks CodeQL's dataflow-based
analysis.

## 3. Scan results review

- SARIF from `analyze@v3` uploads to the repository **Security → Code
  scanning** tab (permissions `security-events: write` are in place).
- Alert contents could not be enumerated from the agent sandbox (the API
  token returned `403 Resource not accessible by integration` for
  `code-scanning/alerts`). A repo admin can review current alerts at
  `https://github.com/midnghtsapphire/revvel-standards/security/code-scanning`.
- The workflow header documents a known operational caveat: if GitHub's
  code-scanning **default setup** is ever re-enabled, advanced-config SARIF
  uploads can fail. The workflow now separates concerns: it requires SARIF
  generation, then treats upload/post-processing API failures as warnings.

## 4. Gaps and recommendations

All four recommendations were implemented in this PR at the maintainer's
explicit request (PR comment on 2026-07-11), overriding the original
assessment-only scope.

| # | Gap | Recommendation | Status |
| --- | --- | --- | --- |
| 1 | Python (incl. `coldtrace/backend/models/`) not in the CodeQL matrix | Add `python` to `strategy.matrix.language` in `codeql.yml` (build-mode `none` works for Python) | ✅ Done — matrix is now `actions`, `javascript-typescript`, `python` |
| 2 | `continue-on-error: true` on `analyze` can hide real scan failures | Tighten to fail on analysis errors while tolerating only upload conflicts | ✅ Done — analysis (`upload: never`) now fails the run on real errors; a separate `upload-sarif` step keeps `continue-on-error: true` for default-setup upload conflicts only |
| 3 | No documented alert-triage cadence for CodeQL findings | Fold code-scanning alert review into the self-healing loop | ✅ Done — new weekly `alert-triage` job in `codeql.yml` files/refreshes a `[SELF-HEAL]` issue (labels `security`, `self-heal`) for open critical/high alerts and auto-closes it on recovery |
| 4 | `docs/github-project-v2-workflows.md` says CodeQL "was removed" (describing another stack), which can mislead readers about this repo | Clarify that note's scope | ✅ Done — note now states removal applies to the Project v2 bundle's target repos, not `revvel-standards` |

## 5. Definition-of-done mapping

| WR requirement | Status |
| --- | --- |
| Documented implementation status | ✅ Section 1 |
| Configuration details | ✅ Sections 1.1, 1.3 |
| Active-scan confirmation | ✅ Section 1.2 (2,381 runs, recent successes) |
| Models-directory coverage assessment | ✅ Section 2 (initially not covered; now covered after the `python` matrix update in this PR) |
| Scan-results review | ✅ Section 3 (upload path verified; alert listing requires admin access — noted) |
| Gaps + actionable next steps | ✅ Section 4 (all four implemented per maintainer request) |
| No code/config changes (Explicit Exclusions) | ⚠️ Superseded — the maintainer explicitly requested the §4 fixes in PR review, so this PR now includes the `codeql.yml` and doc-note changes |

## 6. What you (the human) actually need to do — plain English

Everything in this PR is automated **except two one-time checks** that only a
repo admin can do in the browser. Here they are, click by click:

### Check 1 — make sure GitHub's "default setup" scanning is OFF (2 minutes)

Why: this repo uses its own CodeQL workflow file. If GitHub's built-in
scanner is *also* turned on, the two fight and results silently stop
uploading.

1. Open <https://github.com/midnghtsapphire/revvel-standards/settings/security_analysis>
2. Scroll to the **Code scanning** section.
3. Look at the **CodeQL analysis** row:
   - If it says **"Default setup"** with an **Enabled** badge → click the
     `…` menu on that row → click **Disable CodeQL** (only default setup is
     disabled; the workflow in this repo keeps running).
   - If it already says **Advanced** or shows no default setup → you're done,
     nothing to click.
4. Success looks like: no "Default setup · Enabled" badge on that row.

### Check 2 — look at the security findings once (3 minutes)

Why: the scanner files results into a tab that only admins can see. Nobody
has confirmed whether there are any open findings yet.

1. Open <https://github.com/midnghtsapphire/revvel-standards/security/code-scanning>
2. You'll see a list (possibly empty). Each row is one potential problem the
   scanner found — click a row to see the exact file and line.
3. What to do with what you see:
   - **Empty list** → great, nothing to do.
   - **Rows marked Critical or High** → don't fix anything by hand; the new
     weekly `alert-triage` job (added in this PR) will automatically open a
     `[SELF-HEAL]` issue every Monday listing them, and the fleet picks that
     issue up like any other work item.
   - **Rows marked Medium/Low** → safe to ignore for now.

That's it. After Check 1 is done once, the whole loop (scan → alert → issue →
fix PR) runs by itself with no further human steps.
