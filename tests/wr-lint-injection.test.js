"use strict";

// Verifies wr-lint's shell-injection rule (rule 10) flags untrusted
// github.event.*.{body,title} interpolated into a shell command and accepts the
// safe env: pattern. Guards the fix for the #15094 security review.

const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const LINT = path.join(__dirname, "..", "wr", "scripts", "wr-lint.mjs");

function lint(md) {
  const file = path.join(
    fs.mkdtempSync(path.join(os.tmpdir(), "wrlint-")),
    "wr.md",
  );
  fs.writeFileSync(file, md);
  try {
    execFileSync("node", [LINT, file], { encoding: "utf8" });
    return "";
  } catch (err) {
    return String(err.stdout || "") + String(err.stderr || "");
  }
}

const HEADER =
  "# WR: /dragnet fix and implement\n\n## 9. Automatic Fix and Commit Queue\n\n";

test("flags untrusted issue body interpolated into shell", () => {
  const out = lint(
    HEADER +
      '```yaml\n      run: |\n        echo "${{ github.event.issue.body }}"\n```\n',
  );
  assert.match(out, /interpolated into a shell command/);
});

test("accepts the safe env: pattern", () => {
  const out = lint(
    HEADER +
      '```yaml\n      env:\n        ISSUE_BODY: ${{ github.event.issue.body }}\n      run: |\n        echo "$ISSUE_BODY"\n```\n',
  );
  assert.doesNotMatch(out, /interpolated into a shell command/);
});
