#!/usr/bin/env node
"use strict";

/**
 * Tests for wr/scripts/sanitize-wr-markdown.mjs — the generated-WR markdown
 * normalizer that stops the daily CircleCI changed-Markdown gate failures
 * (MD012 / MD025 / MD049; issue #15604). Covers both the pure function and
 * the in-place CLI, mirroring the fixture-based style of wr-lint.test.js.
 */

const { test } = require("node:test");
const assert = require("node:assert");
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const SCRIPT = path.join(
  __dirname,
  "..",
  "wr",
  "scripts",
  "sanitize-wr-markdown.mjs",
);

async function sanitize(text) {
  const { sanitizeWrMarkdown } = await import(SCRIPT);
  return sanitizeWrMarkdown(text);
}

test("MD012: collapses runs of blank lines to a single blank line", async () => {
  const input = "# WR: Title\n\n\n\nBody text\n\n\nMore text\n";
  assert.strictEqual(
    await sanitize(input),
    "# WR: Title\n\nBody text\n\nMore text\n",
  );
});

test("MD025: demotes any H1 after the first to an H2", async () => {
  const input = [
    "# WR: Title",
    "",
    "Intro.",
    "",
    "# WR-Ready Research Packet: Atomic Label Updates",
    "",
    "Packet body.",
    "",
  ].join("\n");
  const out = await sanitize(input);
  assert.match(out, /^# WR: Title\n/);
  assert.match(out, /\n## WR-Ready Research Packet: Atomic Label Updates\n/);
  assert.strictEqual(out.match(/^# /gm).length, 1, "exactly one H1 remains");
});

test("MD049: rewrites asterisk emphasis to underscore, keeps strong intact", async () => {
  const input =
    "_No response_ then imported *packet emphasis* and **bold** text.\n";
  assert.strictEqual(
    await sanitize(input),
    "_No response_ then imported _packet emphasis_ and **bold** text.\n",
  );
});

test("does not touch fenced code blocks or inline code", async () => {
  const input = [
    "# WR: Title",
    "",
    "```text",
    "# not a heading",
    "",
    "",
    "*not emphasis*",
    "```",
    "",
    "Inline `*code*` stays.",
    "",
  ].join("\n");
  const out = await sanitize(input);
  assert.match(out, /\n# not a heading\n/, "H1 inside fence untouched");
  assert.match(
    out,
    /\n\n\*not emphasis\*\n/,
    "blanks/emphasis inside fence untouched",
  );
  assert.match(out, /`\*code\*`/, "inline code untouched");
});

test("does not treat list bullets or multiplication as emphasis", async () => {
  const input = "* bullet item\n\n3 * 4 * 5 = 60\n";
  assert.strictEqual(await sanitize(input), input);
});

test("MD047: ends with exactly one trailing newline", async () => {
  assert.strictEqual(await sanitize("# WR: Title\n\n\n"), "# WR: Title\n");
  assert.strictEqual(await sanitize("# WR: Title"), "# WR: Title\n");
});

test("CLI rewrites a dirty file in place and leaves a clean file untouched", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "sanitize-wr-"));
  const file = path.join(dir, "wr.md");
  try {
    fs.writeFileSync(file, "# A\n\n\n# B\n", "utf8");
    const res = spawnSync(process.execPath, [SCRIPT, file], {
      encoding: "utf8",
    });
    assert.strictEqual(res.status, 0, res.stderr);
    assert.match(res.stdout, /sanitized:/);
    assert.strictEqual(fs.readFileSync(file, "utf8"), "# A\n\n## B\n");

    const res2 = spawnSync(process.execPath, [SCRIPT, file], {
      encoding: "utf8",
    });
    assert.strictEqual(res2.status, 0, res2.stderr);
    assert.match(res2.stdout, /clean:/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("sanitized output passes markdownlint on the original failure pattern", (t) => {
  // Reproduces the exact finding set from issue #15604 (MD012/MD025/MD049),
  // then asserts markdownlint-cli2 reports the sanitized file clean.
  // Requires the repo devDependency markdownlint-cli2 to be installed
  // (`npm ci`); skips gracefully when it is not available.
  const repoRoot = path.join(__dirname, "..");
  if (
    !fs.existsSync(path.join(repoRoot, "node_modules", "markdownlint-cli2"))
  ) {
    t.skip("markdownlint-cli2 not installed (run npm ci)");
    return;
  }
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "sanitize-wr-lint-"));
  const file = path.join(dir, "wr.md");
  try {
    const dirty = [
      "# WR: implement atomic label updates",
      "",
      "_No response_",
      "",
      "",
      "Body text.",
      "",
      "# WR-Ready Research Packet: Atomic Label Updates",
      "",
      "Use *atomic* label calls with *retry* logic.",
      "",
    ].join("\n");
    fs.writeFileSync(file, dirty, "utf8");
    spawnSync(process.execPath, [SCRIPT, file], { encoding: "utf8" });

    const lint = spawnSync(
      "npx",
      [
        "--no-install",
        "markdownlint-cli2",
        "--config",
        path.join(repoRoot, ".markdownlint.jsonc"),
        file,
      ],
      { cwd: repoRoot, encoding: "utf8" },
    );
    assert.strictEqual(
      lint.status,
      0,
      `sanitized WR should pass markdownlint:\n${lint.stdout}\n${lint.stderr}`,
    );
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
