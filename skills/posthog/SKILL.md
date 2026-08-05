# PostHog Skill — Product Analytics & Session Replay

Activate when any task involves setting up PostHog, instrumenting product events, session replay, feature flags, A/B tests, error tracking with source maps, or integrating PostHog into a Revvel project (web, Node, mobile).

## What PostHog Does

PostHog is an all-in-one product analytics platform that captures **user-behavior events**, **session replays**, **feature flags**, **A/B tests**, and **error tracking** (with source map support). It lets product owners answer questions like *"how many users completed onboarding?"*, *"which feature is causing crashes?"*, *"what did the user do before encountering the error?"*, all in one platform. It's open-source and can be self-hosted or used via PostHog Cloud.

## Why PostHog in the Revvel Ecosystem

- Open-source alternative to Mixpanel + FullStory + LaunchDarkly combined.
- **Free tier** covers 1M events/month, 5K session replays/month, unlimited feature flags.
- First-class SDKs for browser (`posthog-js`), Node (`posthog-node`), React, React Native, iOS, Android.
- **Session replay** — watch what users did before encountering a bug.
- **Feature flags** — A/B test features, gradual rollouts, kill switches.
- **Error tracking with source maps** — upload source maps via GitHub Actions for readable stack traces.
- Server-side ingest works via the Ingestion API (token + `/capture`) — no SDK required for cron jobs or workers.
- Plays nicely with the Revvel `vault-agent` skill for `POSTHOG_API_KEY` provisioning.
- **GitHub Actions integrations** for annotations (mark deployments), source map uploads, and event tracking from CI/CD.

## Integration Architecture

```text
Revvel app (browser / Node / mobile)
        ↓
  PostHog SDK initialized with POSTHOG_API_KEY
        ↓
  posthog.capture('event_name', { property: value })
        ↓
  PostHog cloud (https://app.posthog.com or https://eu.posthog.com)
        ↓
  Dashboards, session replay, feature flags, A/B tests, error tracking
        ↓
  GitHub Actions annotations on PR merges / releases
```

## Setup Checklist (New Project)

1. **Create a PostHog project:**
   Visit <https://posthog.com> → sign up → create a project. Pick the EU region only if user data must stay in the EU (otherwise leave default US).

2. **Retrieve credentials from PostHog:**
   - `POSTHOG_API_KEY` — Project Settings → API Keys → Project API Key (safe to expose in client bundles).
   - `POSTHOG_PERSONAL_API_KEY` — Personal API Keys (for GitHub Actions annotations, server-side API access).
   - `POSTHOG_PROJECT_ID` — Project Settings → Project ID (required for annotations, source maps).

3. **Add secrets to your GitHub repository (and Vault):**
   Repository → Settings → Secrets and variables → Actions → New repository secret:
   - `POSTHOG_API_KEY` (also `NEXT_PUBLIC_POSTHOG_API_KEY` if Next.js — same value, exposed to client)
   - `POSTHOG_PERSONAL_API_KEY` (server-only, for GitHub Actions)
   - `POSTHOG_PROJECT_ID` (for annotations, source maps)

   Vault path convention: `revvel/apps/<app>/<env>/posthog`. See `docs/SECRETS_MANAGEMENT.md`.

4. **Install the SDK** in the target repo:
   ```bash
   # Browser / SPA / Next.js
   npm install posthog-js

   # Node / worker / server
   npm install posthog-node
   ```

5. **Drop in the initializer template:**
   ```bash
   cp revvel-standards/templates/standards/posthog-init.ts \
      <app>/src/lib/analytics-posthog.ts
   ```
   Then import `captureEvent`, `identify`, `reset`, `optOut` from `lib/analytics-posthog` everywhere instead of calling the SDK directly.

6. **Adopt the event-naming and PII rules** in `templates/standards/posthog-events.md`:
   - Event names use `snake_case` (e.g. `signup_completed`, `checkout_started`).
   - Property keys use `snake_case` (e.g. `plan_tier`, `referrer_source`).
   - Never send PII (email, phone, government ID, address) as a property — use the hashed `distinct_id` only.

7. **Wire the opt-out path:**
   - Honor `Do-Not-Track` in `posthog-init.ts` (the template already does this).
   - Provide a settings toggle that calls `optOut()` / `optIn()`.

8. **Enable Session Replay** (optional):
   ```ts
   posthog.init(apiKey, {
     enable_recording_console_log: true,
     session_recording: {
       maskAllInputs: true,
       maskTextSelector: '[data-private]',
     },
   });
   ```

9. **Upload source maps** (for error tracking):
   Add the PostHog Upload Source Maps GitHub Action to `.github/workflows/`.
   See `templates/cicd/posthog-upload-sourcemaps.yml`.

10. **Add annotations for deployments** (optional):
    Add the PostHog Annotations GitHub Action to `.github/workflows/`.
    See `templates/cicd/posthog-annotations.yml`.

11. **Verify ingest in the PostHog dashboard:**
    PostHog Dashboard → Activity → Events — events should appear within seconds of triggering them locally.

## Event Catalog — Default Revvel Events

Every Revvel app **must** emit these baseline events (server-side or client-side, whichever is authoritative):

| Event Name | When to Fire | Required Properties |
|---|---|---|
| `app_loaded` | First mount of the root component | `app_version`, `platform` |
| `user_signed_up` | Server confirms new account | `signup_method`, `referrer_source` |
| `user_logged_in` | Server confirms session | `login_method` |
| `user_logged_out` | User-initiated sign out | *(none)* |
| `feature_used` | Any non-nav user action worth tracking | `feature_name`, `surface` |
| `purchase_completed` | Stripe webhook `checkout.session.completed` | `product_slug`, `amount_cents`, `currency` |
| `error_surfaced` | User saw a non-fatal error toast / page | `error_code`, `surface` |

