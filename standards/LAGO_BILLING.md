# Lago Billing Integration Standard

Closes WR #18333.

## What
Lago (open-source metering/billing) tracks usage events → invoices. Self-hosted
free tier via docker-compose (`deploy/lago/docker-compose.yml`).

## Wiring
1. **Metered events** from the fleet: `llm_call`, `book_packaged`, `deploy`, each with
   `customer_id` (project slug) and units.
2. `scripts/lago_sync.py` reads `artifacts/usage/*.jsonl` and pushes events to
   Lago's API (`POST /api/v1/events`).
3. Billable metrics defined in `deploy/lago/metrics.json` (code, name, aggregation).
4. Invoices monthly via Lago cron; Freedom Angel Corp donation share computed
   from the invoice total (part of every sale — per mission).

## Secrets
LAGO_API_KEY via zero-touch secrets vault (standard ZERO_TOUCH_SECRETS).
