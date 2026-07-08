#!/usr/bin/env node
"use strict";

const { test } = require("node:test");
const assert = require("node:assert");
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const REPO_ROOT = path.join(__dirname, "..");
const GENERATOR = path.join(REPO_ROOT, "wr", "scripts", "generate-wr.sh");
const WR_ISSUES_DIR = path.join(REPO_ROOT, "wr", "issues");

function toSlug(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
}

test("generate-wr strips leading multiline template comments so H1 is on line 1", () => {
  const issue = "999001";
  const title = "Multiline comment strip regression for full template output";
  const bodyPath = path.join(os.tmpdir(), `issue-${issue}-body.md`);
  const dest = path.join(WR_ISSUES_DIR, `issue-${issue}-${toSlug(title)}.md`);

  fs.writeFileSync(bodyPath, "https://example.com/source\n", "utf8");

  try {
    const res = spawnSync(
      GENERATOR,
      ["--issue", issue, "--title", title, "--body-file", bodyPath],
      { cwd: REPO_ROOT, encoding: "utf8" },
    );

    assert.strictEqual(
      res.status,
      0,
      `generator should succeed for full template titles:\n${res.stdout}\n${res.stderr}`,
    );

    const out = fs.readFileSync(dest, "utf8");
    assert.ok(out.length > 0, "generator should not produce an empty file");
    const firstLine = out.split("\n")[0];
    assert.strictEqual(
      firstLine,
      `# WR: ${title}`,
      "output must start with the rendered H1 (no leading template comments)",
    );
  } finally {
    fs.rmSync(bodyPath, { force: true });
    fs.rmSync(dest, { force: true });
  }
});
