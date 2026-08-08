import { NextResponse } from "next/server";
import { authenticateRequest } from "./auth";
import { log, recordRequest } from "./logger";
import {
  checkRateLimit,
  rateLimitHeaders,
  type RateLimitConfig,
} from "./rate-limit";

export function newRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function guardRequest(
  req: Request,
  opts?: { rateLimit?: RateLimitConfig }
):
  | { ok: true; requestId: string; clientKey: string; started: number }
  | { ok: false; response: NextResponse } {
  const requestId = newRequestId();
  const started = Date.now();
  const auth = authenticateRequest(req.headers);

  if (!auth.ok) {
    log("warn", "auth.denied", { reason: auth.reason }, { requestId });
    recordRequest({
      mode: "mock",
      durationMs: Date.now() - started,
      error: auth.reason,
    });
    return {
      ok: false,
      response: NextResponse.json(
        { error: auth.reason || "Unauthorized", requestId },
        { status: 401 }
      ),
    };
  }

  const rl = checkRateLimit(auth.clientKey, opts?.rateLimit);
  if (!rl.allowed) {
    log(
      "warn",
      "rate_limit.blocked",
      { clientKey: auth.clientKey, retryAfterMs: rl.retryAfterMs },
      { requestId }
    );
    recordRequest({
      mode: "mock",
      durationMs: Date.now() - started,
      rateLimited: true,
      error: "rate_limited",
    });
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: "Rate limit exceeded",
          requestId,
          retryAfterMs: rl.retryAfterMs,
        },
        { status: 429, headers: rateLimitHeaders(rl) }
      ),
    };
  }

  return { ok: true, requestId, clientKey: auth.clientKey, started };
}

export function jsonOk(
  body: unknown,
  init?: { status?: number; headers?: Record<string, string> }
): NextResponse {
  return NextResponse.json(body, {
    status: init?.status ?? 200,
    headers: init?.headers,
  });
}

export function jsonError(
  status: number,
  error: string,
  extra?: Record<string, unknown>
): NextResponse {
  return NextResponse.json({ error, ...extra }, { status });
}
