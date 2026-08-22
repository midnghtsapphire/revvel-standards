# Creator Payout Tracker

## Live Deployment

▶️ **[Open the live app & test it](https://midnghtsapphire.github.io/revvel-standards/docs/creator-payout-tracker/)**

## What It Is

Creator Payout Tracker is a **Next.js 15 web app** that shows real 2025 payout rates for 12 major creator platforms — YouTube, TikTok, Patreon, Substack, Kick, Twitch, OnlyFans, Spotify, Ko-fi, Instagram, and more — and lets creators calculate estimated monthly earnings based on their own metrics.

**Market context:** Creator economy valued at $104B+ (2025), 207M active creators globally, yet no free creator-first payout comparison tool exists. All existing tools (HypeAuditor $400+/mo, CreatorIQ enterprise, Upfluence $795+/mo) are brand-facing. This fills the gap.

---

## Features

- **Platform Rankings Table** — sortable by RPM (ad revenue), subscription net payout, and platform cut percentage
- **Ad Revenue Tab** — YouTube (long-form + Shorts), TikTok Creator Rewards, Instagram Reels, Spotify streams
- **Subscription Tab** — Kick, Substack, Patreon, OnlyFans, Twitch (Affiliate + Partner Plus), Ko-fi
- **Earnings Calculator** — enter monthly views, paying subscribers, and subscription price; table updates live
- **Recommendation Engine** — ranks the best payout moves for the creator's entered metrics
- **Strategy Brief Export** — downloads a Markdown brief and CSV estimate table for agencies or creator audits
- **Report API** — `POST /api/report` returns the same ranked estimates, Markdown, and CSV for automations
- **Quick Scenarios** — one-click presets for micro-creator through pro creator tiers
- **Platform Deep Dives** — per-platform cards with RPM range, net payout per sub, platform cut %, eligibility requirements, pros/cons
- **Category Filters** — filter by Video, Live Streaming, Subscriptions, Newsletters, Audio/Music
- **SEO-optimized** — targets "creator platform payout comparison," "which platform pays creators the most 2025," and related high-intent keywords

---

## Quick Start

```bash
cd products/creator-payout-tracker
npm install
npm run test
npm run lint
npm run build
npm run dev    # starts on http://localhost:3005
```

---

## Runtime Configuration

| Variable | Required | Description |
| --- | --- | --- |
| `NEXT_PUBLIC_POLAR_CHECKOUT_URL` | Optional | Creator Pro checkout URL. Falls back to an email contact link when unset. |

Create local config:

```bash
cp .env.example .env.local
```

---

## Report API

```bash
curl -X POST http://localhost:3005/api/report \
  -H "Content-Type: application/json" \
  -d '{"monthlyViews":100000,"monthlySubscribers":100,"subscriptionPrice":5}'
```

Response shape:

```json
{
  "metrics": {
    "monthlyViews": 100000,
    "monthlySubscribers": 100,
    "subscriptionPrice": 5
  },
  "topPlatforms": [],
  "markdown": "# Creator Payout Strategy Brief...",
  "csv": "\"Platform\",\"Category\"..."
}
```

---

## Stack

| Layer | Technology |
| --- | --- |
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Deploy | Vercel |
| Data | Curated static dataset (quarterly refresh) |
| Port | 3005 |

---

## Data Sources

Payout figures are community-sourced estimates derived from:

- Platform official documentation
- Reddit creator communities (r/NewTubers, r/Twitch, r/CreatorEconomy)
- Industry reports: Influencer Marketing Hub, MilX, LiveWire Weekly, Fundmates, Base.Tube

**Last data refresh:** Q2 2025  
**Refresh cadence:** Quarterly — update `app/data/platforms.ts` each quarter

---

## Monetization Path

1. **Free tier** — full rankings, calculator, Markdown brief, and CSV export
2. **Creator Pro ($9/mo)** — payout change alerts, niche RPM briefings, all platforms with deep analytics
3. **Agency ($49/mo)** — API access, white-label reports for creator roster management
4. **Affiliate revenue** — platform referral links (Kick, Substack, Patreon all have affiliate programs)
5. **Sponsored rankings** — platform promotion (clearly labeled, editorial firewall)

See [GO_TO_MARKET.md](./GO_TO_MARKET.md) for full launch strategy.

---

## Deployment

See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) for step-by-step Vercel deployment.

**Recommended domain:** `creatorpayouts.com` (exact-match SEO for primary keyword)

---

## Related

- **WR Research Doc:** [`wr/issues/issue-13641-creator-platform-payout-rankings.md`](../../wr/issues/issue-13641-creator-platform-payout-rankings.md)
- **Issue:** [#13641](https://github.com/midnghtsapphire/revvel-standards/issues/13641)
- **Port assignments:** This product runs on port 3005 per AGENTS.md standards

---

## License

MIT — See root [`LICENSE`](../../LICENSE)
