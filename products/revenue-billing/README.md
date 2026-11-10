# Revenue billing integration

Server-side Lago adapter and operator CLI for WR #18333. Node 22 or newer;
no external runtime dependencies. Supports Stripe-synced customers, plans,
subscriptions, checkout payment-method setup, customer portal and usage events.

Set `LAGO_API_URL` to the full API base (for example
`https://api.getlago.com/api/v1`) and `LAGO_API_KEY` in the server environment.
Never use `NEXT_PUBLIC_` for these values. Configure Stripe in Lago first;
use its provider code when creating a customer. Existing GitHub Stripe secrets
do not automatically configure a Lago organization.

```sh
node --test products/revenue-billing/lago.test.mjs
node products/revenue-billing/cli.mjs customer --apply < customer.json
node products/revenue-billing/cli.mjs checkout --apply < customer-id.json
node products/revenue-billing/cli.mjs portal < customer-id.json
```

Customer input:

```json
{"externalId":"account-123","email":"buyer@example.com","name":"Buyer","stripeProviderCode":"stripe-test"}
```

Checkout/portal input is `{"externalCustomerId":"account-123"}`. Plan input
is `{"code":"pro","name":"Pro","amountCents":9900}`. The proposed Free
and Enterprise prices can use separate plan codes with amounts 0, 200000
or 500000 cents, but choose the agreed contract before assigning a plan.

Subscription input contains `externalCustomerId`, `externalSubscriptionId`,
and `planCode`. Assigning a paid plan can create an invoice: use the test Lago
organization with Stripe test mode before using live keys. Usage input contains
`transactionId`, `externalSubscriptionId`, `code`, and `properties`. Use the
same transaction ID for retries of the same usage event. Configure a matching
billable metric and plan charge in Lago before sending usage.

Import `LagoClient` only in an authenticated backend. Derive customer IDs from
the signed-in account, not a caller-supplied arbitrary ID. Portal and checkout
URLs grant account access and must not be logged publicly. The CLI prints API
responses to the operator; store them securely. HTTP errors expose status only.
The adapter has bounded requests and rejects redirects; it does not silently
retry potentially billable mutations.

Lago's checkout collects a payment method; it does not prove an invoice was
paid. Do not grant product access from a return URL. Account authentication,
verified billing webhooks, durable entitlement processing and a paid test
invoice are required before enabling public subscriptions on the three catalog
products. WR #18333 remains open until those integration and production checks
pass; this adapter alone does not establish working product checkout.

API contract: [Lago OpenAPI](https://github.com/getlago/lago-openapi/blob/main/openapi.yaml).

## Signed durable webhook receiver

Node 24 is required for the private receiver's built-in SQLite support. The
existing adapter and CLI retain their previous APIs. All paid public routes
remain disabled; this receiver records provider observations without creating
customers, subscriptions, charges, accounts or entitlements.

Run the offline HTTP/durability tests:

```sh
node --test products/revenue-billing/lago.test.mjs products/revenue-billing/webhook.test.mjs
```

Operator environment names, never values:

| Name | Purpose |
| --- | --- |
| `LAGO_API_URL`, `LAGO_API_KEY` | Existing private Lago read credentials |
| `LAGO_ORGANIZATION_ID` | Exact organization expected in each signed notification |
| `LAGO_WEBHOOK_DATABASE` | Absolute private persistent SQLite filename, outside public/out |
| `LAGO_WEBHOOK_ALGORITHM` | Explicit `hmac` or `jwt`, matching the Lago endpoint |
| `LAGO_WEBHOOK_HMAC_KEY` | Organization HMAC key for HMAC mode |
| `LAGO_WEBHOOK_PUBLIC_KEY_FILE` | Pinned RSA PEM public key file for JWT mode |
| `LAGO_WEBHOOK_ISSUER` | Exact configured Lago issuer for JWT mode |
| `LAGO_WEBHOOK_PORT` | Existing operator-assigned local listener port; default 8090 |

Obtain and pin the JWT public key through Lago's authenticated
`GET /api/v1/webhooks/json_public_key` endpoint before configuring the receiver.
Decode the documented public-key response to PEM if needed. Never fetch a key
from a request-supplied URL. The receiver accepts only the configured algorithm;
there is no algorithm fallback. These names must be explicitly permitted by an
operator-owned HULL policy for a receiver run. Offline checks inherit no keys.

```sh
node products/revenue-billing/webhook-server.mjs
# One bounded batch of already-verified pending events, without an HTTP listener:
node products/revenue-billing/webhook-server.mjs --drain
```

The listener binds loopback and exposes only `POST /webhooks/lago` and
`GET /health`. Do not change ingress, TLS, DNS, tunnel settings or other services
to run it. The deployment owner separately composes approved ingress. Headers
are bounded, request bodies are limited to 64 KiB, compressed input is refused,
and each peer is rate-limited. Provider JSON is bounded to 1 MiB and retained
resource snapshots to 256 KiB each. Health responses contain no customer data
or credentials and report degraded after reconciliation failure.

An authenticated notification is acknowledged with 202 only after its inbox
insert commits using SQLite WAL with full synchronization. This proves durable
receipt, not payment, fulfillment or completed processing. Organization-scoped
unique keys and body hashes prevent duplicate effects, including signed-body
replay with a changed unsigned delivery header. The same key with different
bytes returns 409. Full inbox/disk failure returns a non-2xx response; no
successful marker is emitted for uncommitted data.

Invoice/subscription notifications trigger read-only reconciliation against
the current Lago API, with resource/customer ID consistency checks. State from
the notification itself never establishes paid access. Unsupported authentic
events are recorded as ignored. Observations and processed status commit in
one transaction; a crash during processing leaves the event pending, without
partial snapshots. Failed reads retain pending work with persisted exponential
backoff, capped at five minutes; periodic processing and `--drain` resume it.
Drain exits nonzero while pending events remain, including backoff-delayed ones.

Keep the database, WAL and SHM together on a private persistent local volume;
do not include them in product exports, source control, logs or public backups.
Raw payloads can contain customer information. Database size and pending queue
are bounded; provision capacity and monitor health before exposing ingress.
The database is a single-organization inbox, not an end-user identity service.
New observations are appended; no history is deleted by this implementation.

`invoice()` and `subscription()` are read helpers. `invoicePaymentUrl()` calls
Lago's documented POST endpoint to generate a payment link for an existing
invoice; it does not charge the invoice. `checkout()` continues to mean
payment-method setup. The receiver invokes neither payment URL generation nor
any billing mutation. Keep Lago as billing authority; do not create a parallel
Stripe Billing subscription for the same customer contract.

Research, exact scope, rollback and acceptance gates are recorded in
[the webhook MVI](WEBHOOK-MVI-2026-11-10.md). Real hosted Lago, authenticated
customer binding, an actual Stripe test invoice/payment, verified public ingress
and subscription fulfillment remain acceptance work for #18333.
