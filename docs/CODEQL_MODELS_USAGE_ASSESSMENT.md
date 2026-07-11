# CodeQL Usage Assessment — is CodeQL "under models" being used

Investigation report for WR issue
[#15693](https://github.com/midnghtsapphire/revvel-standards/issues/15693).
Scope is **assessment only** (per the WR's Explicit Exclusions) — no CodeQL
configuration, rules, or workflows were changed as part of this work.

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
    `coldtrace/backend/models/` (Python / Pydantic models). It is **not
    currently covered** by CodeQL, because the workflow's language matrix does
    not include `python` — see [Gaps](#4-gaps-and-recommendations).

## 1. Where CodeQL is configured

### 1.1 Workflow: `.github/workflows/codeql.yml`

| Aspect | Value |
| --- | --- |
| Setup type | Advanced (workflow-based), not GitHub default setup |
| Action | `github/codeql-action/init@v3` + `analyze@v3` |
| Languages | `actions`, `javascript-typescript` |
| Build mode | `none` |
| Triggers | `push` (main), `pull_request` (main), weekly `schedule` (Mon 03:20 UTC), `workflow_dispatch` |
| Query suites | Default (no `queries:` input, no custom `.ql`/`.qls` files in the repo) |
| Path filters | None — scans the whole repository for the configured languages |
| Permissions | `security-events: write` (SARIF upload enabled) |
| Failure posture | `analyze` step uses `continue-on-error: true` so a SARIF-upload conflict with GitHub default setup cannot block PRs (documented in the workflow header comment) |

There is **no** `codeql-config.yml`, no custom queries (`*.ql`), and no custom
query suites (`*.qls`) anywhere in the repository — the workflow relies on the
stock CodeQL query packs for the two configured languages.

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
FastAPI-style app with `models/`, `routers/`, `services/`, `tests/`). The
CodeQL matrix scans only `actions` and `javascript-typescript`, so:

> **CodeQL does not currently analyze `coldtrace/backend/models/` (or any
> Python code in the repo).**

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
  uploads fail; `continue-on-error: true` keeps that failure from blocking PRs
  (at the cost of silently skipping the upload).

## 4. Gaps and recommendations

Assessment-only; none of these were implemented here.

| # | Gap | Recommendation | Effort |
| --- | --- | --- | --- |
| 1 | Python (incl. `coldtrace/backend/models/`) not in the CodeQL matrix | Add `python` to `strategy.matrix.language` in `codeql.yml` (build-mode `none` works for Python) | ~1 line |
| 2 | `continue-on-error: true` on `analyze` can hide real scan failures | Once default setup is confirmed disabled, tighten to fail on analysis errors while tolerating only upload conflicts | Small |
| 3 | No documented alert-triage cadence for CodeQL findings | Fold code-scanning alert review into the existing self-healing / agent-monitor loops | Medium |
| 4 | `docs/github-project-v2-workflows.md` says CodeQL "was removed" (describing another stack), which can mislead readers about this repo | Clarify that note's scope | Doc-only |

## 5. Definition-of-done mapping

| WR requirement | Status |
| --- | --- |
| Documented implementation status | ✅ Section 1 |
| Configuration details | ✅ Sections 1.1, 1.3 |
| Active-scan confirmation | ✅ Section 1.2 (2,381 runs, recent successes) |
| Models-directory coverage assessment | ✅ Section 2 (not covered; gap #1) |
| Scan-results review | ✅ Section 3 (upload path verified; alert listing requires admin access — noted) |
| Gaps + actionable next steps | ✅ Section 4 |
| No code/config changes (Explicit Exclusions) | ✅ This PR is documentation-only |
