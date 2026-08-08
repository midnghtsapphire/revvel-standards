# neon-control-console — Delivery Artifacts

> Code path: `products/neon-control-console`  
> Live: [https://revvel-standards.vercel.app/docs/neon-control-console/](https://revvel-standards.vercel.app/docs/neon-control-console/)

## Definition-of-Done requirements

| Requirement | Status | Notes |
| --- | :---: | --- |
| Live deployment URL | ✅ | <https://revvel-standards.vercel.app/docs/neon-control-console/> |
| README `## Live Deployment` | ✅ | present |
| Live web test interface | ✅ | Next.js app on port 3012 |
| Secrets named (not valued) | ✅ | `NEON_API_KEY`, `NEON_PROJECT_ID` in SECRETS_MAP + `.env.example` |
| Monetization path | ✅ | SaaS ops console |
| Tests | ✅ | `tests/neon-core.test.js` + root `tests/neon-control-console.test.js` |
| Listed in APP_REGISTRY.md | ✅ | listed |

## Required deliverable records

- [x] **BOM** — Neon API + neonctl + GitHub Actions create/delete branch actions
- [x] **Research** — Neon serverless Postgres + preview branches as PR hygiene
- [x] **Deploy** — docs hub live URL + product Vercel config
- [x] **Monetize** — ops console for teams already paying Neon
- [x] **Market / SEO** — keywords in layout metadata + README
- [x] **Tests** — pure core + HTTP client stub coverage
