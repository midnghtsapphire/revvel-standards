'use strict';

/**
 * Regression tests for the workflow-lint gate.
 *
 * Originally WR-15860 (rethab/actions-lint@v1.0.0). Retargeted by WR #17734,
 * which replaced that linter with actionlint after it failed on EVERY run on
 * main for days while configured as a required check — on false positives, not
 * defects (it could not parse `${{ secrets.A || secrets.B }}`, treated
 * `secrets.*` outside workflow_call as undeclared, and could not resolve
 * choice-typed inputs). Keeping it green had required excluding 150 of 227
 * workflow files from linting altogether.
 *
 * The guards below are the same guards as before, re-expressed against the new
 * implementation — plus ratchet guards that did not previously exist:
 *   - the workflow exists, parses, and wires the linter
 *   - the linter is pinned AND checksum-verified (supply chain)
 *   - triggers cover pull_request (unfiltered) + push to main
 *   - timeouts + permissions + a stable gate job name are present
 *   - the exclude list names real workflows and never the gate itself
 *   - the exclude list is a RATCHET: it may only shrink
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const yaml = require('yaml');

const ROOT = path.join(__dirname, '..');
const WORKFLOW = path.join(ROOT, '.github', 'workflows', 'actions-lint.yml');
const EXCLUDE = path.join(ROOT, '.github', 'actions-lint-exclude.txt');
const WORKFLOWS_DIR = path.join(ROOT, '.github', 'workflows');

// The ratchet, pinned BY NAME. A bare count is not a ratchet: swap any entry
// for a different workflow and a length check of 12 still reads 12, so the
// gate silently stops linting something it used to lint. Names make a swap
// impossible to express without editing this list, which is the point.
//
// Removing a name here is the ONLY allowed direction — it means you fixed that
// workflow. Adding one means you excluded a workflow instead of fixing it,
// which is what left this gate red and two-thirds blind in the first place.
// Fixing them is tracked in #17742.
const RATCHET = Object.freeze([
  // Empty, and it must stay that way (#17742). actionlint 1.7.7 reports zero
  // findings across all 227 workflows with no exclusions. Adding a name here is
  // not a fix — fix the workflow. The twelve that were listed are documented in
  // .github/actions-lint-exclude.txt with what each one actually turned out to
  // be; none was a style nit, every one was dead or broken code.
]);

function readWorkflow() {
  assert.ok(fs.existsSync(WORKFLOW), 'actions-lint.yml must exist');
  const raw = fs.readFileSync(WORKFLOW, 'utf8');
  const doc = yaml.parse(raw);
  return { raw, doc };
}

function readExcludeBasenames() {
  assert.ok(fs.existsSync(EXCLUDE), 'actions-lint-exclude.txt must exist');
  const names = [];
  for (const line of fs.readFileSync(EXCLUDE, 'utf8').split(/\r?\n/)) {
    const trimmed = line.replace(/#.*$/, '').trim();
    if (trimmed) names.push(trimmed);
  }
  return names;
}

test('actions-lint workflow parses with name + on triggers', () => {
  const { doc } = readWorkflow();
  assert.equal(doc.name, 'Actions Lint');
  // yaml may parse bare `on` as boolean key `true`
  const on = doc.on || doc.true;
  assert.ok(on, 'missing on: trigger');
  assert.ok('pull_request' in on, 'must run on pull_request');
  assert.ok(on.push, 'must run on push');
  const pushBranches = on.push.branches || [];
  assert.ok(
    pushBranches.includes('main'),
    `push.branches must include main, got ${JSON.stringify(pushBranches)}`,
  );
  assert.ok(on.workflow_dispatch !== undefined, 'must allow workflow_dispatch');
});

test('actions-lint workflow declares contents: read and job timeouts', () => {
  const { doc, raw } = readWorkflow();
  assert.equal(doc.permissions?.contents, 'read');
  assert.match(raw, /timeout-minutes:\s*\d+/);
  const jobs = doc.jobs || {};
  for (const [id, job] of Object.entries(jobs)) {
    assert.ok(
      typeof job['timeout-minutes'] === 'number',
      `job ${id} missing timeout-minutes`,
    );
  }
});

test('linter is pinned to an explicit actionlint version', () => {
  const { doc, raw } = readWorkflow();
  const version = doc.env?.ACTIONLINT_VERSION;
  assert.ok(version, 'ACTIONLINT_VERSION must be declared');
  assert.match(
    String(version),
    /^\d+\.\d+\.\d+$/,
    'actionlint must be pinned to an exact version, never a floating ref',
  );
  assert.match(
    raw,
    new RegExp(`actionlint/releases/download/v\\$\\{ACTIONLINT_VERSION\\}`),
    'the download URL must use the pinned version',
  );
});

test('actionlint download is checksum-verified before it is executed', () => {
  const { doc, raw } = readWorkflow();
  const sha = doc.env?.ACTIONLINT_SHA256;
  assert.ok(sha, 'ACTIONLINT_SHA256 must be declared');
  assert.match(String(sha), /^[0-9a-f]{64}$/, 'must be a full SHA-256 hex digest');
  // The binary is fetched at runtime rather than pinned by action SHA, so the
  // checksum IS the supply-chain control (CLAUDE.md gotcha #8). Without this
  // the gate would execute whatever the release URL happened to serve.
  assert.match(raw, /sha256sum -c -/, 'download must be verified with sha256sum -c');
  const verifyIdx = raw.indexOf('sha256sum -c -');
  const execIdx = raw.indexOf('./actionlint --version');
  assert.ok(
    verifyIdx > -1 && execIdx > verifyIdx,
    'checksum must be verified BEFORE the binary is executed',
  );
});

test('actions-lint has a stable gate job name for branch protection', () => {
  const { doc } = readWorkflow();
  assert.ok(
    doc.jobs && doc.jobs['actions-lint'],
    'stable gate job `actions-lint` required — branch protection pins this name',
  );
  assert.equal(doc.jobs['actions-lint'].name, 'actions-lint');
});

test('gate fails loudly rather than passing on an empty lint set', () => {
  const { raw } = readWorkflow();
  // Previously an empty matrix was a soft pass. That turned "everything is
  // excluded" into a green required check — exactly the failure mode the
  // ratchet exists to prevent.
  assert.match(raw, /No workflow files left to lint/);
  assert.match(raw, /set -euo pipefail/, 'lint step must not swallow failures');
});

test('the quoted array is an ARGUMENT to actionlint (gotcha #5 / SC2128)', () => {
  const { raw } = readWorkflow();

  // Merely finding `"${files[@]}"` somewhere in the file proves nothing — it
  // could sit in a comment, or in an echo, while the real invocation passes
  // the unquoted `${files[@]}` and lints only the first path.
  // `./actionlint --version` also appears, as the post-download smoke check.
  // Excluding it matters: it is the FIRST match in the file, so a naive
  // `.find()` asserts against the probe and passes while the real invocation
  // is unquoted.
  const invocations = raw
    .split('\n')
    .filter((line) => /^\s*\.\/actionlint\b/.test(line))
    .filter((line) => !/--version/.test(line));

  assert.equal(
    invocations.length,
    1,
    `expected exactly one lint invocation, found ${invocations.length}`,
  );
  const invocation = invocations[0];
  assert.match(
    invocation,
    /"\$\{files\[@\]\}"/,
    `actionlint is invoked as \`${(invocation || '').trim()}\` — the file list `
      + 'must be passed as "${files[@]}". Unquoted, word-splitting reduces the '
      + 'whole array to its first element and the gate lints one file.',
  );
});

test('exclude list only names existing workflow basenames and skips self', () => {
  const excluded = readExcludeBasenames();
  assert.ok(
    !excluded.includes('actions-lint.yml'),
    'actions-lint.yml must never be excluded from itself',
  );

  const existing = new Set(
    fs.readdirSync(WORKFLOWS_DIR).filter((f) => /\.ya?ml$/.test(f)),
  );

  const missing = excluded.filter((name) => !existing.has(name));
  assert.deepEqual(
    missing,
    [],
    `exclude list references missing workflows: ${missing.join(', ')}`,
  );

  assert.equal(new Set(excluded).size, excluded.length, 'exclude list has duplicates');
});

test('the exclude list is a ratchet — it may only shrink, and only by name', () => {
  const excluded = readExcludeBasenames();

  // Anything not on the pinned list is a workflow that used to be linted and
  // now is not. A count check cannot see this: swapping one name for another
  // keeps the length identical while coverage quietly drops.
  const added = excluded.filter((name) => !RATCHET.includes(name));
  assert.deepEqual(
    added,
    [],
    `these workflows were newly excluded: ${added.join(', ')}. `
      + 'Fix the workflow rather than excluding it. If it genuinely cannot be '
      + 'fixed now, add the name to RATCHET in this file in the same commit and '
      + 'say why in the PR body — that makes the coverage loss reviewable.',
  );

  // Belt and braces: names alone would still permit duplicates padding the file.
  assert.ok(
    excluded.length <= RATCHET.length,
    `exclude list grew to ${excluded.length} (ratchet holds ${RATCHET.length})`,
  );
});

test('fixing a workflow means deleting its name from the ratchet too', () => {
  // The ratchet is allowed to shrink, but the two lists must not drift: a name
  // left in RATCHET after the exclusion is gone is dead weight that would
  // silently re-authorise excluding that file later.
  const excluded = readExcludeBasenames();
  const stale = RATCHET.filter((name) => !excluded.includes(name));
  assert.deepEqual(
    stale,
    [],
    `RATCHET still lists ${stale.join(', ')}, which is no longer excluded. `
      + 'Delete the name here now that the workflow is fixed.',
  );
});

test('the vast majority of workflows are actually linted', () => {
  const excluded = new Set(readExcludeBasenames());
  const all = fs.readdirSync(WORKFLOWS_DIR).filter((f) => /\.ya?ml$/.test(f));
  const linted = all.filter((f) => !excluded.has(f));

  assert.ok(linted.includes('actions-lint.yml'), 'the gate must lint itself');
  // Under the old linter only ~77 of 227 files were checked. Coverage is the
  // thing that regressed silently before, so assert on it directly.
  assert.ok(
    linted.length / all.length >= 0.9,
    `only ${linted.length}/${all.length} workflows are linted — coverage must stay above 90%`,
  );
});

test('pull_request trigger has no paths filter (required-check deadlock)', () => {
  const { doc } = readWorkflow();
  const on = doc.on || doc.true;
  assert.ok('pull_request' in on, 'pull_request trigger required');
  const pr = on.pull_request;
  // A paths filter on a required-check trigger means the check never reports
  // on PRs that don't touch workflows, blocking their merges forever.
  assert.ok(
    pr === null || pr === undefined || !('paths' in pr),
    'pull_request must not be path-filtered — the gate is a required check',
  );
});

test('push trigger path filter covers workflow changes on main', () => {
  const { doc } = readWorkflow();
  const on = doc.on || doc.true;
  const pushPaths = (on.push && on.push.paths) || [];
  assert.ok(
    pushPaths.some((p) => p.includes('.github/workflows')),
    'push paths must include .github/workflows/**',
  );
});
