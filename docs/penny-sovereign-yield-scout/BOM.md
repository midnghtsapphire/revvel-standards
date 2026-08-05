# Bill of Materials — Penny Sovereign Yield Scout

**Last Updated:** April 2026
**Status:** Active Development
**Project:** `midnghtsapphire/penny-sovereign-yield-scout` (in revvel-standards monorepo)
**Description:** Automated DeFi/yield farming intelligence platform. Monitors Twitter/Reddit/Telegram for penny stock + yield signals, sweeps 50+ DeFi protocols ranked by APY/TVL/risk, auto-compounds positions, and shields against impermanent loss.

---

## Already Covered by Revvel Stack

| Service | Provider | Monthly Cost | Notes |
|---|---|---|---|
| Hosting | DigitalOcean Droplet | $0 (shared) | Shared `164.90.148.7` — Python/FastAPI |
| CI/CD | GitHub Actions | $0 | Free for public repos |

---

## Purchase Needed

| Item | Purpose | Provider | Est. Cost | Priority | Status |
|---|---|---|---|---|---|
| Twitter/X API (Basic tier) | Signal listener — real-time tweets | X/Twitter | $100/mo | P0 | ❌ Not set up |
| CoinGecko Pro API | DeFi protocol data (APY, TVL, price) | CoinGecko | $129/mo | P0 | ❌ Not set up |
| Telegram Bot API | Signal listening + alert notifications | Telegram | $0 (free) | P0 | ❌ Not configured |
| Reddit API (free tier) | Social signal monitoring | Reddit | $0 | P1 | ❌ Not configured |
| Domain registration | `pennyscout.io` or similar | Namecheap | ~$15/yr | P1 | ❌ Not purchased |
| RecurseML | Autonomous PR code review + bug detection | RecurseML | $250/yr | P1 | ❌ 14-day trial active |
| DigitalOcean Managed PostgreSQL | Storing yield history, signal log, compounding records | DigitalOcean | ~$15/mo | P1 | ❌ Currently using shared MySQL |
| Sentry | Error monitoring for background jobs | Sentry | $0 (free tier) | P1 | ❌ Not configured |
| Resend | Alert emails (impermanent loss warnings, compound reports) | Resend | $0 (free tier) | P1 | ❌ Not configured |

---

## One-Time Purchases

| Item | Provider | Cost | Status |
|---|---|---|---|
| Domain registration | Namecheap | ~$15/yr | ❌ Not purchased |

---

## Key Tools (from README)

| Tool | Status |
|---|---|
| `listener.py` — Twitter/Reddit/Telegram signal monitor | Built — API keys needed |
| `yield_scraper_cli.py` — 50 protocol sweep, APY rank | Built |
| `auto_compounder_api.py` — FastAPI auto-compounder | Built |
| `il_shield.py` — Impermanent loss calculator | Built |
| `verifiable_logger.py` — SHA-256 tamper-evident log | Built |
| `blue_ocean_generator.py` — Scaffold new CLIs/APIs | Built |

---

## Total Estimated Monthly Cost

| Category | Cost |
|---|---|
| Shared infrastructure (pro-rated) | ~$5/mo |
| Twitter/X API Basic | ~$100/mo |
| CoinGecko Pro | ~$129/mo |
| Managed PostgreSQL (if upgraded) | ~$15/mo |
| **Total estimated monthly (full)** | **~$249/mo** |
| **Total estimated monthly (free tier only)** | **~$5/mo** |

---

## Notes

- Twitter API is the biggest cost driver. Evaluate if free-tier Reddit + Telegram signals are sufficient before committing to $100/mo X API.
- CoinGecko has a free tier with rate limits — test it first before upgrading to Pro.
- SHA-256 verifiable logger is a blue ocean feature for compliance/audit use cases.
- Consider CoinMarketCap API as a cheaper alternative to CoinGecko Pro.
