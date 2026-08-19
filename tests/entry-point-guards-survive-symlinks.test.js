#!/usr/bin/env node
'use strict';

// A script that does nothing and exits 0 is the worst failure mode we have.
//
// scripts/image-seo-build-pack.mjs and scripts/image-seo-filename-qa.mjs both
// decided whether they were the entry point like this:
//
//   const isMain =
//     process.argv[1] &&
//     path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
//
// Only one side is resolved. Through a symlink, process.argv[1] is the link
// and import.meta.url is the target, so the two strings differ, isMain is
// false, main() never runs — and because nothing throws, the process prints
// nothing and exits 0. Measured before the fix:
//
//   node scripts/image-seo-build-pack.mjs --out probe.json   exit 0, file written
//   node symlink-to-it.mjs               --out probe.json   exit 0, NO file
//
// image-automation-auto-wr.mjs then decided the build had succeeded from
// `built.status === 0` and reported ok:true over a builder that produced
// nothing. That is CLAUDE.md gotcha 6 exactly: an exit code must mean the
// postcondition holds, not that the process finished. It now reads the pack
// back and fails if it is missing or unusable.
//
// Same family as #17704 (`npm test || true`), #17714, #17717, #17718 and
// #17719 — an artifact reporting success without doing the work.

const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..');

function withTempDir(fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'entrypoint-guard-'));
  try {
    return fn(dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

test('image-seo-build-pack runs and writes when invoked through a symlink', () => {
  withTempDir((dir) => {
    const target = path.join(repoRoot, 'scripts', 'image-seo-build-pack.mjs');
    const link = path.join(dir, 'linked-build-pack.mjs');
    fs.symlinkSync(target, link);
    const out = path.join(dir, 'pack.json');

    const result = spawnSync(
      process.execPath,
      [
        link,
        '--brief',
        path.join(repoRoot, 'artifacts/image-automation/default-brief.json'),
        '--out',
        out,
      ],
      { cwd: repoRoot, encoding: 'utf8' },
    );

    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.ok(
      fs.existsSync(out),
      'invoked through a symlink the builder exited 0 without writing its pack — ' +
        'the entry-point guard resolved only one side of the comparison',
    );
    const pack = JSON.parse(fs.readFileSync(out, 'utf8'));
    assert.ok(pack.seo, 'pack has no seo section');
  });
});

test('image-seo-filename-qa runs when invoked through a symlink', () => {
  withTempDir((dir) => {
    const target = path.join(repoRoot, 'scripts', 'image-seo-filename-qa.mjs');
    const link = path.join(dir, 'linked-filename-qa.mjs');
    fs.symlinkSync(target, link);

    // A clearly non-SEO filename on stdin must be rejected. Silence and exit 0
    // is the bug: it means main() never ran.
    const result = spawnSync(process.execPath, [link, '--stdin'], {
      cwd: repoRoot,
      encoding: 'utf8',
      input: 'docs/IMG_1234.png\n',
    });

    assert.notEqual(
      result.status,
      0,
      'through a symlink the QA script accepted a non-SEO filename and exited 0 — ' +
        'main() did not run',
    );
    assert.match(`${result.stdout}${result.stderr}`, /IMG_1234/);
  });
});

test('neither script self-runs when imported as a module', () => {
  // The guard must still be a guard: importing these for their exports has to
  // stay side-effect free, or the tests that do so would start writing files.
  for (const script of ['image-seo-build-pack.mjs', 'image-seo-filename-qa.mjs']) {
    const result = spawnSync(
      process.execPath,
      ['-e', `import(${JSON.stringify(path.join(repoRoot, 'scripts', script))}).then(() => console.log('IMPORTED'))`],
      { cwd: repoRoot, encoding: 'utf8' },
    );
    assert.equal(result.status, 0, `${script}: ${result.stderr}`);
    assert.match(result.stdout, /IMPORTED/, `${script} did not import cleanly`);
  }
});

test('the parent fails when the builder exits 0 without producing a pack', () => {
  // Guards the other half: a green exit code from a child is not evidence the
  // child did anything.
  const parent = fs.readFileSync(
    path.join(repoRoot, 'scripts', 'image-automation-auto-wr.mjs'),
    'utf8',
  );
  assert.match(
    parent,
    /packError/,
    'image-automation-auto-wr.mjs must verify the builder produced a usable pack, ' +
      'not just that it exited 0',
  );
  assert.match(
    parent,
    /ok:\s*missing\.length === 0 && built\.status === 0 && packError === null|const ok = missing\.length === 0 && built\.status === 0 && packError === null/,
    'the reported ok must include the pack check',
  );
});
