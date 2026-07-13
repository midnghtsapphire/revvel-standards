'use strict';

const { findNewlyCheckedFollowUps } = require('../scripts/checkbox-diff');

function assertEqual(actual, expected, msg) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) {
    throw new Error(`${msg}\n  expected: ${e}\n  actual:   ${a}`);
  }
}

const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

test('single item checked', () => {
  const oldBody = '- [ ] Follow-up: do the thing';
  const newBody = '- [x] Follow-up: do the thing';
  const r = findNewlyCheckedFollowUps(oldBody, newBody);
  assertEqual(r.length, 1, 'one item');
  assertEqual(r[0].description, 'do the thing', 'description');
});

test('multiple items checked in one edit', () => {
  const oldBody = '- [ ] Follow-up: A\n- [ ] Follow-up: B\n- [ ] Follow-up: C';
  const newBody = '- [x] Follow-up: A\n- [x] Follow-up: B\n- [ ] Follow-up: C';
  const r = findNewlyCheckedFollowUps(oldBody, newBody);
  assertEqual(r.length, 2, 'two items');
  assertEqual(r.map((x) => x.description), ['A', 'B'], 'descriptions');
});

test('unrelated (non-follow-up) checkbox checked is ignored', () => {
  const oldBody = '- [ ] some random task';
  const newBody = '- [x] some random task';
  const r = findNewlyCheckedFollowUps(oldBody, newBody);
  assertEqual(r.length, 0, 'ignored');
});

test('already-checked item not re-reported', () => {
  const oldBody = '- [x] Follow-up: already done';
  const newBody = '- [x] Follow-up: already done';
  const r = findNewlyCheckedFollowUps(oldBody, newBody);
  assertEqual(r.length, 0, 'no transition');
});

test('null oldBody (new item added and checked in same edit) does not fire', () => {
  const oldBody = null;
  const newBody = '- [x] Follow-up: brand new';
  const r = findNewlyCheckedFollowUps(oldBody, newBody);
  assertEqual(r.length, 0, 'no prior state');
});

test('null newBody', () => {
  const r = findNewlyCheckedFollowUps('- [ ] Follow-up: foo', null);
  assertEqual(r.length, 0, 'no new body');
});

test('undefined bodies', () => {
  const r = findNewlyCheckedFollowUps(undefined, undefined);
  assertEqual(r.length, 0, 'no bodies');
});

test('reordered lines still detected', () => {
  const oldBody = '- [ ] Follow-up: alpha\n- [ ] Follow-up: beta';
  const newBody = '- [x] Follow-up: beta\n- [ ] Follow-up: alpha';
  const r = findNewlyCheckedFollowUps(oldBody, newBody);
  assertEqual(r.length, 1, 'one transition');
  assertEqual(r[0].description, 'beta', 'beta');
});

test('case-insensitive prefix (FOLLOW-UP)', () => {
  const oldBody = '- [ ] FOLLOW-UP: shout';
  const newBody = '- [x] FOLLOW-UP: shout';
  const r = findNewlyCheckedFollowUps(oldBody, newBody);
  assertEqual(r.length, 1, 'one item');
});

test('prefix with extra spaces', () => {
  const oldBody = '- [ ] Follow-up:   spaced';
  const newBody = '- [x] Follow-up:   spaced';
  const r = findNewlyCheckedFollowUps(oldBody, newBody);
  assertEqual(r.length, 1, 'one item');
});

test('prefix "Followup" (no hyphen) tolerated', () => {
  const oldBody = '- [ ] Followup: no hyphen';
  const newBody = '- [x] Followup: no hyphen';
  const r = findNewlyCheckedFollowUps(oldBody, newBody);
  assertEqual(r.length, 1, 'one item');
});

test('empty description ignored', () => {
  const oldBody = '- [ ] Follow-up:';
  const newBody = '- [x] Follow-up:';
  const r = findNewlyCheckedFollowUps(oldBody, newBody);
  assertEqual(r.length, 0, 'empty ignored');
});

test('capital X for checked', () => {
  const oldBody = '- [ ] Follow-up: cap X';
  const newBody = '- [X] Follow-up: cap X';
  const r = findNewlyCheckedFollowUps(oldBody, newBody);
  assertEqual(r.length, 1, 'one item');
});

test('star bullet marker', () => {
  const oldBody = '* [ ] Follow-up: star';
  const newBody = '* [x] Follow-up: star';
  const r = findNewlyCheckedFollowUps(oldBody, newBody);
  assertEqual(r.length, 1, 'one item');
});

test('mixed follow-up and regular content, only follow-ups reported', () => {
  const oldBody = 'Preamble text\n- [ ] Follow-up: real\n- [ ] other task\nMore text';
  const newBody = 'Preamble text\n- [x] Follow-up: real\n- [x] other task\nMore text';
  const r = findNewlyCheckedFollowUps(oldBody, newBody);
  assertEqual(r.length, 1, 'only follow-up');
  assertEqual(r[0].description, 'real', 'real');
});

test('unchecking a follow-up does not fire', () => {
  const oldBody = '- [x] Follow-up: revert me';
  const newBody = '- [ ] Follow-up: revert me';
  const r = findNewlyCheckedFollowUps(oldBody, newBody);
  assertEqual(r.length, 0, 'no fire');
});

let failed = 0;
for (const { name, fn } of tests) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (e) {
    failed += 1;
    console.error(`not ok - ${name}: ${e.message}`);
  }
}

if (failed > 0) {
  console.error(`\n${failed} test(s) failed`);
  process.exit(1);
} else {
  console.log(`\n${tests.length} test(s) passed`);
}
