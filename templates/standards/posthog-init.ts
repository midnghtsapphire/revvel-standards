/**
 * Revvel Standard — PostHog Initializer
 * ──────────────────────────────────────
 * Drop-in analytics module. Copy to: <app>/src/lib/analytics-posthog.ts
 *
 * Why this wrapper exists (do NOT call `posthog-js` / `posthog-node`
 * directly from feature code):
 *   1. Honors Do-Not-Track and explicit user opt-out by default.
 *   2. No-ops when POSTHOG_API_KEY is unset (e.g. local dev) — feature
 *      code never has to null-check.
 *   3. Centralizes PII guardrails — strips obviously-PII keys from
 *      properties before sending (defense in depth; primary
 *      responsibility is still the call site).
 *   4. Single import surface for both browser and Node — the
 *      build tool tree-shakes the unused half.
 *
 * Required env vars:
 *   - Browser: NEXT_PUBLIC_POSTHOG_API_KEY  (or VITE_POSTHOG_API_KEY, etc.)
 *   - Node:    POSTHOG_API_KEY
 *
 * NEVER reference POSTHOG_PERSONAL_API_KEY in this file or anywhere
 * client-bundled. Personal API Key is server-only (GitHub Actions, data export).
 *
 * See: skills/posthog/SKILL.md and templates/standards/posthog-events.md
 */

// ─── Configuration ─────────────────────────────────────────────────────────

/** True in a browser/SPA build, false in pure Node. */
const IS_BROWSER = typeof window !== "undefined";

/**
 * Pull the token from whichever env shape the host build system exposes.
 * Order: NEXT_PUBLIC_* → VITE_* → POSTHOG_API_KEY.
 */
function resolveToken(): string | undefined {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const env: any = (typeof process !== "undefined" && process.env) || {};
  return (
    env.NEXT_PUBLIC_POSTHOG_API_KEY ||
    env.VITE_POSTHOG_API_KEY ||
    env.POSTHOG_API_KEY
  );
}

/** Set to 'https://eu.posthog.com' for EU-residency projects. */
const API_HOST =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ((typeof process !== "undefined" && (process.env as any)) || {})
    .POSTHOG_API_HOST || "https://app.posthog.com";

// ─── PII guardrails ────────────────────────────────────────────────────────
//
// Hard ban list — these property keys must never reach PostHog. If your
// feature code tries to send them, this wrapper drops them and logs a
// warning in development. See templates/standards/posthog-events.md §PII.

const PII_KEY_BLOCKLIST = new Set<string>([
  "email",
  "email_address",
  "phone",
  "phone_number",
  "ssn",
  "tax_id",
  "address",
  "street",
  "full_name",
  "first_name",
  "last_name",
  "ip",
  "ip_address",
  "lat",
  "lng",
  "latitude",
  "longitude",
  "password",
  "token",
  "api_key",
]);

function stripPII(props?: Record<string, unknown>): Record<string, unknown> {
  if (!props) return {};
  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(props)) {
    if (PII_KEY_BLOCKLIST.has(key.toLowerCase())) {
      if (typeof console !== "undefined" && console.warn) {
        console.warn(
          `[analytics-posthog] dropping PII property "${key}" — see posthog-events.md §PII`,
        );
      }
      continue;
    }
    clean[key] = value;
  }
  return clean;
}

// ─── Opt-out state ─────────────────────────────────────────────────────────
//
// Two layers:
//   1. Browser Do-Not-Track signal — honored at init.
//   2. Persistent user choice — stored in localStorage as 'posthog_opt_out'.

const OPT_OUT_STORAGE_KEY = "posthog_opt_out";

function isDoNotTrack(): boolean {
  if (!IS_BROWSER) return false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nav: any = window.navigator || {};
  return (
    nav.doNotTrack === "1" ||
    nav.doNotTrack === "yes" ||
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).doNotTrack === "1" ||
    nav.msDoNotTrack === "1"
  );
}

