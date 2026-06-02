// fix-wr-gate.test.mjs — node:test suite for the fix-WR gate.
// Drives the gate script as a child process for each row in
// fixtures/fix-wr-gate-cases.json and asserts exit code matches `expect`.
//
// Run locally: node --test wr/tests/fix-wr-gate.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, "..", "..");
const GATE = path.join(REPO, "wr", "scripts", "fix-wr-gate.mjs");
const CASES = JSON.parse(
  fs.readFileSync(path.join(__dirname, "fixtures", "fix-wr-gate-cases.json"), "utf8")
);

function runGate({ title, body, labels, changed }) {
  const args = [GATE, "--changed", changed, "--title", title, "--body", body];
  if (labels) args.push("--labels", labels);
  const r = spawnSync(process.execPath, args, { encoding: "utf8" });
  return { code: r.status, stdout: r.stdout || "", stderr: r.stderr || "" };
}

for (const c of CASES) {
  test(`fix-wr-gate: ${c.name} → ${c.expect} (${c.why})`, () => {
    const r = runGate(c);
    const expected = c.expect === "pass" ? 0 : 1;
    assert.equal(
      r.code,
      expected,
      `case "${c.name}" expected ${c.expect} (exit ${expected}), got exit ${r.code}\n` +
        `title: ${c.title}\nlabels: ${c.labels}\nchanged: ${c.changed}\n` +
        `body: ${JSON.stringify(c.body)}\nstdout:\n${r.stdout}\nstderr:\n${r.stderr}`
    );
  });
}

test("tracking-only with Tracks: ref produces note acknowledging acceptance", () => {
  const c = CASES.find((x) => x.name === "tracking-only-with-tracks-ref");
  const r = runGate(c);
  assert.equal(r.code, 0);
  assert.match(r.stdout, /tracking-only fix WR accepted/);
});
