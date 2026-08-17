# WR: [WR] Fleet maintenance — midnghtsapphire/oath-gate-connect

**Issue:** #16883  
**Repository:** [midnghtsapphire/revvel-standards](https://github.com/midnghtsapphire/revvel-standards)  
**Target:** [midnghtsapphire/oath-gate-connect](https://github.com/midnghtsapphire/oath-gate-connect)  
**Research Date:** 2026-08-08  
**Researcher:** Copilot Coding Agent  
**WR Status:** 🟢 Complete (implementation PR opened)

---

## Issue Context

Filed automatically by the fleet-maintenance sweep so this repo flows through
the revvel-standards pipeline (research-engine → coder → full review jury).

<!-- fleet-maintenance:midnghtsapphire/oath-gate-connect -->

## Repository Metadata

| Property | Value |
| --- | --- |
| Name | oath-gate-connect |
| Product | Ordain.Church — ordination + marriage ceremony platform |
| Language | TypeScript (Vite/React) + Python (FastAPI) |
| Default branch | main |
| Private | No |
| Stars | 0 (confidence: observed via API at research time) |
| Prior workflows | **None** |
| Target PR | https://github.com/midnghtsapphire/oath-gate-connect/pull/1 |

## Research findings

### Docs

| Gap | Severity | Action taken |
| --- | --- | --- |
| README used scaffold tone; no Live Deployment section | Med | Refreshed README with stack, setup, API table, Live Deployment |
| No CONTRIBUTING.md | Med | Added CONTRIBUTING with setup + PR checklist |
| package.json name still `vite_react_shadcn_ts` | Low | Renamed to `oath-gate-connect` |

### Security / hygiene

| Gap | Severity | Action taken |
| --- | --- | --- |
| Tracked `.env` | High | Removed from tree; gitignore `.env` |
| Tracked `ordainchurch.db` + `__pycache__` + `models.py.backup` | High | Removed; gitignore patterns expanded |
| CORS `allow_origins=["*"]` with `allow_credentials=True` | High | Explicit allow-list via `CORS_ORIGINS` / `APP_URL` |
| Weak docker-compose DB password hardcoded | Med | Parameterized via `${POSTGRES_PASSWORD}` |
| No Dependabot | Med | Added npm / pip / github-actions |

### Tests / DX

| Gap | Severity | Action taken |
| --- | --- | --- |
| Zero automated tests | High | pytest health + CORS unit tests (4 passing locally) |
| Dockerfile copies frontend to `static/`; app only mounted `dist/` | Med | Serve either `static/` or `dist/` |
| No CI workflow | High | Added `.github/workflows/ci.yml` |

### Review jury

| Workflow | Status before | Status after |
| --- | --- | --- |
| `ai-pr-review-openrouter.yml` | Missing | Added |
| `jules-pr-reviewer.yml` | Missing | Added |
| `semgrep.yml` | Missing | Added |
| `codeql.yml` | Missing | Added (actions, js/ts, python) |
| `ci.yml` | Missing | Added |
| `dependabot.yml` | Missing | Added |

> Note: OpenRouter AI review skips **draft** PRs by design. Mark the target PR
> ready-for-review once CI is green so the AI lane runs.

## Marketing / SEO keywords

online ordination, ordain online, marriage ceremony builder, wedding officiant
tools, interfaith ceremony script, digital ordination certificate, marriage
license by state, LGBTQ wedding officiant

## Monetization path

Stripe dual-mode billing already lives under `/api/billing/*` (subscriptions +
checkout). Protecting this surface with CI/SAST, secret hygiene, and Dependabot
reduces outage/fraud risk on the paid path. Upsell levers already in product:
AI ceremony generation (OpenRouter) and certificate PDFs.

## Citations

- Target tree + `package.json` / `server/main.py` via GitHub Contents API (2026-08-08)
- Standard jury templates from `revvel-standards` `.github/workflows/{ai-pr-review-openrouter,jules-pr-reviewer,semgrep,codeql}.yml`
- Local verification: `python -m pytest -q` → **4 passed** on commit `b4b25db`

## Tasks

- [x] Update / refresh the docs (README, overview, contributing)
- [x] Research concrete improvements (deps, security, tests, DX, performance)
- [x] Ensure standard review workflows on target
- [x] Implement improvements as draft PR on target
  ([oath-gate-connect#1](https://github.com/midnghtsapphire/oath-gate-connect/pull/1))

## Next

1. Wait for CI / Semgrep / CodeQL / Jules on PR #1
2. Auto-fix any failures on the target branch
3. Mark PR ready for review (unblocks OpenRouter AI review)
4. Merge when checks allow
