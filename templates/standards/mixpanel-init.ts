/**
 * Revvel Standard — Mixpanel Initializer
 * ──────────────────────────────────────
 * Drop-in analytics module. Copy to: <app>/src/lib/analytics.ts
 *
 * Why this wrapper exists (do NOT call `mixpanel-browser` / `mixpanel`
 * directly from feature code):
 *   1. Honors Do-Not-Track and explicit user opt-out by default.
 *   2. No-ops when MIXPANEL_TOKEN is unset (e.g. local dev) — feature
 *      code never has to null-check.
 *   3. Centralizes PII guardrails — strips obviously-PII keys from
 *      properties before sending (defense in depth; primary
 *      responsibility is still the call site).
 *   4. Single import surface for both browser and Node — the
 *      build tool tree-shakes the unused half.
 *
 * Required env vars:
 *   - Browser: NEXT_PUBLIC_MIXPANEL_TOKEN  (or VITE_MIXPANEL_TOKEN, etc.)
 *   - Node:    MIXPANEL_TOKEN
 *
 * NEVER reference MIXPANEL_API_SECRET in this file or anywhere
 * client-bundled. API secret is server-only (data-export jobs).
 *
 * See: skills/mixpanel/SKILL.md and templates/standards/mixpanel-events.md
 */

// ─── Configuration ─────────────────────────────────────────────────────────

/** True in a browser/SPA build, false in pure Node. */
const IS_BROWSER = typeof window !== "undefined";

/**
 * Pull the token from whichever env shape the host build system exposes.
 * Order: NEXT_PUBLIC_* → VITE_* → MIXPANEL_TOKEN.
 */
function resolveToken(): string | undefined {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const env: any = (typeof process !== "undefined" && process.env) || {};
  return (
    env.NEXT_PUBLIC_MIXPANEL_TOKEN ||
    env.VITE_MIXPANEL_TOKEN ||
    env.MIXPANEL_TOKEN
  );
}

/** Set to 'https://api-eu.mixpanel.com' for EU-residency projects. */
const API_HOST =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ((typeof process !== "undefined" && (process.env as any)) || {})
    .MIXPANEL_API_HOST || "https://api.mixpanel.com";

// ─── PII guardrails ────────────────────────────────────────────────────────
//
// Hard ban list — these property keys must never reach Mixpanel. If your
// feature code tries to send them, this wrapper drops them and logs a
// warning in development. See templates/standards/mixpanel-events.md §PII.

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
          `[analytics] dropping PII property "${key}" — see mixpanel-events.md §PII`,
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
//   2. Persistent user choice — stored in localStorage as 'mp_opt_out'.

const OPT_OUT_STORAGE_KEY = "mp_opt_out";

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
// Lazy import so Node-only callers don't pull in `mixpanel-browser` and
// browser-only callers don't pull in `mixpanel`. Both are listed in
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
    // don't have to set up Mixpanel.
    return null;
  }

  try {
    if (IS_BROWSER) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
      const mp = require("mixpanel-browser");
      mp.init(token, {
        api_host: API_HOST,
        // PII-safe defaults: no IP, no GPS, no auto-property capture beyond UA.
        ip: false,
        property_blacklist: ["$current_url", "$initial_referrer", "$referrer"],
        opt_out_tracking_by_default: shouldSuppress(),
        persistence: "localStorage",
      });
      _client = mp;
    } else {
      // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
      const Mixpanel = require("mixpanel");
      _client = Mixpanel.init(token, { host: API_HOST.replace(/^https?:\/\//, "") });
    }
  } catch (err) {
    // SDK not installed in this environment — stay silent in production,
    // surface the install hint in development.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const env: any = (typeof process !== "undefined" && process.env) || {};
    if (env.NODE_ENV !== "production" && typeof console !== "undefined") {
      console.warn(
        "[analytics] Mixpanel SDK not installed. " +
          "Run `npm install mixpanel-browser` (browser) or `npm install mixpanel` (node).",
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
 * Event names use Title Case With Spaces (e.g. 'Signup Completed').
 * Property keys use snake_case. Never include PII as properties.
 */
export function track(
  eventName: string,
  properties?: Record<string, unknown>,
): void {
  if (shouldSuppress()) return;
  const client = getClient();
  if (!client) return;
  const clean = stripPII(properties);
  try {
    if (IS_BROWSER) {
      client.track(eventName, clean);
    } else {
      // Node SDK requires distinct_id at the property level.
      client.track(eventName, clean);
    }
  } catch (err) {
    if (typeof console !== "undefined" && console.warn) {
      console.warn("[analytics] track failed:", err);
    }
  }
}

/**
 * Associate the current session with a hashed user UUID.
 * NEVER pass raw email, phone, or any PII as the id.
 */
export function identify(hashedUserId: string): void {
  if (shouldSuppress()) return;
  const client = getClient();
  if (!client) return;
  if (IS_BROWSER) {
    client.identify(hashedUserId);
  }
  // Node SDK has no identify call — pass distinct_id on each track().
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
    if (client && client.opt_out_tracking) client.opt_out_tracking();
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
    if (client && client.opt_in_tracking) client.opt_in_tracking();
  }
}

/** True if the current user is opted out (DNT or explicit choice). */
export function isOptedOut(): boolean {
  return shouldSuppress();
}
