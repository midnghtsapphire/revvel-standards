# RevenueCat Standard

> **Status:** Canonical
> **Owner:** Audrey Evans (@midnghtsapphire)
> **Related:** [`standards/INTEGRATIONS.md`](INTEGRATIONS.md), [`docs/SECRETS_MANAGEMENT.md`](../docs/SECRETS_MANAGEMENT.md), [`standards/PRICING.md`](PRICING.md)

## Overview

[RevenueCat](https://www.revenuecat.com) is the canonical subscription / in-app
purchase (IAP) and paywall platform for every Revvel app that monetizes on
iOS, Android, the web, or via cross-platform stacks (React Native, Flutter,
Expo, Capacitor). It abstracts App Store, Google Play, Stripe, Amazon, and
Paddle billing behind a single SDK + REST API and gives us a unified view of
entitlements, customer state, and revenue.

When a Revvel app needs subscriptions, **use RevenueCat** — do not call the
store SDKs directly. Bypassing RevenueCat means losing cross-platform
entitlement, customer attribution, churn analytics, paywall A/B testing, and
the audited webhook trail we rely on for support tickets and refunds.

---

## When to Use RevenueCat

| Use Case | Use RevenueCat? |
|---|---|
| Mobile subscriptions (iOS / Android) | **Yes** — required |
| Mobile consumables / non-consumables (IAP) | **Yes** — required |
| Cross-platform entitlements (mobile + web) | **Yes** — required |
| Web-only subscriptions (no mobile app) | Optional — Stripe direct is fine; use RevenueCat Web Billing if you also have native apps |
| One-time digital purchases on the web | Stripe direct |
| B2B / invoice-billed contracts | Stripe direct |

---

## Secret Naming Convention

All RevenueCat keys live in HashiCorp Vault under `revvel/shared/billing/revenuecat`
(or `revvel/apps/<app>/<env>/billing/revenuecat` if app-scoped). The canonical
env-var names below are the **only** names downstream Revvel apps may use —
do not invent app-specific aliases.

| Env Var | Type | Where It's Used | Notes |
|---|---|---|---|
| `REVENUECAT_PUBLIC_API_KEY_IOS` | Public SDK key (`appl_...`) | iOS client | Safe to ship in client bundles. One key per platform. |
| `REVENUECAT_PUBLIC_API_KEY_ANDROID` | Public SDK key (`goog_...`) | Android client | Safe to ship in client bundles. |
| `REVENUECAT_PUBLIC_API_KEY_AMAZON` | Public SDK key (`amzn_...`) | Amazon Appstore client | Optional — only if shipping to Amazon. |
| `REVENUECAT_PUBLIC_API_KEY_WEB` | Public SDK key (`rcb_...`) | Web Billing client | Required for RevenueCat Web Billing. |
| `REVENUECAT_SECRET_API_KEY` | Server REST key (`sk_...` / v2 key) | Backend services only | **Never ship to clients.** Used for REST API + webhook replay. |
| `REVENUECAT_WEBHOOK_AUTHORIZATION` | Shared secret string | Webhook receiver | Sent by RevenueCat in the `Authorization` header. Verify on every request. |
| `REVENUECAT_PROJECT_ID` | RevenueCat project identifier | Tooling / reporting | Required for v2 REST API calls. |

> **Rule:** Public keys are platform-scoped and **must** be loaded from the
> per-platform env vars above — do not reuse one key across platforms.
> RevenueCat will reject mismatched keys.
>
> **Framework prefixes:** Some client bundlers require a prefix to expose env
> vars to client code (Expo: `EXPO_PUBLIC_`, Next.js: `NEXT_PUBLIC_`, Vite:
> `VITE_`, CRA: `REACT_APP_`). When that's required, prepend the prefix to the
> canonical name — e.g. `EXPO_PUBLIC_REVENUECAT_PUBLIC_API_KEY_IOS`. The
> canonical suffix (`REVENUECAT_PUBLIC_API_KEY_IOS`) is what gets stored in
> Vault and `.env.example`; the prefix is a build-tool concern only.

---

## Backend Integration

The backend's job is narrow: receive webhooks, verify them, and update the
user's entitlement record in our database. **Entitlement state is owned by
RevenueCat — we mirror it, we do not author it.**

### Webhook Receiver

```python
# app/integrations/revenuecat.py
import hmac
import logging
import os
import httpx
from fastapi import APIRouter, Header, HTTPException, Request

router = APIRouter(prefix="/webhooks/revenuecat")
log = logging.getLogger(__name__)

REVENUECAT_WEBHOOK_AUTH = os.environ["REVENUECAT_WEBHOOK_AUTHORIZATION"]
REVENUECAT_SECRET_API_KEY = os.environ["REVENUECAT_SECRET_API_KEY"]
REVENUECAT_API_BASE = "https://api.revenuecat.com/v1"


@router.post("")
async def receive_webhook(
    request: Request,
    authorization: str | None = Header(default=None),
):
    """Receive a RevenueCat webhook event.

    Webhook docs: https://www.revenuecat.com/docs/webhooks
    """
    # Constant-time compare to avoid leaking the shared secret via timing.
    if not authorization or not hmac.compare_digest(
        authorization, REVENUECAT_WEBHOOK_AUTH
    ):
        raise HTTPException(status_code=401, detail="bad webhook auth")

    payload = await request.json()
    event = payload.get("event") or {}
    event_type = event.get("type")
    app_user_id = event.get("app_user_id")
    if not app_user_id:
        # Malformed event — ack with 400 so RevenueCat does not retry forever.
        raise HTTPException(status_code=400, detail="missing app_user_id")

    # Mirror, don't author. Always re-fetch the subscriber from RevenueCat
    # rather than trusting the webhook body — webhooks can arrive out of order.
    try:
        subscriber = await fetch_subscriber(app_user_id)
    except httpx.TimeoutException:
        # 5xx so RevenueCat retries with backoff; do NOT swallow.
        log.warning("revenuecat fetch_subscriber timeout for %s", app_user_id)
        raise HTTPException(status_code=504, detail="upstream timeout")
    except httpx.HTTPError as exc:
        # Connect / read / status errors — bubble as 5xx so RC retries.
        log.warning("revenuecat fetch_subscriber failed for %s: %s", app_user_id, exc)
        raise HTTPException(status_code=502, detail="upstream error")

    entitlements = (
        (subscriber.get("subscriber") or {}).get("entitlements") or {}
    )
    await upsert_entitlements(app_user_id, entitlements)

    return {"received": True, "type": event_type}


async def fetch_subscriber(app_user_id: str) -> dict:
    """Fetch the canonical subscriber record from RevenueCat."""
    headers = {"Authorization": f"Bearer {REVENUECAT_SECRET_API_KEY}"}
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(
            f"{REVENUECAT_API_BASE}/subscribers/{app_user_id}",
            headers=headers,
        )
        resp.raise_for_status()
        return resp.json()
```

### Required Webhook Events to Handle

At minimum, every Revvel backend must handle these RevenueCat event types:

| Event | What To Do |
|---|---|
| `INITIAL_PURCHASE` | Grant entitlement; trigger welcome email. |
| `RENEWAL` | Refresh entitlement expiry; no user-facing message. |
| `CANCELLATION` | Mark entitlement as `will_renew=false`; keep access until expiry. |
| `EXPIRATION` | Revoke entitlement. |
| `BILLING_ISSUE` | Notify user (in-app + email) to update payment method. |
| `PRODUCT_CHANGE` | Update tier on the user record. |
| `SUBSCRIPTION_PAUSED` | Revoke entitlement until pause ends. |
| `UNCANCELLATION` | Restore `will_renew=true`. |
| `TRANSFER` | Move entitlement between `app_user_id`s. |
| `REFUND` / `SUBSCRIPTION_EXTENDED` | Adjust entitlement window; log for support. |

Webhooks **must be idempotent**. RevenueCat retries on 5xx. Use the event
`id` as a dedupe key.

---

## Client Integration

### React Native / Expo

```ts
// src/billing/revenuecat.ts
import Purchases, { LOG_LEVEL } from "react-native-purchases";
import { Platform } from "react-native";

const KEY = Platform.select({
  ios: process.env.EXPO_PUBLIC_REVENUECAT_PUBLIC_API_KEY_IOS,
  android: process.env.EXPO_PUBLIC_REVENUECAT_PUBLIC_API_KEY_ANDROID,
})!;

export async function initRevenueCat(appUserId: string) {
  if (__DEV__) Purchases.setLogLevel(LOG_LEVEL.DEBUG);
  await Purchases.configure({ apiKey: KEY, appUserID: appUserId });
}

export async function hasProEntitlement(): Promise<boolean> {
  const info = await Purchases.getCustomerInfo();
  return info.entitlements.active["pro"] !== undefined;
}
```

### Web (RevenueCat Web Billing)

```ts
// src/billing/revenuecat-web.ts
import { Purchases } from "@revenuecat/purchases-js";

const KEY = process.env.NEXT_PUBLIC_REVENUECAT_PUBLIC_API_KEY_WEB!;

export async function initRevenueCatWeb(appUserId: string) {
  Purchases.configure(KEY, appUserId);
}
```

### Required Client Rules

1. **`appUserID` is our internal user ID** — never the email, never the device
   ID, never the auth provider's ID. This is what stitches identities across
   platforms.
2. **Always check entitlements via `getCustomerInfo()`** — never trust local
   state across app launches.
3. **Never check entitlements by product ID** — use entitlement IDs
   (e.g. `pro`, `team`, `lifetime`). Product IDs change; entitlement IDs are
   stable.
4. **Restore purchases must be a one-tap action** — Apple requires it for
   apps that sell subscriptions.

---

## Entitlement Naming Convention

Entitlement IDs are shared across all Revvel apps and **must** be one of:

| Entitlement ID | Meaning |
|---|---|
| `pro` | Standard paid tier |
| `team` | Multi-seat tier |
| `lifetime` | Non-expiring one-time purchase |
| `enterprise` | Custom-billed (set manually via REST API, not in stores) |

Custom per-app entitlements are allowed, but `pro` is the default and every
paywall must offer it.

---

## Paywalls

Use **RevenueCat-hosted Paywalls** (the no-code paywall builder) by default.
They are remote-configurable, A/B testable, and don't require an app release
to change copy or pricing.

Custom-coded paywalls are only allowed when RevenueCat Paywalls cannot
express the design — and that decision must be logged in `DECISIONS.md`.

---

## Testing

| Layer | How to Test |
|---|---|
| Sandbox purchases (iOS) | Use a sandbox tester Apple ID; sandbox renewals are accelerated (1 week ≈ 3 min). |
| Test purchases (Android) | Add license testers in Play Console; use `closed testing` track. |
| Webhooks | Use the **"Test Webhook"** button in RevenueCat dashboard, or replay events from the Events tab. |
| Backend integration tests | Stub the RevenueCat REST API with `respx` (Python) or `nock` (Node). |
| Entitlement gating in CI | Use `REVENUECAT_SECRET_API_KEY` for a dedicated `ci` project; never test against production. |

---

## What Not To Do

- ❌ Do not call StoreKit / Google Play Billing directly. Use the RevenueCat SDK.
- ❌ Do not store the secret API key in client code. Public keys only on clients.
- ❌ Do not author entitlement state in our database — mirror it from RevenueCat.
- ❌ Do not hand out entitlements via in-house promo codes; use RevenueCat **Promotional Entitlements** so analytics, lifecycle webhooks, and revenue reports stay correct.
- ❌ Do not skip webhook signature verification — `REVENUECAT_WEBHOOK_AUTHORIZATION` must match.
- ❌ Do not reuse the same public API key across platforms — each platform has its own.

---

## References

- RevenueCat docs: <https://www.revenuecat.com/docs>
- Webhook event reference: <https://www.revenuecat.com/docs/webhooks>
- REST API v2: <https://www.revenuecat.com/reference/projects>
- Web Billing: <https://www.revenuecat.com/docs/web/web-billing>
