#!/usr/bin/env node
"use strict";

const { test } = require("node:test");
const assert = require("node:assert");
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const REPO_ROOT = path.join(__dirname, "..");

function copyRecursive(src, dest) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src)) {
      copyRecursive(path.join(src, entry), path.join(dest, entry));
    }
    return;
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

test("generate-wr strips leading multi-line template comments before linting", () => {
  const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), "generate-wr-"));
  try {
    copyRecursive(path.join(REPO_ROOT, "wr"), path.join(sandbox, "wr"));

    const bodyFile = path.join(sandbox, "issue-body.txt");
    fs.writeFileSync(
      bodyFile,
      "https://www.nad.com/news/fda-greenlights-life-biosciences-human-study-setting-up-pivotal-test-for-aging-theory-from-harvards-david-sinclair\n",
      "utf8"
    );

    const script = path.join(sandbox, "wr", "scripts", "generate-wr.sh");
    const result = spawnSync(
      "bash",
      [
        script,
        "--issue",
        "15317",
        "--title",
        "FDA Greenlights Life Biosciences’ Human Study, Setting Up Pivotal Test for Aging Theory from Harvard’s David Sinclair#tools #app",
        "--body-file",
        bodyFile,
      ],
      { cwd: sandbox, encoding: "utf8" }
    );

    assert.strictEqual(result.status, 0, `expected success, got:\n${result.stdout}\n${result.stderr}`);
    const generatedDir = path.join(sandbox, "wr", "issues");
    const generated = fs
      .readdirSync(generatedDir)
      .find((name) => /^issue-15317-.*\.md$/.test(name));
    assert.ok(generated, "expected generator to create a WR issue file");

    const text = fs.readFileSync(path.join(generatedDir, generated), "utf8");
    const [firstLine] = text.split("\n");
    assert.match(firstLine, /^# WR: FDA Greenlights Life Biosciences/);
    assert.ok(!text.startsWith("<!--"), "rendered WR must not keep template comments above the H1");
  } finally {
    fs.rmSync(sandbox, { recursive: true, force: true });
  }
});
