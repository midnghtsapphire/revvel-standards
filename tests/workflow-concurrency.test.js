#!/usr/bin/env node
'use strict';

// Guard for the rule that every PR-triggered workflow must declare a
// top-level `concurrency:` group.
//
// The symptom, measured on this repo: 73 workflows fire on a single
// pull_request event, and 35 of them had no concurrency group. Without one,
// pushing a fix does not stop the previous run -- the superseded run keeps
// executing and billing while the new one starts beside it. A PR that takes
// ten pushes to go green therefore spawns ~730 runs, roughly 350 of which are
// doing nothing but burning Actions minutes on commits that no longer exist.
//
// Two assertions, both load-bearing:
//
//   1. A PR-triggered workflow has a top-level `concurrency:` block. This is
//      what stops the pile-up.
//   2. A *cancelling* group (`cancel-in-progress: true`) interpolates
//      something per-PR or per-ref. A literal group plus cancellation means
//      pushing to PR B cancels PR A's in-flight run -- the two PRs share one
//      lane and evict each other. That is a correctness bug, not just a
//      throughput one.
//
// A literal group with `cancel-in-progress: false` is NOT flagged: that is a
// deliberate repo-global mutex, and some workflows need one. auditor-
// controller.yml upserts a single tracking issue, so two concurrent runs
// would both create it; serializing every run behind one lane is the point.
//
// `cancel-in-progress` itself is deliberately not asserted either way.
// Read-only checks want `true`; workflows that mutate state (labels, issues,
// branches, audit logs) want `false` so a second event queues rather than
// cancelling a half-applied mutation. Both are correct, for different
// workflows.
//
// Per RVS-VERIFY-001 (standards/VERIFY_THE_POSTCONDITION.md): this guard has
// a producer (the concurrency blocks in .github/workflows) and a consumer
// (`npm test` running this file). It names the offending files rather than
// reporting a count nobody reads.

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const REPO_ROOT = path.resolve(__dirname, '..');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`PASS: ${name}`);
    passed++;
  } catch (error) {
    console.log(`FAIL: ${name}\n    ${error.stack || error.message}`);
    failed++;
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message || 'assertion failed');
}

// Read from git rather than walking the directory, so untracked scratch
// workflows and local experiments do not fail the build.
function trackedWorkflows() {
  const out = execSync('git ls-files -- ".github/workflows/*.yml" ".github/workflows/*.yaml"', {
    encoding: 'utf8',
    cwd: REPO_ROOT,
    maxBuffer: 8 * 1024 * 1024
  });
  return out
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

// A workflow counts as PR-triggered if `pull_request` or
// `pull_request_target` appears as a trigger key.
function isPullRequestTriggered(contents) {
  return /^\s*pull_request(_target)?\s*:?\s*$/m.test(contents);
}

// Extract the top-level concurrency block: from a column-0 `concurrency:` to
// the next column-0 key.
function concurrencyBlock(contents) {
  const match = contents.match(/^concurrency:\n((?:[ \t#].*\n|\n)*)/m);
  return match ? match[0] : null;
}

const workflows = trackedWorkflows();
const prWorkflows = workflows.filter((file) =>
  isPullRequestTriggered(fs.readFileSync(path.join(REPO_ROOT, file), 'utf8'))
);

// --- 0. the inventory itself is a control ---------------------------------
// If this reads zero, the two assertions below are vacuously true and the
// guard is decoration. Fail loudly instead.

test('the workflow inventory is non-empty', () => {
  assert(
    workflows.length > 0,
    'git ls-files returned no workflows -- has .github/workflows moved, or is this not a git checkout?'
  );
  assert(
    prWorkflows.length > 0,
    `${workflows.length} workflows found but none parsed as pull_request-triggered -- the trigger regex is probably stale.`
  );
});

// --- 1. every PR-triggered workflow declares a concurrency group ----------

test('every pull_request-triggered workflow declares a top-level concurrency group', () => {
  const offenders = [];
  for (const file of prWorkflows) {
    const contents = fs.readFileSync(path.join(REPO_ROOT, file), 'utf8');
    if (!/^concurrency:/m.test(contents)) offenders.push(file);
  }

  assert(
    offenders.length === 0,
    `${offenders.length} of ${prWorkflows.length} pull_request workflows have no concurrency group.\n` +
      'Without one, pushing a new commit does not stop the previous run -- it keeps\n' +
      'billing Actions minutes against a commit that no longer exists.\n' +
      'Add a top-level block (cancel-in-progress: false if the workflow mutates state):\n' +
      '  concurrency:\n' +
      '    group: <workflow-name>-${{ github.event.pull_request.number || github.ref }}\n' +
      '    cancel-in-progress: true\n' +
      'Offending files:\n  ' + offenders.join('\n  ')
  );
});

// --- 2. the group is scoped, not repo-global ------------------------------

test('no cancelling concurrency group is shared across PRs', () => {
  const offenders = [];
  for (const file of prWorkflows) {
    const contents = fs.readFileSync(path.join(REPO_ROOT, file), 'utf8');
    const block = concurrencyBlock(contents);
    if (!block) continue; // covered by assertion 1

    const group = block.match(/^\s+group:\s*(.+)$/m);
    if (!group) {
      offenders.push(`${file} (concurrency block has no group:)`);
      continue;
    }

    // A literal group is only a defect when the group also cancels. Without
    // cancellation it is an intentional global mutex (see header).
    const cancels = /^\s+cancel-in-progress:\s*true\s*$/m.test(block);
    if (cancels && !group[1].includes('${{')) {
      offenders.push(`${file} (literal group "${group[1].trim()}" + cancel-in-progress: true)`);
    }
  }

  assert(
    offenders.length === 0,
    'A cancelling concurrency group with a fixed name is shared by every PR, so\n' +
      "pushing to one PR cancels another PR's in-flight run.\n" +
      'Either scope the group:\n' +
      '  group: <workflow-name>-${{ github.event.pull_request.number || github.ref }}\n' +
      'or, if a repo-global mutex is intended, set cancel-in-progress: false.\n' +
      'Offending files:\n  ' + offenders.join('\n  ')
  );
});

console.log('');
console.log(`${prWorkflows.length} pull_request workflows checked (of ${workflows.length} total)`);
console.log(`${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
