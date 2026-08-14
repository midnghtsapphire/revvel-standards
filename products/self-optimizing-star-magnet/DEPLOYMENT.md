# Deployment — Self-Optimizing Star Magnet

## Local

```bash
cd products/self-optimizing-star-magnet
npm install
npm run dev -- -p 3012
```

Open [http://localhost:3012](http://localhost:3012)

## Vercel (product folder)

1. Vercel dashboard → **Add New…** → **Project**
2. Import `midnghtsapphire/revvel-standards`
3. Set **Root Directory** to `products/self-optimizing-star-magnet`
4. Framework preset: **Next.js** (uses `vercel.json`)
5. Optional env: `NEXT_PUBLIC_POLAR_CHECKOUT_URL`
6. Deploy → copy the production URL into the product README live link if it differs

## Monorepo static path

If the umbrella `revvel-standards` Vercel project already serves `products/*` under `/docs/<name>/`, a main merge is enough — no extra project required.

## Hourly engine on GitHub Actions

1. Ensure `.github/workflows/hourly-growth-prioritizer.yml` is on the default branch
2. Add `GH_PAT` secret if default `GITHUB_TOKEN` cannot push or set topics
3. Manually run once from the Actions tab to verify `PRIORITIZED_STARS.md` commits
4. Leave cron `0 * * * *` enabled for hourly refresh

## Smoke checklist

- [ ] `npm test` green in product folder
- [ ] `npm run build` green
- [ ] UI loads and downloads `PRIORITIZED_STARS.md`
- [ ] `POST /api/report` returns JSON with `markdown` + `growth`
- [ ] Workflow dispatch succeeds on GitHub
