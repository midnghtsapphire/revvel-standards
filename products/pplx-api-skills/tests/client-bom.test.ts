import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { BOM_ITEMS, bomForSkill, getBomMatches } from "../app/lib/bom";
import { createPerplexityClient } from "../app/lib/perplexity-client";
import {
  __resetMonitorForTests,
  getMonitorSnapshot,
  recordRequest,
} from "../app/lib/logger";

describe("BOM", () => {
  it("includes perplexity entries and skill mapping", () => {
    assert.ok(BOM_ITEMS.some((i) => i.id === "perplexity-api"));
    const matches = getBomMatches("perplexity");
    assert.ok(matches.length >= 1);
    const forWeb = bomForSkill("web_search");
    assert.ok(forWeb.length >= 1);
  });
});

describe("perplexity client mock mode", () => {
  it("returns structured mock chat with local skill results", async () => {
    const client = createPerplexityClient({
      env: { PPLX_FORCE_MOCK: "true" },
    });
    const result = await client.chat({
      mock: true,
      skills: ["bom_lookup", "skill_classify"],
      messages: [{ role: "user", content: "evaluate perplexity for skills" }],
    });
    assert.equal(result.mode, "mock");
    assert.match(result.content, /skills/i);
    assert.ok(result.skillInvocations.length >= 1);
    assert.ok(
      result.skillInvocations.every(
        (s) => s.status === "completed" || s.status === "failed"
      )
    );
    assert.ok(result.citations.length >= 1);
  });

  it("calls live endpoint with injected fetch", async () => {
    let sawAuth = false;
    const client = createPerplexityClient({
      env: {
        PERPLEXITY_API_KEY: "test-key",
        PPLX_FORCE_MOCK: "false",
        PPLX_DEFAULT_MODEL: "sonar-pro",
      },
      fetchImpl: async (input, init) => {
        assert.match(String(input), /chat\/completions$/);
        const headers = init?.headers as Record<string, string>;
        sawAuth = String(headers.Authorization || "").includes("test-key");
        return new Response(
          JSON.stringify({
            id: "live-1",
            model: "sonar-pro",
            choices: [
              {
                message: {
                  role: "assistant",
                  content: "Live answer with citations.",
                },
              },
            ],
            citations: ["https://example.com"],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      },
    });

    const result = await client.chat({
      messages: [{ role: "user", content: "hello" }],
      mock: false,
    });
    assert.equal(sawAuth, true);
    assert.equal(result.mode, "live");
    assert.match(result.content, /Live answer/);
    assert.deepEqual(result.citations, ["https://example.com"]);
  });

  it("surfaces API errors", async () => {
    const client = createPerplexityClient({
      env: { PERPLEXITY_API_KEY: "k" },
      fetchImpl: async () =>
        new Response(JSON.stringify({ error: "nope" }), { status: 429 }),
    });
    await assert.rejects(
      () =>
        client.chat({
          mock: false,
          messages: [{ role: "user", content: "x" }],
        }),
      /429/
    );
  });
});

describe("monitor logger", () => {
  it("aggregates request metrics", () => {
    __resetMonitorForTests();
    recordRequest({ mode: "mock", durationMs: 10, skills: ["bom_lookup"] });
    recordRequest({
      mode: "live",
      durationMs: 30,
      error: "boom",
      rateLimited: true,
    });
    const snap = getMonitorSnapshot();
    assert.equal(snap.totalRequests, 2);
    assert.equal(snap.mockRequests, 1);
    assert.equal(snap.liveRequests, 1);
    assert.equal(snap.errorCount, 1);
    assert.equal(snap.rateLimitedCount, 1);
    assert.equal(snap.avgLatencyMs, 20);
    assert.equal(snap.skillHits.bom_lookup, 1);
  });
});
