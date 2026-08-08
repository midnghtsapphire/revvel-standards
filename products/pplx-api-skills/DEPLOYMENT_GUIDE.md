# Deployment Guide — pplx-api Skills Console

## Local

```bash
cd products/pplx-api-skills
npm install
cp .env.example .env.local
# optional: set PERPLEXITY_API_KEY and PPLX_APP_TOKEN
npm run dev
```

Open [http://localhost:3012](http://localhost:3012).

## Vercel (click-by-click)

1. Open [https://vercel.com](https://vercel.com) and sign in to the Revvel team.
2. **Add New… → Project** and import `midnghtsapphire/revvel-standards` (or open the existing monorepo project).
3. Under **Root Directory**, set `products/pplx-api-skills`.
4. Framework preset: **Next.js** (should auto-detect `vercel.json`).
5. Environment variables → add:
   - `PERPLEXITY_API_KEY` = your key from [Perplexity API settings](https://www.perplexity.ai/settings/api)
   - `PPLX_APP_TOKEN` = long random secret (optional but recommended in prod)
   - `PPLX_DEFAULT_MODEL` = `sonar-pro` (optional)
6. Click **Deploy**.
7. Success looks like: build finishes green, visiting the deployment URL shows **pplx-api Skills Console**, and `GET /api/health` returns `"ok": true`.

### Smoke test after deploy

```bash
curl -s https://<your-deployment>/api/health | jq .
curl -s https://<your-deployment>/api/chat \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $PPLX_APP_TOKEN" \
  -d '{"mock":true,"messages":[{"role":"user","content":"ping"}]}'
```

## Monitoring

- In-app: `GET /api/monitor` (request counts, errors, skill hits, recent JSON logs).
- Vercel: Project → **Logs** / **Analytics** for HTTP status and latency.
- Optional: point an uptime check at `/api/health` every 5 minutes.

## Rollback

Redeploy the previous Vercel deployment from the Deployments tab, or revert the git merge that introduced the product folder.
