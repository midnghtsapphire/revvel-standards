'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const SCRIPT = path.resolve(
  __dirname,
  '..',
  'scripts',
  'auto-resolve-mechanical-conflicts.js',
);

function sh(cwd, cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, {
    cwd,
    encoding: 'utf8',
    ...opts,
  });
  return r;
}

function git(cwd, args, opts = {}) {
  return sh(cwd, 'git', args, {
    env: {
      ...process.env,
      GIT_AUTHOR_NAME: 'Test',
      GIT_AUTHOR_EMAIL: 'test@example.com',
      GIT_COMMITTER_NAME: 'Test',
      GIT_COMMITTER_EMAIL: 'test@example.com',
    },
    ...opts,
  });
}

function mkRepo() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'armc-'));
  git(dir, ['init', '-q', '-b', 'main']);
  git(dir, ['config', 'commit.gpgsign', 'false']);
  git(dir, ['config', 'user.email', 'test@example.com']);
  git(dir, ['config', 'user.name', 'Test']);
  return dir;
}

test('main() exit code (false-success regression)', async (t) => {
  await t.test(
    'binary UU conflict with zero textual hunks exits 2, not 0',
    () => {
      const dir = mkRepo();

      // Seed a binary file on main.
      const bin0 = Buffer.from([0, 1, 2, 3, 4, 5, 6, 7, 0, 8, 9]);
      fs.writeFileSync(path.join(dir, 'bin.dat'), bin0);
      // .gitattributes ensures git treats it as binary (no textual markers).
      fs.writeFileSync(path.join(dir, '.gitattributes'), 'bin.dat binary\n');
      git(dir, ['add', '.']);
      git(dir, ['commit', '-q', '-m', 'seed']);

      // Branch A modifies binary.
      git(dir, ['checkout', '-q', '-b', 'branchA']);
      fs.writeFileSync(
        path.join(dir, 'bin.dat'),
        Buffer.from([0, 1, 2, 0xaa, 0xaa, 0xaa, 6, 7, 0, 8, 9]),
      );
      git(dir, ['commit', '-q', '-am', 'A change']);

      // Branch B modifies binary differently.
      git(dir, ['checkout', '-q', 'main']);
      git(dir, ['checkout', '-q', '-b', 'branchB']);
      fs.writeFileSync(
        path.join(dir, 'bin.dat'),
        Buffer.from([0, 1, 2, 0xbb, 0xbb, 0xbb, 6, 7, 0, 8, 9]),
      );
      git(dir, ['commit', '-q', '-am', 'B change']);

      // Merge A into B -> conflicted binary (UU) with no textual markers.
      const mergeRes = git(dir, ['merge', '--no-commit', '--no-ff', 'branchA']);
      // git returns non-zero on conflict; we just want the working tree state.
      assert.notStrictEqual(mergeRes.status, 0, 'merge should conflict');

      const status = git(dir, ['diff', '--name-only', '--diff-filter=U']);
      assert.ok(
        status.stdout.split('\n').includes('bin.dat'),
        `expected bin.dat to be UU, got: ${status.stdout}`,
      );

      // Confirm there are no textual conflict markers in the file.
      const buf = fs.readFileSync(path.join(dir, 'bin.dat'));
      assert.ok(
        !buf.includes(Buffer.from('<<<<<<<')),
        'binary conflict should not contain textual markers',
      );

      const run = sh(dir, process.execPath, [SCRIPT]);
      assert.strictEqual(
        run.status,
        2,
        `expected exit 2 for unresolved binary conflict, got ${run.status}\nstdout:\n${run.stdout}\nstderr:\n${run.stderr}`,
      );
      assert.match(
        run.stdout,
        /(MANUAL|SKIP)\s+bin\.dat/,
        `expected bin.dat reported as MANUAL/SKIP, got:\n${run.stdout}`,
      );
    },
  );

  await t.test(
    'fully mechanically-resolvable conflict still exits 0',
    () => {
      const dir = mkRepo();

      const wfPath = path.join(dir, '.github', 'workflows');
      fs.mkdirSync(wfPath, { recursive: true });
      const wf = path.join(wfPath, 'ci.yml');

      fs.writeFileSync(
        wf,
        [
          'name: ci',
          'on: [push]',
          'jobs:',
          '  build:',
          '    runs-on: ubuntu-latest',
          '    steps:',
          '      - uses: actions/checkout@v3',
          '',
        ].join('\n'),
      );
      git(dir, ['add', '.']);
      git(dir, ['commit', '-q', '-m', 'seed']);

      git(dir, ['checkout', '-q', '-b', 'bumpA']);
      fs.writeFileSync(
        wf,
        [
          'name: ci',
          'on: [push]',
          'jobs:',
          '  build:',
          '    runs-on: ubuntu-latest',
          '    steps:',
          '      - uses: actions/checkout@v4',
          '',
        ].join('\n'),
      );
      git(dir, ['commit', '-q', '-am', 'bump to v4']);

      git(dir, ['checkout', '-q', 'main']);
      git(dir, ['checkout', '-q', '-b', 'bumpB']);
      fs.writeFileSync(
        wf,
        [
          'name: ci',
          'on: [push]',
          'jobs:',
          '  build:',
          '    runs-on: ubuntu-latest',
          '    steps:',
          '      - uses: actions/checkout@v3.5',
          '',
        ].join('\n'),
      );
      git(dir, ['commit', '-q', '-am', 'bump to v3.5']);

      const mergeRes = git(dir, ['merge', '--no-commit', '--no-ff', 'bumpA']);
      assert.notStrictEqual(mergeRes.status, 0, 'merge should conflict');

      const run = sh(dir, process.execPath, [SCRIPT]);
      assert.strictEqual(
        run.status,
        0,
        `expected exit 0 for fully mechanical resolve, got ${run.status}\nstdout:\n${run.stdout}\nstderr:\n${run.stderr}`,
      );
      assert.match(
        run.stdout,
        /RESOLVED\s+\.github\/workflows\/ci\.yml/,
        `expected ci.yml reported RESOLVED, got:\n${run.stdout}`,
      );

      // And the ambiguous count is 0 in summary.
      assert.match(run.stdout, /0 ambiguous/);
    },
  );
});
