# PostHog Integration — Revvel Standards

**Version:** 1.0.0
**Date:** April 30, 2026
**Status:** Active — additive standard for all MIDNGHTSAPPHIRE apps that ship product analytics, session replay, feature flags, or error tracking
**Owner:** Audrey Evans (MIDNGHTSAPPHIRE)
**Scope:** Every Revvel project (web, Node, mobile, browser extension) that needs product analytics
**Related:**
[`skills/posthog/SKILL.md`](../skills/posthog/SKILL.md) ·
[`templates/standards/posthog-init.ts`](../templates/standards/posthog-init.ts) ·
[`templates/standards/posthog-events.md`](../templates/standards/posthog-events.md) ·
[`docs/REVVEL_MASTER_STANDARDS.md`](./REVVEL_MASTER_STANDARDS.md) §Analytics ·
[`docs/SECRETS_MANAGEMENT.md`](./SECRETS_MANAGEMENT.md)

---

## 1. Problem statement

While `docs/REVVEL_MASTER_STANDARDS.md` names **Mixpanel** and **Amplitude** as the analytics tools of record, there is growing interest in **PostHog** as an all-in-one alternative that combines:

- **Product analytics** (like Mixpanel/Amplitude)
- **Session replay** (like FullStory/LogRocket)
- **Feature flags** (like LaunchDarkly/Split)
- **A/B testing** (like Optimizely/VWO)
- **Error tracking** (like Sentry/Rollbar)

PostHog is **open-source**, can be **self-hosted**, and offers a **generous free tier** (1M events/month, 5K session replays/month, unlimited feature flags). It also has **first-class GitHub Actions integrations** for annotations, source map uploads, and event tracking from CI/CD.

However, the standards repo previously had:

- no skill telling agents how to integrate it,
- no drop-in initializer / wrapper module,
- no event-naming or PII rules,
- no GitHub Actions workflow templates,
- no env-var documentation in `.env.example`.

This integration ships the missing pieces so any agent or human can drop PostHog into a Revvel app in under 10 minutes and have it conform to the standard on the first commit.

---

## 2. What this integration adds

| Artifact | Path | Purpose |
|---|---|---|
| Skill (agent-facing) | `skills/posthog/SKILL.md` | Tells any agent how to integrate PostHog correctly |
| Skill (machine-readable) | `skills/posthog/posthog.skill.yml` | Auto-loadable spec, registered in `SKILLS_INDEX.yml` |
| Init template (TypeScript) | `templates/standards/posthog-init.ts` | Drop-in wrapper with DNT honoring, opt-out, PII strip, session replay, feature flags |
| Event standard | `templates/standards/posthog-events.md` | Event names, property keys, baseline catalog, PII rules, session replay, feature flags |
| GitHub Actions — Annotations | `templates/cicd/posthog-annotations.yml` | Send annotations to PostHog on PR merges / releases |
| GitHub Actions — Source Maps | `templates/cicd/posthog-upload-sourcemaps.yml` | Upload source maps for error tracking |
| GitHub Actions — Send Event | `templates/cicd/posthog-send-event.yml` | Send custom events from CI/CD |
| Env documentation | `.env.example` (ANALYTICS block) | Documents `POSTHOG_API_KEY`, `POSTHOG_PERSONAL_API_KEY`, `POSTHOG_PROJECT_ID`, `POSTHOG_API_HOST` |
| Registry entries | `skills/REGISTRY.md`, `skills/SKILLS_INDEX.yml` | Discoverable via skill triggers (`posthog`, `session replay`, etc.) |

The integration is **additive** — it does not replace, modify, or conflict with any existing skill, template, or workflow.

---

## 3. Per-project integration steps (the 10-minute path)

1. **Provision secrets**

   ```bash
   # Vault (preferred):
   vault kv put revvel/apps/<app>/<env>/posthog \
     api_key=<POSTHOG_API_KEY> \
     personal_api_key=<POSTHOG_PERSONAL_API_KEY> \
     project_id=<POSTHOG_PROJECT_ID>

   # GitHub Actions (mirror from Vault, or set manually):
   gh secret set POSTHOG_API_KEY           --repo midnghtsapphire/<app>
   gh secret set POSTHOG_PERSONAL_API_KEY  --repo midnghtsapphire/<app>
   gh secret set POSTHOG_PROJECT_ID        --repo midnghtsapphire/<app>
   ```

2. **Install the SDK**

   ```bash
   # Browser / Next.js / Vite app:
   npm install posthog-js

   # Node worker / API server / Stripe webhook:
   npm install posthog-node
   ```

