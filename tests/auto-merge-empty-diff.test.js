'use strict';

/**
 * Auto-merge must refuse a PR that delivers nothing (WR #17756).
 *
 * PR #17058 — `[WIP] Build a production-grade orchestration engine` — merged on
 * 2026-08-10 with **zero changed files**, its title still `[WIP]`, all eight
 * checklist boxes unchecked, and `Fixes #16438` in the body. None of its stated
 * deliverables exist on `main`.
 *
 * Nothing asked whether the diff contained anything. That inverts the incentive
 * the gates are supposed to create: an empty diff is the easiest thing in the
 * repository to get green — no code to fail a test, no file to fail a lint, no
 * line to fail a scan — so every quality gate passed unanimously on a PR that
 * did nothing. "Checks passing" was being read as evidence of delivery when it
 * is compatible with total non-delivery.
 *
 * `[WIP]` was invisible for a separate reason: the gates read `pr.draft`, and
 * the PR was marked ready-for-review while still carrying the marker in its
 * title.
 *
 * ## What these tests check
 *
 * The guard is duplicated across six arming sites — five copies of
 * `enableAutoMerge` in `pr-state-orchestrator.yml`, one inline in
 * `auto-merge.yml`. Duplication is what the workflow format forces, so the
 * repo-wide test below is the important one: **every** `enablePullRequestAutoMerge`
 * mutation must be guarded, so a seventh site cannot be added without one.
 *
 * The behavioural tests extract the real guard from the shipped YAML and run it
 * against stub PRs, rather than re-implementing the decision — a re-implemented
 * model in `wr-pr-creation.test.js` asserted its own workflow's bug and stayed
 * green for the whole life of that defect (#17750).
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const yaml = require('yaml');

const ROOT = path.join(__dirname, '..');
const WORKFLOWS = path.join(ROOT, '.github', 'workflows');

function scriptsIn(file) {
  const doc = yaml.parse(fs.readFileSync(path.join(WORKFLOWS, file), 'utf8'));
  const out = [];
  for (const job of Object.values(doc?.jobs ?? {})) {
    for (const step of job?.steps ?? []) {
      if (typeof step?.with?.script === 'string') out.push(step.with.script);
    }
  }
  return out;
}

/**
 * Pull the shipped guard out of auto-merge.yml and make it callable.
 * `pulls.get` and `core` are stubbed; every condition is the real code.
 */
function loadGuard() {
  const src = scriptsIn('auto-merge.yml').join('\n');
  // YAML strips the block-scalar indentation, so anchor on the dedented text.
  const start = src.indexOf('try {\n  const { data: fresh } = await github.rest.pulls.get(');
  assert.notEqual(start, -1, 'the diff guard must be present in auto-merge.yml');
  const end = src.indexOf('\n}', src.indexOf('could not verify the diff')) + 2;
  const body = src.slice(start, end);

  assert.match(body, /changed_files === 0/, 'extracted the wrong block');

  // eslint-disable-next-line no-new-func
  const fn = new Function(
    'github',
    'core',
    'pr',
    'context',
    `return (async () => {\n${body}\n  return 'ARMED';\n})();`,
  );

  // `context` must be stubbed too. The guard fails closed, so a missing stub
  // makes every case refuse — including the ones that should arm — and the
  // suite would look like it was passing for the wrong reason.
  const context = { repo: { owner: 'o', repo: 'r' } };

  return async (prData, { throws = false } = {}) => {
    const warnings = [];
    const github = {
      rest: {
        pulls: {
          get: async () => {
            if (throws) throw new Error('boom');
            return { data: prData };
          },
        },
      },
    };
    const core = { warning: (m) => warnings.push(m) };
    const result = await fn(github, core, { number: prData.number ?? 1 }, context);
    return { armed: result === 'ARMED', warnings };
  };
}

const guard = loadGuard();

test('a PR with an empty diff is refused — the #17058 shape', async () => {
  const { armed, warnings } = await guard({
    number: 17058,
    changed_files: 0,
    title: '[WIP] Build a production-grade orchestration engine',
  });
  assert.equal(armed, false);
  assert.match(warnings.join('\n'), /diff is empty/);
});

test('a WIP title is refused even though draft is false', async () => {
  for (const title of [
    '[WIP] add the thing',
    'WIP: add the thing',
    'wip : add the thing',
    'feat: add the thing DO NOT MERGE',
  ]) {
    const { armed } = await guard({ number: 1, changed_files: 12, title });
    assert.equal(armed, false, `should refuse: ${title}`);
  }
});

test('an ordinary PR with real changes is still armed', async () => {
  const { armed, warnings } = await guard({
    number: 2,
    changed_files: 3,
    title: 'fix(ci): repair the thing',
  });
  assert.equal(armed, true);
  assert.deepEqual(warnings, []);
});

test('a title that merely contains the letters w-i-p is not refused', async () => {
  // `swipe`, `wipe`, `Wipro` — the marker is a word, not a substring.
  for (const title of ['fix: wipe the cache on rotate', 'feat: swipe gestures']) {
    const { armed } = await guard({ number: 3, changed_files: 1, title });
    assert.equal(armed, true, `should arm: ${title}`);
  }
});

test('an unreadable changed_files is refused, not waved through', async () => {
  // Some webhook payloads omit it. `undefined === 0` is false, so a guard
  // written the obvious way would arm on exactly the case it exists to stop.
  const { armed, warnings } = await guard({ number: 4, title: 'fix: thing' });
  assert.equal(armed, false);
  assert.match(warnings.join('\n'), /could not read changed_files/);
});

test('a failure to fetch the PR is refused — the guard fails closed', async () => {
  const { armed, warnings } = await guard(
    { number: 5, changed_files: 9, title: 'fix: thing' },
    { throws: true },
  );
  assert.equal(armed, false, 'an unverified PR must not be an eligible PR');
  assert.match(warnings.join('\n'), /could not verify the diff/);
});

test('every auto-merge arming site in the repo is guarded', () => {
  // The point of this file. Six sites today; a seventh must not slip in
  // unguarded, and a count would let one be swapped for another.
  //
  // Each site is bounded by the PREVIOUS arming site in the same file. A naive
  // "is there a guard anywhere before this?" passes when one of five guards in
  // a file is deleted, because an earlier function's guard still precedes the
  // later mutation — mutation-tested, and it escaped exactly that way.
  const MARKER = 'the diff is empty (0 changed files)';
  const unguarded = [];
  let siteCount = 0;

  for (const file of fs.readdirSync(WORKFLOWS).filter((f) => /\.ya?ml$/.test(f))) {
    const raw = fs.readFileSync(path.join(WORKFLOWS, file), 'utf8');
    const sites = [...raw.matchAll(/enablePullRequestAutoMerge/g)].map((m) => m.index);
    siteCount += sites.length;

    sites.forEach((index, i) => {
      const from = i === 0 ? 0 : sites[i - 1];
      if (!raw.slice(from, index).includes(MARKER)) {
        unguarded.push(`${file}:${raw.slice(0, index).split('\n').length}`);
      }
    });
  }

  assert.ok(siteCount > 0, 'expected at least one arming site');
  assert.deepEqual(
    unguarded,
    [],
    `auto-merge is armed without checking the diff at: ${unguarded.join(', ')}`,
  );
});
