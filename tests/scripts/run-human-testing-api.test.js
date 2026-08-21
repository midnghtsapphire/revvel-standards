const assert = require("assert");
const fs = require("fs");
const path = require("path");
const https = require("https");

const testOutputPath = path.join(__dirname, "test-output.md");
process.env.OPENROUTER_API_KEY = "test-key";
// This suite exercises the cloud call path deliberately — it mocks
// https.request to simulate provider failures, so no request leaves the
// process and no money moves. The spend gate (#17850) refuses paid calls
// by default, so the gate must be opened explicitly here or the assertions
// below would be testing the refusal instead of the failure handling.
process.env.REVVEL_LLM_ALLOW_CLOUD = "1";
process.env.TARGET_URL = "https://example.com";
process.env.OUTPUT_FILE = testOutputPath;
process.env.APP_NAME = "Test App";

const script = require("../../scripts/run-human-testing-api.js");

async function runTests() {
  console.log("Running run-human-testing-api tests...");
  let failed = false;

  const originalRequest = https.request;
  const originalLog = console.log;
  const originalWarn = console.warn;
  const originalError = console.error;

  try {
    let requestCount = 0;
    https.request = function (options, callback) {
      requestCount++;
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

      if (requestCount === 1) {
        // Agent 1 fails with a network error
        process.nextTick(() => {
          req.emit('error', new Error("Simulated network failure"));
        });
      } else {
        process.nextTick(() => {
          const res = {
            on: (event, cb) => {
              if (event === "data") cb(Buffer.from(JSON.stringify({ choices: [{ message: { content: "Agent success" } }] })));
              if (event === "end") cb();
            },
          };
          callback(res);
        });
      }

      return req;
    };

    console.log("  Testing agent failure handling...");

    let warnings = [];
    console.log = () => {};
    console.warn = (msg) => { warnings.push(msg); };
    console.error = () => {};

    await script.main();

    // Restore output temporarily
    console.log = originalLog;
    console.warn = originalWarn;
    console.error = originalError;

    assert(warnings.some(w => w.includes("Failed: Simulated network failure")), "Should log warning about agent failure");
    console.log("  ✅ Agent failure handling test passed.");

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

  try {
    let requestCount = 0;
    https.request = function (options, callback) {
      requestCount++;
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

      if (requestCount <= 5) {
        // All agents succeed
        process.nextTick(() => {
          const res = {
            on: (event, cb) => {
              if (event === "data") cb(Buffer.from(JSON.stringify({ choices: [{ message: { content: "Agent success" } }] })));
              if (event === "end") cb();
            },
          };
          callback(res);
        });
      } else {
        // Synthesizer fails with network error
        process.nextTick(() => {
          req.emit('error', new Error("Synthesizer network failure"));
        });
      }

      return req;
    };

    console.log("  Testing synthesizer failure handling...");

    let errors = [];
    console.log = () => {};
    console.warn = () => {};
    console.error = (msg) => { errors.push(msg); };

    await script.main();

    console.log = originalLog;
    console.warn = originalWarn;
    console.error = originalError;

    const output = fs.readFileSync(testOutputPath, "utf8");
    assert(errors.some(e => e.includes("Synthesis failed: Synthesizer network failure")), "Should log synthesis failure");
    assert(output.includes("Agent success"), "Should contain raw reports as fallback");
    console.log("  ✅ Synthesizer failure handling test passed.");

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
  }
}

if (require.main === module) {
  runTests().catch(err => { console.error(err); process.exit(1); });
}
