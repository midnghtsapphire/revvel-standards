# PostHog Event Standard — Revvel

**Version:** 1.0.0
**Status:** Active — applies to every Revvel project that ships a PostHog SDK.
**Companion:** [`skills/posthog/SKILL.md`](../../skills/posthog/SKILL.md), [`posthog-init.ts`](./posthog-init.ts).

This is the authoritative event-naming, property-shape, and PII standard for PostHog across the MIDNGHTSAPPHIRE org. If a project deviates, document the deviation in its `BOM.md` §Telemetry.

---

## 1. Naming Rules

### Event names

- **`snake_case`** — lowercase with underscores, past-tense verb phrase describing the action that already occurred.
- ✅ `signup_completed`, `checkout_started`, `feature_used`, `purchase_completed`.
- ❌ `Signup Completed`, `signupCompleted`, `Signup`, `SignupEvent`, `click_signup_button`.

PostHog displays event names in dashboards and session replays. Treat them like technical identifiers, not UI copy.

> **Note:** This differs from Mixpanel's `Title Case With Spaces` convention. PostHog uses `snake_case` by default. If migrating from Mixpanel, update event names or configure PostHog to accept both.

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
| `app_loaded` | client | `app_version`, `platform` |
| `user_signed_up` | server | `signup_method`, `referrer_source` |
| `user_logged_in` | server | `login_method` |
| `user_logged_out` | client | _(none)_ |
| `feature_used` | client | `feature_name`, `surface` |
| `purchase_completed` | server (Stripe webhook) | `product_slug`, `amount_cents`, `currency` |
| `error_surfaced` | client | `error_code`, `surface` |

> **Authoritative side** is whichever side can confirm the event without race conditions. Stripe purchases are server-confirmed via webhook; client `purchase_completed` events are unreliable (closed tab, payment failure).

---

## 3. PII Rules — Hard Lines

The following property keys **must never** be sent to PostHog. The drop-in `posthog-init.ts` strips them, but call sites must avoid them in the first place.

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
- **`session_id`** — random per-session UUID, opaque to PostHog (PostHog generates this automatically).
- **`anon_id`** — random per-device UUID (pre-auth, PostHog generates this automatically).

### EU residency

If the app has _any_ EU traffic, set:

```ts
// In posthog-init.ts — already configurable via POSTHOG_API_HOST:
process.env.POSTHOG_API_HOST = "https://eu.posthog.com";
```

Also create the PostHog project in the EU region from the dashboard.

---

## 4. Opt-Out / Consent

Three layers, all enforced by `posthog-init.ts`:

1. **Do-Not-Track header** — honored at SDK init. If the browser sends DNT, `captureEvent()` is a no-op until the user explicitly opts in.
2. **Persistent opt-out** — stored in `localStorage` as `posthog_opt_out=1`. Survives reloads.
3. **Default-deny in jurisdictions requiring opt-in consent** — for EU/UK traffic, gate `optIn()` behind explicit consent UI before any `captureEvent()` fires. The drop-in template treats `opt_out_capturing_by_default` as ON when DNT is set; you must wire the consent-banner side yourself.

---

## 5. Server-Side Ingestion

For events the client cannot be trusted to fire (purchases, server-validated signups), use the Node SDK:

```ts
import { PostHog } from 'posthog-node';
const posthog = new PostHog(process.env.POSTHOG_API_KEY!);

posthog.capture({
  distinctId: hashedUserId,                 // required for server-side
  event: 'purchase_completed',
  properties: {
    product_slug: 'asset-donation-engine',
    amount_cents: 4900,
    currency: 'usd',
    ts: new Date().toISOString(),
  },
});

// IMPORTANT: Flush events before process exit (e.g., serverless functions)
await posthog.shutdown();
```

`POSTHOG_PERSONAL_API_KEY` is **only** used for the GitHub Actions integrations (annotations, source maps). It is never bundled into client code.

---

## 6. Session Replay

PostHog session replay captures user interactions (clicks, scrolls, form fills) so you can watch what happened before a bug or conversion. Enable in `posthog-init.ts`:

```ts
// posthog-init.ts — add to the init options:
posthog.init(token, {
  // ... other options
  disable_session_recording: false,  // Enable session replay
  session_recording: {
    maskAllInputs: true,               // Mask all input fields by default
    maskTextSelector: '[data-private]', // Also mask elements with data-private
  },
});
```

Mark sensitive elements with `data-private` attribute:

```html
<input type="password" data-private />
<div data-private>User's full name: John Doe</div>
```

PostHog automatically masks credit card numbers, SSNs, and other sensitive patterns.

---

## 7. Feature Flags

PostHog feature flags let you A/B test features, gradual rollouts, and kill switches:

