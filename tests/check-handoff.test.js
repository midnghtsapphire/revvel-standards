'use strict';

/**
 * AGENTS.md S7: scripts/check_handoff.sh fails a PR from a known bot branch that
 * changes bot work without a handoffs/<bot>/ file dated within the last day, and
 * only warns for any other branch. Every case runs the real script against a temp
 * tree, with HANDOFF_TODAY and HANDOFF_CHANGED_FILES pinned so no git, clock or
 * network is involved.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const REPO = path.join(__dirname, '..');
const SCRIPT = path.join(REPO, 'scripts', 'check_handoff.sh');

function run({ branch, files, handoffs = [], today = '2026-11-14', conf }) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'handoff-'));
  try {
    fs.mkdirSync(path.join(root, 'handoffs'), { recursive: true });
    fs.copyFileSync(
      conf || path.join(REPO, 'handoffs', 'bots.conf'),
      path.join(root, 'handoffs', 'bots.conf')
    );
    for (const rel of handoffs) {
      const p = path.join(root, rel);
      fs.mkdirSync(path.dirname(p), { recursive: true });
      fs.writeFileSync(p, '# handoff\n');
    }
    const list = path.join(root, 'changed.txt');
    fs.writeFileSync(list, files.join('\n') + '\n');
    const res = spawnSync('bash', [SCRIPT], {
      encoding: 'utf8',
      env: {
        PATH: process.env.PATH,
        HANDOFF_ROOT: root,
        HANDOFF_BRANCH: branch,
        HANDOFF_TODAY: today,
        HANDOFF_CHANGED_FILES: list,
      },
    });
    return { status: res.status, out: res.stdout + res.stderr };
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

test('known bot branch with changed work and no handoff fails', () => {
  const r = run({ branch: 'triage/fix-x', files: ['scripts/a.js'] });
  assert.equal(r.status, 1, r.out);
  assert.match(r.out, /handoffs\/triagechief\/2026-11-14\.md/);
});

test('known bot branch with a handoff dated today passes', () => {
  const r = run({
    branch: 'proofy/book-fix',
    files: ['books/a.md'],
    handoffs: ['handoffs/proofy/2026-11-14.md'],
  });
  assert.equal(r.status, 0, r.out);
  assert.match(r.out, /^OK:/m);
});

test('a handoff dated yesterday still counts (within the last day)', () => {
  const r = run({
    branch: 'balls/x',
    files: ['x.js'],
    handoffs: ['handoffs/balls/2026-11-13.md'],
  });
  assert.equal(r.status, 0, r.out);
});

test('a handoff dated two days ago fails', () => {
  const r = run({
    branch: 'balls/x',
    files: ['x.js'],
    handoffs: ['handoffs/balls/2026-11-12.md'],
  });
  assert.equal(r.status, 1, r.out);
});

test('month boundary: yesterday of 2026-12-01 is 2026-11-30', () => {
  const r = run({
    branch: 'mech/x',
    files: ['x.js'],
    today: '2026-12-01',
    handoffs: ['handoffs/mechsensorforge/2026-11-30.md'],
  });
  assert.equal(r.status, 0, r.out);
});

test('another bot\'s fresh handoff does not satisfy this bot', () => {
  const r = run({
    branch: 'triage/x',
    files: ['x.js'],
    handoffs: ['handoffs/proofy/2026-11-14.md'],
  });
  assert.equal(r.status, 1, r.out);
});

test('a PR that changes only handoffs/ is exempt', () => {
  const r = run({ branch: 'triage/x', files: ['handoffs/triagechief/2026-11-14.md'] });
  assert.equal(r.status, 0, r.out);
  assert.match(r.out, /only handoffs\//);
});

test('unknown branch prefix with no handoff warns and exits 0', () => {
  const r = run({ branch: 'feat/something', files: ['x.js'] });
  assert.equal(r.status, 0, r.out);
  assert.match(r.out, /^WARN:/m);
});

test('unknown branch prefix with any fresh handoff is fine', () => {
  const r = run({
    branch: 'feat/something',
    files: ['x.js'],
    handoffs: ['handoffs/proofy/2026-11-14.md'],
  });
  assert.equal(r.status, 0, r.out);
  assert.doesNotMatch(r.out, /WARN/);
});

test('main and daily branches are skipped', () => {
  for (const branch of ['main', 'daily/2026-11-14']) {
    const r = run({ branch, files: ['x.js'] });
    assert.equal(r.status, 0, r.out);
    assert.match(r.out, /^SKIP:/m);
  }
});

test('handoffs/bots.conf lists only well-formed prefix/bot pairs', () => {
  const lines = fs
    .readFileSync(path.join(REPO, 'handoffs', 'bots.conf'), 'utf8')
    .split('\n')
    .filter((l) => l.trim() && !l.startsWith('#'));
  assert.ok(lines.length > 0);
  for (const l of lines) {
    assert.match(l, /^[a-z0-9._-]+\/ [a-z0-9-]+$/, `bad bots.conf line: ${l}`);
  }
});
