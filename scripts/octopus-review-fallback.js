#!/usr/bin/env node
/**
 * scripts/octopus-review-fallback.js
 *
 * Fallback reviewer that posts a lightweight review comment on PRs when the
 * primary Octopus reviewer is unavailable (e.g., quota exhausted).
 *
 * This file was updated to distinguish GitHub's PRIMARY rate limit (shared
 * hourly installation budget — signaled by `x-ratelimit-remaining: 0` +
 * `x-ratelimit-reset`, does NOT reliably send `Retry-After`) from its
 * SECONDARY / abuse-detection rate limit (short-lived, DOES send
 * `Retry-After`). These need different handling:
 *
 *   - PRIMARY: sleep until the real `x-ratelimit-reset` timestamp. If that
 *     exceeds our in-process wait ceiling (below the workflow's 15-minute
 *     timeout), give up loudly rather than burn retries that cannot possibly
 *     succeed before the job is killed. The 6-hourly schedule sweep lane in
 *     `.github/workflows/octopus-review-fallback.yml` (`cron: "17 */6 * * *"`)
 *     will pick this PR back up next cycle: `shouldReview()`'s dedupe marker
 *     is only set once a review is actually posted, so a run that gave up
 *     before that point leaves no marker and will be retried.
 *
 *   - SECONDARY: keep short-backoff retry, but honor a server-provided
 *     `Retry-After` in full (bounded only by the in-process wait ceiling so a
 *     pathological value can't burn the whole job).
 *
 * Background: incident #15491 documented at `docs/biome/README.md:147-155`.
 * Follow-up to #15836.
 */

'use strict';

const https = require('https');

const RATE_LIMIT_BASE_DELAY_MS = Number(process.env.RATE_LIMIT_BASE_DELAY_MS || 1500);
const RATE_LIMIT_MAX_RETRIES = Number(process.env.RATE_LIMIT_MAX_RETRIES || 4);
// Ceiling for how long a single in-process wait may block. Kept comfortably
// below the workflow's `timeout-minutes: 15` so we leave headroom for the rest
// of the job (default: 10 minutes).
const RATE_LIMIT_MAX_INPROCESS_WAIT_MS = Number(
  process.env.RATE_LIMIT_MAX_INPROCESS_WAIT_MS || 10 * 60 * 1000,
);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeHeaders(headers) {
  const out = {};
  if (!headers) return out;
  for (const key of Object.keys(headers)) {
    out[key.toLowerCase()] = headers[key];
  }
  return out;
}

/**
 * Classify a rate-limited (403/429) response.
 *
 * Returns one of:
 *   - "primary"    — shared hourly installation budget exhausted. Signaled by
 *                    `x-ratelimit-remaining: 0` + `x-ratelimit-reset`, or as a
 *                    fallback by the documented "API rate limit exceeded for
 *                    installation" message body.
 *   - "secondary"  — short-lived abuse/secondary limit. Signaled by
 *                    `Retry-After`, or explicit "secondary rate limit" /
 *                    "abuse detection" wording.
 *   - null         — not a rate limit at all (e.g. genuine permission 403).
 */
function classifyRateLimit(status, headers, body) {
  if (status !== 403 && status !== 429) return null;
  const h = normalizeHeaders(headers);
  const text = typeof body === 'string' ? body : body ? JSON.stringify(body) : '';
  const lower = text.toLowerCase();

  const hasRetryAfter = h['retry-after'] !== undefined && h['retry-after'] !== null && h['retry-after'] !== '';
  const mentionsSecondary =
    lower.includes('secondary rate limit') || lower.includes('abuse detection');
  if (mentionsSecondary) return 'secondary';

  const remaining = h['x-ratelimit-remaining'];
  const reset = h['x-ratelimit-reset'];
  const primaryHeaderSignal =
    (remaining !== undefined && String(remaining) === '0') && reset !== undefined;
  const primaryBodySignal = lower.includes('api rate limit exceeded');
  if (primaryHeaderSignal || primaryBodySignal) return 'primary';

  if (hasRetryAfter) return 'secondary';

  // 429 with no other signal — treat as secondary (short-lived) by default.
  if (status === 429) return 'secondary';
  return null;
}

/**
 * For a primary-limit response, compute how long to wait for the budget to
 * refill, based on `x-ratelimit-reset` (Unix seconds).
 *
 * Returns a millisecond number, or null if the header is missing/unparseable.
 * A small safety pad is added so we don't wake up a hair before reset.
 */
function computePrimaryResetWaitMs(headers, nowMs = Date.now()) {
  const h = normalizeHeaders(headers);
  const raw = h['x-ratelimit-reset'];
  if (raw === undefined || raw === null || raw === '') return null;
  const resetSeconds = Number(raw);
  if (!Number.isFinite(resetSeconds) || resetSeconds <= 0) return null;
  const waitMs = resetSeconds * 1000 - nowMs;
  if (waitMs <= 0) return 0;
  // Small pad (1s) so we clear the boundary cleanly.
  return waitMs + 1000;
}

/**
 * Compute the retry delay for a secondary (or reset-less primary) rate limit.
 *
 * Honors `Retry-After` in full (seconds or HTTP-date) when present; otherwise
 * falls back to exponential backoff. Bounded only by
 * `RATE_LIMIT_MAX_INPROCESS_WAIT_MS` so a pathological server value can't burn
 * the whole job.
 */
function computeRetryDelayMs(headers, attempt, opts = {}) {
  const baseDelay = opts.baseDelay ?? RATE_LIMIT_BASE_DELAY_MS;
  const maxWait = opts.maxWait ?? RATE_LIMIT_MAX_INPROCESS_WAIT_MS;
  const h = normalizeHeaders(headers);
  const retryAfter = h['retry-after'];

  if (retryAfter !== undefined && retryAfter !== null && retryAfter !== '') {
    // Retry-After can be delta-seconds or an HTTP-date.
    const asNumber = Number(retryAfter);
    if (Number.isFinite(asNumber) && asNumber >= 0) {
      return Math.min(asNumber * 1000, maxWait);
    }
    const asDate = Date.parse(retryAfter);
    if (!Number.isNaN(asDate)) {
      const delta = asDate - Date.now();
      return Math.min(Math.max(delta, 0), maxWait);
    }
  }

  // Exponential backoff: base * 2^attempt.
  const backoff = baseDelay * Math.pow(2, Math.max(0, attempt));
  return Math.min(backoff, maxWait);
}

function isRateLimitedResponse(status, headers, body) {
  return classifyRateLimit(status, headers, body) !== null;
}

function githubRequestRaw(method, path, token, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = https.request(
      {
        hostname: 'api.github.com',
        path,
        method,
        headers: {
          'User-Agent': 'octopus-review-fallback',
          Accept: 'application/vnd.github+json',
          Authorization: `Bearer ${token}`,
          'X-GitHub-Api-Version': '2022-11-28',
          ...(data ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } : {}),
        },
      },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const text = Buffer.concat(chunks).toString('utf8');
          resolve({ status: res.statusCode || 0, headers: res.headers || {}, body: text });
        });
      },
    );
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

