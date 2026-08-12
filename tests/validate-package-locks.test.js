const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const SCRIPT = path.join(__dirname, '..', 'scripts', 'validate-package-locks.sh');

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { encoding: 'utf8', ...options });
  if (result.error) throw result.error;
  return result;
}

function addLocalDependency(dir) {
  const depDir = path.join(dir, 'local-dep');
  fs.mkdirSync(depDir, { recursive: true });
  fs.writeFileSync(
    path.join(depDir, 'package.json'),
    JSON.stringify(
      {
        name: 'local-dep',
        version: '1.0.0',
      },
      null,
      2
    ) + '\n'
  );
}

function runOrThrow(command, args, options = {}) {
  const result = run(command, args, options);
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed:\n${result.stderr || result.stdout}`);
  }
  return result;
}

function makeRepo(mutate) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lock-gate-'));
  runOrThrow('git', ['init', '-q'], { cwd: dir });
  runOrThrow('git', ['config', 'user.email', 'ci@example.com'], { cwd: dir });
  runOrThrow('git', ['config', 'user.name', 'CI'], { cwd: dir });

  fs.writeFileSync(
    path.join(dir, 'package.json'),
    JSON.stringify(
      {
        name: 'lock-gate-test',
        version: '1.0.0',
        private: true,
      },
      null,
      2
    ) + '\n'
  );
  addLocalDependency(dir);
  runOrThrow('npm', ['install', '--package-lock-only', '--ignore-scripts', '--silent'], { cwd: dir });
  runOrThrow('git', ['add', '.'], { cwd: dir });
  runOrThrow('git', ['commit', '-qm', 'base'], { cwd: dir });
  const baseSha = runOrThrow('git', ['rev-parse', 'HEAD'], { cwd: dir }).stdout.trim();

  mutate(dir);

  runOrThrow('git', ['add', '-A'], { cwd: dir });
  runOrThrow('git', ['commit', '-qm', 'head'], { cwd: dir });
  const headSha = runOrThrow('git', ['rev-parse', 'HEAD'], { cwd: dir }).stdout.trim();
  return { dir, baseSha, headSha };
}

function runValidator({ dir, baseSha, headSha }) {
  return run('bash', [SCRIPT], {
    cwd: dir,
    env: { ...process.env, BASE_SHA: baseSha, HEAD_SHA: headSha },
  });
}

test('passes when dependency and lockfile are synchronized', () => {
  const repo = makeRepo((dir) => {
    const pkgPath = path.join(dir, 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    pkg.dependencies = { 'local-dep': 'file:./local-dep' };
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
    runOrThrow('npm', ['install', '--package-lock-only', '--ignore-scripts', '--silent'], { cwd: dir });
  });

  try {
    const result = runValidator(repo);
    assert.equal(result.status, 0, result.stderr || result.stdout);
  } finally {
    fs.rmSync(repo.dir, { recursive: true, force: true });
  }
});

test('fails when package.json changed but lockfile edit does not synchronize it', () => {
  const repo = makeRepo((dir) => {
    const pkgPath = path.join(dir, 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    pkg.dependencies = { 'local-dep': 'file:./local-dep' };
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
    const lockPath = path.join(dir, 'package-lock.json');
    const lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
    lock.__test_marker = true;
    fs.writeFileSync(lockPath, JSON.stringify(lock, null, 2) + '\n');
  });

  try {
    const result = runValidator(repo);
    assert.notEqual(result.status, 0, 'validator must fail on mismatch');
    assert.match(result.stdout + result.stderr, /not synchronized/i);
  } finally {
    fs.rmSync(repo.dir, { recursive: true, force: true });
  }
});

test('passes metadata-only package.json changes without lockfile updates', () => {
  const repo = makeRepo((dir) => {
    const pkgPath = path.join(dir, 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    pkg.description = 'metadata-only update';
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
  });

  try {
    const result = runValidator(repo);
    assert.equal(result.status, 0, result.stderr || result.stdout);
  } finally {
    fs.rmSync(repo.dir, { recursive: true, force: true });
  }
});

test('fails when only the lockfile is corrupted (manifest untouched)', () => {
  const repo = makeRepo((dir) => {
    fs.writeFileSync(path.join(dir, 'package-lock.json'), '{ this is not valid json');
  });

  try {
    const result = runValidator(repo);
    assert.notEqual(result.status, 0, 'validator must fail on a corrupted lockfile');
    assert.match(result.stdout + result.stderr, /not synchronized|missing|orphaned/i);
  } finally {
    fs.rmSync(repo.dir, { recursive: true, force: true });
  }
});

test('fails when the lockfile is deleted without a manifest change', () => {
  const repo = makeRepo((dir) => {
    fs.rmSync(path.join(dir, 'package-lock.json'));
  });

  try {
    const result = runValidator(repo);
    assert.notEqual(result.status, 0, 'validator must fail when the lockfile disappears');
    assert.match(result.stdout + result.stderr, /missing/i);
  } finally {
    fs.rmSync(repo.dir, { recursive: true, force: true });
  }
});

test('skips pnpm-workspace manifests that have no package-lock.json (npm-only gate)', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lock-gate-pnpm-'));
  runOrThrow('git', ['init', '-q'], { cwd: dir });
  runOrThrow('git', ['config', 'user.email', 'ci@example.com'], { cwd: dir });
  runOrThrow('git', ['config', 'user.name', 'CI'], { cwd: dir });
  fs.writeFileSync(
    path.join(dir, 'package.json'),
    JSON.stringify({ name: 'pnpm-ws-root', version: '1.0.0', private: true }, null, 2) + '\n'
  );
  fs.writeFileSync(path.join(dir, 'pnpm-lock.yaml'), "lockfileVersion: '9.0'\n");
  runOrThrow('git', ['add', '.'], { cwd: dir });
  runOrThrow('git', ['commit', '-qm', 'base'], { cwd: dir });
  const baseSha = runOrThrow('git', ['rev-parse', 'HEAD'], { cwd: dir }).stdout.trim();

  const pkgPath = path.join(dir, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  pkg.description = 'pnpm-managed manifest edit';
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
  runOrThrow('git', ['add', '-A'], { cwd: dir });
  runOrThrow('git', ['commit', '-qm', 'head'], { cwd: dir });
  const headSha = runOrThrow('git', ['rev-parse', 'HEAD'], { cwd: dir }).stdout.trim();

  try {
    const result = runValidator({ dir, baseSha, headSha });
    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.match(result.stdout, /governed by a pnpm workspace/i);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
