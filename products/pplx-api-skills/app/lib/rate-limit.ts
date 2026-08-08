import type { RateLimitResult } from "./types";

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

export interface RateLimitConfig {
  max: number;
  windowMs: number;
}

export function getRateLimitConfig(
  env: Record<string, string | undefined> = process.env
): RateLimitConfig {
  const max = Number(env.PPLX_RATE_LIMIT_MAX ?? 30);
  const windowMs = Number(env.PPLX_RATE_LIMIT_WINDOW_MS ?? 60_000);
  return {
    max: Number.isFinite(max) && max > 0 ? max : 30,
    windowMs: Number.isFinite(windowMs) && windowMs > 0 ? windowMs : 60_000,
  };
}

/**
 * Fixed-window rate limiter keyed by client identity (IP or token hash).
 * In-memory — fine for single-instance / serverless warm isolates.
 * For multi-region production, swap the Map for Redis/Upstash.
 */
export function checkRateLimit(
  key: string,
  config: RateLimitConfig = getRateLimitConfig(),
  now = Date.now()
): RateLimitResult {
  const existing = buckets.get(key);
  if (!existing || now >= existing.resetAt) {
    const resetAt = now + config.windowMs;
    buckets.set(key, { count: 1, resetAt });
    return {
      allowed: true,
      remaining: Math.max(0, config.max - 1),
      limit: config.max,
      resetAt,
    };
  }

  if (existing.count >= config.max) {
    return {
      allowed: false,
      remaining: 0,
      limit: config.max,
      resetAt: existing.resetAt,
      retryAfterMs: Math.max(0, existing.resetAt - now),
    };
  }

  existing.count += 1;
  buckets.set(key, existing);
  return {
    allowed: true,
    remaining: Math.max(0, config.max - existing.count),
    limit: config.max,
    resetAt: existing.resetAt,
  };
}

export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  const headers: Record<string, string> = {
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
  };
  if (!result.allowed && result.retryAfterMs != null) {
    headers["Retry-After"] = String(Math.ceil(result.retryAfterMs / 1000));
  }
  return headers;
}

export function __resetRateLimitForTests(): void {
  buckets.clear();
}
