import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  authenticateRequest,
  hashToken,
  shouldUseMock,
} from "../app/lib/auth";
import {
  __resetRateLimitForTests,
  checkRateLimit,
  rateLimitHeaders,
} from "../app/lib/rate-limit";

describe("auth", () => {
  it("allows open access when app token unset", () => {
    const headers = new Headers();
    const result = authenticateRequest(headers, {});
    assert.equal(result.ok, true);
    assert.match(result.clientKey, /^ip:/);
  });

  it("requires matching app token when configured", () => {
    const env = { PPLX_APP_TOKEN: "secret-token" };
    const denied = authenticateRequest(new Headers(), env);
    assert.equal(denied.ok, false);

    const headers = new Headers({
      authorization: "Bearer " + "secret-token",
    });
    const ok = authenticateRequest(headers, env);
    assert.equal(ok.ok, true);
    assert.equal(ok.clientKey, `token:${hashToken("secret-token")}`);
  });

  it("shouldUseMock respects force flag and missing key", () => {
    assert.equal(shouldUseMock(undefined, {}), true);
    assert.equal(
      shouldUseMock(undefined, { PERPLEXITY_API_KEY: "k", PPLX_FORCE_MOCK: "true" }),
      true
    );
    assert.equal(shouldUseMock(false, { PERPLEXITY_API_KEY: "k" }), false);
    assert.equal(shouldUseMock(true, { PERPLEXITY_API_KEY: "k" }), true);
  });
});

describe("rate limit", () => {
  it("blocks after max requests in window", () => {
    __resetRateLimitForTests();
    const cfg = { max: 2, windowMs: 60_000 };
    const a = checkRateLimit("client-a", cfg, 1_000);
    const b = checkRateLimit("client-a", cfg, 1_001);
    const c = checkRateLimit("client-a", cfg, 1_002);
    assert.equal(a.allowed, true);
    assert.equal(b.allowed, true);
    assert.equal(c.allowed, false);
    assert.equal(c.remaining, 0);
    const headers = rateLimitHeaders(c);
    assert.equal(headers["X-RateLimit-Limit"], "2");
    assert.ok(headers["Retry-After"]);
  });

  it("resets after window", () => {
    __resetRateLimitForTests();
    const cfg = { max: 1, windowMs: 100 };
    assert.equal(checkRateLimit("z", cfg, 0).allowed, true);
    assert.equal(checkRateLimit("z", cfg, 50).allowed, false);
    assert.equal(checkRateLimit("z", cfg, 150).allowed, true);
  });
});
