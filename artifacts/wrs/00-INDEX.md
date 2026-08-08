# WR Index — Finisher Fleet

This pack contains **8 ordered Work Requests** to execute the Finisher pipeline, wire commerce last-mile, and fix the fleet.

Regenerate anytime from a research chat:

```bash
node scripts/chat-deployment-organizer.js --input path/to/chat.txt --format wr-pack
```

UI: `products/chat-deployment-organizer` (port 3012).

## Execution order (do not scramble)

1. `01-WR-Finisher-0-bootstrap-revvel-finishers.md` — Seed finishers repo, scripts, SYSTEM_PROMPT, Grok PR review
2. `02-WR-Finisher-1-produce-dist-sellables.md` — Run builders → vault/packs inventory
3. `03-WR-Finisher-2-gumroad-storefront.md` — Live SKUs $29/$99/$399 + anti-cannibalization
4. `04-WR-Finisher-3-daily-digest-ship.md` — Push + Vercel
5. `05-WR-revvel-fixer-fleet-sweep.md` — 404 / dead workflow / TODO / shipped-vs-live sweep
6. `06-WR-Finisher-4-landing-ctas.md` — Hub → Gumroad CTAs
7. `07-WR-Finisher-5-affiliate-after-sale.md` — Affiliate deploy after first sale
8. `08-WR-Finisher-6-public-api-defer.md` — Public API — explicit defer

## Labels

When opening on GitHub: `priority:high`, `commerce`, `finishers`, `work-request`

## Money path reminder

**0 → 1 → 2** before portfolio (3), hub CTAs (5), affiliate (6), and public API (7).
