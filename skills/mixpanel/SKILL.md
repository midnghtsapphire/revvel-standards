# Mixpanel Skill — User-Behavior Analytics

Activate when any task involves setting up Mixpanel, instrumenting product events, defining funnel/retention metrics, wiring opt-out/PII rules, or integrating Mixpanel into a Revvel project (web, Node, mobile, or extension).

## What Mixpanel Does

Mixpanel is a product-analytics platform that captures **user-behavior events** (not page views) and lets product owners answer questions like *"how many users completed onboarding?"*, *"what's the day-7 retention of cohort X?"*, *"which feature caused the drop-off?"*. It complements Umami / GA (page-level web analytics) by focusing on **action-level events** in the application itself.

## Why Mixpanel in the Revvel Ecosystem

- It is already the named user-behavior analytics tool in `docs/REVVEL_MASTER_STANDARDS.md` §Analytics and `README.md`.
- Free tier covers up to 1M events/month — sufficient for every shipped Revvel product before paid tier becomes necessary.
- First-class SDKs for browser (`mixpanel-browser`), Node (`mixpanel`), React Native, iOS, Android.
- Server-side ingest works via the Ingestion API (token + `/track`) — no SDK required for cron jobs or workers.
- Plays nicely with the Revvel `vault-agent` skill for `MIXPANEL_TOKEN` provisioning.

## Integration Architecture

```text
Revvel app (browser / Node / mobile)
        ↓
  Mixpanel SDK initialized with MIXPANEL_TOKEN
        ↓
  mixpanel.track('Event Name', { property: value })
        ↓
  Mixpanel cloud (https://api.mixpanel.com)
        ↓
  Dashboards, funnels, retention, cohorts in app.mixpanel.com
        ↓
  Daily roll-up → product-pipeline payability weights
```

## Setup Checklist (New Project)

1. **Create a Mixpanel project:**
   Visit <https://mixpanel.com> → sign up → create a project. Pick the EU residency region only if user data must stay in the EU (otherwise leave default US).

2. **Retrieve credentials from Mixpanel:**
   - `MIXPANEL_TOKEN` — Project Settings → Access Keys → Project Token (safe to expose in client bundles).
   - `MIXPANEL_API_SECRET` — Project Settings → Access Keys → API Secret (server-only, never expose in client bundles or commit to git).

3. **Add secrets to your GitHub repository (and Vault):**
   Repository → Settings → Secrets and variables → Actions → New repository secret:
   - `MIXPANEL_TOKEN` (also `NEXT_PUBLIC_MIXPANEL_TOKEN` if Next.js — same value, exposed to client)
   - `MIXPANEL_API_SECRET` (server-only)

   Vault path convention: `revvel/apps/<app>/<env>/mixpanel`. See `docs/SECRETS_MANAGEMENT.md`.

4. **Install the SDK** in the target repo:
   ```bash
   # Browser / SPA / Next.js
   npm install mixpanel-browser

   # Node / worker / server
   npm install mixpanel
   ```

5. **Drop in the initializer template:**
   ```bash
   cp revvel-standards/templates/standards/mixpanel-init.ts \
      <app>/src/lib/analytics.ts
   ```
   Then import `track`, `identify`, `reset`, `optOut` from `lib/analytics` everywhere instead of calling the SDK directly.

6. **Adopt the event-naming and PII rules** in `templates/standards/mixpanel-events.md`:
   - Event names use `Title Case With Spaces` (e.g. `Signup Completed`, `Checkout Started`).
   - Property keys use `snake_case` (e.g. `plan_tier`, `referrer_source`).
   - Never send PII (email, phone, government ID, address) as a property — use the hashed `distinct_id` only.

7. **Wire the opt-out path:**
   - Honor `Do-Not-Track` in `mixpanel-init.ts` (the template already does this).
   - Provide a settings toggle that calls `optOut()` / `optIn()`.

8. **Verify ingest in the Mixpanel dashboard:**
   Mixpanel Dashboard → Events → Live View — events should appear within seconds of triggering them locally.

## Event Catalog — Default Revvel Events

