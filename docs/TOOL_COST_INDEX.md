# Tool Cost Index

Single source of truth for current + next-tier costs of every SaaS the pipeline
uses. The **API-Limit Auto-Upgrade Decision Standard**
(`docs/API_LIMIT_AUTO_UPGRADE.md`) reads from this file when a quota wall is
hit. If a tool isn't listed here, a research WR must populate it before any
upgrade decision can be made.

> Numbers are estimates as of 2026-07-08 — verify at each provider's pricing
> page before committing. Update this file when a tier changes.
>
> **Free-tier-first has a Layer 0.** The cheapest lane is not a free SaaS tier,
> it is the operator's own machine. `wr/agents/HIERARCHY.md` puts local LLMs at
> Layer 0 with a target share of 60–70% of work, and `scripts/local_llm.py`
> implements that ordering for the whole repo: LM Studio → Ollama → OpenRouter,
> with the paid lane **refused** unless `REVVEL_LLM_ALLOW_CLOUD=1`. That gate
> now covers scripts *and* workflows — set the repository variable of the same
> name under Settings → Variables to allow paid calls; unset is the default and
> skips them. Five health-probe workflows are deliberately exempt because
> `GET /api/v1/models` does not bill; see `docs/LOCAL_LLM_SETUP.md`. Any workflow
> that opts in should say why, in the workflow file. Setup and the Windows
> specifics are in `docs/LOCAL_LLM_SETUP.md`.
>
> **The GitHub Marketplace subscriptions are the ones that actually bill.** Every
> row below that reads `$0` is a free tier; the account's real spend sits in
> Settings → Billing → Subscriptions and in Copilot metered usage, and until
> 2026-08-21 none of it appeared in this file at all. `tests/billed-subscriptions-are-indexed.test.js`
> now name-pins each paid subscription observed there so a charge cannot exist
> without a row here stating its amount.
>
> Layer 0 only reaches work that runs on the operator's machine: GitHub-hosted
> runners are VMs in Azure and cannot reach a laptop, so **every LLM call made
> from CI is a billed call**, regardless of what this table says about tiers.

