# LEDGER — Revenue billing (Lago)

Play-by-play record per `standards/LEDGER_STANDARD.md`. Newest first. Append-only.

## 2026-11-11 07:15 MST — DBArchitect (Grok Bot) — Lago self-host recipe, plan catalog, Postgres mirror

- **Actor:** DBArchitect (Grok Bot), database architect for Audrey Evans.
- **Requested by:** TriageChief routing on WR #18333 (2026-11-11 sweep); Audrey asked that every WR and PR be finished today.
- **Role:** executed (draft PR; not merged, not ready for review).
- **Files:** `self-host/docker-compose.yml`, `self-host/.env.example`, `self-host/README.md`, `plans/plans.json`, `plans/lago-catalog.mjs`, `plans/seed-plans.mjs`, `plans/seed-plans.test.mjs`, `db/migrations/0001..0003`, `db/seed/0001..0002`, `db/apply.sh`, `db/test.sh`, `db/tests/*`, `scripts/gen-plan-seed.mjs`, `scripts/check-self-host.mjs`, `HUMAN-STEPS.md`, `WEBHOOK-POSTGRES-SPEC.md`, `README.md` (appended pointer), `.circleci/config.yml` (two jobs added), `CHANGELOG.md` (entry added): all added or appended; nothing deleted.
- **What was done:** Built everything for WR #18333 that needs no money and no secrets, on top of the existing adapter and signed receiver from PR #18348 (not a fork of it). Tested the SQL on scratch PostgreSQL 15.19 and 18.6 (embedded; no live database touched).
- **Decisions:**
  - Pin Lago `v1.57.0` and require every secret from `.env` — because this repo is public and upstream's sample defaults would become real passwords if copied.
  - The plan seed SQL is generated from `plans/plans.json` — because one source of truth stops the Lago catalog and the Postgres mirror from disagreeing.
  - The seed script never overwrites a live plan; it reports drift — because silently changing a price changes what customers are charged.
  - The webhook table repeats the receiver's two unique keys (delivery key and body hash) — because the delivery key is unsigned and the body hash is the real replay guard.
  - No GitHub Actions added — because the account is billing-locked and Audrey said no automation on the bot box; CI is CircleCI.
- **Sources:** Lago self-hosting docs <https://doc.getlago.com/docs/guide/self-hosting/docker>; official compose <https://github.com/getlago/lago/blob/main/docker-compose.yml>; Lago OpenAPI <https://github.com/getlago/lago-openapi/blob/main/openapi.yaml>; existing `products/revenue-billing/WEBHOOK-MVI-2026-11-10.md`.
- **Commits / PRs:** see the draft PR that references #18333.
- **Open / handoff:** Lago is not hosted, Stripe is not connected, no live payment or webhook has been exercised, and the SQL has not been applied to Supabase. Steps and owners are in [HUMAN-STEPS.md](HUMAN-STEPS.md). Next owner: Audrey for steps 2 to 5, then a builder bot for step 9.
- **Credit note:** Design, SQL, tests and docs by DBArchitect. The adapter and receiver it builds on were written by Codex in PR #18348.
