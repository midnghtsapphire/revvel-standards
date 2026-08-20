'use strict';

/**
 * `issue:done` must mean what it says, on both sides (WR #17750).
 *
 * The label was written by one workflow and trusted by another, and neither
 * checked anything:
 *
 *   issue-lifecycle.yml   applied `issue:done` whenever a merged PR body
 *                         matched `Closes #N` — without confirming the issue
 *                         had actually closed.
 *   wr-pr-creation.yml    refused to open a WR PR for any issue carrying
 *                         `issue:done` — without confirming anything was
 *                         delivered.
 *
 * One spurious `Closes #N` therefore put an OPEN, undelivered issue into a
 * state the fleet could never act on again. Nothing could clear the label
 * either: issue-lifecycle.yml only removes it when a PR linking the issue is
 * opened, and the label is precisely what stopped such a PR being opened. The
 * issue was alive, unfinished and unreachable — self-sealing.
 *
 * Live instance: #17694, open, `closed_by_pull_requests` empty, DoD unmet.
 * Then #17750 itself was closed the same way while its fix PR was still open.
 *
 * The invariant is now `issue:done` ⟹ issue closed, established at both ends:
 * the producer only labels a closed issue, and the consumer decides on state
 * rather than on the marker.
 *
 * ## Why these assertions read the workflow source
 *
 * `tests/wr-pr-creation.test.js` re-implements the decision in a local
 * `shouldCreatePr`. That model asserted the buggy behaviour and was green for
 * the whole life of the defect — a re-implementation does not just drift from
 * the workflow, it can entrench the bug and present it as covered. So the
 * checks below read the shipped YAML, and one of them pins the model to it.
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const yaml = require('yaml');

const ROOT = path.join(__dirname, '..');
const WORKFLOWS = path.join(ROOT, '.github', 'workflows');

function scripts(file) {
  const doc = yaml.parse(fs.readFileSync(path.join(WORKFLOWS, file), 'utf8'));
  const out = [];
  for (const job of Object.values(doc?.jobs ?? {})) {
    for (const step of job?.steps ?? []) {
      if (typeof step?.with?.script === 'string') out.push(step.with.script);
    }
  }
  return out;
}

/** Source with `// comments` stripped, so prose about the defect is not evidence. */
function code(file) {
  return scripts(file)
    .join('\n')
    .split('\n')
    .map((line) => line.replace(/\/\/.*$/, ''))
    .join('\n');
}

test('the skip decision is made on issue state, never on the issue:done label', () => {
  const src = code('wr-pr-creation.yml');

  // Every early-return that refuses to create the PR.
  const guards = [...src.matchAll(/if \(([^\n]*?)\) \{[\s\S]{0,400}?skip\(/g)].map((m) => m[1]);
  assert.ok(guards.length > 0, 'expected at least one skip guard');

  for (const condition of guards) {
    assert.doesNotMatch(
      condition,
      /issue:done/,
      `a skip guard consults issue:done: ${condition.trim()}`,
    );
  }

  // #17795 moved the skip behind a flag so that an `issue:done` label can also
  // reach it — but only after GraphQL confirms a closing PR exists. That is a
  // stronger rule than the one this assertion was written against, and the
  // assertion has to describe the invariant rather than one line's shape:
  // whatever the routing, `state === 'closed'` must still end in a skip.
  const direct = /if \(issue\.state === 'closed'\)[\s\S]{0,300}?skip\(/.test(src);
  const viaFlag = (() => {
    const set = /if \(issue\.state === 'closed'\) \{\s*(\w+) = true;/.exec(src);
    if (!set) return false;
    return new RegExp(`if \\(${set[1]}\\)[\\s\\S]{0,300}?skip\\(`).test(src);
  })();
  assert.ok(direct || viaFlag, 'a closed issue must still be skipped');
});

test('a stale issue:done on an open issue is repaired, not obeyed', () => {
  const src = code('wr-pr-creation.yml');
  assert.match(
    src,
    /removeLabel\(\{[\s\S]{0,300}?name: 'issue:done'/,
    'the contradiction should be cleared so the issue heals instead of staying stuck',
  );
  // LABEL-RACE-001: the label already being absent is success; nothing else is.
  assert.match(
    src,
    /name: 'issue:done',[\s\S]{0,200}?\}\)\.catch\(\((\w+)\) => \{\s*if \(\1\.status !== 404\) throw \1;/,
  );
});

test('issue:done is only applied to an issue that actually closed', () => {
  const src = code('issue-lifecycle.yml');

  const add = /addLabels\(\{[^}]*labels: \['issue:done'\][^}]*\}\)/.exec(src);
  assert.ok(add, "the issue:done addLabels call must be present");

  // The 400 characters before the call must establish the issue is closed.
  const before = src.slice(Math.max(0, add.index - 400), add.index);
  assert.match(
    before,
    /state === 'closed'/,
    'issue:done must be guarded by a check that the issue closed, not applied unconditionally',
  );
});

test('the producer re-reads the issue rather than trusting the payload', () => {
  // The merge is what closes the issue, so the state must be read after it.
  const src = code('issue-lifecycle.yml');
  assert.match(
    src,
    /issues\.get\(\{[^}]*\}\);\s*\n\s*if \(\w+\.state === 'closed'\)/,
  );
});

test("the re-implemented model in wr-pr-creation.test.js matches the workflow", () => {
  // The model asserted the buggy behaviour and was green throughout. Pin it, so
  // a future change to one side fails instead of quietly disagreeing with the
  // other.
  //
  // This originally read "the model must never mention issue:done", because at
  // the time the workflow never looked at the label at all. #17795 changed the
  // rule from "ignore the label" to "the label may TRIGGER a check, never
  // answer it" — an open issue labelled issue:done is skipped only when GraphQL
  // confirms a closing PR. Banning the string would now fail a model that
  // correctly mirrors the workflow, so the assertion pins the invariant that
  // actually matters: nothing returns on the label alone.
  const model = fs.readFileSync(path.join(__dirname, 'wr-pr-creation.test.js'), 'utf8');
  const fn = /function shouldCreatePr\([\s\S]*?\n\}/.exec(model);
  assert.ok(fn, 'shouldCreatePr must be present');

  const body = fn[0]
    .split('\n')
    .map((line) => line.replace(/\/\/.*$/, ''))
    .join('\n');

  assert.match(body, /issue\.state === 'closed'/, 'the model must skip closed issues');

  // Every branch the label opens must reach its decision THROUGH a closure
  // check. Nesting matters, so this is about order, not mere presence: the
  // check has to come between the label test and the decision it gates.
  const lines = body.split('\n');
  lines.forEach((line, i) => {
    if (!/issue:done/.test(line)) return;
    const window = lines.slice(i + 1, i + 8);
    const decision = window.findIndex((l) => /(return false;|\w+ = true;)/.test(l));
    if (decision === -1) return; // the label opens no decision here
    const verified = window
      .slice(0, decision)
      .some((l) => /closedBy|closed_by|state === 'closed'|closedAt/.test(l));
    assert.ok(
      verified,
      'the model decides on the issue:done label alone — the workflow verifies ' +
        'closure first, so one of them is wrong:\n' + window.slice(0, decision + 1).join('\n'),
    );
  });
});
