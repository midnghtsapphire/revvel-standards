/**
 * Authentication middleware helpers for pplx-api routes.
 *
 * Two layers:
 *  1. App token (optional) — protects our Next.js API from anonymous abuse.
 *  2. Perplexity API key — used server-side only; never exposed to the browser.
 */

export interface AuthResult {
  ok: boolean;
  reason?: string;
  clientKey: string;
}

function bearerToken(header: string | null): string | null {
  if (!header) return null;
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match?.[1]?.trim() || null;
}

export type EnvMap = Record<string, string | undefined>;

export function authenticateRequest(
  headers: Headers,
  env: EnvMap = process.env
): AuthResult {
  const appToken = (env.PPLX_APP_TOKEN || "").trim();
  const authHeader = headers.get("authorization");
  const provided = bearerToken(authHeader);
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = headers.get("x-real-ip")?.trim();
  const ip = forwarded || realIp || "anonymous";

  // No app token configured → open in mock/dev (still rate-limited by IP).
  if (!appToken) {
    return { ok: true, clientKey: `ip:${ip}` };
  }

  if (!provided) {
    return {
      ok: false,
      reason: "Missing Authorization header with app token",
      clientKey: `ip:${ip}`,
    };
  }

  if (provided !== appToken) {
    return {
      ok: false,
      reason: "Invalid app token",
      clientKey: `ip:${ip}`,
    };
  }

  // Authenticated clients get their own rate-limit bucket.
  return { ok: true, clientKey: `token:${hashToken(provided)}` };
}

/** Short non-reversible key id for rate-limit buckets (not a security hash). */
export function hashToken(token: string): string {
  let h = 0;
  for (let i = 0; i < token.length; i += 1) {
    h = (h * 31 + token.charCodeAt(i)) >>> 0;
  }
  return h.toString(16);
}

export function getPerplexityApiKey(env: EnvMap = process.env): string | null {
  const key = (env.PERPLEXITY_API_KEY || "").trim();
  return key || null;
}

export function shouldUseMock(
  bodyMock: boolean | undefined,
  env: EnvMap = process.env
): boolean {
  if (bodyMock === true) return true;
  if (String(env.PPLX_FORCE_MOCK || "").toLowerCase() === "true") return true;
  return !getPerplexityApiKey(env);
}
