# Soul2Bowl

**St. Louis Fusion Cuisine — Soul in Every Bowl, Crafted Just for You**

**Repository:** `midnghtsapphire/Soul2Bowl`  
**Website:** [soul2bowl.com](https://soul2bowl.com)  
**Staging:** [soul2bowl.vercel.app](https://soul2bowl.vercel.app) — auto-deploys from `main`  
**Status:** Pre-Build — Documentation Complete  
**Version:** 1.0.0  
**Parent Organization:** Freedom Angel Corp (EIN: 86-1209156)  
**Standards:** [midnghtsapphire/revvel-standards](https://github.com/midnghtsapphire/revvel-standards)

---

## About Soul2Bowl

Soul2Bowl is a premium online ordering and catering platform for a St. Louis-native, culinary-school-trained chef specializing in fusion cuisine — BBQ, Asian-Hawaiian flare, and classic Southern soul food — served in eco-friendly, biodegradable LIFEMADE bowls.

**Services:** Individual Meals · Meal Prep × 7 · Sunday Dinner (Sat & Sun) · Catering · By the Pound (Chicken Salad, Sides)

**Dietary options:** Keto · Vegan · Gluten-Free · Custom requests always welcome

**Packaging:** LIFEMADE 16 oz Bowls — TUV OK compost HOME Certified + BPI® Commercially Compostable + BPA-Free

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router) |
| Styling | Tailwind CSS + Glassmorphism design system |
| Animations | Framer Motion |
| Backend | Next.js Route Handlers / tRPC |
| Database | PostgreSQL (Drizzle ORM) |
| Authentication | Clerk (Google, Apple, Email) |
| Payments | Stripe (one-time + subscriptions) |
| Email | Resend |
| Calendar | FullCalendar.js |
| Media CDN | DigitalOcean Spaces CDN |
| Deployment | DigitalOcean App Platform |
| CI/CD | GitHub Actions |
| Analytics | Plausible |
| Error Tracking | Sentry |

---

## Project Structure

```text
/Soul2Bowl
├── docs/                 # All project documentation
├── src/
│   ├── app/              # Next.js App Router pages
│   │   ├── page.tsx      # Homepage
│   │   ├── menu/         # Menu page
│   │   ├── order/        # Calendar + ordering
│   │   ├── catering/     # Catering page
│   │   ├── about/        # About + owner video
│   │   ├── blog/         # Blog section
│   │   ├── contact/      # Contact
│   │   ├── account/      # Customer account
│   │   ├── admin/        # Admin panel
│   │   └── api/          # API route handlers
│   ├── components/       # Reusable UI components
│   ├── lib/              # Utilities, DB client, Stripe, Clerk
│   ├── db/               # Drizzle schema + migrations
│   └── styles/           # Global CSS, glass utilities
├── assets/               # Static assets (logos, icons)
├── public/               # Public directory (favicons, manifest, robots.txt)
├── tests/                # Vitest unit + Playwright E2E
├── .env.example          # Required environment variables
├── .mcp.json             # MCP server config (web profile)
├── CHANGELOG.md          # Auto-updated on push to main
├── LICENSE               # All Rights Reserved — Freedom Angel Corp
└── README.md             # This file
```

---

## Environment Variables

Copy `.env.example` to `.env` and fill in all values before running locally.

```bash
cp .env.example .env
```

Required variables (see `.env.example` for full list):

```text
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
CLERK_WEBHOOK_SECRET=

# Stripe
STRIPE_PUBLIC_KEY_TEST=
STRIPE_SECRET_KEY_TEST=
STRIPE_PUBLIC_KEY_LIVE=
STRIPE_SECRET_KEY_LIVE=
STRIPE_WEBHOOK_SECRET=

# Database
DATABASE_URL=

# Resend
RESEND_API_KEY=

# DigitalOcean Spaces (Media CDN)
DO_SPACES_KEY=
DO_SPACES_SECRET=
DO_SPACES_ENDPOINT=
DO_SPACES_BUCKET=

# App
NEXT_PUBLIC_APP_URL=https://soul2bowl.com

# Plausible Analytics
NEXT_PUBLIC_PLAUSIBLE_DOMAIN=soul2bowl.com
```

---

## Local Development

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Fill in .env with your values

# Run database migrations
npx drizzle-kit push

# Start development server
npm run dev

# Open http://localhost:3000
```

---

## Running Tests

```bash
# Unit tests (Vitest)
npm run test

# E2E tests (Playwright)
npm run test:e2e
```

---

## Deployment

| Environment | Platform | URL | Trigger |
|---|---|---|---|
| Staging | Vercel | [soul2bowl.vercel.app](https://soul2bowl.vercel.app) | Every push to `main` |
| Production | DigitalOcean App Platform | [soul2bowl.com](https://soul2bowl.com) | Manual / tagged release |

See [VERCEL_DEPLOYMENT.md](https://github.com/midnghtsapphire/revvel-standards/blob/main/docs/Soul2Bowl/VERCEL_DEPLOYMENT.md) for the full Vercel setup guide (env vars, secrets, monitoring).

```bash
# Manual deploy (emergency only)
# See docs/DEPLOYMENT_GUIDE.md
```

---

## Documentation

All documentation lives in [`docs/`](./docs/) and in [revvel-standards/docs/Soul2Bowl/](https://github.com/midnghtsapphire/revvel-standards/tree/main/docs/Soul2Bowl/).

| Document | Description |
|---|---|
| [BLUEPRINT.md](https://github.com/midnghtsapphire/revvel-standards/blob/main/docs/Soul2Bowl/BLUEPRINT.md) | Full product specification — master reference |
| [BRAND.md](https://github.com/midnghtsapphire/revvel-standards/blob/main/docs/Soul2Bowl/BRAND.md) | Brand identity, colors, typography, assets |
| [BOM.md](https://github.com/midnghtsapphire/revvel-standards/blob/main/docs/Soul2Bowl/BOM.md) | Bill of Materials — services, costs |
| [ROADMAP.md](https://github.com/midnghtsapphire/revvel-standards/blob/main/docs/Soul2Bowl/ROADMAP.md) | Phased release plan |
| [SPRINT_LOG.md](https://github.com/midnghtsapphire/revvel-standards/blob/main/docs/Soul2Bowl/SPRINT_LOG.md) | Sprint planning and history |
| [DARE_LOG.md](https://github.com/midnghtsapphire/revvel-standards/blob/main/docs/Soul2Bowl/DARE_LOG.md) | Decisions, Actions, Results, Evidence |
| [RAID_LOG.md](https://github.com/midnghtsapphire/revvel-standards/blob/main/docs/Soul2Bowl/RAID_LOG.md) | Risks, Assumptions, Issues, Dependencies |
| [SEO_STRATEGY.md](https://github.com/midnghtsapphire/revvel-standards/blob/main/docs/Soul2Bowl/SEO_STRATEGY.md) | SEO keywords, metadata, content strategy |
| [DATA_MODEL.md](https://github.com/midnghtsapphire/revvel-standards/blob/main/docs/Soul2Bowl/DATA_MODEL.md) | Database schema (PostgreSQL + Drizzle) |
| [API_SPEC.md](https://github.com/midnghtsapphire/revvel-standards/blob/main/docs/Soul2Bowl/API_SPEC.md) | API endpoint specification |
| [ADMIN_PANEL_SPEC.md](https://github.com/midnghtsapphire/revvel-standards/blob/main/docs/Soul2Bowl/ADMIN_PANEL_SPEC.md) | Admin panel feature specification |
| [VERCEL_DEPLOYMENT.md](https://github.com/midnghtsapphire/revvel-standards/blob/main/docs/Soul2Bowl/VERCEL_DEPLOYMENT.md) | Vercel staging setup, env vars, monitoring |

---

## License

All Rights Reserved. Copyright 2010–2026 Freedom Angel Corp / Audrey Evans.
