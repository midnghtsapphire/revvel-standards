#!/usr/bin/env node
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const lib = require(path.join(
  root,
  'products/easy-env-vars/lib/parse-env.js'
));

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

test('simple values parse and resolve in order', () => {
  const result = lib.parseEnvBlock(`
SOME_FLAG=1
THIS_GREETING=hello
WITH_SPACES="a value with spaces"
`);
  assert.equal(result.ok, true);
  assert.equal(result.resolved.SOME_FLAG, '1');
  assert.equal(result.resolved.THIS_GREETING, 'hello');
  assert.equal(result.resolved.WITH_SPACES, 'a value with spaces');
});

test('later vars can reference earlier vars', () => {
  const result = lib.parseEnvBlock(
    `
TWO=two
ONETWOTHREE="$ONE $TWO three"
`,
    { existingEnv: { ONE: 'one' } }
  );
  assert.equal(result.ok, true);
  assert.equal(result.resolved.ONETWOTHREE, 'one two three');
});

test('shell parameter default expansion works', () => {
  const result = lib.parseEnvBlock(`
THAT_VALUE="\${THIS_GREETING:-hi} \${LOCATION:-world}"
`);
  assert.equal(result.ok, true);
  assert.equal(result.resolved.THAT_VALUE, 'hi world');
});

test('pwd command substitution is allowlisted', () => {
  const result = lib.parseEnvBlock(`
ABS_SUBDIR="$(pwd)/test"
`);
  assert.equal(result.ok, true);
  assert.equal(result.resolved.ABS_SUBDIR, `${process.cwd()}/test`);
});

test('malformed definitions are rejected', () => {
  const result = lib.parseEnvBlock(`
=novalue
123BAD=1
GOOD=ok
`);
  assert.equal(result.ok, false);
  assert.ok(result.findings.some((f) => f.code === 'malformed'));
  // continueOnError keeps GOOD when earlier rows fail
  assert.equal(result.resolved.GOOD, 'ok');
});

test('circular references are detected', () => {
  const result = lib.parseEnvBlock(`
A=$B
B=$C
C=$A
`);
  assert.equal(result.ok, false);
  assert.ok(result.findings.some((f) => f.code === 'circular'));
  assert.deepEqual(result.resolved, {});
});

test('command injection patterns are rejected', () => {
  const payloads = [
    'X=$(curl evil.test)',
    'X=`id`',
    'X=1; rm -rf /',
    'X=1 && whoami',
    'X=1 | tee /tmp/x',
    'X=1 > /tmp/pwned',
  ];
  for (const block of payloads) {
    const result = lib.parseEnvBlock(block);
    assert.equal(result.ok, false, `expected fail for: ${block}`);
    assert.ok(
      result.findings.some(
        (f) => f.code === 'injection' || f.code === 'command-sub'
      ),
      `expected injection finding for: ${block}`
    );
  }
});

test('self-reference cycle is detected', () => {
  const result = lib.parseEnvBlock('A=$A');
  assert.equal(result.ok, false);
  assert.ok(result.findings.some((f) => f.code === 'circular'));
});

test('workflow snippet pins briantist/ezenv to full SHA', () => {
  const result = lib.parseEnvBlock('FOO=bar');
  assert.match(
    result.workflowSnippet,
    new RegExp(`briantist/ezenv@${lib.PINNED_SHA}`)
  );
  assert.equal(lib.PINNED_TAG, 'v1.0.0');
  assert.match(lib.PINNED_SHA, /^[0-9a-f]{40}$/);
});

test('validate-cli exits 0 on clean input and 1 on injection', () => {
  const cli = path.join(root, 'products/easy-env-vars/lib/validate-cli.js');
  const ok = spawnSync(process.execPath, [cli, '--env-var', 'EEV_TEST'], {
    env: { ...process.env, EEV_TEST: 'A=1\nB=$A' },
    encoding: 'utf8',
  });
  assert.equal(ok.status, 0, ok.stdout + ok.stderr);

  const bad = spawnSync(process.execPath, [cli, '--env-var', 'EEV_TEST'], {
    env: { ...process.env, EEV_TEST: 'X=$(curl evil.test)' },
    encoding: 'utf8',
  });
  assert.equal(bad.status, 1, bad.stdout + bad.stderr);
});

test('workflow pins briantist/ezenv and runs pre-validation', () => {
  const wf = read('.github/workflows/easy-env-vars.yml');
  assert.match(wf, /name:\s*Easy Env Vars/);
  assert.match(
    wf,
    new RegExp(`briantist/ezenv@${lib.PINNED_SHA}`)
  );
  assert.match(wf, /products\/easy-env-vars\/lib\/validate-cli\.js/);
  assert.match(wf, /workflow_dispatch:/);
  // uses: line must be full SHA, not a floating tag.
  assert.match(wf, /^\s*uses:\s+briantist\/ezenv@[0-9a-f]{40}\s*$/m);
  assert.doesNotMatch(wf, /^\s*uses:\s+briantist\/ezenv@v/m);
});

test('briantist/ezenv is accepted in third-party audit allowlist', () => {
  const audit = read('scripts/audit-third-party-actions.sh');
  assert.match(audit, /briantist\/ezenv/);
  assert.match(audit, /WR #15863|WR #15863|#15863/);
});

test('product ships with README, package.json, and UI entrypoints', () => {
  for (const rel of [
    'products/easy-env-vars/package.json',
    'products/easy-env-vars/README.md',
    'products/easy-env-vars/app/page.tsx',
    'products/easy-env-vars/app/layout.tsx',
    'products/easy-env-vars/vercel.json',
    'products/easy-env-vars/tests/parser.test.js',
  ]) {
    assert.ok(fs.existsSync(path.join(root, rel)), `missing ${rel}`);
  }
  const pkg = JSON.parse(read('products/easy-env-vars/package.json'));
  assert.equal(pkg.name, 'easy-env-vars');
  assert.ok(pkg.scripts.test);
  assert.ok(pkg.scripts.build);
  assert.ok(pkg.scripts.dev);
});