| Tool | Current tier | Current cost | Next-tier name | Next-tier cost | Fleet decision | Source |
| --- | --- | --- | --- | --- | --- | --- |
| Keploy | Free | $0 | Pro / Team | est. $20–$40 / seat / mo | keep | keploy.io/pricing |
| Vercel | Hobby — **account blocked** | $0 | Pro | $20 / user / mo | keep, but **three deployment checks fail red on every PR** until the account is unblocked (#17831, owner-only) | vercel.com/pricing |
| LM Studio (Layer 0) | Local — runs on the operator's machine | **$0** | — | n/a | **keep — try first** (`scripts/local_llm.py`; `wr/agents/HIERARCHY.md` targets 60–70% of work here) | lmstudio.ai |
| Ollama (Layer 0b) | Local — runs on the operator's machine | **$0** | — | n/a | keep (optional second local lane) | ollama.com |
| OpenRouter (Layer 1) | usage-priced (no tier) | varies — **account at 402, balance exhausted** | — | n/a | **keep, but gated** — `scripts/local_llm.py` refuses this lane unless `REVVEL_LLM_ALLOW_CLOUD=1`; ~270 scheduled calls/day removed by the cron freeze (#17849) | openrouter.ai/pricing |
| Jules | per Google plan | varies | per Google plan | varies | keep | jules.google.com |
| DigitalOcean | usage-priced | varies | — | n/a | keep | digitalocean.com/pricing |
| Doppler | Free (Developer) | $0 | Team | $18 / user / mo | keep | doppler.com/pricing |
| ImgBot | Open-source | $0 | — | n/a (free indefinitely) | keep | imgbot.net |
| CodeRabbit | Free (limited) | $0 | Pro | est. $24 / user / mo | **keep** (free; codebase-index value; D009) | coderabbit.ai/pricing |
| Bito | **CUT 2026-07-08** | $0 (was free-limited) | — | — | **cut** (zero unique catches; workflow skips gracefully when key is absent; D006) | bito.ai/pricing |
| RecurseML | **RESTORED 2026-08-19** (D014 reverses D007) | $0 | — | — | **keep** — two delivery mechanisms, only one was ever measured: the `recurse-ml.yml` workflow lane no-ops without `RECURSE_ML_API_KEY`, but the **GitHub App posts its `recurseml/analysis` check independently of that workflow and never needed the secret**. It stayed installed through the entire D007 cut. Currently reporting `error` on every PR (#17855) | app.recurse.ml (verify) |
| Mabl | **PAUSED 2026-05-27** | $0 | — | est. starts $150+ / mo; note: local/CI CLI runs are credit-free (see `skills/mabl-expert/`) | **cut** (replaced by Keploy; D010) | mabl.com/pricing (verify) |
| Octopus Review | **REPLACED 2026-07-08** — but the App is still installed | $0 (hosted; out of credits) | BYOK / self-host | $0 platform + provider usage | **replace → ai-pr-review-openrouter.yml** (D008). The decision was made; the App was never uninstalled and still comments on every PR, currently "Your organization is out of credits". Owner has said to keep it — the monthly quota is used deliberately | octopus-review.ai (verify) |
| Devin | **Trial expired** | $0 (no credits) | per their pricing | per their pricing | keep (inert) — posts `Devin Review` on every PR reading "Full review skipped: trial expired and no credits remaining"; referenced by 14 workflows, all of which no-op | devin.ai/pricing (verify) |
| Augment Code | Free (limited) | $0 | per their pricing | per their pricing | keep | augmentcode.com |
| Stacker (stacker-bot) | Free (installed #16874, install `150619571`) | $0 | — | n/a (free indefinitely) | **keep** (stacked-PR TOC + merge-order guard; legacy CLI) | github.com/apps/stacker-bot · stacker-site.now.sh |
| Graphite | Free tier (public / ≤10 users) | $0 | Team | est. $25 / user / mo | keep (preferred modern stacking; see GRAPHITE_INTEGRATION.md) | graphite.dev/pricing |
| Cypress | OSS / Free | $0 | Cypress Cloud — est. $75/mo team | est. $75 / mo | keep | cypress.io/pricing (verify) |
| Applitools | Free (100 checkpoints/mo) | $0 | Starter | est. $45 / mo | keep | applitools.com/pricing (verify) |
| Postman | Free | $0 | Basic | est. $14 / user / mo | keep | postman.com/pricing (verify) |
| BrowserStack | n/a (deferred) | $0 | Live | est. $29 / user / mo | keep (deferred) | browserstack.com/pricing |
| Test.ai | n/a (skipped — overlaps Keploy) | — | — | — | skip | — |
| Jenkins | n/a (skipped — overlaps GH Actions) | $0 (OSS) | n/a | $0 | skip | jenkins.io |
| CircleCI | Free (6,000 build min/mo) | $0 | Performance (usage-based credits) | est. $15+ / mo (verify) | keep | circleci.com/pricing (verify) |
| **Rollbar** | `advanced_4000K` — **free trial ends 2026-08-24** | **$1,208 / yr** (prorated over 365 days; first charge 2026-08-24) | — | n/a | **CUT — owner action required before 2026-08-24.** Nothing in this repository references Rollbar: no workflow, no script, no config. The scheduled *downgrade* to `advanced_4000K` on 2026-08-25 does not avoid the charge — it is the same tier — so only cancelling does. `docs/Universal-BOM_List/TOOLING_AND_TESTING_BOM.md` carried it as "Free (5k items/mo) / $12+/mo", which is the price of a plan the account is not on | github.com/settings/billing/subscriptions |
| **Deploybot-app** | Pro Plan | **$45 / mo** | — | n/a | **keep — owner confirms it is in use (2026-08-21).** Configured in the Deploybot dashboard rather than in-repo, so grepping `.github/` and `scripts/` finds nothing: absence of a repo reference is not evidence a marketplace app is unused, and this row exists so nobody re-derives that wrong conclusion | github.com/settings/billing/subscriptions |
| **Create Issue Branch** | Developer | **$10 / mo** | — | n/a | keep — genuinely wired in (`.github/issue-branch.yml`, `create-issue-branch.yml`, `ready-for-review.yml`, `close-linked-issue.yml`) | github.com/marketplace/create-issue-branch |
| **GitHub Copilot** | Max — 20,000 included AI credits, **exhausted**; resets 2026-08-31 | **$566.17 additional usage** (Aug 1–21 2026), of which **$421.28 — 74% — is the Code Review model** | — | n/a | **automated code review OFF** (owner, 2026-08-21); automated `@Copilot` assignment gated behind `REVVEL_ALLOW_COPILOT_ASSIGN` (#17864, #17865). Daily billed usage fell $97.59 (Aug 20) → $5.71 (Aug 21) after the freeze | github.com/settings/billing/usage |

## Update procedure

1. When a provider changes their pricing OR we hit a limit and need to know the
   real number → update the row here.
2. Add a corresponding entry to `docs/UPGRADE_LOG.md` if the change triggered a
   tier action.
3. Workflows should *read* from this file, not hardcode prices inline.
