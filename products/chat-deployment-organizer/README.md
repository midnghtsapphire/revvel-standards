# Chat Deployment Organizer

Filter huge implementation / research chats and organize them into the **correct Finisher deployment order** with paste-ready GitHub Work Requests.

## Live preview

- **Local:** `http://localhost:3012`
- **Vercel:** connect this folder as a Vercel root directory (`products/chat-deployment-organizer`) — production build is `npm run build`.
- **Verified deploy URL (fill after first Vercel project link):** `https://chat-deployment-organizer.vercel.app`

## What it does

1. **Filters** UI chrome (`Ctrl+K`, “Worked for…”, Marketplace chrome, sandbox URLs).
2. **Classifies** remaining segments (commerce, product ship, blocker, infra, script probe, research…).
3. **Maps** each segment onto a deployment target (`revvel-finishers`, `sellable-dist`, `gumroad`, `vercel-app`, …).
4. **Orders** work on the Finisher money path (**0 → 1 → 2 first** — do not scramble).
5. **Exports** deployment plan markdown, WR pack, filtered chat, or JSON.

## Finisher deployment order

| Order | Lane | Target | First $ |
| --- | --- | --- | --- |
| 0 | Bootstrap revvel-finishers | `revvel-finishers` | Enables all |
| 1 | Produce dist sellables | `sellable-dist` | Days |
| 2 | Gumroad storefront | `gumroad` | Days |
| 3 | daily-digest + Vercel | `vercel-app` | Portfolio |
| 4 | Fleet sweep (fixer) | `standards-repo` | Indirect |
| 5 | Hub landing CTAs | `hub-landing` | After 2 |
| 6 | Affiliate after sale | `affiliate` | After sale |
| 7 | Public API | `public-api` | Defer |

## Local development

```bash
cd products/chat-deployment-organizer
npm install
npm run dev
```

Default port: **3012**.

## Validation

```bash
npm test
npm run lint
npm run build
```

## CLI twin (repo root)

The same pipeline ships as a root script for CI / agents:

```bash
node scripts/chat-deployment-organizer.js --input /path/to/finisher.txt --format markdown
node scripts/chat-deployment-organizer.js --input /path/to/finisher.txt --format wr-pack
node scripts/chat-deployment-organizer.js --input /path/to/finisher.txt --format json
```

Root regression tests: `tests/chat-deployment-organizer.test.js` (covered by root `npm test`).

## Revenue model

| Tier | Price | Includes |
| --- | --- | --- |
| One-shot pack | $29 | Export plan + WR pack for one chat dump |
| Workspace | $99/mo | Unlimited organizes, saved plans, team paste queue |
| Done-with-you | $499 | Operator runs Finisher-0..2 against your monorepo |

Monetization path: organizer unblocks **Gumroad last-mile** (vault $99 / packs $29 / R&D $399) before affiliate sprawl.

## Related in-repo artifacts

- `artifacts/revvel-finishers/` — seed package (SYSTEM_PROMPT, memory, scripts)
- `artifacts/wrs/` — ordered Finisher WR pack
- `scripts/chat-deployment-organizer.js` — CLI engine

## Research checklist (WR-16924)

- Marketing/SEO keywords: chat deployment organizer, finisher pipeline, commerce last-mile, work request automation
- GitHub stars: N/A for this first-party tool; compares to generic “issue templates / saved replies” UX (issue #16923 sibling)
- Monetization path: SaaS tiers above → Gumroad SKUs
- Citations: issue attachment `finisher.txt`; `artifacts/wrs/00-INDEX.md`

## Deploy path

1. Vercel → Add New Project → import `midnghtsapphire/revvel-standards`
2. **Root Directory:** `products/chat-deployment-organizer`
3. Build command: `npm run build` · Output: Next default
4. Paste the production URL into this README’s Live preview section

No runtime secrets required for the core organize path.