```ts
import { posthog, isFeatureEnabled, getFeatureFlag } from '@/lib/analytics-posthog';

// Check if a feature is enabled for the current user
if (isFeatureEnabled('new-checkout-flow')) {
  // Show new checkout flow
} else {
  // Show old checkout flow
}

// Get the variant of a multivariate flag
const variant = getFeatureFlag('pricing-test');
if (variant === 'variant-a') {
  // Show variant A pricing
} else if (variant === 'variant-b') {
  // Show variant B pricing
}
```

Feature flags are defined in PostHog dashboard → Feature Flags → New Flag.

---

## 8. Error Tracking

PostHog error tracking integrates with session replay and source maps:

```ts
import { captureException } from '@/lib/analytics-posthog';

try {
  // Your code
} catch (error) {
  captureException(error, {
    surface: 'checkout-page',
    user_action: 'submit-payment',
  });
}
```

Upload source maps via `PostHog/upload-source-maps` GitHub Action for readable stack traces.

---

## 9. GitHub Actions Integration

### Annotations

Mark deployments, PR merges, or releases in PostHog:

```yaml
- name: Send annotation to PostHog
  uses: PostHog/posthog-annotations-github-action@v1
  with:
    posthog-token: ${{ secrets.POSTHOG_PERSONAL_API_KEY }}
    posthog-project-id: ${{ secrets.POSTHOG_PROJECT_ID }}
    annotation-message: "Merged PR #${{ github.event.pull_request.number }}"
```

See `templates/cicd/posthog-annotations.yml`.

### Source Maps

Upload source maps after build:

```yaml
- name: Upload source maps to PostHog
  uses: PostHog/upload-source-maps@v1
  with:
    directory: dist
    project-id: ${{ secrets.POSTHOG_PROJECT_ID }}
    api-key: ${{ secrets.POSTHOG_PERSONAL_API_KEY }}
```

See `templates/cicd/posthog-upload-sourcemaps.yml`.

### Custom Events

Send custom events from CI/CD:

```yaml
- name: Send event to PostHog
  uses: daun/posthog-event-action@v1
  with:
    api-key: ${{ secrets.POSTHOG_API_KEY }}
    event: ci_completed
    properties: |
      workflow: ${{ github.workflow }}
      status: success
```

See `templates/cicd/posthog-send-event.yml`.

---

## 10. Review Checklist (for PRs that touch analytics)

- [ ] Event name follows `snake_case` past-tense.
- [ ] All property keys are `snake_case`.
- [ ] No PII keys in the property bag (cross-check the banned list).
- [ ] `distinct_id` is a hashed UUID, not raw email/login.
- [ ] Money amounts are integer cents, not float dollars.
- [ ] `optOut()` is honored — confirm by reading the call path in `lib/analytics-posthog`.
- [ ] If event is purchase / signup / logged-in, it fires from the server, not the client.
- [ ] If app has EU traffic, `POSTHOG_API_HOST` points to the EU host.
- [ ] Session replay masking is enabled for sensitive inputs.
- [ ] Source maps are uploaded if using error tracking.

---

## 11. Migration from Mixpanel

If migrating from Mixpanel:

1. **Event naming**: PostHog uses `snake_case` (vs Mixpanel's `Title Case`). Update event names:
   - `Signup Completed` → `signup_completed`
   - `Checkout Started` → `checkout_started`
   - `Purchase Completed` → `purchase_completed`

2. **distinct_id**: PostHog and Mixpanel use the same concept. Reuse your hashed user UUID.

3. **Properties**: Both use `snake_case` property keys. Minimal changes needed.

4. **Opt-out**: Both honor Do-Not-Track and persistent opt-out. The PostHog template mirrors the Mixpanel opt-out pattern.

5. **Server-side**: PostHog Node SDK (`posthog-node`) is similar to Mixpanel Node SDK (`mixpanel`).

6. **Session replay**: PostHog adds session replay (not available in Mixpanel). Enable in `posthog-init.ts`.

7. **Feature flags**: PostHog adds feature flags (not available in Mixpanel). Use `isFeatureEnabled()` and `getFeatureFlag()`.

---

## 12. Costs

- **Free tier**: 1M events/month, 5K session replays/month, unlimited feature flags.
- **Paid tier**: $0.000025/event after 1M (about $25 for 2M events), $0.005/replay after 5K.
- **Self-hosted**: Free forever, but you manage infrastructure.

See <https://posthog.com/pricing> for current pricing.

---

## References

- PostHog Docs: <https://posthog.com/docs>
- PostHog GitHub: <https://github.com/PostHog/posthog>
- PostHog API: <https://posthog.com/docs/api>
- Revvel PostHog Integration Standard: `docs/POSTHOG_INTEGRATION.md`
- Revvel PostHog Skill: `skills/posthog/SKILL.md`