/**
 * Perform a GitHub API request with rate-limit-aware retry.
 *
 * `opts.transport` is optional and used by tests to inject a fake responder
 * with signature (method, path, token, body) => { status, headers, body }.
 * `opts.sleep` is optional and used by tests to intercept waits.
 */
async function githubRequest(method, path, token, body, opts = {}) {
  const transport = opts.transport || githubRequestRaw;
  const sleeper = opts.sleep || sleep;
  const maxRetries = opts.maxRetries ?? RATE_LIMIT_MAX_RETRIES;
  const maxWait = opts.maxWait ?? RATE_LIMIT_MAX_INPROCESS_WAIT_MS;

  let attempt = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const res = await transport(method, path, token, body);
    const kind = classifyRateLimit(res.status, res.headers, res.body);

    if (!kind) {
      return res;
    }

    if (kind === 'primary') {
      const waitMs = computePrimaryResetWaitMs(res.headers);
      if (waitMs === null) {
        // No usable reset header — fall through to short-backoff behavior.
        if (attempt >= maxRetries) {
          throw new Error(
            `GitHub primary rate limit hit and no x-ratelimit-reset header; giving up after ${attempt} retries`,
          );
        }
        const delay = computeRetryDelayMs(res.headers, attempt, { maxWait });
        console.warn(
          `[octopus-fallback] Primary rate limit (no reset header) — retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`,
        );
        await sleeper(delay);
        attempt += 1;
        continue;
      }

      if (waitMs > maxWait) {
        // Cannot possibly succeed before the workflow's 15-minute timeout.
        // Give up loudly — the 6-hourly schedule sweep will pick this PR back
        // up next cycle (no dedupe marker is set until a review actually posts).
        console.warn(
          `[octopus-fallback] Primary GitHub rate limit exhausted; reset in ${Math.round(waitMs / 1000)}s ` +
            `exceeds in-process wait ceiling of ${Math.round(maxWait / 1000)}s. ` +
            `Deferring to next scheduled sweep run.`,
        );
        const err = new Error(
          `GitHub primary rate limit exhausted; reset in ${Math.round(waitMs / 1000)}s, exceeds max in-process wait`,
        );
        err.code = 'RATE_LIMIT_DEFERRED';
        err.waitMs = waitMs;
        throw err;
      }

      console.warn(
        `[octopus-fallback] Primary GitHub rate limit — waiting ${Math.round(waitMs / 1000)}s until x-ratelimit-reset`,
      );
      await sleeper(waitMs);
      // Do not count primary waits against `attempt` — we waited the real
      // reset, so the next call should succeed.
      continue;
    }

    // Secondary limit.
    if (attempt >= maxRetries) {
      throw new Error(`GitHub secondary rate limit hit; giving up after ${attempt} retries`);
    }
    const delay = computeRetryDelayMs(res.headers, attempt, { maxWait });
    console.warn(
      `[octopus-fallback] Secondary GitHub rate limit — retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`,
    );
    await sleeper(delay);
    attempt += 1;
  }
}

