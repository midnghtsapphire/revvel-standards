'use strict';

const { findNewlyCheckedFollowUps, parseFollowUpTasks } = require('../scripts/checkbox-diff');

function assertEqual(actual, expected, msg) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) {
    throw new Error(`${msg}\n  expected: ${e}\n  actual:   ${a}`);
  }
}

const tests = [];
function test(name, fn) { tests.push({ name, fn }); }

test('single follow-up checked', () => {
  const oldBody = '- [ ] Follow-up: refactor the auth module';
  const newBody = '- [x] Follow-up: refactor the auth module';
  const r = findNewlyCheckedFollowUps(oldBody, newBody);
  assertEqual(r.map(x => x.description), ['refactor the auth module'], 'single check');
});

test('multiple follow-ups checked in one edit', () => {
  const oldBody = '- [ ] Follow-up: a\n- [ ] Follow-up: b\n- [ ] Follow-up: c';
  const newBody = '- [x] Follow-up: a\n- [x] Follow-up: b\n- [ ] Follow-up: c';
  const r = findNewlyCheckedFollowUps(oldBody, newBody);
  assertEqual(r.map(x => x.description), ['a', 'b'], 'multi check');
});

test('unrelated (non-follow-up) checkbox checked is ignored', () => {
  const oldBody = '- [ ] Not a follow-up\n- [ ] Follow-up: keep me';
  const newBody = '- [x] Not a follow-up\n- [ ] Follow-up: keep me';
  const r = findNewlyCheckedFollowUps(oldBody, newBody);
  assertEqual(r, [], 'non-followup ignored');
});

test('already-checked item is not re-reported', () => {
  const oldBody = '- [x] Follow-up: already done';
  const newBody = '- [x] Follow-up: already done';
  const r = findNewlyCheckedFollowUps(oldBody, newBody);
  assertEqual(r, [], 'already checked');
});

test('null oldBody returns empty (no prior state)', () => {
  const r = findNewlyCheckedFollowUps(null, '- [x] Follow-up: new');
  assertEqual(r, [], 'null old');
});

test('null newBody returns empty', () => {
  const r = findNewlyCheckedFollowUps('- [ ] Follow-up: x', null);
  assertEqual(r, [], 'null new');
});

test('undefined bodies return empty', () => {
  const r = findNewlyCheckedFollowUps(undefined, undefined);
  assertEqual(r, [], 'undefined');
});

test('reordered lines still detected by content', () => {
  const oldBody = '- [ ] Follow-up: alpha\n- [ ] Follow-up: beta';
  const newBody = '- [x] Follow-up: beta\n- [ ] Follow-up: alpha';
  const r = findNewlyCheckedFollowUps(oldBody, newBody);
  assertEqual(r.map(x => x.description), ['beta'], 'reorder');
});

test('prefix casing variants: FOLLOW-UP, follow up, Followup', () => {
  const oldBody = '- [ ] FOLLOW-UP: one\n- [ ] follow up: two\n- [ ] Followup: three';
  const newBody = '- [x] FOLLOW-UP: one\n- [x] follow up: two\n- [x] Followup: three';
  const r = findNewlyCheckedFollowUps(oldBody, newBody);
  assertEqual(r.length, 3, 'casing variants');
});

test('whitespace tolerance in prefix', () => {
  const oldBody = '- [ ] Follow-up:   spaced out description';
  const newBody = '- [x] Follow-up: spaced out description';
  const r = findNewlyCheckedFollowUps(oldBody, newBody);
  assertEqual(r.map(x => x.description), ['spaced out description'], 'whitespace');
});

test('added-and-checked in same edit is NOT reported', () => {
  const oldBody = 'no follow-ups here';
  const newBody = '- [x] Follow-up: brand new';
  const r = findNewlyCheckedFollowUps(oldBody, newBody);
  assertEqual(r, [], 'added+checked skipped');
});

test('empty description follow-up (no description)', () => {
  const oldBody = '- [ ] Follow-up: ';
  const newBody = '- [x] Follow-up: ';
  const r = findNewlyCheckedFollowUps(oldBody, newBody);
  assertEqual(r.map(x => x.description), [''], 'empty desc');
});

test('capital X check mark', () => {
  const oldBody = '- [ ] Follow-up: cap x';
  const newBody = '- [X] Follow-up: cap x';
  const r = findNewlyCheckedFollowUps(oldBody, newBody);
  assertEqual(r.map(x => x.description), ['cap x'], 'cap X');
});

test('asterisk bullet is accepted', () => {
  const oldBody = '* [ ] Follow-up: star';
  const newBody = '* [x] Follow-up: star';
  const r = findNewlyCheckedFollowUps(oldBody, newBody);
  assertEqual(r.map(x => x.description), ['star'], 'asterisk');
});

test('parseFollowUpTasks basic', () => {
  const tasks = parseFollowUpTasks('- [ ] Follow-up: hello\n- [x] Follow-up: world');
  assertEqual(tasks.length, 2, 'parse count');
  assertEqual(tasks[0].checked, false, 'parse c0');
  assertEqual(tasks[1].checked, true, 'parse c1');
});

test('non-followup task lines ignored by parser', () => {
  const tasks = parseFollowUpTasks('- [ ] regular todo\n- [x] another one\n- [ ] Follow-up: only me');
  assertEqual(tasks.length, 1, 'parse only followups');
  assertEqual(tasks[0].description, 'only me', 'parse desc');
});

let failed = 0;
for (const { name, fn } of tests) {
  try {
    fn();
    console.log(`ok  - ${name}`);
  } catch (err) {
    failed++;
    console.error(`FAIL - ${name}`);
    console.error(err.message);
  }
}
if (failed > 0) {
  console.error(`\n${failed} test(s) failed`);
  process.exit(1);
} else {
  console.log(`\nAll ${tests.length} tests passed`);
}
