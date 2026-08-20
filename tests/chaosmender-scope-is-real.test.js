#!/usr/bin/env node
'use strict';

// ChaosMender's PR gate must inspect something before it reports success.
//
// On a pull request the scan runs `--changed-only`, filtering whole-repo
// findings down to the files the diff touched:
//
//     findings = findings.filter((f) => changed.has(f.file))
//
// That filter has two silent-vacuum modes, and both end with the scan printing
// "✅ no known error patterns detected" and exiting 0:
//
//   1. `changed` is empty. The compute step was skipped, its $GITHUB_OUTPUT
//      heredoc broke, the base SHA was unreachable, or the env var was
//      renamed. Every finding is filtered away.
//   2. `f.file` stops matching `git diff --name-only` format. A scanner that
//      pushed a basename or an absolute path would make every key miss, so no
//      finding could ever be attributed to any diff.
//
// Either way the gate passes every PR forever while looking exactly like
// success — CLAUDE.md gotcha 6, and the same shape as the `npm test || true`
// defect in #17704. Case 1 now exits non-zero; case 2 is pinned below by
// asserting the path format the filter depends on, because no amount of
// filtering logic helps if the two sides speak different dialects.
//
// The scan is exercised through the real CLI rather than its exports so the
// arg parsing, env parsing and filter are covered as one unit — that seam is
// where a rename breaks things.

const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const yaml = require('js-yaml');

const REPO = path.resolve(__dirname, '..');
const SCRIPT = path.join(REPO, 'scripts', 'chaosmender.js');

/** Run the real CLI. Exit 1 is a valid outcome (blocking findings), not a crash. */
function run(args, env = {}) {
  const res = spawnSync(process.execPath, [SCRIPT, ...args], {
    cwd: REPO,
    encoding: 'utf8',
    env: { ...process.env, ...env },
  });
  assert.notEqual(res.status, null, `chaosmender did not exit cleanly: ${res.stderr}`);
  return { status: res.status, out: `${res.stdout}${res.stderr}` };
}

/**
 * A throwaway tree containing exactly one file that trips a scanner.
 *
 * These assertions need a live finding to prove the `--changed-only` filter is
 * not vacuous, and they used to take one from this repository — which worked
 * only while the repository had an unfixed defect in it. It had sixteen; they
 * are gone, and the tests went red for the repo being CLEAN.
 *
 * Depending on a real defect makes fixing it look like a regression, and the
 * alternative — leaving one in the tree so a test has something to find — is
 * worse than the defect. The fixture is synthetic now, via `--root`.
 */
function repoWithAFinding() {
  const dir = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'chaosmender-scope-'));
  const wf = path.join(dir, '.github', 'workflows');
  fs.mkdirSync(wf, { recursive: true });
  fs.writeFileSync(path.join(wf, 'unguarded.yml'), [
    'name: Fixture', 'on: [push]', 'jobs:', '  j:', '    steps:',
    '      - uses: actions/github-script@v9.0.0', '        with:', '          script: |',
    '            await github.rest.issues.removeLabel({ owner, repo, issue_number: 1, name: "x" });',
  ].join('\n') + '\n');
  return { dir, file: '.github/workflows/unguarded.yml' };
}

