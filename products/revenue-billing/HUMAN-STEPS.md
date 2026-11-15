# WR #18333 — steps only Audrey can do, in order

The repo now holds everything that needs no money and no secrets. These steps
cannot be done by a bot. Steps 2 to 5 spend money or handle credentials, so
each needs Audrey's explicit yes first. Keys go to the vault, never into chat,
an issue, a PR or a log.

| # | Step | Who | Why a bot cannot do it |
| --- | --- | --- | --- |
| 1 | Merge this PR once CircleCI is green and review is done. | Audrey / TriageChief | Merge is a human gate. |
| 2 | Approve and pay for a host for Lago. Options: the staged Railway project, a DigitalOcean droplet, or any Docker host she already owns. Recommended minimum: 2 vCPU and 4 GB RAM for Lago plus Postgres and Redis. | Audrey | Hosting costs money. The earlier Railway apply was rejected by the approval reviewer; DigitalOcean is paid. |
| 3 | Put the six Lago secrets in the vault, generated with the commands in `self-host/.env.example`, then fill `.env` on the host. | Audrey | Secrets. |
| 4 | Run `docker compose up` on the host, put a TLS reverse proxy in front, create the admin organization, copy the Lago API key to the vault, set `LAGO_DISABLE_SIGNUP=true`. | Audrey (or a bot she delegates with the key) | Needs the host and the key. |
| 5 | Create or approve the Stripe **production** account. Start in **test mode**. Add the Stripe key in Lago under Settings > Integrations > Stripe. | Audrey | Stripe account creation, identity checks and keys are human-only. |
| 6 | Run `LAGO_API_URL=... LAGO_API_KEY=... node products/revenue-billing/plans/seed-plans.mjs` (dry run), review, then add `--apply`. | Audrey or a bot holding the key | Needs the key. Creates the Free, Pro and Enterprise plans in Lago. |
| 7 | Apply the SQL mirror to Supabase: first to a scratch database with `db/test.sh`, then, with Audrey's yes, `db/apply.sh` on the live project. | Audrey approves | Never applied to the live project by a bot without her OK. |
| 8 | In Lago add a webhook endpoint (Developers > Webhooks) pointing at the approved public ingress, choose JWT or HMAC, pin the key as described in `README.md`, and set the receiver environment names. | Audrey | Public ingress, DNS and TLS. |
| 9 | Add authenticated account binding so checkout uses the signed-in account's own customer id. Enforce the Free 5-WR cap in the product (Lago bills, it does not block). | Builder bot, reviewed by Audrey | Product code that must exist before paid routes are enabled. |
| 10 | Run one Stripe **test-mode** payment end to end: customer, subscription, invoice paid, webhook received. Keep the invoice id and webhook row as evidence. | Audrey with a builder bot | Acceptance needs real evidence. |
| 11 | Only after step 10 passes: move Stripe to live mode and run one small live payment. | Audrey | Real money. |

## Acceptance items and what they need

| Acceptance item from #18333 | Status | Needs |
| --- | --- | --- |
| Lago dashboard accessible | Blocked | Steps 2 to 4 |
| Stripe connected and processing payments | Blocked | Step 5 |
| All 3 products have working checkout | Blocked | Steps 4, 5, 9 (affiliate-hub, ai-video-toolkit, screen-recorder-finder) |
| Test payment succeeds | Blocked | Step 10 |
| Webhook received and processed | Blocked | Steps 8 and 10 (the receiver code already exists) |
| LEDGER.md updated | Done | [LEDGER.md](LEDGER.md) in this folder |

## Pricing notes to confirm

- **Free: 5 WRs per month.** Lago meters usage but does not stop it. The cap
  lives in `billing_plan.work_requests_included` and the product must enforce it.
- **Enterprise: $2,000 to $5,000 per month per agent.** The catalog creates one
  plan at the $2,000 floor. Set each contract's real price, inside the range,
  with Lago's `plan_overrides.amount_cents` on a subscription per agent. The SQL
  layer rejects a contract price outside the range.
- **Usage metric:** one `work_requests` event per WR, using the WR id as the
  `transaction_id` so retries deduplicate.
