'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync, spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const GATES = path.join(__dirname, '..', 'scripts', 'security-gates');
const tmp = (p) => fs.mkdtempSync(path.join(os.tmpdir(), p));
const bash = (script, args = [], opts = {}) => spawnSync('bash', [script, ...args], { encoding: 'utf8', ...opts });

const GATE_FILES = ['huge-delete-guard.js', 'prompt-injection-scan.js', 'trivy-scan.sh', 'clamav-scan.sh', 'api-code-review.js'];

/** A gates dir of stand-ins. `behave` maps file -> exit code (default 0). */
function stubGates(behave = {}, omit = []) {
  const d = tmp('gates-');
  for (const f of GATE_FILES) {
    if (omit.includes(f)) continue;
    const code = behave[f] ?? 0;
    const body = f.endsWith('.js')
      ? `console.log('stub ${f}'); process.exit(${code});\n`
      : `echo "stub ${f}"; exit ${code}\n`;
    fs.writeFileSync(path.join(d, f), body);
  }
  return d;
}

test('run-all: all gates pass -> exit 0 and every gate ran', () => {
  const d = stubGates();
  const r = bash(path.join(GATES, 'run-all.sh'), [], { env: { PATH: process.env.PATH, GATES_DIR: d } });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  for (const f of GATE_FILES) assert.match(r.stdout, new RegExp(`stub ${f.replace('.', '\\.')}`));
  assert.match(r.stdout, /passed   huge-delete/);
});

test('run-all: one red gate fails the run, but the later gates still run', () => {
  const d = stubGates({ 'prompt-injection-scan.js': 1 });
  const r = bash(path.join(GATES, 'run-all.sh'), [], { env: { PATH: process.env.PATH, GATES_DIR: d } });
  assert.equal(r.status, 1);
  assert.match(r.stdout, /FAILED   prompt-injection \(exit 1\)/);
  assert.match(r.stdout, /stub clamav-scan\.sh/, 'gates after the red one still ran');
  assert.match(r.stdout, /passed   code-review/);
});

test('run-all: a missing gate script is a failure, never a silent pass', () => {
  const d = stubGates({}, ['clamav-scan.sh']);
  const r = bash(path.join(GATES, 'run-all.sh'), [], { env: { PATH: process.env.PATH, GATES_DIR: d } });
  assert.equal(r.status, 1);
  assert.match(r.stdout, /FAILED   clamav \(script missing\)/);
});

test('run-all: SECURITY_GATES_SKIP skips by name and says so', () => {
  const d = stubGates({ 'clamav-scan.sh': 1 });
  const r = bash(path.join(GATES, 'run-all.sh'), [], { env: { PATH: process.env.PATH, GATES_DIR: d, SECURITY_GATES_SKIP: 'clamav,trivy' } });
  assert.equal(r.status, 0);
  assert.match(r.stdout, /SKIPPED  clamav/);
  assert.match(r.stdout, /SKIPPED  trivy/);
  assert.doesNotMatch(r.stdout, /stub clamav-scan\.sh/);
});

function sh(cwd, ...a) {
  return execFileSync('git', a, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

/** A local stand-in for revvel-standards holding the real run-all.sh plus stub gates. */
function fakeStandards() {
  const dir = tmp('rs-');
  sh(dir, 'init', '-q', '-b', 'main');
  sh(dir, 'config', 'user.email', 't@example.invalid');
  sh(dir, 'config', 'user.name', 't');
  sh(dir, 'config', 'uploadpack.allowFilter', 'true');
  sh(dir, 'config', 'uploadpack.allowAnySHA1InWant', 'true');
  fs.mkdirSync(path.join(dir, 'scripts', 'security-gates'), { recursive: true });
  fs.copyFileSync(path.join(GATES, 'run-all.sh'), path.join(dir, 'scripts', 'security-gates', 'run-all.sh'));
  const stubs = stubGates();
  for (const f of GATE_FILES) fs.copyFileSync(path.join(stubs, f), path.join(dir, 'scripts', 'security-gates', f));
  fs.writeFileSync(path.join(dir, 'scripts', 'llm-spend-gate.js'), '// stub\n');
  fs.writeFileSync(path.join(dir, 'unrelated-big-file.bin'), 'x'.repeat(1000));
  sh(dir, 'add', '-A');
  sh(dir, 'commit', '-q', '-m', 'standards');
  return { dir, sha: sh(dir, 'rev-parse', 'HEAD') };
}

test('bootstrap: fetches only the gates at the pinned SHA and runs them', () => {
  const { dir, sha } = fakeStandards();
  const dest = path.join(tmp('bs-'), 'gates');
  const r = bash(path.join(GATES, 'bootstrap.sh'), [], {
    env: { PATH: process.env.PATH, HOME: process.env.HOME, REVVEL_STANDARDS_SHA: sha, REVVEL_STANDARDS_REPO_URL: `file://${dir}`, SECURITY_GATES_DIR: dest },
  });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, new RegExp(`security gates at ${sha.slice(0, 10)}`));
  assert.match(r.stdout, /stub huge-delete-guard\.js/);
  assert.equal(fs.existsSync(path.join(dest, 'scripts', 'llm-spend-gate.js')), true);
  assert.equal(fs.existsSync(path.join(dest, 'unrelated-big-file.bin')), false, 'sparse: nothing outside the gates is checked out');
});

test('bootstrap: a branch name or a short hash is refused (the pin must be immutable)', () => {
  for (const bad of ['main', 'abc1234', '', 'HEAD']) {
    const r = bash(path.join(GATES, 'bootstrap.sh'), [], { env: { PATH: process.env.PATH, HOME: process.env.HOME, REVVEL_STANDARDS_SHA: bad } });
    assert.equal(r.status, 2, `'${bad}'`);
    assert.match(r.stderr, /40-character commit hash/);
  }
});

test('bootstrap: a gate failure in the pinned code fails the job', () => {
  const { dir } = fakeStandards();
  fs.writeFileSync(path.join(dir, 'scripts', 'security-gates', 'trivy-scan.sh'), 'echo stub; exit 1\n');
  sh(dir, 'add', '-A');
  sh(dir, 'commit', '-q', '-m', 'red trivy');
  const sha = sh(dir, 'rev-parse', 'HEAD');
  const r = bash(path.join(GATES, 'bootstrap.sh'), [], {
    env: { PATH: process.env.PATH, HOME: process.env.HOME, REVVEL_STANDARDS_SHA: sha, REVVEL_STANDARDS_REPO_URL: `file://${dir}`, SECURITY_GATES_DIR: path.join(tmp('bs-'), 'g') },
  });
  assert.equal(r.status, 1);
  assert.match(r.stdout, /FAILED   trivy/);
});

test('print-adopt-snippet: prints a job pinned to the given SHA', () => {
  const sha = 'a'.repeat(40);
  const r = bash(path.join(GATES, 'print-adopt-snippet.sh'), [], { env: { PATH: process.env.PATH, REVVEL_STANDARDS_SHA: sha } });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, new RegExp(`raw\\.githubusercontent\\.com/midnghtsapphire/revvel-standards/${sha}/scripts/security-gates/bootstrap\\.sh`));
  assert.match(r.stdout, new RegExp(`REVVEL_STANDARDS_SHA=${sha} bash`));
  assert.match(r.stdout, /ignore: main/);
  const bad = bash(path.join(GATES, 'print-adopt-snippet.sh'), [], { env: { PATH: process.env.PATH, REVVEL_STANDARDS_SHA: 'main' } });
  assert.equal(bad.status, 2);
});
