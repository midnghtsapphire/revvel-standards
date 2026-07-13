'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { execSync, spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const SCRIPT = path.resolve(__dirname, '..', 'scripts', 'auto-resolve-mechanical-conflicts.js');

function mkTmpRepo() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'armc-'));
  const run = (cmd) => execSync(cmd, { cwd: dir, stdio: 'pipe' });
  run('git init -q -b main');
  run('git config user.email test@example.com');
  run('git config user.name test');
  run('git config commit.gpgsign false');
  return { dir, run };
}

function runScript(cwd) {
  return spawnSync(process.execPath, [SCRIPT], { cwd, encoding: 'utf8' });
}

test('main() exit code (false-success regression)', async (t) => {
  await t.test('binary both-modified conflict with zero hunks exits 2 (was 0)', () => {
    const { dir, run } = mkTmpRepo();
    // Seed with a binary file.
    const bin = path.join(dir, 'bin.dat');
    fs.writeFileSync(bin, Buffer.from([0, 1, 2, 3, 4, 5]));
    run('git add bin.dat');
    run('git commit -qm base');

    run('git checkout -q -b feature');
    fs.writeFileSync(bin, Buffer.from([9, 9, 9, 9, 9, 9]));
    run('git commit -qam feature');

    run('git checkout -q main');
    fs.writeFileSync(bin, Buffer.from([7, 7, 7, 7, 7, 7]));
    run('git commit -qam main');

    // Force a conflict; binary conflicts never write <<<<<<< markers.
    try { execSync('git merge --no-commit --no-ff feature', { cwd: dir, stdio: 'pipe' }); } catch (_) {}

    const res = runScript(dir);
    assert.strictEqual(res.status, 2, `expected exit 2, got ${res.status}. stdout=${res.stdout} stderr=${res.stderr}`);
    assert.match(res.stdout, /MANUAL\s+bin\.dat\s+0 hunk\(s\) ambiguous/);
  });

  await t.test('cleanly auto-resolvable uses: version bump still exits 0', () => {
    const { dir, run } = mkTmpRepo();
    const wf = path.join(dir, 'workflow.yml');
    fs.writeFileSync(wf, 'steps:\n  - uses: actions/checkout@v3\n');
    run('git add workflow.yml');
    run('git commit -qm base');

    run('git checkout -q -b feature');
    fs.writeFileSync(wf, 'steps:\n  - uses: actions/checkout@v5\n');
    run('git commit -qam feature');

    run('git checkout -q main');
    fs.writeFileSync(wf, 'steps:\n  - uses: actions/checkout@v4\n');
    run('git commit -qam main');

    try { execSync('git merge --no-commit --no-ff feature', { cwd: dir, stdio: 'pipe' }); } catch (_) {}

    const res = runScript(dir);
    assert.strictEqual(res.status, 0, `expected exit 0, got ${res.status}. stdout=${res.stdout} stderr=${res.stderr}`);
    assert.match(res.stdout, /RESOLVED\s+workflow\.yml/);
    // Winner should be v5 (highest semver).
    const merged = fs.readFileSync(wf, 'utf8');
    assert.match(merged, /actions\/checkout@v5/);
  });
});
