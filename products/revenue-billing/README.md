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