function isStoredOptOut(): boolean {
  if (!IS_BROWSER) return false;
  try {
    return window.localStorage.getItem(OPT_OUT_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function shouldSuppress(): boolean {
  return isDoNotTrack() || isStoredOptOut();
}

// ─── SDK lazy-init ─────────────────────────────────────────────────────────
//
// Lazy import so Node-only callers don't pull in `posthog-js` and
// browser-only callers don't pull in `posthog-node`. Both are listed in
// peerDependencies so the host project owns the version pin.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _client: any | null = null;
let _initAttempted = false;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getClient(): any | null {
  if (_initAttempted) return _client;
  _initAttempted = true;

  const token = resolveToken();
  if (!token) {
    // No token in this env — silently no-op so local dev / preview deploys
    // don't have to set up PostHog.
    return null;
  }

  try {
    if (IS_BROWSER) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
      const posthog = require("posthog-js");
      posthog.init(token, {
        api_host: API_HOST,
        // PII-safe defaults: no IP capture, respect DNT
        property_blacklist: ["$current_url", "$initial_referrer", "$referrer"],
        opt_out_capturing_by_default: shouldSuppress(),
        persistence: "localStorage",
        // Session replay disabled by default — enable in feature code if needed
        disable_session_recording: true,
        // Capture errors by default (requires source maps for readable traces)
        capture_pageview: false, // Manual pageview tracking only
        capture_pageleave: true,
      });
      _client = posthog;
    } else {
      // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
      const { PostHog } = require("posthog-node");
      _client = new PostHog(token, { host: API_HOST });
    }
  } catch (err) {
    // SDK not installed in this environment — stay silent in production,
    // surface the install hint in development.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const env: any = (typeof process !== "undefined" && process.env) || {};
    if (env.NODE_ENV !== "production" && typeof console !== "undefined") {
      console.warn(
        "[analytics-posthog] PostHog SDK not installed. " +
          "Run `npm install posthog-js` (browser) or `npm install posthog-node` (node).",
        err,
      );
    }
    _client = null;
  }
  return _client;
}

// ─── Public API ────────────────────────────────────────────────────────────

/**
 * Track a single product event.
 *
 * Event names use snake_case (e.g. 'signup_completed').
 * Property keys use snake_case. Never include PII as properties.
 */
export function captureEvent(
  eventName: string,
  properties?: Record<string, unknown>,
): void {
  if (shouldSuppress()) return;
  const client = getClient();
  if (!client) return;
  const clean = stripPII(properties);
  try {
    if (IS_BROWSER) {
      client.capture(eventName, clean);
    } else {
      // Node SDK requires distinct_id at the property level or as a param
      client.capture({
        event: eventName,
        properties: clean,
        distinctId: clean.distinct_id || "anonymous",
      });
    }
  } catch (err) {
    if (typeof console !== "undefined" && console.warn) {
      console.warn("[analytics-posthog] capture failed:", err);
    }
  }
}

/**
 * Associate the current session with a hashed user UUID.
 * NEVER pass raw email, phone, or any PII as the id.
 */
export function identify(hashedUserId: string, properties?: Record<string, unknown>): void {
  if (shouldSuppress()) return;
  const client = getClient();
  if (!client) return;
  const clean = stripPII(properties);
  try {
    if (IS_BROWSER) {
      client.identify(hashedUserId, clean);
    } else {
      client.identify({
        distinctId: hashedUserId,
        properties: clean,
      });
    }
  } catch (err) {
    if (typeof console !== "undefined" && console.warn) {
      console.warn("[analytics-posthog] identify failed:", err);
    }
  }
}

/**
 * Clear the current session. Call on logout.
 * (Browser only; Node has no per-process identity.)
 */
export function reset(): void {
  const client = getClient();
  if (!client || !IS_BROWSER) return;
  try {
    client.reset();
  } catch {
    /* noop */
  }
}

/** User-initiated opt-out. Persists across sessions. */
export function optOut(): void {
  if (IS_BROWSER) {
    try {
      window.localStorage.setItem(OPT_OUT_STORAGE_KEY, "1");
    } catch {
      /* noop */
    }
    const client = getClient();
    if (client && client.opt_out_capturing) client.opt_out_capturing();
  }
}

/** User-initiated opt-in. Use only after explicit consent. */
export function optIn(): void {
  if (IS_BROWSER) {
    try {
      window.localStorage.removeItem(OPT_OUT_STORAGE_KEY);
    } catch {
      /* noop */
    }
    const client = getClient();
    if (client && client.opt_in_capturing) client.opt_in_capturing();
  }
}

/** True if the current user is opted out (DNT or explicit choice). */
export function isOptedOut(): boolean {
  return shouldSuppress();
}

/** Enable session recording (browser only). Call after init if needed. */
export function enableSessionRecording(options?: {
  maskAllInputs?: boolean;
  maskTextSelector?: string;
}): void {
  if (!IS_BROWSER) return;
  const client = getClient();
  if (!client) return;
  try {
    client.startSessionRecording(options);
  } catch (err) {
    if (typeof console !== "undefined" && console.warn) {
      console.warn("[analytics-posthog] enableSessionRecording failed:", err);
    }
  }
}

/** Disable session recording (browser only). */
export function disableSessionRecording(): void {
  if (!IS_BROWSER) return;
  const client = getClient();
  if (!client) return;
  try {
    client.stopSessionRecording();
  } catch {
    /* noop */
  }
}

/** Check if a feature flag is enabled (browser only). */
export function isFeatureEnabled(flagKey: string): boolean {
  if (!IS_BROWSER) return false;
  const client = getClient();
  if (!client) return false;
  try {
    return client.isFeatureEnabled(flagKey) === true;
  } catch {
    return false;
  }
}

/** Get the variant of a multivariate feature flag (browser only). */
export function getFeatureFlag(flagKey: string): string | boolean | undefined {
  if (!IS_BROWSER) return undefined;
  const client = getClient();
  if (!client) return undefined;
  try {
    return client.getFeatureFlag(flagKey);
  } catch {
    return undefined;
  }
}

/** Capture an exception for error tracking (requires source maps for readable stack traces). */
export function captureException(error: Error, context?: Record<string, unknown>): void {
  if (shouldSuppress()) return;
  const client = getClient();
  if (!client) return;
  const clean = stripPII(context);
  try {
    if (IS_BROWSER) {
      client.captureException(error, clean);
    } else {
      // Node SDK doesn't have captureException — use capture with error details
      client.capture({
        event: "$exception",
        properties: {
          ...clean,
          $exception_message: error.message,
          $exception_type: error.name,
          $exception_stack: error.stack,
        },
        distinctId: clean.distinct_id || "anonymous",
      });
    }
  } catch (err) {
    if (typeof console !== "undefined" && console.warn) {
      console.warn("[analytics-posthog] captureException failed:", err);
    }
  }
}

/** Re-export the client for advanced use cases (feature flags, experiments). */
export { _client as posthog };
