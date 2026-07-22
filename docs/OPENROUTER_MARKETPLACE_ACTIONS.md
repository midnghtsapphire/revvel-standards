# OpenRouter Marketplace Actions

This document indexes the **OpenRouter-backed GitHub Marketplace Actions**
integrated into `revvel-standards` so every Revvel repo can adopt them
consistently — and so the OpenRouter-routed orchestrator (`@Copilot`, per
[`OPENROUTER_ASSIGNEE_PROCESS.md`](./OPENROUTER_ASSIGNEE_PROCESS.md)) has a
fleet of pre-approved tools to delegate to.

All actions here share a single repository secret — `OPENROUTER_API_KEY`
(Vault path `revvel/shared/llm/openrouter`, already declared in
[`.env.example`](../.env.example)) — so provisioning one secret unlocks all
of them.

> **Rollout pattern.** Every workflow is declared with
> `workflow_dispatch:` as the primary trigger and a job-level
> `env.OPENROUTER_API_KEY` guard. When the secret is absent, the jobs
> emit `::warning::` and skip — they never fail the pipeline. This lets
> you ship the templates to downstream repos **before** the secret is
> provisioned.

---

## Inventory

| # | Action | Marketplace | Template | Active here? | Purpose |
|---|---|---|---|---|---|
| 1 | Weekly Changelog via OpenRouter | [marketplace](https://github.com/marketplace/actions/weekly-changelog-via-openrouter) — [`fridzema/ai-weekly-changelog-action`](https://github.com/fridzema/ai-weekly-changelog-action) | [`ai-weekly-changelog.yml`](../templates/cicd/ai-weekly-changelog.yml) | ✅ | AI-generated weekly commit changelog → `CHANGELOG.md` |
| 2 | AI PR Review via OpenRouter | [marketplace](https://github.com/marketplace/actions/ai-pr-review-via-openrouter) — [`maxlim0/AI-PR-Reviewer`](https://github.com/maxlim0/AI-PR-Reviewer) | [`ai-pr-review-openrouter.yml`](../templates/cicd/ai-pr-review-openrouter.yml) | ✅ | Per-PR diff analysis as a sticky comment |
| 3 | GitPolyglot — AI Readme Translator | [marketplace](https://github.com/marketplace/actions/gitpolyglot-ai-readme-translator) — [`aboutexo04/git-polyglot`](https://github.com/aboutexo04/git-polyglot) | [`ai-readme-translator.yml`](../templates/cicd/ai-readme-translator.yml) | — | `README.md` → `README.<lang>.md` (ko, ja, zh-CN, …) |
| 4 | AI CI Failure Helper | [marketplace](https://github.com/marketplace/actions/ai-ci-failure-helper) — [`maxlim0/actions-progci-fail`](https://github.com/maxlim0/actions-progci-fail) | [`ai-ci-failure-helper.yml`](../templates/cicd/ai-ci-failure-helper.yml) | ✅ | Post-failure root-cause analysis in a PR comment |
| 5 | AI Code Reviewer Pro | [marketplace](https://github.com/marketplace/actions/ai-code-reviewer-pro) — [`VIVAAN-DHAWAN/ai-code-reviewer`](https://github.com/VIVAAN-DHAWAN/ai-code-reviewer) | [`ai-code-reviewer-pro.yml`](../templates/cicd/ai-code-reviewer-pro.yml) | ✅ | Inline review comments on changed lines + summary table |
| 6 | Android Resource Translator | [marketplace](https://github.com/marketplace/actions/android-resource-translator) — [`duartebarbosadev/AndroidResourceTranslator`](https://github.com/duartebarbosadev/AndroidResourceTranslator) | [`android-resource-translator.yml`](../templates/cicd/android-resource-translator.yml) | — | `strings.xml` missing-translation → auto-PR |
| 7 | MCP Server Evals | [marketplace](https://github.com/marketplace/actions/mcp-server-evals) — [`mcp-use/eval-action`](https://github.com/mcp-use/eval-action) | [`mcp-server-evals.yml`](../templates/cicd/mcp-server-evals.yml) | — | LLM-as-judge evaluations for MCP servers |
| 8 | GASS — GitHub Activity Scoring | [marketplace](https://github.com/marketplace/actions/gass-github-activity-scoring-system) — [`michael-bey/gass`](https://github.com/michael-bey/gass) | [`gass-scoring.yml`](../templates/cicd/gass-scoring.yml) | — | On-chain PR quality score via O2 Oracle |
| 9 | Iara Code Reviewer | [marketplace](https://github.com/marketplace/actions/iara-code-reviewer) — [`felipefernandes/iara`](https://github.com/felipefernandes/iara) | [`iara-code-reviewer.yml`](../templates/cicd/iara-code-reviewer.yml) | — | PR review for bugs / SAST / performance (CLI-based) |
| 10 | Business Central AI Code Reviewer | [marketplace](https://github.com/marketplace/actions/business-central-ai-code-reviewer) — [`ACSG-BizApps/bc-ai-reviewer`](https://github.com/ACSG-BizApps/bc-ai-reviewer) | [`bc-ai-code-reviewer.yml`](../templates/cicd/bc-ai-code-reviewer.yml) | — | BC-specific AL review (AppSource, permissions, posting routines) |
| 11 | PostHog Annotations | [marketplace](https://github.com/marketplace/actions/posthog-annotations) — [`PostHog/posthog-annotations-github-action`](https://github.com/PostHog/posthog-annotations-github-action) | [`posthog-annotations.yml`](../templates/cicd/posthog-annotations.yml) | — | Send deployment annotations to PostHog on PR merges / releases |
| 12 | PostHog Upload Source Maps | [marketplace](https://github.com/marketplace/actions/posthog-upload-source-maps) — [`PostHog/upload-source-maps`](https://github.com/PostHog/upload-source-maps) | [`posthog-upload-sourcemaps.yml`](../templates/cicd/posthog-upload-sourcemaps.yml) | — | Upload JavaScript source maps to PostHog for readable error stack traces |
| 13 | Send Event to PostHog | [marketplace](https://github.com/marketplace/actions/send-event-to-posthog) — [`daun/posthog-event-action`](https://github.com/daun/posthog-event-action) | [`posthog-send-event.yml`](../templates/cicd/posthog-send-event.yml) | — | Send custom events to PostHog from CI/CD pipelines |

"Active here?" = ✅ means the workflow is also installed in
[`.github/workflows/`](../.github/workflows/) of this repo. The others are
template-only because they're only useful in repos with matching stacks
(Android, BC AL, MCP servers, O2 Oracle accounts, etc.).

---

## Shared secret — `OPENROUTER_API_KEY`

- **Vault path:** `revvel/shared/llm/openrouter`
- **Fetch locally:** `vault kv get -field=api_key revvel/shared/llm/openrouter`
- **Add to a repo:** **Settings → Secrets and variables → Actions → New repository secret**
- All templates treat a missing key as a **warning**, not an error — jobs
  skip cleanly instead of failing red. This is intentional so you can
  roll the templates out before the secret lands in every repo.

Some actions require additional secrets:

| Template | Extra secrets |
|---|---|
| `gass-scoring.yml` | `O2_EMAIL`, `O2_PASSWORD`, `O2_APP_ID`, `O2_PROP_LIST_ID` |
| `bc-ai-code-reviewer.yml` | (Optional) `AZURE_OPENAI_KEY` or `OPENAI_API_KEY` if you switch providers in `MODELS_BLOCK` |

---

## How this fits with the rest of Revvel's AI automation

| Workflow | Trigger | Role |
|---|---|---|
| `openrouter-assignee.yml` | New issue / PR, hourly cron | Routes work **to** `@Copilot` (first line of sight) |
| `ai-pr-review-openrouter.yml` | PR opened / sync | Summary-style PR comment review |
| `ai-code-reviewer-pro.yml` | PR opened / sync | Inline line-level review comments |
| `ai-ci-failure-helper.yml` | Manual / chained after a failure | Root-cause comment on the PR that broke |
| `ralph-loop.yml` | CI failure on a PR | Opens an auto-fix issue and pings the orchestrator |
| `ai-weekly-changelog.yml` | Mondays 06:00 UTC | Commits weekly `CHANGELOG.md` update |

The AI review actions (`ai-pr-review-openrouter`, `ai-code-reviewer-pro`,
`iara-code-reviewer`, `bc-ai-code-reviewer`, `gass-scoring`) all trigger
on the same `pull_request` event. They are complementary — each has a
different lens (summary, inline, SAST, domain-specific, on-chain
scoring) — but if you want only one for a given repo, delete the others.

To bypass any AI review on a specific PR, add `[skip-review]` to the PR
title (honored by `ai-pr-review-openrouter`, `ai-code-reviewer-pro`, and
`iara-code-reviewer`).

---

## Rolling the templates into another Revvel repo

1. Copy the template(s) you want from
   [`templates/cicd/`](../templates/cicd/) into the target repo's
   `.github/workflows/` directory (keep the same filename).
2. Ensure `OPENROUTER_API_KEY` is provisioned in that repo's Actions
   secrets (see
   [`SECRETS_MANAGEMENT.md`](./SECRETS_MANAGEMENT.md) for the
   `scripts/provision-repo-secrets.sh` helper).
3. If you adopt `gass-scoring.yml` or `bc-ai-code-reviewer.yml`, also
   provision the extra secrets listed above.
4. For MCP-server repos using `mcp-server-evals.yml`, add an
   `evals/eval_cases.yaml` file per the
   [mcp-use/eval-action README](https://github.com/mcp-use/eval-action).

No changes to the template YAML are required for the default case.

### CircleCI repos (legacy / exception-only path)

GitHub Actions remains the required/default CI path for Revvel repos, per the
standards in `README.md` and `docs/REVVEL_MASTER_STANDARDS.md`. GitHub
Marketplace actions are GitHub Actions-specific, so this CircleCI template is
provided only for legacy repositories or repos with an explicit exception that
have not yet migrated their CI to GitHub Actions.

If you are maintaining one of those exception cases, use
[`templates/cicd/circleci-openrouter.yml`](../templates/cicd/circleci-openrouter.yml)
as the `.circleci/config.yml` baseline to preserve the same Revvel behavior:
OpenRouter diagnostics run on failure, and a missing `OPENROUTER_API_KEY`
degrades to a warning (no extra red build from the AI helper itself). Do not
treat this section as approval for new repos to adopt CircleCI instead of
GitHub Actions

---

## Cost governance

The `OPENROUTER_API_KEY` is shared across the orchestrator (`openrouter-assignee`)
and these ten actions. Budget and model-selection guidance lives in
`skills/openrouter-swarms/SKILL.md § Cost Governance`. Per-action knobs:

- **`ai-weekly-changelog.yml`** — default model `openai/gpt-5-mini`,
  once per week. Tiny cost.
- **`ai-pr-review-openrouter.yml`** — default model
  `x-ai/grok-4.1-fast`. (The legacy `:free` slug was retired by OpenRouter
  in April 2026 — "The free Grok 4.1 Fast period has ended" — so the paid
  slug is now the default.)
- **`ai-code-reviewer-pro.yml`** — default model
  `google/gemini-2.5-flash` (~$0.001/PR per the action's README).
- **`ai-ci-failure-helper.yml`** — runs **only on failure**, `max_log_lines: 200`.
- **`ai-readme-translator.yml`** / **`android-resource-translator.yml`** —
  `workflow_dispatch` / path-triggered only; not per-PR.
- **`mcp-server-evals.yml`** — only runs when `evals/eval_cases.yaml`
  exists in the repo.

If a repo is sensitive to AI spend, drop any of these template files
or switch to a `:free` model in the `model:` input.

---

## See also

- [`OPENROUTER_ASSIGNEE_PROCESS.md`](./OPENROUTER_ASSIGNEE_PROCESS.md) — first-line-of-sight routing
- [`SECRETS_MANAGEMENT.md`](./SECRETS_MANAGEMENT.md) — provisioning secrets across repos
- [`MARKETPLACE_GUIDE.md`](./MARKETPLACE_GUIDE.md) — general Marketplace adoption guidance
- `skills/openrouter-swarms/SKILL.md` — agent registry, model selection, cost guardrails
- `skills/ralph-loop/SKILL.md` — the self-healing loop that invokes these reviewers
