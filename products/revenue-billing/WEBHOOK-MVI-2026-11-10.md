# Lago webhook inbox MVI — 10 November 2026

## 1. Context check

SYSTEM_STATE.md infrastructure and known-bugs sections describe unverified
hosting and no billing database. PR #18347 added a server-side Lago adapter;
its checkout method collects payment details, not proof of invoice payment.
The current public catalogs have no customer identity binding. No production
payment, public webhook ingress or Lago deployment is established here.

## 2. Feature definition

An operator can receive signed Lago HTTP notifications into a durable private
inbox, reconcile current invoice/subscription state and resume after interruption,
without creating subscriptions, charging customers or enabling paid access.

## 3. Dependency map

Node 24 provides HTTP, crypto and SQLite. Existing LagoClient supplies bounded
authenticated requests; additional reads reconcile invoices and subscriptions.
The operator supplies a private persistent database path, expected organization,
and either the organization's HMAC key or a pinned RSA public key and issuer.
No keys are fetched from request headers or included in public assets. Offline
HTTP tests inject Lago reads; they require no credentials or network service.

## 4. Acceptance gates

- Real HTTP tests validate HMAC/JWT, tampering, algorithm/organization mismatch,
  malformed/oversized bodies, duplicate identity and changed unsigned headers.
- SQLite survives restart; failed processing remains pending and retries;
  current API snapshots and processed status commit atomically.
- Reconciliation fetches current Lago state, validates identifiers and customer
  consistency, and does not grant entitlements from webhook/redirect claims.
- Existing adapter tests and Markdown lint remain green.
- Root integration owns SYSTEM_STATE.md and the PR. Live deployment is outside
  this operator/offline increment; no production acceptance is claimed.

## 5. Out of scope

Public checkout, account creation, entitlements, subscription creation, refunds,
charging, credential provisioning, Railway edits, Cloudflare, DNS, Proofy and
paid providers. Existing paid public paths remain disabled until identity and
provider configuration are bound by the owner.

## 6. Files to touch

All code/docs/tests are within products/revenue-billing: lago.mjs, lago.test.mjs,
webhook-signature.mjs, webhook-inbox.mjs, webhook-server.mjs, webhook.test.mjs,
this contract and README.md. Existing checkout/CLI APIs remain compatible.

## 7. Rollback plan

Stop the operator receiver and resume the previous artifact. Preserve the
private SQLite database and its WAL files; do not remove events or rewrite
historical observations. Schema creation is additive and versioned; an older
receiver never silently downgrades an incompatible database. Public products
remain unaffected because no checkout/runtime composition changes are made.

## Research contract

Official [format/signature documentation](https://getlago.com/docs/api-reference/webhooks/format---signature)
defines X-Lago-Unique-Key, algorithm selection and signatures. Upstream
[Webhook model](https://github.com/getlago/lago-api/blob/main/app/models/webhook.rb)
confirms JWT data is the serialized payload and HMAC covers those bytes, not the
unique-key header. Consequently content hashes also deduplicate replay when
that unsigned header changes; no invented timestamp is required.

The [sender implementation](https://github.com/getlago/lago-api/blob/main/app/services/webhooks/send_http_service.rb)
retries failed delivery, with a configurable attempt limit. The receiver only
acknowledges after durable insert; reconciliation failures remain independently
retryable. Read APIs are [invoice retrieval](https://getlago.com/docs/api-reference/invoices/get-specific)
and [subscription retrieval](https://getlago.com/docs/api-reference/subscriptions/get-specific).

Current sender-contract verification: upstream
[BaseService](https://github.com/getlago/lago-api/blob/main/app/services/webhooks/base_service.rb#L15-L20)
includes top-level organization_id. The current
[SubscriptionSerializer](https://github.com/getlago/lago-api/blob/main/app/serializers/v1/subscription_serializer.rb#L4-L9)
uses flat lago_id, external_id and external_customer_id. Invoice customer data
uses the nested customer object instead. Older abbreviated examples do not
override these current sender contracts; a legacy event lacking organization
identity is refused rather than silently assigned a tenant.