Project-specific events go in the per-app `BOM.md` under §Telemetry.

## PII & Compliance Rules — Hard Lines

1. **Never send raw email, phone, full name, government ID, address, IP, or precise geolocation as a PostHog property.** Hash any required identifier with SHA-256 before sending.
2. **`distinct_id` is your hashed user UUID**, never the raw email or login.
3. **`optOut()` is honored** — the template's `captureEvent()` is a no-op when opted out, and Do-Not-Track is treated as opt-out by default.
4. **EU users → use the EU host** if the app has any EU traffic; the SDK init flag is `api_host: 'https://eu.posthog.com'`.
5. **Server-only secret** — `POSTHOG_PERSONAL_API_KEY` is **never** referenced in client code. Only `POSTHOG_API_KEY` (or `NEXT_PUBLIC_POSTHOG_API_KEY`) goes to the browser bundle.

## GitHub Actions Integrations

PostHog provides several GitHub Actions for CI/CD integration:

### 1. PostHog Annotations

Mark deployments, PR merges, or releases in PostHog with annotations.

```yaml
- name: Send annotation to PostHog
  uses: PostHog/posthog-annotations-github-action@v1
  with:
    posthog-token: ${{ secrets.POSTHOG_PERSONAL_API_KEY }}
    posthog-project-id: ${{ secrets.POSTHOG_PROJECT_ID }}
    annotation-message: "Merged PR #${{ github.event.pull_request.number }}"
```

See `templates/cicd/posthog-annotations.yml`.

### 2. PostHog Upload Source Maps

Upload JavaScript source maps after build for readable error stack traces.

```yaml
- name: Upload source maps to PostHog
  uses: PostHog/upload-source-maps@v1
  with:
    directory: dist
    project-id: ${{ secrets.POSTHOG_PROJECT_ID }}
    api-key: ${{ secrets.POSTHOG_PERSONAL_API_KEY }}
```

See `templates/cicd/posthog-upload-sourcemaps.yml`.

### 3. Send Event to PostHog

Send custom events from GitHub Actions (e.g., CI completion, deployment success).

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

## Feature Flags

PostHog feature flags let you A/B test features, gradual rollouts, and kill switches:

```ts
import { posthog } from '@/lib/analytics-posthog';

// Check if a feature is enabled for the current user
if (posthog.isFeatureEnabled('new-checkout-flow')) {
  // Show new checkout flow
} else {
  // Show old checkout flow
}

// Get the variant of a multivariate flag
const variant = posthog.getFeatureFlag('pricing-test');
if (variant === 'variant-a') {
  // Show variant A pricing
} else if (variant === 'variant-b') {
  // Show variant B pricing
}
```

Feature flags are defined in PostHog dashboard → Feature Flags → New Flag.

## Session Replay

Session replay captures user interactions (clicks, scrolls, form fills) so you can watch what happened before a bug or conversion:

```ts
// Enable session replay in posthog-init.ts
posthog.init(apiKey, {
  session_recording: {
    maskAllInputs: true,
    maskTextSelector: '[data-private]',
  },
});

// Mark sensitive elements with data-private attribute
<input type="password" data-private />
```

Replays appear in PostHog dashboard → Session Replay → Recordings.

## Error Tracking

PostHog error tracking integrates with session replay and source maps:

```ts
try {
  // Your code
} catch (error) {
  posthog.captureException(error);
}
```

Upload source maps via `PostHog/upload-source-maps` GitHub Action for readable stack traces.

## Migration from Mixpanel

If migrating from Mixpanel:

1. **Event naming**: PostHog uses `snake_case` by default (vs Mixpanel's `Title Case`). Update event names in the migration or configure PostHog to accept both.
2. **distinct_id**: PostHog and Mixpanel use the same concept. Reuse your hashed user UUID.
3. **Properties**: Both use `snake_case` property keys. Minimal changes needed.
4. **Opt-out**: Both honor Do-Not-Track and persistent opt-out. The PostHog template mirrors the Mixpanel opt-out pattern.
5. **Server-side**: PostHog Node SDK (`posthog-node`) is similar to Mixpanel Node SDK.

## Testing

Before deploying, verify:

1. **Events appear in PostHog dashboard** → Activity → Events.
2. **Session replays work** → Session Replay → Recordings (if enabled).
3. **Feature flags return correct values** → Feature Flags → Usage.
4. **Source maps uploaded** → Settings → Source Maps (if using error tracking).
5. **Annotations appear** → Annotations tab (if using GitHub Actions).

## Compliance

- **GDPR**: PostHog is GDPR-compliant. Use the EU host for EU traffic.
- **CCPA**: PostHog honors opt-out via `optOut()` and Do-Not-Track.
- **Data residency**: PostHog Cloud has US and EU regions. Self-hosting is also an option.

## Costs

- **Free tier**: 1M events/month, 5K session replays/month, unlimited feature flags.
- **Paid tier**: $0.000025/event after 1M (about $25 for 2M events), $0.005/replay after 5K.
- **Self-hosted**: Free forever, but you manage infrastructure.

See <https://posthog.com/pricing> for current pricing.

## References

- PostHog Docs: <https://posthog.com/docs>
- PostHog GitHub: <https://github.com/PostHog/posthog>
- PostHog GitHub Actions: <https://github.com/marketplace?query=posthog>
- Revvel PostHog Integration Standard: `docs/POSTHOG_INTEGRATION.md`
- Revvel PostHog Events Standard: `templates/standards/posthog-events.md`
- Revvel PostHog Init Template: `templates/standards/posthog-init.ts`
