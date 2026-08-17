# AI Ad Generator

**Zeely AI-inspired open-source ad automation.** Turn any product URL into high-converting
static creatives, AI ad copy, and UGC video scripts — all from a single tool.

> Port: **3009** · Part of the `revvel-standards` monorepo

---

## What it does

| Feature | Description |
|---|---|
| 🔗 Product Scraper | Paste any product URL — Shopify, WooCommerce, Amazon, custom. Extracts title, images, price, description, OG tags, and reviews via `cheerio`. |
| ✍️ AI Ad Copy | Generates a primary headline, 3 variants (AIDA / PAS / BAB), a 30-second UGC video script, and hashtags via OpenRouter. |
| 🎨 Static Creative | Server-side PNG rendering via `@napi-rs/canvas` across 5 templates: Bold, Minimal, UGC, Sale, Story. |
| 🎬 Video Ad Scaffold | Ready-to-submit scripts for HeyGen, D-ID, Synthesia, Runway ML — plug in an API key to render avatar videos. |
| 📊 Campaign Manager | Save, track, and manage campaigns with status, budget, spend, ROAS, and CTR — stored in localStorage. |
| 📈 Analytics Dashboard | 14-day CTR, ROAS, spend vs. revenue, and conversion charts powered by Recharts. |

---

## Quick start

```bash
cd products/ai-ad-generator
npm install
cp .env.example .env.local  # add your OPENROUTER_API_KEY
npm run dev                  # http://localhost:3009
```

---

## Environment variables

| Variable | Required | Default | Notes |
|---|---|---|---|
| `OPENROUTER_API_KEY` | Recommended | — | Get one at <https://openrouter.ai>. If absent, mock copy is returned so the UI stays usable. |
| `OPENROUTER_MODEL` | Optional | `anthropic/claude-haiku-3` | Any model supported by OpenRouter. Haiku-3 is cheap and fast for ad copy. |
| `NEXT_PUBLIC_SITE_URL` | Optional | `http://localhost:3009` | Sent as `HTTP-Referer` to OpenRouter for rankings. |

---

## Pages

| Route | Description |
|---|---|
| `/` | Landing page — hero, how-it-works, feature grid |
| `/create` | 4-step wizard: URL → Scrape → Copy → Creative → Video |
| `/campaigns` | Campaign manager — CRUD, status, metrics |
| `/analytics` | ROAS / CTR / spend charts + per-campaign table |

---

## API routes

| Endpoint | Method | Body | Returns |
|---|---|---|---|
| `/api/scrape-product` | POST | `{ url: string }` | `ScrapeProductResponse` |
| `/api/generate-ad` | POST | `{ product: ProductData }` | `GenerateAdResponse` |
| `/api/generate-creative` | POST | `{ templateId, productTitle, headline, cta, imageUrl? }` | `GenerateCreativeResponse` |

---

## Architecture

```text
User → /create (wizard) → /api/scrape-product → lib/scraper.ts (undici + cheerio)
                        → /api/generate-ad     → lib/openrouter.ts (OpenRouter API)
                        → /api/generate-creative → lib/ad-templates.ts (@napi-rs/canvas)
                        → lib/campaign-store.ts (localStorage)
```

---

## Adding video rendering

The video ad step scaffolds the script and shows integration docs for 4 providers.
To enable live rendering:

1. Get an API key from [HeyGen](https://heygen.com) or [D-ID](https://d-id.com)
2. Add `HEYGEN_API_KEY=sk-...` or `DID_API_KEY=...` to `.env.local`
3. Create `app/api/generate-video/route.ts` that POSTs the script to the chosen avatar API
4. Wire the response into `VideoAdStep.tsx`

---

## Monetisation ideas

- **SaaS subscription**: Wrap with next-auth + Stripe, charge per credit (ad generation = 1 credit)
- **Gumroad product**: Sell the source code + setup guide as a "Zeely clone starter kit"
- **White-label**: Resell to agencies as a private-label ad automation tool
- **Polar.sh**: Add as a funded open-source product for sponsor visibility

---

## Tech stack

- Next.js 15 · TypeScript · Tailwind CSS
- `cheerio` — HTML parsing for product scraping
- `undici` — fast Node.js HTTP client
- `@napi-rs/canvas` — server-side Canvas API for PNG rendering
- `recharts` — analytics charts
- OpenRouter API — AI model routing (claude-haiku-3 default)
