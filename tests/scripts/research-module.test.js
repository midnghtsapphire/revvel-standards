const assert = require("assert");
const fs = require("fs");
const path = require("path");
const https = require("https");

const testOutputPath = path.join(__dirname, "research-test-output.md");
process.env.OPENROUTER_API_KEY = "test-key";
process.env.QUESTION = "What is the meaning of life?";
process.env.OUTPUT_FILE = testOutputPath;

const script = require("../../scripts/research-module.js");

async function runTests() {
  console.log("Running research-module tests...");
  let failed = false;

  const originalRequest = https.request;
  const originalLog = console.log;
  const originalWarn = console.warn;
  const originalError = console.error;

  // Helper to mock https.request
  function mockHttpsRequest(onReq) {
    https.request = function (options, callback) {
      const req = {
        _events: {},
        on: function(event, cb) {
          this._events[event] = cb;
        },
        emit: function(event, ...args) {
          if (this._events[event]) {
            this._events[event](...args);
          }
        },
        end: () => {},
        write: () => {},
      };
      if (onReq) onReq(req, callback, options);
      return req;
    };
  }

  try {
    // 1. Success test
    console.log("  Testing successful response...");
    mockHttpsRequest((req, callback) => {
      process.nextTick(() => {
        const res = {
          statusCode: 200,
          on: (event, cb) => {
            if (event === "data") cb(Buffer.from(JSON.stringify({ choices: [{ message: { content: "Success response" } }] })));
            if (event === "end") cb();
          },
        };
        callback(res);
      });
    });
    const result = await script.callOpenRouter("model", "sys", "user");
    assert.strictEqual(result, "Success response");
    console.log("  ✅ Success test passed.");

    // 2. OpenRouter error test
    console.log("  Testing OpenRouter API error...");
    mockHttpsRequest((req, callback) => {
      process.nextTick(() => {
        const res = {
          statusCode: 200,
          on: (event, cb) => {
            if (event === "data") cb(Buffer.from(JSON.stringify({ error: { message: "API Error" } })));
            if (event === "end") cb();
          },
        };
        callback(res);
      });
    });
    await assert.rejects(
      script.callOpenRouter("model", "sys", "user"),
      /OpenRouter error: API Error/
    );
    console.log("  ✅ API error test passed.");

    // 3. Invalid JSON response test (THE FIX WE ADDED)
    console.log("  Testing invalid JSON response...");
    const invalidJson = "Not a JSON";
    mockHttpsRequest((req, callback) => {
      process.nextTick(() => {
        const res = {
          statusCode: 200,
          on: (event, cb) => {
            if (event === "data") cb(Buffer.from(invalidJson));
            if (event === "end") cb();
          },
        };
        callback(res);
      });
    });
    await assert.rejects(
      script.callOpenRouter("model", "sys", "user"),
      (err) => {
        assert(err.message.includes("Failed to parse OpenRouter response"));
        assert(err.message.includes("Raw: " + invalidJson));
        return true;
      }
    );
    console.log("  ✅ Invalid JSON test passed.");

    // 4. Network error test
    console.log("  Testing network error...");
    mockHttpsRequest((req, callback) => {
      process.nextTick(() => {
        req.emit('error', new Error("Simulated network failure"));
      });
    });
    await assert.rejects(
      script.callOpenRouter("model", "sys", "user"),
      /Simulated network failure/
    );
    console.log("  ✅ Network error test passed.");

    // 5. Full main() flow test
    console.log("  Testing full main() flow...");
    let requestCount = 0;
    mockHttpsRequest((req, callback) => {
      requestCount++;
      const currentCount = requestCount;
      process.nextTick(() => {
        if (currentCount === 1) {
          // First agent fails
          req.emit('error', new Error("First agent failure"));
        } else {
          // Others succeed
          const res = {
            statusCode: 200,
            on: (event, cb) => {
              if (event === "data") cb(Buffer.from(JSON.stringify({ choices: [{ message: { content: "Agent/Synthesis content" } }] })));
              if (event === "end") cb();
            },
          };
          callback(res);
        }
      });
    });

    let warnings = [];
    console.log = () => {};
    console.warn = (msg) => { warnings.push(msg); };
    console.error = () => {};

    await script.main();

    // Restore output
    console.log = originalLog;
    console.warn = originalWarn;
    console.error = originalError;

    assert(warnings.some(w => w.includes("Failed: First agent failure")), "Should log warning about agent failure. Warnings: " + JSON.stringify(warnings));
    assert(fs.existsSync(testOutputPath), "Output file should be created");
    const output = fs.readFileSync(testOutputPath, "utf8");
    assert(output.includes("Agent/Synthesis content"), "Output should contain content");
    console.log("  ✅ Full main() flow test passed.");

  } catch (err) {
    console.log = originalLog;
    console.warn = originalWarn;
    console.error = originalError;
    console.error("  ❌ Test failed:", err);
    failed = true;
  } finally {
    https.request = originalRequest;
    if (fs.existsSync(testOutputPath)) fs.unlinkSync(testOutputPath);
  }

  if (failed) {
    process.exit(1);
  } else {
    console.log("\nAll research-module tests passed! ✨");
  }
}

if (require.main === module) {
  runTests().catch(err => { console.error(err); process.exit(1); });
}
