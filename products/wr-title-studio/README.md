# WR Title Studio

Shippable UI for **autocreating generic Work Request titles** so you do not
retype long messy titles.

## Live Deployment

▶️ After merge + Vercel deploy of `products/wr-title-studio`, open the product
preview from the monorepo Vercel project. Local default: <http://localhost:3012>

Root automation (no UI required):

- `node scripts/wr-autotitle.js --suggest --title "[WR] ..."`
- Issue comment: `/wr-title` or `/wr-title force`
- Docs: [`docs/WR_TITLE_AUTOCREATE.md`](../../docs/WR_TITLE_AUTOCREATE.md)

## Mission Alignment

Part of the $10k/month → $10M/3yr pipeline. Speeds the automated product
pipeline intake surface (fewer junk WR titles → less agent thrash → faster
ship). Monetization path: internal leverage now; optional SaaS “title pack”
export later for multi-repo clients.

## What Problem It Solves

GitHub’s Work Request form only prefills `[WR] `. Humans paste brain dumps,
URLs, and `/dragnet` into the title. Saved replies help comment bodies but do
not bind the title field. This app + the `wr-autotitle` workflow give:

1. Deterministic cleanup
2. Template suggestion from mined WR patterns
3. One-click starters to copy
4. A slash command path on the issue itself

## Features

- Paste messy title → suggested clean `[WR]` title
- Optional Summary seed when the title is sparse
- Starter catalog (fleet, wire-in, ship, research, fix CI, add, create, implement)
- Template table
- Copy buttons for title and `/wr-title force`
- No API keys

## Local Development

```bash
cd products/wr-title-studio
npm install
npm run dev -- -p 3012
```

## Validation

```bash
npm test
npm run lint
npm run build
```

Root regression (engine + registry):

```bash
node --test tests/wr-autotitle.test.js tests/saved-replies.test.js
node scripts/wr-autotitle.js --check
```

## Deploy path

1. Vercel project root can stay monorepo root; set **Root Directory** to
   `products/wr-title-studio` for a dedicated deploy, **or** link from the
   static monorepo site once published.
2. Framework preset: Next.js
3. Install: `npm install`
4. Build: `npm run build`
5. Output: Next default
6. No secrets required

## Port

**3012** (see root `AGENTS.md` port table).
