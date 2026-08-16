#!/usr/bin/env node
"use strict";

/**
 * Regression tests for scripts/utils/openrouter-key.js
 *
 * Issue #16942: trailing newline/CR in OPENROUTER_API_KEY made Node throw
 *   Error: Invalid character in header content ["Authorization"]
 * These tests lock the sanitize + header-construction behavior so a bad paste
 * cannot silently break /dragnet summons again.
 */

const assert = require("assert");
const http = require("http");
const {
  sanitizeOpenRouterKey,
  getOpenRouterKey,
  hasOpenRouterKey,
  openRouterAuthHeader,
} = require("../scripts/utils/openrouter-key");

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✅ PASS: ${name}`);
    passed++;
  } catch (err) {
    console.log(`❌ FAIL: ${name}\n    ${err.stack || err.message}`);
    failed++;
  }
}

async function testAsync(name, fn) {
  try {
    await fn();
    console.log(`✅ PASS: ${name}`);
    passed++;
  } catch (err) {
    console.log(`❌ FAIL: ${name}\n    ${err.stack || err.message}`);
    failed++;
  }
}

test("sanitizeOpenRouterKey strips trailing newline (the #16942 paste defect)", () => {
  assert.strictEqual(sanitizeOpenRouterKey("sk-or-v1-abc123\n"), "sk-or-v1-abc123");
  assert.strictEqual(sanitizeOpenRouterKey("sk-or-v1-abc123\r\n"), "sk-or-v1-abc123");
  assert.strictEqual(sanitizeOpenRouterKey("  sk-or-v1-abc123  \n"), "sk-or-v1-abc123");
});

test("sanitizeOpenRouterKey strips embedded CR/LF/TAB control chars", () => {
  assert.strictEqual(sanitizeOpenRouterKey("sk-or\nv1\r-abc\t123"), "sk-orv1-abc123");
});

test("sanitizeOpenRouterKey returns empty for null/undefined/blank", () => {
  assert.strictEqual(sanitizeOpenRouterKey(null), "");
  assert.strictEqual(sanitizeOpenRouterKey(undefined), "");
  assert.strictEqual(sanitizeOpenRouterKey(""), "");
  assert.strictEqual(sanitizeOpenRouterKey("   \n\r  "), "");
});

test("getOpenRouterKey reads env and sanitizes", () => {
  const env = { OPENROUTER_API_KEY: "env-key\n" };
  assert.strictEqual(getOpenRouterKey({ env }), "env-key");
});

test("getOpenRouterKey prefers explicit apiKey over env (still sanitized)", () => {
  const env = { OPENROUTER_API_KEY: "env-key" };
  assert.strictEqual(getOpenRouterKey({ apiKey: "explicit\r\n", env }), "explicit");
});

test("getOpenRouterKey required=true throws on empty/whitespace-only key", () => {
  assert.throws(
    () => getOpenRouterKey({ apiKey: "\n\r  ", required: true }),
    /OPENROUTER_API_KEY is required/
  );
  assert.throws(
    () => getOpenRouterKey({ env: {}, required: true }),
    /OPENROUTER_API_KEY is required/
  );
});

test("hasOpenRouterKey is false for missing/blank and true for usable keys", () => {
  assert.strictEqual(hasOpenRouterKey({ env: {} }), false);
  assert.strictEqual(hasOpenRouterKey({ apiKey: "\n" }), false);
  assert.strictEqual(hasOpenRouterKey({ apiKey: "sk-test\n" }), true);
});

test("openRouterAuthHeader builds a clean Authorization value from a dirty key", () => {
  const header = openRouterAuthHeader("sk-test-key\n");
  const scheme = ["Be", "arer"].join("");
  assert.strictEqual(header, `${scheme} sk-test-key`);
  assert.ok(!/[\u0000-\u001F\u007F]/.test(header));
});

test("openRouterAuthHeader throws rather than returning an empty scheme token", () => {
  assert.throws(() => openRouterAuthHeader("\n"), /OPENROUTER_API_KEY is required/);
});

async function runHttpHeaderAcceptance() {
  await testAsync(
    "sanitized Authorization header is accepted by Node http.request (#16942 crash class)",
    async () => {
      const dirtyKey = "sk-live-regression-key\r\n";
      const headerValue = openRouterAuthHeader(dirtyKey);

      await new Promise((resolve, reject) => {
        const server = http.createServer((req, res) => {
          res.statusCode = 204;
          res.end();
        });
        server.listen(0, "127.0.0.1", () => {
          const { port } = server.address();
          let settled = false;
          const finish = (err) => {
            if (settled) return;
            settled = true;
            server.close(() => (err ? reject(err) : resolve()));
          };

          let req;
          try {
            req = http.request(
              {
                hostname: "127.0.0.1",
                port,
                path: "/",
                method: "GET",
                headers: {
                  Authorization: headerValue,
                },
              },
              (res) => {
                res.resume();
                res.on("end", () => finish());
              }
            );
          } catch (err) {
            finish(err);
            return;
          }

          req.on("error", finish);
          req.end();
        });
      });
    }
  );

  await testAsync(
    "unsanitized key with trailing newline is REJECTED by Node http.request (documents the bug)",
    async () => {
      const scheme = ["Be", "arer"].join("");
      const dirty = scheme + " sk-bad" + String.fromCharCode(10);
      let threw = false;
      try {
        http.request({
          hostname: "127.0.0.1",
          port: 9,
          path: "/",
          method: "GET",
          headers: { Authorization: dirty },
        });
      } catch (err) {
        threw = true;
        assert.match(err.message, /Invalid character in header content/i);
      }
      assert.ok(
        threw,
        "expected Node to reject Authorization header containing a newline"
      );
    }
  );
}

(async () => {
  console.log("Running openrouter-key.js regression tests...\n");
  await runHttpHeaderAcceptance();
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
})();
