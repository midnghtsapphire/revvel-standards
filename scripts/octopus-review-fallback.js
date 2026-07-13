#!/usr/bin/env node
/**
 * Octopus review fallback script.
 *
 * Posts a fallback review comment when the Octopus reviewer bot has been
 * silenced (quota death) or otherwise cannot respond on a PR. This runs both
 * on `pull_request` events and on a 6-hourly schedule sweep
 * (see `.github/workflows/octopus-review-fallback.yml`).
 *
 * GitHub API rate-limit handling notes:
 *
 *   GitHub distinguishes two rate-limit failure modes and they need different
 *   treatment:
 *
 *   1. Primary limit — the shared hourly budget for the installation
 *      (5,000 req/h for a GitHub App installation). Signaled by
 *      `x-ratelimit-remaining: 0` + `x-ratelimit-reset` (Unix seconds).
 *      Body reads `API rate limit exceeded for installation`.
 *      Does NOT reliably send `Retry-After`. Reset can be up to ~1h out —
 *      a short exponential backoff cannot recover this.
 *
 *   2. Secondary limit — short-lived abuse-detection throttle. Sends
 *      `Retry-After` (seconds). Body may say `secondary rate limit` or
 *      `abuse detection`. Short backoff *can* recover this.
 *
 *   Prior version treated both as one bucket and capped every wait at 20s,
 *   so a primary-limit 403 would burn 4 pointless retries and then get
 *   swallowed by the top-level try/catch in main() as a silent success.
 *   This version:
 *     - classifies the two,
 *     - waits the actual `x-ratelimit-reset` for primary,
 *     - gives up (loudly, in logs — still swallowed by main() so the job
 *       reports success) if that reset is beyond the in-process wait
 *       ceiling, since the workflow has a 15-minute timeout and retrying
 *       cannot succeed before it dies,
 *     - honors server-provided `Retry-After` in full for secondary,
 *       bounded only by the same ceiling.
 *
 *   Recovery for the give-up case is the 6-hourly schedule sweep: the
 *   dedupe marker is only set once a review has actually been posted, so
 *   a PR that we bailed on stays eligible on the next sweep cycle.
 *   See docs/biome/README.md:147-155 for the incident #15491 write-up of
 *   the same failure mode.
 */

'use strict';

const https = require('https');

const GITHUB_API_HOST = 'api.github.com';
const USER_AGENT = 'octopus-review-fallback';

// Retry tuning.
const RATE_LIMIT_MAX_RETRIES = 4;
const RATE_LIMIT_BASE_DELAY_MS = 1500;
// Hard ceiling on any single in-process wait. The workflow has
// timeout-minutes: 15, so we keep ~5 min headroom.
const RATE_LIMIT_MAX_INPROCESS_WAIT_MS = 10 * 60 * 1000;

// Legacy knob kept for callers that still reference it; only used as a
// floor sanity for backoff, not as a cap on server-provided delays.
const RATE_LIMIT_MAX_BACKOFF_MS = 20 * 1000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeHeaders(headers) {
  const out = {};
  if (!headers) return out;
  for (const [k, v] of Object.entries(headers)) {
    out[String(k).toLowerCase()] = Array.isArray(v) ? v.join(', ') : v;
  }
  return out;
}

/**
 * Classify a rate-limited response.
 *
 * @param {number} status
 * @param {Record<string,string>} headers   Already lowercased.
 * @param {string} body
 * @returns {"primary"|"secondary"|null}
 */
function classifyRateLimit(status, headers, body) {
  if (status !== 403 && status !== 429) return null;
  const h = normalizeHeaders(headers);
  const text = String(body || '').toLowerCase();

  const remaining = h['x-ratelimit-remaining'];
  const reset = h['x-ratelimit-reset'];
  const retryAfter = h['retry-after'];

  // Explicit secondary wording wins.
  if (text.includes('secondary rate limit') || text.includes('abuse detection')) {
    return 'secondary';
  }

  // Explicit primary wording (documented in docs/biome/README.md).
  if (text.includes('api rate limit exceeded')) {
    return 'primary';
  }

  // Header-based primary signal: remaining == 0 + reset present.
  if (remaining !== undefined && Number(remaining) === 0 && reset) {
    return 'primary';
  }

  // Retry-After without primary signal → treat as secondary.
  if (retryAfter) return 'secondary';

  // 429 without a clearer signal → treat as secondary (short-lived).
  if (status === 429) return 'secondary';

  return null;
}

