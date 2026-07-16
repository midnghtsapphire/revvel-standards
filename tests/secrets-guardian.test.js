// Regression test for scripts/secrets-guardian.sh
// Verifies that the critical-secrets membership check expands the full array,
// so GITHUB_TOKEN (index 1, not 0) is not duplicated in `missing=` output.

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");

test("secrets-guardian.sh does not duplicate critical secrets in missing= output", () => {
  const scriptPath = path.resolve(
    __dirname,
    "..",
    "scripts",
    "secrets-guardian.sh",
  );
  if (!fs.existsSync(scriptPath)) {
    // If script is not present in this checkout, skip silently.
    return;
  }

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "secrets-guardian-"));
  const outputFile = path.join(tmpDir, "gh_output");
  const stubBin = path.join(tmpDir, "bin");
  fs.mkdirSync(stubBin, { recursive: true });

  // Stub `gh` so it reports zero existing secrets
  const ghStub = path.join(stubBin, "gh");
  fs.writeFileSync(ghStub, "#!/usr/bin/env bash\nexit 0\n", { mode: 0o755 });

  fs.writeFileSync(outputFile, "");

  const env = {
    ...process.env,
    PATH: `${stubBin}:${process.env.PATH || ""}`,
    GITHUB_OUTPUT: outputFile,
  };

  try {
    execFileSync("bash", [scriptPath], { env, stdio: "pipe" });
  } catch (err) {
    // Script may exit non-zero when secrets missing; we still validate output file.
  }

  const output = fs.readFileSync(outputFile, "utf8");
  const missingLine = output.split("\n").find((l) => l.startsWith("missing="));
  assert.ok(missingLine, "missing= line should be present in GITHUB_OUTPUT");

  const missingValues = missingLine
    .replace(/^missing=/, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  // GITHUB_TOKEN is a critical secret that is NOT first in the array.
  // Before the fix, it would be listed twice (once per loop).
  const githubTokenCount = missingValues.filter(
    (s) => s === "GITHUB_TOKEN",
  ).length;
  assert.equal(
    githubTokenCount,
    1,
    `GITHUB_TOKEN should appear exactly once in missing=, got ${githubTokenCount}: ${missingLine}`,
  );

  // No secret name should be duplicated in missing=
  const seen = new Set();
  const dupes = [];
  for (const name of missingValues) {
    if (seen.has(name)) dupes.push(name);
    seen.add(name);
  }
  assert.deepEqual(
    dupes,
    [],
    `no duplicate secret names expected, found: ${dupes.join(", ")}`,
  );
});
