# Mixpanel Integration — Revvel Standards

**Version:** 1.0.0
**Date:** April 28, 2026
**Status:** Active — additive standard for all MIDNGHTSAPPHIRE apps that ship product analytics
**Owner:** Audrey Evans (MIDNGHTSAPPHIRE)
**Scope:** Every Revvel project (web, Node, mobile, browser extension) that needs user-behavior analytics
**Related:**
[`skills/mixpanel/SKILL.md`](../skills/mixpanel/SKILL.md) ·
[`templates/standards/mixpanel-init.ts`](../templates/standards/mixpanel-init.ts) ·
[`templates/standards/mixpanel-events.md`](../templates/standards/mixpanel-events.md) ·
[`docs/REVVEL_MASTER_STANDARDS.md`](./REVVEL_MASTER_STANDARDS.md) §Analytics ·
[`docs/SECRETS_MANAGEMENT.md`](./SECRETS_MANAGEMENT.md)

---

## 1. Problem statement

`docs/REVVEL_MASTER_STANDARDS.md` and `README.md` both name **Mixpanel** as the user-behavior analytics tool of record for Revvel projects, but the standards repo previously had:

- no skill telling agents how to integrate it,
- no drop-in initializer / wrapper module,
- no event-naming or PII rules,
- no env-var documentation in `.env.example`.

As a result, every project that has tried to wire Mixpanel has done it differently — different event-name casing, different property-key conventions, inconsistent opt-out handling, and at least one case of an email being sent as a property (PII leak).

This integration ships the missing pieces so any agent or human can drop Mixpanel into a Revvel app in under 10 minutes and have it conform to the standard on the first commit.

---

## 2. What this integration adds

| Artifact | Path | Purpose |
|---|---|---|
| Skill (agent-facing) | `skills/mixpanel/SKILL.md` | Tells any agent how to integrate Mixpanel correctly |
| Skill (machine-readable) | `skills/mixpanel/mixpanel.skill.yml` | Auto-loadable spec, registered in `SKILLS_INDEX.yml` |
| Init template (TypeScript) | `templates/standards/mixpanel-init.ts` | Drop-in wrapper with DNT honoring, opt-out, PII strip |
| Event standard | `templates/standards/mixpanel-events.md` | Event names, property keys, baseline catalog, PII rules |
| Env documentation | `.env.example` (ANALYTICS block) | Documents `MIXPANEL_TOKEN`, `MIXPANEL_API_SECRET`, `NEXT_PUBLIC_MIXPANEL_TOKEN`, `MIXPANEL_API_HOST` |
| Registry entries | `skills/REGISTRY.md`, `skills/SKILLS_INDEX.yml` | Discoverable via skill triggers (`mixpanel`, `track event`, etc.) |

The integration is **additive** — it does not replace, modify, or conflict with any existing skill, template, or workflow.

---

## 3. Per-project integration steps (the 10-minute path)

1. **Provision secrets**

   ```bash
   # Vault (preferred):
   vault kv put revvel/apps/<app>/<env>/mixpanel \
     token=<MIXPANEL_TOKEN> api_secret=<MIXPANEL_API_SECRET>

   # GitHub Actions (mirror from Vault, or set manually):
   gh secret set MIXPANEL_TOKEN       --repo midnghtsapphire/<app>
   gh secret set MIXPANEL_API_SECRET  --repo midnghtsapphire/<app>
   ```

2. **Install the SDK**

   ```bash
   # Browser / Next.js / Vite app:
   npm install mixpanel-browser

   # Node worker / API server / Stripe webhook:
   npm install mixpanel
   ```

3. **Drop in the wrapper**

   ```bash
   cp revvel-standards/templates/standards/mixpanel-init.ts \
      <app>/src/lib/analytics.ts
   ```

4. **Use it in feature code** — never call the SDK directly:

   ```ts
   import { track, identify, optOut } from '@/lib/analytics';

   track('Signup Completed', {
     signup_method: 'google',
     referrer_source: 'twitter',
   });
   ```

5. **Wire baseline events** from `templates/standards/mixpanel-events.md` §2:
   `App Loaded`, `User Signed Up`, `User Logged In`, `User Logged Out`,
   `Feature Used`, `Purchase Completed`, `Error Surfaced`.

6. **Verify in Mixpanel Dashboard → Live View** — events should appear within seconds.

7. **Document any project-specific events** in the per-app `BOM.md` §Telemetry.

---

## 4. PII guardrails — defense in depth

Three layers protect against accidental PII leaks:

1. **Standard** (`mixpanel-events.md` §3) — enumerates the banned property keys and the authoritative `distinct_id` shape.
2. **Wrapper** (`mixpanel-init.ts` `stripPII()`) — drops banned keys at runtime and logs a dev-mode warning.
3. **PR review** (`mixpanel-events.md` §6 checklist) — required for any PR that touches `lib/analytics` call sites.

If any layer fires (PR comment, dev-mode warning, or production audit finds a banned key in raw events), treat as a **security incident** and follow `skills/security/SKILL.md`.

---

## 5. Why a wrapper instead of direct SDK usage

Feature code calls `track()`, `identify()`, `optOut()`, `reset()` from `lib/analytics` — never `mixpanel-browser` or `mixpanel` directly. Reasons:

- **Single PII strip point** — every call goes through `stripPII()`.
- **Single opt-out point** — DNT and `localStorage` opt-out are checked once in the wrapper, not duplicated at every call site.
- **No-op when token is unset** — local dev / preview deploys don't crash.
- **EU host swap** — controlled by `MIXPANEL_API_HOST` env var, not hard-coded.
- **SDK swap-out is one-file** — if Mixpanel is ever replaced (PostHog, Amplitude), only `lib/analytics.ts` changes; feature code is untouched.

---

## 6. What this integration does NOT do

- It does not run Mixpanel in CI — Mixpanel is a runtime SDK, not a CI tool. There is no `.github/workflows/mixpanel.yml` and there should never be one.
- It does not auto-instrument page views — Revvel uses Umami for marketing-site traffic (see `docs/REVVEL_MASTER_STANDARDS.md` §Analytics).
- It does not capture session replay — use PostHog or Hotjar if replay is needed; do not enable Mixpanel session replay (paid + PII-heavy).
- It does not provision the Mixpanel project itself — that is a one-time dashboard step (see `skills/mixpanel/SKILL.md` §Setup Checklist step 1).

---

## 7. Maintenance

- **Skill version** is tracked in `skills/mixpanel/mixpanel.skill.yml` `version`. Bump on any rule change.
- **Template version** is tracked in this doc's frontmatter. Bump on `mixpanel-init.ts` or `mixpanel-events.md` changes.
- **Banned-keys list** in `mixpanel-init.ts` and `mixpanel-events.md` must stay in sync — any change to one requires the matching change to the other in the same PR.
