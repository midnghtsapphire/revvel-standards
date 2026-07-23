const test = require("node:test");
const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const path = require("node:path");

const HARVEST = path.join(__dirname, "..", "tools", "harvest.py");

// Grounding gate: the harvester's own offline unit checks must pass. This is
// the boolean surface (WR-4200 "maximize the scripted surface") — no network,
// deterministic, so it runs in CI without hitting NCBI/Crossref/ctgov.
test("harvest.py --self-test passes (pure-function contract)", () => {
  const py = process.env.PYTHON || "python3";
  let out;
  try {
    out = execFileSync(py, [HARVEST, "--self-test"], { encoding: "utf8" });
  } catch (err) {
    // Surface the failing checks in the assertion message.
    assert.fail(
      "harvest self-test failed:\n" +
        (err.stdout || "") +
        (err.stderr || "")
    );
  }
  assert.match(out, /harvest self-test: (\d+)\/\1 passed/, out);
});

test("harvest.py --dry-run runs offline without writing or fabricating", () => {
  const py = process.env.PYTHON || "python3";
  // A single keyed shard degrades to zero rows and writes nothing in dry-run.
  const out = execFileSync(py, [HARVEST, "--shard", "standards", "--dry-run"], {
    encoding: "utf8",
  });
  const summary = JSON.parse(out.trim().split("\n").pop());
  assert.equal(summary.new, 0, "keyed shard must not fabricate rows");
  assert.equal(summary.total, 0);
  assert.equal(summary.quiet, true);
});