async function shouldReview(owner, repo, prNumber, token, opts = {}) {
  const res = await githubRequest('GET', `/repos/${owner}/${repo}/issues/${prNumber}/comments?per_page=100`, token, null, opts);
  if (res.status < 200 || res.status >= 300) return true;
  try {
    const comments = JSON.parse(res.body || '[]');
    for (const c of comments) {
      if (typeof c.body === 'string' && c.body.includes('<!-- octopus-fallback-marker -->')) {
        return false;
      }
    }
  } catch {
    // fall through — err on the side of reviewing
  }
  return true;
}

async function postFallbackReview(owner, repo, prNumber, token, opts = {}) {
  const marker = '<!-- octopus-fallback-marker -->';
  const body =
    `${marker}\n\n` +
    ':octopus: **Octopus fallback review**\n\n' +
    "The primary Octopus reviewer is temporarily unavailable (quota or upstream issue). " +
    'This is a lightweight placeholder acknowledgement — a full review will follow on the ' +
    'next scheduled sweep.\n';
  return githubRequest('POST', `/repos/${owner}/${repo}/issues/${prNumber}/comments`, token, { body }, opts);
}

async function main() {
  const token = process.env.GITHUB_TOKEN;
  const repoSlug = process.env.GITHUB_REPOSITORY || '';
  const prNumber = process.env.PR_NUMBER;
  if (!token || !repoSlug || !prNumber) {
    console.warn('[octopus-fallback] Missing env; skipping.');
    return;
  }
  const [owner, repo] = repoSlug.split('/');
  try {
    if (!(await shouldReview(owner, repo, prNumber, token))) {
      console.log('[octopus-fallback] Fallback review already posted; skipping.');
      return;
    }
    const res = await postFallbackReview(owner, repo, prNumber, token);
    if (res.status >= 200 && res.status < 300) {
      console.log('[octopus-fallback] Posted fallback review.');
    } else {
      console.warn(`[octopus-fallback] Non-2xx posting review: ${res.status} ${res.body}`);
    }
  } catch (err) {
    // Preserve historical "never fail the job loud" contract, but distinguish
    // the deferred rate-limit case in logs so operators can see it clearly.
    if (err && err.code === 'RATE_LIMIT_DEFERRED') {
      console.warn(`[octopus-fallback] Deferred to next sweep: ${err.message}`);
    } else {
      console.warn(`[octopus-fallback] Error (non-fatal): ${err && err.message ? err.message : err}`);
    }
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
  main,
  RATE_LIMIT_MAX_INPROCESS_WAIT_MS,
};

if (require.main === module) {
  main().catch((err) => {
    console.warn(`[octopus-fallback] Fatal (swallowed): ${err && err.message ? err.message : err}`);
  });
}
