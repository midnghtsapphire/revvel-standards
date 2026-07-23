const test = require("node:test");
const assert = require("node:assert/strict");
const { execFileSync, execFile } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const GATE = path.join(__dirname, "..", ".pre-commit-hooks", "pre-review-gate.sh");
const ENV = { ...process.env, PRE_REVIEW_NO_LINT: "1" };

function runGate(files) {
  return new Promise((resolve) => {
    execFile("bash", [GATE, ...files], { env: ENV }, (error, stdout, stderr) => {
      resolve({ code: error ? error.code : 0, stdout, stderr });
    });
  });
}

function tmpFile(dir, name, content) {
  const p = path.join(dir, name);
  fs.writeFileSync(p, content);
  return p;
}

let dir;
test.before(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "pre-review-"));
});
test.after(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

const hasPyYaml = (() => {
  try {
    execFileSync("python3", ["-c", "import yaml"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
})();

test("gate script parses cleanly (bash -n)", () => {
  execFileSync("bash", ["-n", GATE]);
});

test("wraps bare URLs but leaves code fences, links, and wrapped URLs alone", async () => {
  const md = tmpFile(
    dir,
    "urls.md",
    [
      "# Doc",
      "",
      "See https://example.com/page for details.",
      "Already wrapped: <https://example.com/ok>",
      "Linked: [site](https://example.com/linked)",
      "```bash",
      "curl https://example.com/in-fence",
      "```",
      "Trailing punctuation: https://example.com/end.",
      "",
    ].join("\n")
  );
  const res = await runGate([md]);
  assert.equal(res.code, 0, res.stderr);
  const out = fs.readFileSync(md, "utf-8");
  assert.ok(out.includes("See <https://example.com/page> for details."));
  assert.ok(out.includes("<https://example.com/ok>"));
  assert.ok(!out.includes("<<https://example.com/ok>>"), "must not double-wrap");
  assert.ok(out.includes("[site](https://example.com/linked)"), "must not touch markdown links");
  assert.ok(out.includes("curl https://example.com/in-fence"), "must not touch fenced code");
  assert.ok(out.includes("<https://example.com/end>."), "punctuation stays outside");
});

test("collapses duplicate blank lines outside fences", async () => {
  const md = tmpFile(dir, "blanks.md", "# T\n\n\n\nBody\n\n```\n\n\nkeep\n```\n");
  const res = await runGate([md]);
  assert.equal(res.code, 0, res.stderr);
  const out = fs.readFileSync(md, "utf-8");
  assert.ok(out.includes("# T\n\nBody"));
  assert.ok(out.includes("```\n\n\nkeep\n```"), "fenced blank lines preserved");
});

test("markdown auto-fix is idempotent", async () => {
  const md = tmpFile(dir, "idem.md", "Go to https://example.com now\n");
  await runGate([md]);
  const first = fs.readFileSync(md, "utf-8");
  await runGate([md]);
  assert.equal(fs.readFileSync(md, "utf-8"), first);
});

test("valid YAML and JSON pass", { skip: !hasPyYaml && "PyYAML unavailable" }, async () => {
  const y = tmpFile(dir, "ok.yml", "name: test\nsteps:\n  - one\n  - two\n");
  const j = tmpFile(dir, "ok.json", '{"a": 1, "b": [2, 3]}\n');
  const res = await runGate([y, j]);
  assert.equal(res.code, 0, res.stderr);
});

test("invalid YAML blocks with non-zero exit", { skip: !hasPyYaml && "PyYAML unavailable" }, async () => {
  const y = tmpFile(dir, "bad.yml", "jobs:\n  build:\n  - broken\n    indent: [\n");
  const res = await runGate([y]);
  assert.notEqual(res.code, 0);
  assert.match(res.stdout + res.stderr, /FAILED/);
});

test("duplicate YAML keys block with non-zero exit", { skip: !hasPyYaml && "PyYAML unavailable" }, async () => {
  const y = tmpFile(dir, "dup.yml", "env:\n  TOKEN: a\n  TOKEN: b\n");
  const res = await runGate([y]);
  assert.notEqual(res.code, 0, "duplicate keys must be rejected");
  assert.match(res.stderr, /duplicate key/i);
});

test("invalid JSON blocks with non-zero exit", async () => {
  const j = tmpFile(dir, "bad.json", '{"a": 1,,}\n');
  const res = await runGate([j]);
  assert.notEqual(res.code, 0);
});

test("secret-looking assignments warn but do not block", async () => {
  const f = tmpFile(dir, "config.js", 'const api_key = "sk-abcdef123456789";\n');
  const res = await runGate([f]);
  assert.equal(res.code, 0, "secret warning must be non-blocking");
  assert.match(res.stdout, /potential secrets/i);
});

test("missing files are skipped without error", async () => {
  const res = await runGate([path.join(dir, "does-not-exist.yml")]);
  assert.equal(res.code, 0, res.stderr);
});