test('the whole-repo scan is not vacuous', () => {
  // Guards the guard: if the scanners stop finding anything at all, the
  // filtering tests would pass by finding nothing rather than by filtering.
  const { dir, file } = repoWithAFinding();
  try {
    const { out } = run(['--root', dir]);
    assert.match(out, new RegExp(file.replace(/[.]/g, '\\.')),
      'the scanners must still report a genuinely unguarded call');
    assert.match(file, /^\.github\/workflows\//);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('this repository itself is clean', () => {
  // The outcome the fixture above exists to let us assert separately: no
  // finding anywhere in the tree, and an exit code that says so.
  const { status, out } = run([]);
  assert.equal(status, 0, `ChaosMender is red on this tree:\n${out}`);
});

test('an empty changed-file set fails instead of reporting a clean diff', () => {
  // The PR trigger is path-filtered, so a pull_request run always has files in
  // scope. Reaching --changed-only with none means the list never arrived.
  for (const env of [{ CHAOSMENDER_CHANGED_FILES: '' }, { CHAOSMENDER_CHANGED_FILES: '   ' }]) {
    const { status, out } = run(['--changed-only'], env);
    assert.equal(status, 1, 'a scan that inspected nothing must not exit 0');
    assert.doesNotMatch(
      out,
      /no known error patterns detected/,
      'must not claim the diff is clean when the scope was never computed'
    );
  }
});

test('findings inside the diff survive the filter', () => {
  const { dir, file } = repoWithAFinding();
  try {
    const { out } = run(['--changed-only', '--root', dir], {
      CHAOSMENDER_CHANGED_FILES: file,
    });
    const m = out.match(/(\d+) finding\(s\) attributable/);
    assert.ok(m, 'the changed-only summary line must be printed');
    assert.ok(
      Number(m[1]) > 0,
      `${file} trips a scanner in the whole-repo scan, so scoping to it must ` +
        'attribute at least one finding — zero here means the keys never match'
    );
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('findings outside the diff are filtered out', () => {
  // The other direction. Without this, a filter that matched everything would
  // pass the test above while gating nothing.
  const { status, out } = run(['--changed-only'], { CHAOSMENDER_CHANGED_FILES: 'README.md' });
  assert.match(out, /0 finding\(s\) attributable/, 'unchanged files must not be attributed to the diff');
  assert.equal(status, 0, 'a genuinely clean diff is a pass');
});

test('every finding path is in `git diff --name-only` format', () => {
  // This is the invariant the filter is built on. `changed` is populated from
  // git's output; `f.file` comes from the scanners. If the two ever diverge,
  // `changed.has(f.file)` misses every time and the gate silently passes
  // everything — with no error anywhere, because "0 findings" reads as success.
  const { dir } = repoWithAFinding();
  try {
    const { out } = run(['--root', dir]);
    // Report lines read:  `   File  : .github/workflows/foo.yml:288`
    const paths = [...out.matchAll(/^\s*File\s*:\s*(\S+?):\d+\s*$/gm)].map((m) => m[1]);

    assert.ok(paths.length > 0, 'expected the report to name file paths');

    for (const p of new Set(paths)) {
      assert.ok(!path.isAbsolute(p), `${p} must be repo-relative, not absolute`);
      assert.ok(!p.startsWith('./'), `${p} must not carry a ./ prefix — git omits it`);
      assert.ok(!p.includes('\\'), `${p} must use forward slashes`);
      assert.ok(
        fs.existsSync(path.join(dir, p)),
        `${p} must resolve from the scanned root, the same way git diff --name-only reports it`
      );
    }
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('the workflow actually supplies the scope it claims to use', () => {
  // The filter is only as good as its input. If the PR path stops passing
  // --changed-only, the gate reverts to whole-repo noise; if it stops setting
  // CHAOSMENDER_CHANGED_FILES, the scope is empty and (before this change) the
  // gate passed everything.
  const wf = yaml.load(fs.readFileSync(path.join(REPO, '.github/workflows/chaosmender.yml'), 'utf8'));
  const steps = wf.jobs.scan.steps;

  const scan = steps.find((s) => /run chaosmender scan/i.test(s.name || ''));
  assert.ok(scan, 'the scan step must exist');
  assert.match(scan.run, /--changed-only/, 'the pull_request path must scope the scan to the diff');
  assert.ok(
    scan.env && 'CHAOSMENDER_CHANGED_FILES' in scan.env,
    'the scan step must receive the changed-file list, or --changed-only has an empty scope'
  );

  const compute = steps.find((s) => /changed files/i.test(s.name || ''));
  assert.ok(compute, 'the step computing the changed-file list must exist');
  assert.match(compute.run, /--name-only/, 'the list must come from git, matching the finding paths');
});
