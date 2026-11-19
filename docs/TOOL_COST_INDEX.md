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
| RecurseML | **workflow triggers CUT 2026-08-21 (D016 reverses D014)**; the **GitHub App is still installed** | $0 | — | — | **cut the workflow lane only.** D014's reasoning stands: the App reports `recurseml/analysis` independently of `recurse-ml.yml` and never needed `RECURSE_ML_API_KEY`. That is exactly why commenting the workflow does **not** remove the red check — the App must be uninstalled in repository settings (#17872). The workflow lane was cut for waste, not for value: without the secret it no-ops. Check still reporting `error` on every PR (#17855) | app.recurse.ml (verify) |
| Mabl | **PAUSED 2026-05-27** | $0 | — | est. starts $150+ / mo; note: local/CI CLI runs are credit-free (see `skills/mabl-expert/`) | **cut** (replaced by Keploy; D010) | mabl.com/pricing (verify) |
| Octopus Review | **REPLACED 2026-07-08 (D008); route + fallback workflow triggers CUT 2026-08-21 (D016)** — the App is still installed | $0 (hosted; out of credits) | BYOK / self-host | $0 platform + provider usage | **cut the workflow lanes.** Owner previously kept it for the monthly free quota; it is now reporting "Your organization is out of credits" on every PR, so the quota is spent and the lanes were burning runner time for nothing. As with RecurseML, commenting the workflows does **not** stop `octopus-review[bot]` commenting — that is the App (#17872) | octopus-review.ai (verify) |
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

## Connector matrix (2026-11-19)

Added by Decipherer for Audrey. Additive only: no row above was edited or
removed. It answers one question per app: what does it connect to, and which
paid add-on does that connection let us skip. The wiring itself lives in
[`config/connections.yml`](../config/connections.yml) and its generated view
[`docs/CONNECTIONS_REGISTRY.md`](CONNECTIONS_REGISTRY.md); this table adds the
plan tier and the free workaround.

Status words: **connected and working** means Audrey said so on 2026-11-14.
**available** means the vendor documents it and nothing here proves it is on.
**unverified** means nobody has confirmed it. A plan tier marked *(Audrey)* is
her word; no read-only tool can see it.

| App | Plan tier | Connects to | Status | Free workaround it enables | Source |
| --- | --- | --- | --- | --- | --- |
| CircleCI | Performance *(Audrey, 2026-11-14)*. Official: 30,000 credits a month, then 15 USD per 25,000 | GitHub App, Gitar, Slack app, n8n node, SonarQube orb, Railway and DigitalOcean deploy jobs | connected and working (GitHub, Gitar, Slack per Audrey). Projects: revvel-standards, reese-reviews, amazon-books, forensicfinders. linear-a has none | Self-hosted runner: 20 concurrent tasks on Performance, no per-minute charge, so CARESSE can stand in for the billing-locked Actions minutes. Schedule triggers stand in for Actions cron | [CircleCI pricing](https://circleci.com/pricing/), [runner overview](https://circleci.com/docs/runner/runner-overview/) |
| CircleCI to Slack | Part of the CircleCI org. The docs state no separate fee | Slack workspace | connected and working *(Audrey, 2026-11-14)* | The app posts workflow results and lets you approve or cancel on-hold workflows from Slack. The docs do not describe starting a pipeline from Slack. To start one, post to the pipeline trigger API from n8n or a small custom Slack app | [CircleCI Slack integration](https://circleci.com/docs/guides/integration/slack-integration/), [trigger a workflow via API v2](https://support.circleci.com/en/articles/15091118-how-to-trigger-a-workflow-via-circleci-api-v2) |
| Gitar | A higher membership she associates with Sonar *(Audrey)*. Official tiers: Core, Pro, Enterprise. Exact tier unverified | GitHub, CircleCI, Linear, Slack, Jira, Plane, YouTrack | CircleCI connected and working *(Audrey)*; others available | Keep deterministic checks in CircleCI jobs and use Gitar only for judgment calls. Scope settings limit what it processes | [Gitar plans](https://docs.gitar.ai/account-billing/plans), [connect CircleCI](https://docs.gitar.ai/connecting-ci/circleci) |
| Sonar (SonarQube Cloud) | Unverified whether a separate subscription exists. Gitar is now a Sonar product but a Gitar plan is not documented as including SonarQube. Official Free: 50k lines of private code, 5 members | GitHub, CircleCI orb, Slack (Free, Team, Enterprise), Jira (Team, Enterprise) | unverified. Checks have been seen on PRs | The free plan covers small private repos. Unlimited for public repos | [SonarQube Cloud plans](https://docs.sonarsource.com/sonarqube-cloud/administering-sonarcloud/managing-subscription/subscription-plans), [Slack](https://docs.sonarsource.com/sonarqube-cloud/administering-sonarcloud/integrations/setup) |
| Cubic | Team *(Audrey)*. Official: 30 USD per developer a month, billed yearly | GitHub App, Linear, Jira, Asana, GitHub Issues, Confluence, Notion | connected and working as a GitHub reviewer and installed in Notion. Seat and line usage unverified | Free for public repos. Linear and Notion context in reviews replaces a separate requirements-check tool | [cubic integrations](https://docs.cubic.dev/integrations/overview), [cubic pricing](https://www.cubic.dev/pricing-plans) |
| Chunk | CircleCI beta, on Free, Performance and Scale *(Audrey has it)*. It is CircleCI's, not Cubic's | CircleCI, GitHub | available. Org setup unverified | No extra fee during beta. Uses credits and model tokens, and becomes paid at general availability | [Chunk overview](https://circleci.com/docs/guides/toolkit/chunk-setup-and-overview/) |
| Bito | Paid on 2026-11-11, plan and amount unknown *(Audrey)*. Official: Team 12 to 15 USD, Professional 20 to 25 USD per seat a month | GitHub, GitLab, Bitbucket, VS Code and JetBrains. Jira, Confluence and Google Docs on Professional | connected (GitHub App, `bito-ai.yml`). Plan unverified | Same job as Gitar and Cubic. Free plan gives PR summaries | [Bito plans](https://docs.bito.ai/help/billing-and-plans/overview), [Bito features](https://docs.bito.ai/ai-code-reviews-in-git/key-features) |
| Notion | Unverified. One member, one teamspace, no plan field readable | Slack, Linear (previews), cubic, GitHub (sync, Business only), n8n, Notion MCP | MCP connected. Bots installed: Composio, cubic, DEVIN_BRIDGE, Notion MCP | Notion AI connectors for Slack, GitHub and Linear need Business or Enterprise. n8n or the Notion API does the same on a free plan | [Notion pricing](https://www.notion.com/pricing), [AI connectors](https://www.notion.com/help/notion-ai-connectors) |
| n8n | Community, self-hosted, free. Lab on Audrey's computer, localhost only | Built-in nodes: Slack, GitHub, Linear, Notion (with trigger), CircleCI (get, get many, trigger) | unverified. Trial lab only | Replaces Zapier tasks and Notion's Business-only GitHub sync. Notion webhooks need a public HTTPS endpoint | [n8n CircleCI](https://docs.n8n.io/integrations/builtin/credentials/circleci), [n8n Slack](https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.slack) |
| Slack | Unknown (oaudrey workspace) | CircleCI app, MergeMe, Linear, Notion, SonarQube, Gitar (Pro), Zapier, n8n | connected and working for CircleCI *(Audrey)* and MergeMe | The CircleCI docs state no fee for the Slack app and SonarQube Slack is on its Free plan. Linear Slack intake is Business | [Linear Slack](https://linear.app/docs/slack) |
| GitHub | Personal account behaves as Free (HTTP 403 on private-repo protection). Freedom-Angel-Corp is on the free plan with 1 seat | Everything above | connected and working | Self-hosted runners are free. Private repos cannot enforce merge gates without a paid plan | [GitHub plans](https://docs.github.com/en/get-started/learning-about-github/githubs-plans) |
| Linear | Unknown (workspace RisingAloha). Free plan includes integrations, API and MCP | GitHub, Slack, Notion (previews), Zapier, Gitar, cubic | MCP connected | Free covers 250 issues and 2 teams | [Linear pricing](https://linear.app/pricing), [Linear integrations](https://linear.app/integrations) |
| Zapier | Unknown. Free: 100 tasks a month, two-step Zaps | 9,000 plus apps, Linear triggers and actions, GitHub triggers polled every 15 minutes on Free | available (MCP connected) | n8n replaces it once the 100 tasks run out | [Zapier pricing](https://zapier.com/pricing), [Linear to Zapier](https://linear.app/docs/zapier) |
| Higgins | Unknown. Audrey's name for an app; the product has not been identified. Another agent guessed Higgsfield, which is a guess | Audrey says she added it next to Gitar with CircleCI API work done | unverified | None until Audrey names it | Audrey, 2026-11-14 |

### Stale rows (marked, not removed)

Dated 2026-11-19. Each row below stays where it is. The current fact is here.

| Where | What it says | Current fact | Source |
| --- | --- | --- | --- |
| `docs/TOOL_COST_INDEX.md`, CircleCI row above | Free tier, 6,000 build minutes a month | Audrey confirmed Performance on 2026-11-14. Performance includes 30,000 credits a month and 20 concurrent self-hosted tasks | Audrey; [CircleCI pricing](https://circleci.com/pricing/) |
| `docs/TOOL_COST_INDEX.md`, Bito row above | CUT 2026-07-08 (D006), 0 USD | Audrey paid for Bito on 2026-11-11. Plan unknown. The cut decision and the payment are not reconciled | `docs/tool-history/bito.md` |
| `docs/STACK.md`, Source control | GitHub Enterprise (Freedom-Angel-Corp) | The GitHub API reports the org on the free plan with 1 seat (checked 2026-11-14). Confirm no separate enterprise account exists | GitHub API, read-only |
| `docs/Master Revvel-Standards Flow Charts/TOOLS_CATALOG.md`, row 68 | Notion: Free or 8 USD per user a month | Notion Plus is 10 USD per member a month; Business is 20 USD. That file is auto-maintained by `scripts/sync-flow-charts.js`, so this note lives here | [Notion pricing](https://www.notion.com/pricing) |

### Open questions for Audrey

1. What is Higgins? Name or link, so a row can be filled in.
2. Is your Gitar plan Pro or Enterprise, and do you also pay for SonarQube or SonarCloud separately?
3. What is the Notion plan, and what do you pay for Bito?
4. Which repo holds the `secrets-` setup, so linear-a jobs can use it?
