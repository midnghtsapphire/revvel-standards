"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const {
  parseArgs,
  walkMarkdown,
  healFiles,
} = require("../scripts/orchestration/structural-heal.js");

test("parseArgs reads root, dry-run, files", () => {
  const opts = parseArgs(["--root", "docs/n8n", "--dry-run", "--files", "a.md", "b.md"]);
  assert.equal(opts.root, "docs/n8n");
  assert.equal(opts.dryRun, true);
  assert.deepEqual(opts.files, ["a.md", "b.md"]);
});

test("walkMarkdown finds nested md and skips node_modules", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "walk-md-"));
  fs.mkdirSync(path.join(root, "sub"));
  fs.mkdirSync(path.join(root, "node_modules", "pkg"), { recursive: true });
  fs.writeFileSync(path.join(root, "a.md"), "# A\n");
  fs.writeFileSync(path.join(root, "sub", "b.md"), "# B\n");
  fs.writeFileSync(path.join(root, "node_modules", "pkg", "c.md"), "# C\n");
  fs.writeFileSync(path.join(root, "skip.txt"), "nope");
  const found = walkMarkdown(root).map((f) => path.relative(root, f)).sort();
  assert.deepEqual(found, ["a.md", path.join("sub", "b.md")]);
});

test("healFiles rewrites MD025/MD056 and is idempotent", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "heal-files-"));
  const file = path.join(root, "broken.md");
  fs.writeFileSync(
    file,
    "# One\n\n# Two\n\n| A | B |\n| --- | --- |\n| only |\n"
  );
  const first = healFiles([file], { dryRun: false });
  assert.equal(first.healed.length, 1);
  const body = fs.readFileSync(file, "utf8");
  assert.match(body, /^# One/m);
  assert.match(body, /^## Two/m);
  assert.match(body, /\|\s*only\s*\|\s*\|\s*$/m);
  const second = healFiles([file], { dryRun: false });
  assert.equal(second.healed.length, 0, "second pass must be a no-op");
});

test("healFiles dry-run does not write", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "heal-dry-"));
  const file = path.join(root, "x.md");
  const original = "# A\n\n# B\n";
  fs.writeFileSync(file, original);
  const res = healFiles([file], { dryRun: true });
  assert.equal(res.healed.length, 1);
  assert.equal(fs.readFileSync(file, "utf8"), original);
});
