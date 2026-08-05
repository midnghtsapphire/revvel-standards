# Tool Cost Index

Single source of truth for current + next-tier costs of every SaaS the pipeline
uses. The **API-Limit Auto-Upgrade Decision Standard**
(`docs/API_LIMIT_AUTO_UPGRADE.md`) reads from this file when a quota wall is
hit. If a tool isn't listed here, a research WR must populate it before any
upgrade decision can be made.

> Numbers are estimates as of 2026-07-08 — verify at each provider's pricing
> page before committing. Update this file when a tier changes.

| Tool | Current tier | Current cost | Next-tier name | Next-tier cost | Fleet decision | Source |
| --- | --- | --- | --- | --- | --- | --- |
| Keploy | Free | $0 | Pro / Team | est. $20–$40 / seat / mo | keep | keploy.io/pricing |
| Vercel | Hobby | $0 | Pro | $20 / user / mo | keep | vercel.com/pricing |
| OpenRouter | usage-priced (no tier) | varies | — | n/a | keep (backbone) | openrouter.ai/pricing |
| Jules | per Google plan | varies | per Google plan | varies | keep | jules.google.com |
| DigitalOcean | usage-priced | varies | — | n/a | keep | digitalocean.com/pricing |
| Doppler | Free (Developer) | $0 | Team | $18 / user / mo | keep | doppler.com/pricing |
| ImgBot | Open-source | $0 | — | n/a (free indefinitely) | keep | imgbot.net |
| CodeRabbit | Free (limited) | $0 | Pro | est. $24 / user / mo | **keep** (free; codebase-index value; D009) | coderabbit.ai/pricing |
| Bito | **CUT 2026-07-08** | $0 (was free-limited) | — | — | **cut** (zero unique catches; workflow skips gracefully when key is absent; D006) | bito.ai/pricing |
| RecurseML | **CUT 2026-07-08** | $0 (was free-limited) | — | — | **cut** (zero unique catches; workflow skips when key is absent; D007) | app.recurse.ml (verify) |
| Mabl | **PAUSED 2026-05-27** | $0 | — | est. starts $150+ / mo; note: local/CI CLI runs are credit-free (see `skills/mabl-expert/`) | **cut** (replaced by Keploy; D010) | mabl.com/pricing (verify) |
| Octopus Review | **REPLACED 2026-07-08** | $0 (hosted; monthly AI quota hit) | BYOK / self-host | $0 platform + provider usage | **replace → ai-pr-review-openrouter.yml** (D008) | octopus-review.ai (verify) |
| Augment Code | Free (limited) | $0 | per their pricing | per their pricing | keep | augmentcode.com |
| Cypress | OSS / Free | $0 | Cypress Cloud — est. $75/mo team | est. $75 / mo | keep | cypress.io/pricing (verify) |
| Applitools | Free (100 checkpoints/mo) | $0 | Starter | est. $45 / mo | keep | applitools.com/pricing (verify) |
| Postman | Free | $0 | Basic | est. $14 / user / mo | keep | postman.com/pricing (verify) |
| BrowserStack | n/a (deferred) | $0 | Live | est. $29 / user / mo | keep (deferred) | browserstack.com/pricing |
| Test.ai | n/a (skipped — overlaps Keploy) | — | — | — | skip | — |
| Jenkins | n/a (skipped — overlaps GH Actions) | $0 (OSS) | n/a | $0 | skip | jenkins.io |
| CircleCI | Free (6,000 build min/mo) | $0 | Performance (usage-based credits) | est. $15+ / mo (verify) | keep | circleci.com/pricing (verify) |

## Update procedure

1. When a provider changes their pricing OR we hit a limit and need to know the
   real number → update the row here.
2. Add a corresponding entry to `docs/UPGRADE_LOG.md` if the change triggered a
   tier action.
3. Workflows should *read* from this file, not hardcode prices inline.