/**
 * Compute milliseconds to wait until `x-ratelimit-reset`.
 * Returns null if the header is missing/unparseable/in the past.
 */
function computePrimaryResetWaitMs(headers, nowMs = Date.now()) {
  const h = normalizeHeaders(headers);
  const reset = h['x-ratelimit-reset'];
  if (!reset) return null;
  const resetSec = Number(reset);
  if (!Number.isFinite(resetSec) || resetSec <= 0) return null;
  const waitMs = resetSec * 1000 - nowMs;
  // Add a small 1s cushion; if reset is already in the past, treat as null.
  if (waitMs <= 0) return null;
  return waitMs + 1000;
}

/**
 * Compute the delay before a retry attempt for the *secondary* path.
 *
 * Honors server-provided `Retry-After` in full (seconds), bounded only by
 * RATE_LIMIT_MAX_INPROCESS_WAIT_MS so a pathological value can't burn the
 * whole job. Falls back to exponential backoff otherwise.
 */
function computeRetryDelayMs(attempt, headers) {
  const h = normalizeHeaders(headers);
  const retryAfterRaw = h['retry-after'];
  if (retryAfterRaw !== undefined) {
    const secs = Number(retryAfterRaw);
    if (Number.isFinite(secs) && secs > 0) {
      return Math.min(secs * 1000, RATE_LIMIT_MAX_INPROCESS_WAIT_MS);
    }
    // Retry-After can also be an HTTP-date. Try parsing.
    const asDate = Date.parse(retryAfterRaw);
    if (Number.isFinite(asDate)) {
      const delta = asDate - Date.now();
      if (delta > 0) {
        return Math.min(delta, RATE_LIMIT_MAX_INPROCESS_WAIT_MS);
      }
    }
  }
  // Exponential backoff: 1.5s, 3s, 6s, 12s, …
  const expo = RATE_LIMIT_BASE_DELAY_MS * Math.pow(2, attempt);
  return Math.min(expo, RATE_LIMIT_MAX_INPROCESS_WAIT_MS);
}

function isRateLimitedResponse(status, headers, body) {
  return classifyRateLimit(status, headers, body) !== null;
}

function rawRequest({ method, path, token, body }) {
  const payload = body === undefined ? undefined : JSON.stringify(body);
  const options = {
    hostname: GITHUB_API_HOST,
    path,
    method,
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(payload ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } : {}),
    },
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const buf = Buffer.concat(chunks).toString('utf8');
        resolve({
          status: res.statusCode || 0,
          headers: normalizeHeaders(res.headers),
          body: buf,
        });
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

/**
 * Perform a GitHub API request with rate-limit-aware retry.
 *
 * Throws (loudly, with a descriptive Error) on:
 *   - transport failure after retries,
 *   - primary rate-limit whose reset exceeds the in-process wait ceiling,
 *   - non-rate-limit non-2xx responses.
 *
 * The top-level `main()` still catches everything so the job reports
 * success — but at least the logs will make the reason obvious.
 */