Every Revvel app **must** emit these baseline events (server-side or client-side, whichever is authoritative):

| Event Name | When to Fire | Required Properties |
|---|---|---|
| `App Loaded` | First mount of the root component | `app_version`, `platform` |
| `User Signed Up` | Server confirms new account | `signup_method`, `referrer_source` |
| `User Logged In` | Server confirms session | `login_method` |
| `User Logged Out` | User-initiated sign out | *(none)* |
| `Feature Used` | Any non-nav user action worth tracking | `feature_name`, `surface` |
| `Purchase Completed` | Stripe webhook `checkout.session.completed` | `product_slug`, `amount_cents`, `currency` |
| `Error Surfaced` | User saw a non-fatal error toast / page | `error_code`, `surface` |

Project-specific events go in the per-app `BOM.md` under §Telemetry.

## PII & Compliance Rules — Hard Lines

1. **Never send raw email, phone, full name, government ID, address, IP, or precise geolocation as a Mixpanel property.** Hash any required identifier with SHA-256 before sending.
2. **`distinct_id` is your hashed user UUID**, never the raw email or login.
3. **`optOut()` is honored** — the template's `track()` is a no-op when opted out, and Do-Not-Track is treated as opt-out by default.
4. **EU users → use the EU residency project** if the app has any EU traffic; the SDK init flag is `api_host: 'https://api-eu.mixpanel.com'`.
5. **Server-only secret** — `MIXPANEL_API_SECRET` is **never** referenced in client code. Only `MIXPANEL_TOKEN` (or `NEXT_PUBLIC_MIXPANEL_TOKEN`) goes to the browser bundle.

Full rules: `templates/standards/mixpanel-events.md`.

## Key SDK Calls

```ts
// Browser / Next.js client
import { track, identify, reset, optOut, optIn } from '@/lib/analytics';

track('Signup Completed', { signup_method: 'google', referrer_source: 'twitter' });
identify('hashed-user-uuid');
optOut();   // settings toggle
optIn();    // settings toggle
reset();    // call on logout to clear distinct_id
```

```ts
// Node / worker / server
import Mixpanel from 'mixpanel';
const mp = Mixpanel.init(process.env.MIXPANEL_TOKEN!);
mp.track('Purchase Completed', {
  distinct_id: hashedUserId,
  product_slug: 'asset-donation-engine',
  amount_cents: 4900,
  currency: 'usd',
});
```

## Mixpanel vs PostHog vs Umami — When to Use Which

| Scenario | Tool |
|---|---|
| Action-level user-behavior funnels & retention | **Mixpanel** |
| Open-source, self-hosted, page-view web analytics | Umami |
| All-in-one (events + session replay + feature flags), self-hostable | PostHog |
| Marketing-site SEO/page traffic | Umami or GA4 |
| Heatmaps & user recordings | Hotjar |

For shipped Revvel products the default is **Mixpanel for product events + Umami for marketing-site traffic**, unless the per-app `BOM.md` overrides it.

## Cost & Pricing

- **Free plan:** Up to 1M events/month, unlimited reports — sufficient for pre-PMF products.
- **Growth plan:** Paid — visit <https://mixpanel.com/pricing> for current rates.
- **ROI:** Even one funnel insight that lifts conversion 1% on a $5k/mo product offsets the subscription many times over.

## Session Checklist

- [ ] `MIXPANEL_TOKEN` added to GitHub Secrets (and Vault under `revvel/apps/<app>/<env>/mixpanel`)
- [ ] `MIXPANEL_API_SECRET` added to GitHub Secrets, server-only
- [ ] SDK installed (`mixpanel-browser` and/or `mixpanel`)
- [ ] `templates/standards/mixpanel-init.ts` copied to `src/lib/analytics.ts`
- [ ] All event names follow `Title Case With Spaces`; properties `snake_case`
- [ ] No PII sent as event properties (verified by reading every `track()` call site)
- [ ] Do-Not-Track and explicit opt-out wired
- [ ] Baseline Revvel events (`App Loaded`, `User Signed Up`, `Purchase Completed`, etc.) firing
- [ ] Live View in Mixpanel Dashboard shows the events end-to-end
