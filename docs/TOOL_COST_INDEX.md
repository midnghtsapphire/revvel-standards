# Tool Cost Index

Single source of truth for current + next-tier costs of every SaaS the pipeline
uses. The **API-Limit Auto-Upgrade Decision Standard**
(`docs/API_LIMIT_AUTO_UPGRADE.md`) reads from this file when a quota wall is
hit. If a tool isn't listed here, a research WR must populate it before any
upgrade decision can be made.

> Numbers are estimates as of 2026-05-28 — verify at each provider's pricing
> page before committing. Update this file when a tier changes.

| Tool | Current tier | Current cost | Next-tier name | Next-tier cost | Source |
| --- | --- | --- | --- | --- | --- |
| Keploy | Free | $0 | Pro / Team | est. $20–$40 / seat / mo | keploy.io/pricing |
| Vercel | Hobby | $0 | Pro | $20 / user / mo | vercel.com/pricing |
| OpenRouter | usage-priced (no tier) | varies | — | n/a | openrouter.ai/pricing |
| Jules | per Google plan | varies | per Google plan | varies | jules.google.com |
| DigitalOcean | usage-priced | varies | — | n/a | digitalocean.com/pricing |
| Doppler | Free (Developer) | $0 | Team | $18 / user / mo | doppler.com/pricing |
| ImgBot | Open-source | $0 | — | n/a (free indefinitely) | imgbot.net |
| CodeRabbit | Free (limited) | $0 | Pro | est. $24 / user / mo | coderabbit.ai/pricing |
| Bito | Free (limited) | $0 | Pro | est. $15 / user / mo | bito.ai/pricing |
| Mabl | **PAUSED** | $0 | — | est. starts $150+ / mo | mabl.com/pricing (verify) |
| Augment Code | Free (limited) | $0 | per their pricing | per their pricing | augmentcode.com |

## Update procedure

1. When a provider changes their pricing OR we hit a limit and need to know the
   real number → update the row here.
2. Add a corresponding entry to `docs/UPGRADE_LOG.md` if the change triggered a
   tier action.
3. Workflows should *read* from this file, not hardcode prices inline.
