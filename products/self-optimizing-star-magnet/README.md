# Self-Optimizing Star Magnet

TOS-compliant organic GitHub growth engine: priority-score starred indexes, GSEO topic recommendations, live Shields.io badges, and hourly automation — no paid ads or third-party star APIs.

## Live Deployment

▶️ **[Open the live app & test it](https://revvel-standards.vercel.app/docs/self-optimizing-star-magnet/)**

> If that path is not published yet, run locally on port **3012** (see Quick Start). After the monorepo Vercel project redeploys main, the product path above is the canonical preview URL.

## What It Is

A **Next.js SaaS dashboard** plus root automation that turns a public repository into a self-optimizing traffic & star magnet:

1. **Dynamic topic SEO** — recommends high-volume developer topics (`mcp`, `llm`, `agents`, …)
2. **Live badges** — Shields.io star / commit / license social proof block
3. **Star-for-value index** — generates `PRIORITIZED_STARS.md` from starred repos
4. **Priority algorithm** — push recency, release recency, log-star weight, starred-at boost
5. **Hourly workflow** — GitHub Actions cron with concurrency lock and `[skip ci]` commits

**Monetization path:** free open engine + Polar/email Pro checkout CTA for managed growth setup.

## Quick Start

```bash
cd products/self-optimizing-star-magnet
npm install
npm test
npm run lint
npm run build
npm run dev    # http://localhost:3012
```

## Report API

`POST /api/report`

```json
{
  "owner": "midnghtsapphire",
  "repo": "revvel-standards",
  "currentTopics": ["standards"],
  "currentStars": 12,
  "starsYesterday": 10,
  "dailyOrganicVisitors": 80,
  "conversionRatePct": 2.5
}
```

Returns ranked sample (or provided) repos, growth estimate, markdown index, CSV, and README badge block.

## Root automation (monorepo)

| Piece | Path |
| --- | --- |
| Engine script | [`prioritize_and_optimize.py`](../../prioritize_and_optimize.py) |
| Hourly workflow | [`.github/workflows/hourly-growth-prioritizer.yml`](../../.github/workflows/hourly-growth-prioritizer.yml) |
| Output index | `PRIORITIZED_STARS.md` (generated) |

### Secrets / env

| Name | Required | Purpose |
| --- | --- | --- |
| `GH_PAT` | Recommended | PAT with `repo` scope so scheduled runs can commit + update topics |
| `GITHUB_TOKEN` | Fallback | Default Actions token (contents:write on workflow) |
| `ENABLE_TOPIC_UPDATES` | Optional | Set `true` to merge discovery topics (default: off) |
| `STAR_MAGNET_TOPIC_SCOPE` | Optional | `current` (default) or `owned` |
| `NEXT_PUBLIC_POLAR_CHECKOUT_URL` | Optional | Pro checkout / contact link in the UI |

### Enable topic writes (human click-path)

1. GitHub → repo **Settings** → **Secrets and variables** → **Actions**
2. Create secret **`GH_PAT`** with a classic/fine-grained PAT that can write repo metadata
3. Edit workflow env (or repo variable) so **`ENABLE_TOPIC_UPDATES=true`**
4. **Actions** → **Hourly Star Growth & Prioritization Engine** → **Run workflow**
5. Success: job is green and (if enabled) repo **About → Topics** includes discovery tags

## Validation

```bash
# product
cd products/self-optimizing-star-magnet && npm test && npm run build

# monorepo gates
cd ../.. && npm test && npm run workflows:validate
```

## Constraints honored

- **100% free path:** GitHub GraphQL/REST + Actions + Shields.io only
- **No TOS violations:** no star-for-star bots, no follow spam, no paid star farms
- **Rate-limit resilient:** backoff on 403/429, concurrency group, checkpointed fetch
- **Evidence-first estimates:** growth projections are confidence-labeled, not guarantees

## Deploy path

```bash
cd products/self-optimizing-star-magnet
npx vercel --prod
# or ship via monorepo Vercel project that maps /docs/self-optimizing-star-magnet
```

See also [`DEPLOYMENT.md`](./DEPLOYMENT.md).
