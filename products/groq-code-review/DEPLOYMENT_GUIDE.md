# Deployment Guide — Groq Code Review

## Local

```bash
cd products/groq-code-review
npm install
npm run dev
# open http://localhost:3012
```

## Vercel (recommended)

1. Import `midnghtsapphire/revvel-standards` in Vercel (or link the existing project).
2. Set **Root Directory** to `products/groq-code-review`.
3. Framework preset: Next.js (see `vercel.json`).
4. Environment variables:
   - `GROQ_API_KEY` (optional but recommended for live LLM reviews)
   - `GROQ_MODEL` (optional)
   - `NEXT_PUBLIC_POLAR_CHECKOUT_URL` (optional SaaS upgrade link)
5. Deploy. Smoke-test:
   - Open `/` → load sample diff → **Run review**
   - `GET /api/health` returns `ok: true`
   - `POST /api/review` with `forceLocal: true` returns findings for the sample secret

## GitHub Action in this monorepo

1. Copy `workflows/groq-code-review.yml` to `.github/workflows/groq-code-review.yml` when you want it on every PR (not enabled by default to avoid surprise token spend).
2. Add repository secret `GROQ_API_KEY` under **Settings → Secrets and variables → Actions**.
3. Open a test PR with a non-markdown code change. Expect a bot comment titled **Groq Code Review**.

## Validation checklist

- [ ] `npm test` passes
- [ ] `npm run lint` (tsc) passes
- [ ] `npm run build` succeeds
- [ ] UI review works without any API key (local mode)
- [ ] With `GROQ_API_KEY`, provider becomes `groq` or `mixed`
