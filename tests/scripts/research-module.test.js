const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");

const script = require("../../scripts/research-module.js");

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    console.log(`PASS: ${name}`);
    passed += 1;
  } catch (error) {
    console.log(`FAIL: ${name}`);
    console.log(error.stack || error.message);
    failed += 1;
  }
}

async function run() {
  await test("fails fast when required compatibility env vars are missing", () => {
    assert.throws(
      () => script.getCompatOptions({ OUTPUT_FILE: "docs/research-output.md" }),
      /Missing required environment variable: QUESTION/,
    );
    assert.throws(
      () => script.getCompatOptions({ QUESTION: "Evaluate graphify alternatives" }),
      /Missing required environment variable: OUTPUT_FILE/,
    );
  });

  await test("maps legacy research-module env vars to research-engine options", () => {
    const options = script.getCompatOptions({
      QUESTION: "Evaluate graphify alternatives",
      OUTPUT_FILE: "docs/research-output.md",
      GITHUB_REPOSITORY: "midnghtsapphire/revvel-standards",
    });

    assert.strictEqual(options.query, "Evaluate graphify alternatives");
    assert.strictEqual(options.outputFile, "docs/research-output.md");
    assert.strictEqual(options.repository, "midnghtsapphire/revvel-standards");
    assert.strictEqual(options.depth, "triangulated");
  });

  await test("honors explicit research depth when delegating to the research engine", () => {
    const options = script.getCompatOptions({
      QUESTION: "Evaluate graphify alternatives",
      OUTPUT_FILE: "docs/research-output.md",
      RESEARCH_DEPTH: "standard",
    });

    assert.strictEqual(options.depth, "standard");
  });

  await test("falls back to RESEARCH_MODE when RESEARCH_DEPTH is not provided", () => {
    const options = script.getCompatOptions({
      QUESTION: "Evaluate graphify alternatives",
      OUTPUT_FILE: "docs/research-output.md",
      RESEARCH_MODE: "swarm",
    });

    assert.strictEqual(options.depth, "swarm");
  });

  await test("delegates compatibility runs through the research-engine runner", async () => {
    let receivedOptions = null;
    const expectedResult = {
      context: {
        query: "Evaluate graphify alternatives",
        depth: "triangulated",
      },
      status: "complete",
      outputPath: "/tmp/research-output.md",
    };

    const result = await script.runCompatibilityResearch(
      {
        QUESTION: "Evaluate graphify alternatives",
        OUTPUT_FILE: "docs/research-output.md",
      },
      async (options) => {
        receivedOptions = options;
        return expectedResult;
      },
    );

    assert.strictEqual(receivedOptions.query, "Evaluate graphify alternatives");
    assert.strictEqual(receivedOptions.depth, "triangulated");
    assert.strictEqual(receivedOptions.outputFile, "docs/research-output.md");
    assert.strictEqual(result, expectedResult);
  });

  await test("writes a visible blocked packet when the OpenRouter key is missing", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "research-compat-test-"));
    const outputFile = path.join(tmpDir, "packet.md");

    try {
      const result = await script.main({
        QUESTION: "Evaluate graphify alternatives",
        OUTPUT_FILE: outputFile,
        GITHUB_REPOSITORY: "midnghtsapphire/revvel-standards",
        DRY_RUN: "true",
      });

      assert.strictEqual(result.status, "blocked");
      assert.ok(fs.existsSync(outputFile));
      const output = fs.readFileSync(outputFile, "utf8");
      assert.ok(output.includes("Research Engine Packet"));
      assert.ok(output.includes("OPENROUTER_API_KEY"));
      assert.ok(output.includes("infrastructure blocker"));
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  console.log(`\nTest Summary: ${passed} passed, ${failed} failed`);
  process.exit(failed === 0 ? 0 : 1);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
