# Spec: mirror Lago webhooks into Postgres

Status: spec plus tested SQL function. The HTTP receiver already exists
(`webhook-server.mjs`, PR #18348). It stores events in a private SQLite inbox.
This spec says how the same events land in Postgres without changing the
receiver's behaviour. No code switches the receiver over yet.

## Why a mirror

SQLite is single-host. A Postgres copy lets the product and dashboards read
billing state from the same database as everything else. It is a mirror, not a
second authority: Lago stays the billing authority, and no row here grants paid
access.

## Idempotency key (must match the receiver)

`LagoInbox.enqueue` in `webhook-inbox.mjs` dedupes on two organization-scoped
keys, and the SQL table repeats both:

| Rule | SQLite receiver | Postgres mirror |
| --- | --- | --- |
| One row per delivery key | `UNIQUE(organization, delivery_key)` | `UNIQUE (organization_id, delivery_key)` |
| One row per signed body | `UNIQUE(organization, body_sha256)` | `UNIQUE (organization_id, body_sha256)` |
| Same key, different body | HTTP 409 | SQLSTATE `P0409` |

The `x-lago-unique-key` header is not covered by Lago's signature, so the body
hash is the real replay guard. Both must stay in sync.

## Function contract

`billing_enqueue_webhook(organization_id, delivery_key, body_sha256, webhook_type, object_type, payload)`
returns `(id, duplicate)`.

| Input | Result |
| --- | --- |
| New key, new body | row inserted as `pending`, `duplicate = false` |
| Same key, same body | existing row, `duplicate = true` |
| New key, same body (replayed signed body) | existing row, `duplicate = true` |
| Same key, different body | error `P0409` |
| Bad hash, bad type, empty organization, payload over 64 KiB | CHECK violation (`23514`) |

The unique constraints decide, so two concurrent deliveries cannot both insert.

## Processing (planned, not built)

1. The receiver verifies the signature, then calls `billing_enqueue_webhook`
   and answers 202 only after the call commits.
2. A worker reads `pending` rows with `next_attempt_at <= now()`, fetches current
   invoice/subscription state from Lago (the receiver's `reconcileNotification`),
   and in one transaction updates `billing_subscription` and sets
   `status_code = 'processed'` with `processed_at`. Unknown event types become
   `ignored`.
3. Failures keep the row `pending`, add one to `attempts`, set `last_error` to a
   short code, and push `next_attempt_at` out with exponential backoff capped at
   five minutes, as the SQLite inbox does.

Rule: never grant product access from a webhook body. Reconcile against the
live Lago API first, as the receiver does today.

## Tested

`db/tests/billing_assertions.sql` covers every row of the contract table
above, on PostgreSQL 15 and 18.
