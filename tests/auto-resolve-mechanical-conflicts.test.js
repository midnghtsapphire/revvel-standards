'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const SCRIPT = path.resolve(__dirname, '..', 'scripts', 'auto-resolve-mechanical-conflicts.js');

function mkTempRepo() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'auto-resolve-test-'));
  const run = (args, opts = {}) =>
    spawnSync('git', args, { cwd: dir, encoding: 'utf8', ...opts });
  run(['init', '-q', '-b', 'main']);
  run(['config', 'user.email', 'test@example.com']);
  run(['config', 'user.name', 'Test']);
  run(['config', 'commit.gpgsign', 'false']);
  return { dir, run };
}

function runScript(cwd) {
  return spawnSync(process.execPath, [SCRIPT], {
    cwd,
    encoding: 'utf8',
    env: { ...process.env },
  });
}

test('main() exit code (false-success regression)', async (t) => {
  await t.test('binary "both modified" conflict with zero hunks exits 2', () => {
    const { dir, run } = mkTempRepo();

    // Initial commit with a binary file.
    const bin = path.join(dir, 'bin.dat');
    fs.writeFileSync(bin, Buffer.from([0x00, 0x01, 0x02, 0x03, 0x04]));
    // Force git to treat as binary via .gitattributes.
    fs.writeFileSync(path.join(dir, '.gitattributes'), 'bin.dat binary\n');
    run(['add', '-A']);
    run(['commit', '-q', '-m', 'init']);

    // Branch A modifies the binary.
    run(['checkout', '-q', '-b', 'branch-a']);
    fs.writeFileSync(bin, Buffer.from([0x10, 0x11, 0x12, 0x13, 0x14]));
    run(['add', '-A']);
    run(['commit', '-q', '-m', 'a']);

    // Branch B (from main) modifies it differently.
    run(['checkout', '-q', 'main']);
    run(['checkout', '-q', '-b', 'branch-b']);
    fs.writeFileSync(bin, Buffer.from([0x20, 0x21, 0x22, 0x23, 0x24]));
    run(['add', '-A']);
    run(['commit', '-q', '-m', 'b']);

    // Merge branch-a into branch-b to create the conflict.
    const merge = run(['merge', '--no-commit', '--no-ff', 'branch-a']);
    // Merge should fail with conflict; git exits non-zero.
    assert.notStrictEqual(merge.status, 0, 'expected merge to conflict');

    // Sanity: file should be UU in index and contain no textual markers.
    const status = run(['status', '--porcelain']).stdout;
    assert.ok(/UU\s+bin\.dat/.test(status), `expected UU bin.dat in: ${status}`);
    const content = fs.readFileSync(bin);
    assert.ok(!content.includes(Buffer.from('<<<<<<<')), 'binary conflict should have no markers');

    const res = runScript(dir);
    assert.match(res.stdout, /MANUAL\s+bin\.dat\s+0 hunk\(s\) ambiguous/);
    assert.strictEqual(res.status, 2, `expected exit 2, got ${res.status}; stdout=${res.stdout}`);
  });

  await t.test('fully mechanically-resolvable workflow conflict exits 0', () => {
    const { dir, run } = mkTempRepo();

    const wfDir = path.join(dir, '.github', 'workflows');
    fs.mkdirSync(wfDir, { recursive: true });
    const wf = path.join(wfDir, 'ci.yml');
    fs.writeFileSync(
      wf,
      ['name: ci', 'on: [push]', 'jobs:', '  x:', '    runs-on: ubuntu-latest', '    steps:', '      - uses: actions/checkout@v3', ''].join('\n')
    );
    run(['add', '-A']);
    run(['commit', '-q', '-m', 'init']);

    // Branch A bumps to v4.
    run(['checkout', '-q', '-b', 'branch-a']);
    let s = fs.readFileSync(wf, 'utf8').replace('actions/checkout@v3', 'actions/checkout@v4');
    fs.writeFileSync(wf, s);
    run(['add', '-A']);
    run(['commit', '-q', '-m', 'a']);

    // Branch B bumps to v5.
    run(['checkout', '-q', 'main']);
    run(['checkout', '-q', '-b', 'branch-b']);
    s = fs.readFileSync(wf, 'utf8').replace('actions/checkout@v3', 'actions/checkout@v5');
    fs.writeFileSync(wf, s);
    run(['add', '-A']);
    run(['commit', '-q', '-m', 'b']);

    const merge = run(['merge', '--no-commit', '--no-ff', 'branch-a']);
    assert.notStrictEqual(merge.status, 0, 'expected merge to conflict');

    const res = runScript(dir);
    assert.match(res.stdout, /RESOLVED\s+\.github\/workflows\/ci\.yml/);
    assert.strictEqual(res.status, 0, `expected exit 0, got ${res.status}; stdout=${res.stdout}`);

    // And the resolved file should pick v5 (higher).
    const finalText = fs.readFileSync(wf, 'utf8');
    assert.match(finalText, /actions\/checkout@v5/);
    assert.ok(!finalText.includes('<<<<<<<'), 'no markers should remain');
  });
});
