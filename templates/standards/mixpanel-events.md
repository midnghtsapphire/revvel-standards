# Mixpanel Event Standard — Revvel

**Version:** 1.0.0
**Status:** Active — applies to every Revvel project that ships a Mixpanel SDK.
**Companion:** [`skills/mixpanel/SKILL.md`](../../skills/mixpanel/SKILL.md), [`mixpanel-init.ts`](./mixpanel-init.ts).

This is the authoritative event-naming, property-shape, and PII standard for Mixpanel across the MIDNGHTSAPPHIRE org. If a project deviates, document the deviation in its `BOM.md` §Telemetry.

---

## 1. Naming Rules

### Event names

- **`Title Case With Spaces`** — past-tense verb phrase describing the action that already occurred.
- ✅ `Signup Completed`, `Checkout Started`, `Feature Used`, `Purchase Completed`.
- ❌ `signup_completed`, `signupCompleted`, `Signup`, `SignupEvent`, `Click Signup Button`.

Event names are read by humans on dashboards. Treat them like UI copy.

### Property keys

- **`snake_case`** — all lowercase, words joined by `_`.
- ✅ `signup_method`, `referrer_source`, `plan_tier`, `amount_cents`.
- ❌ `signupMethod`, `SignupMethod`, `signup-method`, `Signup Method`.

### Property values

- Strings: lowercase, kebab-case for slugs (e.g. `referrer_source: 'twitter-share'`).
- Numbers: integer cents for money (`amount_cents: 4900`), never floats.
- Booleans: actual `true`/`false`, not `'yes'`/`'no'`.
- Timestamps: ISO 8601 strings, not Unix seconds.

---

## 2. Baseline Event Catalog

Every Revvel app **must** emit these. Project-specific events go in the per-app `BOM.md` §Telemetry.

| Event Name | Authoritative side | Required Properties |
|---|---|---|
| `App Loaded` | client | `app_version`, `platform` |
| `User Signed Up` | server | `signup_method`, `referrer_source` |
| `User Logged In` | server | `login_method` |
| `User Logged Out` | client | _(none)_ |
| `Feature Used` | client | `feature_name`, `surface` |
| `Purchase Completed` | server (Stripe webhook) | `product_slug`, `amount_cents`, `currency` |
| `Error Surfaced` | client | `error_code`, `surface` |

> **Authoritative side** is whichever side can confirm the event without race conditions. Stripe purchases are server-confirmed via webhook; client `Purchase Completed` events are unreliable (closed tab, payment failure).

---

## 3. PII Rules — Hard Lines

The following property keys **must never** be sent to Mixpanel. The drop-in `mixpanel-init.ts` strips them, but call sites must avoid them in the first place.

### Banned property keys

```text
email                phone               ssn
email_address        phone_number        tax_id
full_name            first_name          last_name
address              street              postal_code
ip                   ip_address          lat / lng
latitude             longitude           password
token                api_key
```

### Allowed identifiers

- **`distinct_id`** — a hashed user UUID. Compute as `sha256(user_id + APP_SALT)`. **Never** the raw email, login, or DB primary key.
- **`session_id`** — random per-session UUID, opaque to Mixpanel.
- **`anon_id`** — random per-device UUID (pre-auth).

### EU residency

If the app has _any_ EU traffic, set:

```ts
// In mixpanel-init.ts — already configurable via MIXPANEL_API_HOST:
process.env.MIXPANEL_API_HOST = "https://api-eu.mixpanel.com";
```

Also create the Mixpanel project in the EU region from the dashboard.

---

## 4. Opt-Out / Consent

Three layers, all enforced by `mixpanel-init.ts`:

1. **Do-Not-Track header** — honored at SDK init. If the browser sends DNT, `track()` is a no-op until the user explicitly opts in.
2. **Persistent opt-out** — stored in `localStorage` as `mp_opt_out=1`. Survives reloads.
3. **Default-deny in jurisdictions requiring opt-in consent** — for EU/UK traffic, gate `optIn()` behind explicit consent UI before any `track()` fires. The drop-in template treats `opt_out_tracking_by_default` as ON when DNT is set; you must wire the consent-banner side yourself.

---

## 5. Server-Side Ingestion

For events the client cannot be trusted to fire (purchases, server-validated signups), use the Node SDK:

```ts
import Mixpanel from 'mixpanel';
const mp = Mixpanel.init(process.env.MIXPANEL_TOKEN!);

mp.track('Purchase Completed', {
  distinct_id: hashedUserId,                 // required for server-side
  product_slug: 'asset-donation-engine',
  amount_cents: 4900,
  currency: 'usd',
  ts: new Date().toISOString(),
});
```

`MIXPANEL_API_SECRET` is **only** used for the data-export and engage APIs from server-side jobs. It is never bundled into client code.

---

## 6. Review Checklist (for PRs that touch analytics)

- [ ] Event name follows `Title Case With Spaces` past-tense.
- [ ] All property keys are `snake_case`.
- [ ] No PII keys in the property bag (cross-check the banned list).
- [ ] `distinct_id` is a hashed UUID, not raw email/login.
- [ ] Money amounts are integer cents, not float dollars.
- [ ] `optOut()` is honored — confirm by reading the call path in `lib/analytics`.
- [ ] If event is purchase / signup / logged-in, it fires from the server, not the client.
- [ ] If app has EU traffic, `MIXPANEL_API_HOST` points to the EU host.
