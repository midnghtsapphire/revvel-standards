# Agent Execution Rules: Star Optimizer Engine

## 1. Primary Directives

- **24/7 Silent Execution:** The scheduled workflow runs every 6 hours. Prefer
  fixing the workflow / script over ad-hoc manual ranking.
- **Idempotency Guarantee:** `stars_state.json` checkpoints cursor + repo cache
  so a partial run can resume without replaying completed pages.
- **Rate-Limit Resilience:** All agents executing GitHub API calls for this
  surface MUST handle HTTP 403 / 429 with `Retry-After` inspection and
  exponential backoff (see `scripts/prioritize_stars.py`).

## 2. API Quota & Rate Limit Rules

- **Authentication:** Prefer repository secret `GH_PAT` (fine-grained PAT with
  read access to the starring user's starred repositories) for the 5,000
  requests/hour budget. Fall back to `GITHUB_TOKEN` only when a PAT is absent.
- **GraphQL Over REST:** Bulk reads use GraphQL (50 nodes + nested release /
  topic fields per request) to minimize point consumption.
- **Pacing:** Keep at least `0.2s` between paginated batch requests to avoid
  secondary abuse throttles.

## 3. Artifacts

| Path | Purpose |
| --- | --- |
| `scripts/prioritize_stars.py` | Scoring engine + GraphQL fetcher |
| `.github/workflows/prioritize-stars.yml` | Schedule + auto-commit |
| `PRIORITIZED_STARS.md` | Human-readable ranked table (generated) |
| `prioritized_stars.json` | Machine-readable ranked report (generated) |
| `stars_state.json` | Idempotent cursor / repo checkpoint (generated) |
| `products/star-optimizer/` | SaaS UI for interactive scoring / export |

## 4. Pull Request & Work Request Protocol

- **Bundled Outcomes:** WRs that touch Star Optimizer must ship script +
  workflow + tests + docs together.
- **Recursion Prevention:** Automated bot commits MUST include `[skip ci]` in
  the commit message.
- **Offline Check:** `python scripts/prioritize_stars.py --self-test` must pass
  without network or secrets before merge.

## 5. Scoring Model (do not drift)

```text
Score = w_push * exp(-days_since_push / 60)
      + w_release * exp(-days_since_release / 90)   # 0 if no releases
      + min(log10(max(stars, 1)) * 10, 20)
      + w_starred * exp(-days_since_starred / 14)
```

Weights: push=40, release=30, stars cap=20, starred_at=10.

The TypeScript engine in `products/star-optimizer/lib/scoring.ts` MUST stay
numerically aligned with the Python implementation. When changing the formula,
update both and extend the regression tests.
