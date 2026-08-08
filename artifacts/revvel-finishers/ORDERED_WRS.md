# Ordered Work Requests — Finisher Fleet

Do **not** scramble. Money path is 0 → 1 → 2 first.

| # | WR | Purpose | First $ |
| --- | --- | --- | --- |
| 0 | Finisher-0 | Create/seed `revvel-finishers` + SYSTEM_PROMPT + memory + scripts | Enables all |
| 1 | Finisher-1 | Run `build_skills_vault.py` + `build_packs.py` → real `products/dist` | Days |
| 2 | Finisher-2 | Gumroad live: vault $99, packs $29, R&D $399; stop free full leak | Days |
| 3 | Finisher-3 | daily-digest push + Vercel | Portfolio / soft $ |
| 4 | revvel-fixer | 404 / dead workflow / TODO / shipped-vs-live sweep | Indirect |
| 5 | Finisher-4 | Hub landing CTAs → Gumroad | After 2 |
| 6 | Finisher-5 | Affiliate deploys only after ≥1 paid sale | After sale |
| 7 | Finisher-6 | Public `/api/*` — last | Defer |

Paste-ready bodies live in `../wrs/` and can be regenerated from any chat dump via:

```bash
node scripts/chat-deployment-organizer.js --input chat.txt --format wr-pack
```

Product UI: `products/chat-deployment-organizer` (port 3012).
