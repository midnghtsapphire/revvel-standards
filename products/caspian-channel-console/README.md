# Caspian Channel Console

## Live Deployment

▶️ **[Open the live app & test it](https://midnghtsapphire.github.io/revvel-standards/docs/caspian-channel-console/)**

Static product path (also deployable as its own Vercel project with
`outputDirectory=public`):

`products/caspian-channel-console/public/`

## What It Is

SaaS console for designing **multi-channel AI agent identities** using patterns
from the open-source [Caspian SDK](https://github.com/TryCaspian/caspian-sdk)
(agent communication layer: email, Slack, Discord, Telegram, SMS, and more).

Ship-ready surfaces:

- **Channel planner** — pick free / BYO / prepaid / hosted channels
- **Cost estimator** — console plan + transport planning figures
- **Offline simulator** — one-handler replies across channels (zero network)
- **Code export** — Python & TypeScript Caspian integration snippets
- **Blueprint download** — Markdown runbook + JSON for fleet ledgers
- **Research packet** — stars, competitors, SEO keywords, monetization path
- **Pricing + waitlist** — Starter / Pro / Enterprise SaaS tiers

## Repository Value

| Lens | Detail |
| --- | --- |
| Revenue path | SaaS $29 / $99 / $399 mo + $2/1k msg overage (list prices) |
| Target users | Agent platform teams, support ops, Revvel fleet builders |
| Research source | [TryCaspian/caspian-sdk](https://github.com/TryCaspian/caspian-sdk) — **527★** / 135 forks observed 2026-08-07 |
| Strategic fit | Monetizes the ops layer on top of OSS agent communication (Phase 1 $10k/mo) |

## Quick Start

```bash
# No build step — open the static app
cd products/caspian-channel-console/public
python3 -m http.server 3012
# → http://localhost:3012
```

Or from repo root:

```bash
npx --yes serve products/caspian-channel-console/public -l 3012
```

## Validation

Root regression tests (engine require()'d from Node):

```bash
node --test tests/caspian-channel-console.test.js
# or full suite
npm test
```

## Architecture

```text
products/caspian-channel-console/
├── public/
│   ├── index.html          # SPA shell
│   ├── styles.css
│   ├── app.js              # UI wiring
│   └── caspian-engine.js   # UMD domain logic (browser + Node)
├── research/
│   └── CASPIAN_SDK_DEEP_RESEARCH.md
├── GO_TO_MARKET.md
├── vercel.json
└── README.md
```

`caspian-engine.js` is the single source of truth for channel catalog, cost
math, simulation, and code generation. Root tests import it directly.

## Secrets

No required secrets for the static console. Optional future wiring:

| Secret name | Purpose |
| --- | --- |
| `CASPIAN_API_KEY` | Live gateway calls (not used by offline simulator) |
| `CASPIAN_BASE_URL` | Override gateway (default `https://api.trycaspianai.com`) |
| `STRIPE_PRICE_STARTER` / `PRO` / `ENTERPRISE` | Paid checkout when billing is connected |

## Related

- Deep research: [`research/CASPIAN_SDK_DEEP_RESEARCH.md`](./research/CASPIAN_SDK_DEEP_RESEARCH.md)
- GTM: [`GO_TO_MARKET.md`](./GO_TO_MARKET.md)
- Prior notes: [`../caspian-sdk-research/research/CASPIAN_SDK_RESEARCH.md`](../caspian-sdk-research/research/CASPIAN_SDK_RESEARCH.md)
- Caspian skill guide: <https://api.trycaspianai.com/SKILL.md>
