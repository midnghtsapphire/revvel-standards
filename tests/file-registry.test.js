"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const {
  loadRegistry,
  validateRegistry,
  hasTopLevelHeading,
  parseArgs,
  main,
} = require("../scripts/orchestration/file-registry.js");

function tmpRoot(files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "file-reg-"));
  for (const [rel, body] of Object.entries(files)) {
    const abs = path.join(root, rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, body);
  }
  return root;
}

test("hasTopLevelHeading detects ATX H1 outside fences", () => {
  assert.equal(hasTopLevelHeading("# Title\n\nbody"), true);
  assert.equal(hasTopLevelHeading("## Only h2\n"), false);
  assert.equal(hasTopLevelHeading("```\n# not real\n```\n"), false);
});

test("validateRegistry accepts a well-formed inventory", () => {
  const root = tmpRoot({
    "docs/a.md": "# Hello\n\ntext\n",
    "scripts/x.js": "module.exports = {};\n",
  });
  const report = validateRegistry(
    {
      version: "1.0",
      files: [
        { path: "docs/a.md", role: "doc" },
        { path: "scripts/x.js", role: "script" },
      ],
    },
    { root }
  );
  assert.equal(report.ok, true);
  assert.equal(report.checked, 2);
  assert.deepEqual(report.errors, []);
});

test("validateRegistry rejects missing required files and path traversal", () => {
  const root = tmpRoot({ "ok.md": "# x\n" });
  const report = validateRegistry(
    {
      files: [
        { path: "ok.md", role: "doc" },
        { path: "missing.md", role: "doc" },
        { path: "../etc/passwd", role: "any" },
      ],
    },
    { root }
  );
  assert.equal(report.ok, false);
  assert.ok(report.errors.some((e) => /missing\.md/.test(e)));
  assert.ok(report.errors.some((e) => /traversal|repo-relative/.test(e)));
});

test("validateRegistry rejects wrong extension for role", () => {
  const root = tmpRoot({ "note.txt": "hi" });
  const report = validateRegistry(
    { files: [{ path: "note.txt", role: "doc" }] },
    { root }
  );
  assert.equal(report.ok, false);
  assert.ok(report.errors.some((e) => /extension/.test(e)));
});

test("validateRegistry rejects Markdown docs without a top-level heading", () => {
  const root = tmpRoot({ "docs/noh1.md": "just text\n" });
  const report = validateRegistry(
    { files: [{ path: "docs/noh1.md", role: "doc" }] },
    { root }
  );
  assert.equal(report.ok, false);
  assert.ok(report.errors.some((e) => /top-level heading/.test(e)));
});

test("loadRegistry parses YAML and JSON", () => {
  const root = tmpRoot({
    "r.yml": "version: '1.0'\nfiles:\n  - path: a.md\n    role: doc\n",
    "a.md": "# A\n",
  });
  const reg = loadRegistry(path.join(root, "r.yml"));
  assert.equal(reg.version, "1.0");
  const fromJson = loadRegistry(JSON.stringify({ files: [{ path: "a.md", role: "doc" }] }));
  assert.equal(fromJson.files.length, 1);
});

test("parseArgs and main CLI exit codes", () => {
  const args = parseArgs(["--registry", "x.yml", "--json"]);
  assert.equal(args.registry, "x.yml");
  assert.equal(args.json, true);
  assert.equal(main(["--help"]), 0);
  assert.equal(main([]), 1);
});

test("repo orchestration registry validates against this checkout", () => {
  const regPath = path.join(__dirname, "..", "config", "orchestration", "file-registry.yml");
  // Product files are added in the same PR; if the registry lists them they must exist.
  if (!fs.existsSync(regPath)) {
    assert.fail("config/orchestration/file-registry.yml must exist");
  }
  const registry = loadRegistry(regPath);
  const report = validateRegistry(registry);
  assert.equal(
    report.ok,
    true,
    `registry invalid:\n${report.errors.join("\n")}`
  );
});
