"use strict";

/**
 * Centralized OpenRouter API key retrieval + sanitization.
 *
 * Root cause (issue #16942): a trailing newline/CR in the OPENROUTER_API_KEY
 * repository secret made Node's https module throw:
 *   Error: Invalid character in header content ["Authorization"]
 * when building the Authorization header. That silently killed every
 * /dragnet summon and any other path that built the header from the raw env.
 *
 * Always read the key through this helper so a bad paste cannot break header
 * construction again. Strips surrounding whitespace AND any embedded C0 control
 * characters (CR/LF/TAB/etc.) that are illegal in HTTP header values.
 *
 * 2026-08-08: created for #16942 /dragnet header-corruption hardening.
 */

// ASCII C0 controls (0x00-0x1F) + DEL (0x7F). HTTP header values must be
// Latin-1 without these; Node throws "Invalid character in header content".
const HEADER_ILLEGAL = /[\u0000-\u001F\u007F]/g;

/**
 * Sanitize a raw key string for safe use in an HTTP Authorization header.
 * @param {unknown} value
 * @returns {string} cleaned key, or "" if empty after sanitization
 */
function sanitizeOpenRouterKey(value) {
  if (value == null) return "";
  // Convert to string, drop illegal header chars, then trim remaining space.
  return String(value).replace(HEADER_ILLEGAL, "").trim();
}

/**
 * Read and sanitize OPENROUTER_API_KEY (or an explicit override).
 *
 * @param {Object} [opts]
 * @param {string} [opts.apiKey] - Explicit key override (still sanitized).
 * @param {boolean} [opts.required=false] - Throw if no usable key after sanitize.
 * @param {NodeJS.ProcessEnv} [opts.env=process.env] - Injectable env (tests).
 * @returns {string} sanitized key (may be "" when required=false)
 */
function getOpenRouterKey(opts = {}) {
  const { apiKey, required = false, env = process.env } = opts;
  const raw = apiKey !== undefined && apiKey !== null ? apiKey : env.OPENROUTER_API_KEY;
  const key = sanitizeOpenRouterKey(raw);

  if (required && !key) {
    throw new Error(
      "OPENROUTER_API_KEY is required (set via environment or apiKey parameter). " +
        "If the secret was recently pasted, re-check for trailing whitespace/newlines " +
        "in Settings -> Secrets -> Actions."
    );
  }

  return key;
}

/**
 * True when a usable (non-empty after sanitize) OpenRouter key is available.
 * @param {Object} [opts]
 * @param {string} [opts.apiKey]
 * @param {NodeJS.ProcessEnv} [opts.env]
 * @returns {boolean}
 */
function hasOpenRouterKey(opts = {}) {
  return Boolean(getOpenRouterKey({ ...opts, required: false }));
}

/**
 * Build a safe Authorization header value from a key.
 * Throws if the key is empty after sanitization — never returns a header
 * that would crash Node's https module.
 *
 * @param {string} [apiKey] - Optional explicit key; else env.
 * @param {Object} [opts]
 * @param {NodeJS.ProcessEnv} [opts.env]
 * @returns {string} e.g. "Bearer <key>"
 */
function openRouterAuthHeader(apiKey, opts = {}) {
  const key = getOpenRouterKey({ apiKey, required: true, env: opts.env });
  return `Bearer ${key}`;
}

module.exports = {
  sanitizeOpenRouterKey,
  getOpenRouterKey,
  hasOpenRouterKey,
  openRouterAuthHeader,
};
