# Greenfield UI Lab

Modernized **idea board + day wallet** demonstrating how patterns from
[rgn/greenfield-ui](https://github.com/rgn/greenfield-ui) (Angular 5 / Hyperledger
Composer demo, **0★**, 2018) incorporate into the revvel-standards monorepo.

This is **not** a fork of the upstream Angular app. Domain concepts
(`IdeaState`, wallet days, like/follow, kanban columns) are reimplemented as pure
TypeScript + Next.js + Tailwind.

## Live deployment

▶️ After Vercel picks up `products/greenfield-ui-lab`, open the product URL from the
deployment dashboard. Until a dedicated project URL is provisioned, use local
dev below.

Research lineage: [`wr/greenfield-ui-research.md`](../../wr/greenfield-ui-research.md)

## Local development

```bash
cd products/greenfield-ui-lab
npm install
npm run dev
```

Default port: **3012** → <http://localhost:3012>

## Validation

```bash
npm test
npm run lint
npm run build
```

## What you can do in the UI

1. Add ideas (land in **Fresh**).
2. Move cards across **Fresh / In work / Finished**.
3. Like, follow, and **donate days** from the personal wallet.
4. Release +5 days into the wallet.
5. Export the board as JSON or Markdown.
6. Reset to the seed board.

## Deploy path

- Framework: Next.js App Router
- Hosting: Vercel (same monorepo pattern as other `products/*` apps)
- Build command: `npm run build` (from this directory)
- Output: `.next`

Optional `vercel.json` at repo root already supports multi-product static hosting;
wire a Vercel project with Root Directory = `products/greenfield-ui-lab`.

## Monetization (directional)

- Free lab / SEO lead magnet for innovation-board keywords
- Future SaaS: idea → work-request funnel ($19–$49/mo band, estimate)
- Services collateral: legacy Composer UI modernization engagements

## Related

- Full audit + indexed-web research: [`wr/greenfield-ui-research.md`](../../wr/greenfield-ui-research.md)
- Product notes: [`research/INTEGRATION.md`](./research/INTEGRATION.md)
- Upstream (do not vendor): <https://github.com/rgn/greenfield-ui>