3. **Drop in the wrapper**

   ```bash
   cp revvel-standards/templates/standards/posthog-init.ts \
      <app>/src/lib/analytics-posthog.ts
   ```

4. **Use it in feature code** — never call the SDK directly:

   ```ts
   import { captureEvent, identify, optOut } from '@/lib/analytics-posthog';

   captureEvent('signup_completed', {
     signup_method: 'google',
     referrer_source: 'twitter',
   });
   ```

5. **Wire baseline events** from `templates/standards/posthog-events.md` §2:
   `app_loaded`, `user_signed_up`, `user_logged_in`, `user_logged_out`,
   `feature_used`, `purchase_completed`, `error_surfaced`.

6. **Verify in PostHog Dashboard → Activity → Events** — events should appear within seconds.

7. **Document any project-specific events** in the per-app `BOM.md` §Telemetry.

8. **(Optional) Enable session replay** in `posthog-init.ts`:

   ```ts
   posthog.init(apiKey, {
     disable_session_recording: false,
     session_recording: {
       maskAllInputs: true,
       maskTextSelector: '[data-private]',
     },
   });
   ```

9. **(Optional) Add GitHub Actions** for annotations, source maps, and events:

   ```bash
   cp revvel-standards/templates/cicd/posthog-annotations.yml \
      <app>/.github/workflows/
   cp revvel-standards/templates/cicd/posthog-upload-sourcemaps.yml \
      <app>/.github/workflows/
   cp revvel-standards/templates/cicd/posthog-send-event.yml \
      <app>/.github/workflows/
   ```

---

## 4. PII guardrails — defense in depth

1. **Never send raw email, phone, full name, government ID, address, IP, or precise geolocation as a PostHog property.**

2. **`distinct_id` is your hashed user UUID**, never the raw email or login.

3. **`optOut()` is honored** — the template's `captureEvent()` is a no-op when opted out, and Do-Not-Track is treated as opt-out by default.

4. **EU users → use the EU host** if the app has any EU traffic; the SDK init flag is `api_host: 'https://eu.posthog.com'`.

5. **Server-only secret** — `POSTHOG_PERSONAL_API_KEY` is **never** referenced in client code. Only `POSTHOG_API_KEY` (or `NEXT_PUBLIC_POSTHOG_API_KEY`) goes to the browser bundle.

6. **Session replay masking** — mark sensitive elements with `data-private` attribute, and enable `maskAllInputs: true` in the init options.

---

## 5. Session Replay

PostHog session replay captures user interactions (clicks, scrolls, form fills) so you can watch what happened before a bug or conversion. Enable in `posthog-init.ts`:

```ts
posthog.init(apiKey, {
  disable_session_recording: false,
  session_recording: {
    maskAllInputs: true,
    maskTextSelector: '[data-private]',
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

## 6. Feature Flags

PostHog feature flags let you A/B test features, gradual rollouts, and kill switches:

```ts
import { isFeatureEnabled, getFeatureFlag } from '@/lib/analytics-posthog';

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

## 7. Error Tracking

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

Upload source maps via `PostHog/upload-source-maps` GitHub Action for readable stack traces. See `templates/cicd/posthog-upload-sourcemaps.yml`.

---

## 8. GitHub Actions Integration

PostHog provides three GitHub Actions for CI/CD integration:

### 1. PostHog Annotations

Mark deployments, PR merges, or releases in PostHog with annotations:

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

Upload JavaScript source maps after build for readable error stack traces:

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

Send custom events from GitHub Actions (e.g., CI completion, deployment success):

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

## 9. Migration from Mixpanel

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

## 10. Costs

- **Free tier**: 1M events/month, 5K session replays/month, unlimited feature flags.
- **Paid tier**: $0.000025/event after 1M (about $25 for 2M events), $0.005/replay after 5K.
- **Self-hosted**: Free forever, but you manage infrastructure.

See <https://posthog.com/pricing> for current pricing.

---

## 11. Compliance

- **GDPR**: PostHog is GDPR-compliant. Use the EU host for EU traffic.
- **CCPA**: PostHog honors opt-out via `optOut()` and Do-Not-Track.
- **Data residency**: PostHog Cloud has US and EU regions. Self-hosting is also an option.

---

## 12. References

- PostHog Docs: <https://posthog.com/docs>
- PostHog GitHub: <https://github.com/PostHog/posthog>
- PostHog GitHub Actions: <https://github.com/marketplace?query=posthog>
- Revvel PostHog Skill: `skills/posthog/SKILL.md`
- Revvel PostHog Events Standard: `templates/standards/posthog-events.md`
- Revvel PostHog Init Template: `templates/standards/posthog-init.ts`
