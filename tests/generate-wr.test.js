#!/usr/bin/env node
"use strict";

const { test } = require("node:test");
const assert = require("node:assert");
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const REPO_ROOT = path.join(__dirname, "..");

function setupSandboxWr(sandbox) {
  const wrRoot = path.join(sandbox, "wr");
  fs.mkdirSync(path.join(wrRoot, "scripts"), { recursive: true });
  fs.mkdirSync(path.join(wrRoot, "issues"), { recursive: true });

  const filesToCopy = [
    "scripts/generate-wr.sh",
    "scripts/wr-lint.mjs",
    "WR_TEMPLATE_FULL.md",
    "WR_TEMPLATE_BASIC.md",
  ];

  for (const rel of filesToCopy) {
    const src = path.join(REPO_ROOT, "wr", rel);
    const dest = path.join(wrRoot, rel);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }
}

test("generate-wr strips leading multi-line template comments", () => {
  const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), "generate-wr-"));
  try {
    setupSandboxWr(sandbox);
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

// A second, in-repo variant of the same regression (arrived via a parallel
// fix; both are kept because they exercise different working directories).
// NOTE: an overlapping merge of these two variants once dropped the closing
// braces above, leaving this whole file unparseable — and red on main.
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