async function githubRequest({ method, path, token, body, _now = Date.now, _sleep = sleep }) {
  let lastErr;
  for (let attempt = 0; attempt <= RATE_LIMIT_MAX_RETRIES; attempt++) {
    let res;
    try {
      res = await rawRequest({ method, path, token, body });
    } catch (err) {
      lastErr = err;
      if (attempt === RATE_LIMIT_MAX_RETRIES) break;
      await _sleep(computeRetryDelayMs(attempt, {}));
      continue;
    }

    if (res.status >= 200 && res.status < 300) {
      return res;
    }

    const kind = classifyRateLimit(res.status, res.headers, res.body);
    if (kind === 'primary') {
      const waitMs = computePrimaryResetWaitMs(res.headers, _now());
      if (waitMs !== null) {
        if (waitMs > RATE_LIMIT_MAX_INPROCESS_WAIT_MS) {
          const err = new Error(
            `github primary rate limit exhausted; reset in ${Math.round(waitMs / 1000)}s ` +
              `exceeds in-process wait ceiling ${Math.round(RATE_LIMIT_MAX_INPROCESS_WAIT_MS / 1000)}s. ` +
              `Deferring to the 6-hourly schedule sweep.`,
          );
          err.rateLimit = 'primary';
          err.status = res.status;
          throw err;
        }
        // Wait the real reset window; only one such wait per call.
        if (attempt < RATE_LIMIT_MAX_RETRIES) {
          await _sleep(waitMs);
          continue;
        }
      }
      // No usable reset — fall through to short backoff (best effort).
      if (attempt < RATE_LIMIT_MAX_RETRIES) {
        await _sleep(computeRetryDelayMs(attempt, res.headers));
        continue;
      }
      const err = new Error(
        `github primary rate limit; no usable x-ratelimit-reset after ${RATE_LIMIT_MAX_RETRIES} retries`,
      );
      err.rateLimit = 'primary';
      err.status = res.status;
      throw err;
    }

    if (kind === 'secondary') {
      if (attempt < RATE_LIMIT_MAX_RETRIES) {
        await _sleep(computeRetryDelayMs(attempt, res.headers));
        continue;
      }
      const err = new Error(`github secondary rate limit; giving up after ${RATE_LIMIT_MAX_RETRIES} retries`);
      err.rateLimit = 'secondary';
      err.status = res.status;
      throw err;
    }

    // Non-rate-limit error — fail fast, don't burn retries on a genuine
    // 403/404/422.
    const err = new Error(`github ${method} ${path} failed: ${res.status} ${res.body.slice(0, 500)}`);
    err.status = res.status;
    throw err;
  }
  throw lastErr || new Error('github request failed');
}

/**
 * Determine whether the fallback should post a review on this PR.
 *
 * The dedupe marker is only set *after* a review is successfully posted,
 * so a PR we bailed on (e.g. primary rate limit with a far-off reset)
 * remains eligible on the next 6-hourly sweep.
 */
async function shouldReview({ owner, repo, prNumber, token, markerRegex }) {
  const res = await githubRequest({
    method: 'GET',
    path: `/repos/${owner}/${repo}/issues/${prNumber}/comments?per_page=100`,
    token,
  });
  const comments = JSON.parse(res.body);
  for (const c of comments) {
    if (markerRegex.test(c.body || '')) return false;
  }
  return true;
}

async function postFallbackReview({ owner, repo, prNumber, token, body }) {
  return githubRequest({
    method: 'POST',
    path: `/repos/${owner}/${repo}/issues/${prNumber}/comments`,
    token,
    body: { body },
  });
}

async function main() {
  try {
    const token = process.env.GITHUB_TOKEN;
    const repoFull = process.env.GITHUB_REPOSITORY;
    const prNumber = process.env.PR_NUMBER;
    if (!token || !repoFull || !prNumber) {
      console.log('octopus-review-fallback: missing env; skipping.');
      return;
    }
    const [owner, repo] = repoFull.split('/');
    const marker = /octopus-review-fallback:v1/;

    const eligible = await shouldReview({ owner, repo, prNumber, token, markerRegex: marker });
    if (!eligible) {
      console.log(`octopus-review-fallback: PR #${prNumber} already has a fallback review; skipping.`);
      return;
    }

    const body =
      '<!-- octopus-review-fallback:v1 -->\n' +
      '_Octopus reviewer is unavailable (quota) — this is an automated fallback acknowledgement._';
    await postFallbackReview({ owner, repo, prNumber, token, body });
    console.log(`octopus-review-fallback: posted fallback review on PR #${prNumber}.`);
  } catch (err) {
    // Preserve prior "never fail loud" behavior — the schedule sweep will
    // retry primary-limit deferrals. Log the classification so it's obvious.
    const tag = err && err.rateLimit ? ` [rate-limit=${err.rateLimit}]` : '';
    console.warn(`octopus-review-fallback: giving up${tag}: ${err && err.message ? err.message : err}`);
  }
}

module.exports = {
  classifyRateLimit,
  computePrimaryResetWaitMs,
  computeRetryDelayMs,
  isRateLimitedResponse,
  githubRequest,
  shouldReview,
  postFallbackReview,
  RATE_LIMIT_MAX_RETRIES,
  RATE_LIMIT_BASE_DELAY_MS,
  RATE_LIMIT_MAX_INPROCESS_WAIT_MS,
  RATE_LIMIT_MAX_BACKOFF_MS,
};

if (require.main === module) {
  main();
}
