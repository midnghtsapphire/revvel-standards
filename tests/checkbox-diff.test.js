'use strict';

const { findNewlyCheckedFollowUps } = require('../scripts/checkbox-diff');

function assertEq(actual, expected, name) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) {
    throw new Error(`FAIL: ${name}\n  expected: ${e}\n  actual:   ${a}`);
  }
}

const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

test('single follow-up newly checked', () => {
  const oldBody = '- [ ] Follow-up: refactor helper';
  const newBody = '- [x] Follow-up: refactor helper';
  assertEq(
    findNewlyCheckedFollowUps(oldBody, newBody),
    [{ description: 'refactor helper' }],
    'single newly checked'
  );
});

test('multiple follow-ups checked in one edit', () => {
  const oldBody = [
    '- [ ] Follow-up: alpha',
    '- [ ] Follow-up: beta',
    '- [ ] Follow-up: gamma',
  ].join('\n');
  const newBody = [
    '- [x] Follow-up: alpha',
    '- [ ] Follow-up: beta',
    '- [X] Follow-up: gamma',
  ].join('\n');
  assertEq(
    findNewlyCheckedFollowUps(oldBody, newBody),
    [{ description: 'alpha' }, { description: 'gamma' }],
    'multiple checked'
  );
});

test('non-follow-up checkbox ignored', () => {
  const oldBody = '- [ ] Some random task';
  const newBody = '- [x] Some random task';
  assertEq(findNewlyCheckedFollowUps(oldBody, newBody), [], 'non follow-up');
});

test('already-checked not re-reported', () => {
  const oldBody = '- [x] Follow-up: done thing';
  const newBody = '- [x] Follow-up: done thing';
  assertEq(findNewlyCheckedFollowUps(oldBody, newBody), [], 'already checked');
});

test('brand new checked box not reported (no prior unchecked)', () => {
  const oldBody = 'no checkboxes here';
  const newBody = '- [x] Follow-up: added and checked at once';
  assertEq(findNewlyCheckedFollowUps(oldBody, newBody), [], 'brand new checked');
});

test('null oldBody treated as no items', () => {
  const newBody = '- [x] Follow-up: something';
  assertEq(findNewlyCheckedFollowUps(null, newBody), [], 'null old');
});

test('null newBody yields empty', () => {
  const oldBody = '- [ ] Follow-up: something';
  assertEq(findNewlyCheckedFollowUps(oldBody, null), [], 'null new');
});

test('undefined bodies safe', () => {
  assertEq(findNewlyCheckedFollowUps(undefined, undefined), [], 'undefined bodies');
});

test('reordered lines still matched by text', () => {
  const oldBody = [
    '- [ ] Follow-up: alpha',
    '- [ ] Follow-up: beta',
  ].join('\n');
  const newBody = [
    '- [ ] Follow-up: beta',
    '- [x] Follow-up: alpha',
  ].join('\n');
  assertEq(
    findNewlyCheckedFollowUps(oldBody, newBody),
    [{ description: 'alpha' }],
    'reordered'
  );
});

test('case-insensitive Follow-up prefix', () => {
  const oldBody = '- [ ] follow-up: lower case';
  const newBody = '- [x] FOLLOW-UP: lower case';
  assertEq(
    findNewlyCheckedFollowUps(oldBody, newBody),
    [{ description: 'lower case' }],
    'case-insensitive'
  );
});

test('whitespace tolerance in prefix', () => {
  const oldBody = '- [ ] Follow up : spaced prefix';
  const newBody = '- [x] Follow-up:  spaced prefix';
  assertEq(
    findNewlyCheckedFollowUps(oldBody, newBody),
    [{ description: 'spaced prefix' }],
    'whitespace tolerance'
  );
});

test('capital X counts as checked', () => {
  const oldBody = '- [ ] Follow-up: capital x';
  const newBody = '- [X] Follow-up: capital x';
  assertEq(
    findNewlyCheckedFollowUps(oldBody, newBody),
    [{ description: 'capital x' }],
    'capital X'
  );
});

test('empty description ignored', () => {
  const oldBody = '- [ ] Follow-up: ';
  const newBody = '- [x] Follow-up: ';
  assertEq(findNewlyCheckedFollowUps(oldBody, newBody), [], 'empty desc');
});

test('asterisk and plus list markers', () => {
  const oldBody = [
    '* [ ] Follow-up: star item',
    '+ [ ] Follow-up: plus item',
  ].join('\n');
  const newBody = [
    '* [x] Follow-up: star item',
    '+ [x] Follow-up: plus item',
  ].join('\n');
  assertEq(
    findNewlyCheckedFollowUps(oldBody, newBody),
    [{ description: 'star item' }, { description: 'plus item' }],
    'alt markers'
  );
});

test('mixed check/uncheck in edit only reports new checks', () => {
  const oldBody = [
    '- [x] Follow-up: was done',
    '- [ ] Follow-up: to do',
  ].join('\n');
  const newBody = [
    '- [ ] Follow-up: was done',
    '- [x] Follow-up: to do',
  ].join('\n');
  assertEq(
    findNewlyCheckedFollowUps(oldBody, newBody),
    [{ description: 'to do' }],
    'mixed transitions'
  );
});

test('unrelated body edits do not affect detection', () => {
  const oldBody = [
    'Some intro paragraph.',
    '',
    '- [ ] Follow-up: real work',
    '',
    'Trailing notes.',
  ].join('\n');
  const newBody = [
    'Some intro paragraph, edited.',
    '',
    '- [x] Follow-up: real work',
    '',
    'Trailing notes, also edited.',
    'New paragraph added.',
  ].join('\n');
  assertEq(
    findNewlyCheckedFollowUps(oldBody, newBody),
    [{ description: 'real work' }],
    'unrelated edits'
  );
});

let failed = 0;
for (const { name, fn } of tests) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (err) {
    failed += 1;
    console.error(err.message);
  }
}

if (failed > 0) {
  console.error(`\n${failed} test(s) failed`);
  process.exit(1);
} else {
  console.log(`\n${tests.length} test(s) passed`);
}
