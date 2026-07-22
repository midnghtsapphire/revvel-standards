'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  findNewlyCheckedFollowUps,
  parseFollowUpCheckboxes,
  parseFollowUpTasks,
  normalizeDescription,
  normalizeKey,
} = require('../scripts/checkbox-diff');

test('single follow-up transitions from unchecked to checked', () => {
  const result = findNewlyCheckedFollowUps(
    '- [ ] Follow-up: refactor the widget loader',
    '- [x] Follow-up: refactor the widget loader'
  );
  assert.equal(result.length, 1);
  assert.equal(result[0].description, 'refactor the widget loader');
});

test('uppercase [X] also counts as checked', () => {
  const result = findNewlyCheckedFollowUps(
    '- [ ] Follow-up: something',
    '- [X] Follow-up: something'
  );
  assert.equal(result.length, 1);
});

test('multiple items checked in one edit', () => {
  const oldBody = [
    '- [ ] Follow-up: alpha task',
    '- [ ] Follow-up: beta task',
    '- [ ] Follow-up: gamma task',
  ].join('\n');
  const newBody = [
    '- [x] Follow-up: alpha task',
    '- [ ] Follow-up: beta task',
    '- [x] Follow-up: gamma task',
  ].join('\n');
  const result = findNewlyCheckedFollowUps(oldBody, newBody);
  assert.deepEqual(
    result.map((r) => r.description),
    ['alpha task', 'gamma task']
  );
});

test('non-follow-up checkbox being checked is ignored', () => {
  const result = findNewlyCheckedFollowUps(
    ['- [ ] Follow-up: keep this one', '- [ ] Random task not a follow-up'].join('\n'),
    ['- [ ] Follow-up: keep this one', '- [x] Random task not a follow-up'].join('\n')
  );
  assert.equal(result.length, 0);
});

test('already-checked follow-up is not re-reported', () => {
  const result = findNewlyCheckedFollowUps(
    '- [x] Follow-up: was already done',
    '- [x] Follow-up: was already done'
  );
  assert.equal(result.length, 0);
});

test('follow-up added and checked in same edit does not fire', () => {
  const result = findNewlyCheckedFollowUps(
    'no follow-ups here yet',
    '- [x] Follow-up: brand new task'
  );
  assert.equal(result.length, 0);
});

test('reordered lines still match by content', () => {
  const result = findNewlyCheckedFollowUps(
    ['- [ ] Follow-up: first item', '- [ ] Follow-up: second item'].join('\n'),
    ['- [ ] Follow-up: second item', '- [x] Follow-up: first item'].join('\n')
  );
  assert.equal(result.length, 1);
  assert.equal(result[0].description, 'first item');
});

test('prefix casing variants are accepted', () => {
  assert.equal(
    findNewlyCheckedFollowUps('- [ ] FOLLOW-UP: casing', '- [x] follow-up: casing').length,
    1
  );
});

test('prefix with no hyphen (Followup:) is accepted', () => {
  const result = findNewlyCheckedFollowUps(
    '- [ ] Followup: no hyphen',
    '- [x] Followup: no hyphen'
  );
  assert.equal(result.length, 1);
  assert.equal(result[0].description, 'no hyphen');
});

test('prefix with space instead of hyphen is accepted', () => {
  const result = findNewlyCheckedFollowUps(
    '- [ ] Follow up: spaced variant',
    '- [x] Follow up: spaced variant'
  );
  assert.equal(result.length, 1);
  assert.equal(result[0].description, 'spaced variant');
});

test('extra whitespace around description still matches', () => {
  const result = findNewlyCheckedFollowUps(
    '- [ ]  Follow-up:   whitespace   test  ',
    '- [x] Follow-up: whitespace test'
  );
  assert.equal(result.length, 1);
});

test('trailing punctuation does not break pairing', () => {
  const result = findNewlyCheckedFollowUps(
    '- [ ] Follow-up: ship the thing.',
    '- [x] Follow-up: ship the thing'
  );
  assert.equal(result.length, 1);
});

test('follow-up with empty description does not fire', () => {
  const result = findNewlyCheckedFollowUps('- [ ] Follow-up: ', '- [x] Follow-up: ');
  assert.deepEqual(result, []);
});

test('mixed: one transition, one already-checked, one newly-added-checked', () => {
  const oldBody = [
    '- [ ] Follow-up: will transition',
    '- [x] Follow-up: was already checked',
  ].join('\n');
  const newBody = [
    '- [x] Follow-up: will transition',
    '- [x] Follow-up: was already checked',
    '- [x] Follow-up: newly added and checked',
  ].join('\n');
  const result = findNewlyCheckedFollowUps(oldBody, newBody);
  assert.equal(result.length, 1);
  assert.equal(result[0].description, 'will transition');
});

test('interleaved unrelated content does not confuse matcher', () => {
  const oldBody = [
    'Some intro prose.',
    '',
    '- [ ] Follow-up: real task',
    '',
    '## Section header',
    '- [ ] a plain checkbox',
  ].join('\n');
  const newBody = [
    'Some intro prose (edited).',
    '',
    '- [x] Follow-up: real task',
    '',
    '## Section header',
    '- [x] a plain checkbox',
  ].join('\n');
  const result = findNewlyCheckedFollowUps(oldBody, newBody);
  assert.equal(result.length, 1);
  assert.equal(result[0].description, 'real task');
});

test('null / undefined bodies are handled without throwing', () => {
  assert.deepEqual(findNewlyCheckedFollowUps(null, '- [x] Follow-up: x'), []);
  assert.deepEqual(findNewlyCheckedFollowUps(undefined, '- [x] Follow-up: x'), []);
  assert.deepEqual(findNewlyCheckedFollowUps('- [ ] Follow-up: x', null), []);
  assert.deepEqual(findNewlyCheckedFollowUps('- [ ] Follow-up: x', undefined), []);
  assert.deepEqual(findNewlyCheckedFollowUps(null, null), []);
});

test('parseFollowUpCheckboxes keeps empty-description entries', () => {
  const parsed = parseFollowUpCheckboxes('- [ ] Follow-up:');
  assert.equal(parsed.length, 1);
  assert.equal(parsed[0].description, '');
});

test('parseFollowUpTasks (alias) returns entries with checked flag', () => {
  const tasks = parseFollowUpTasks(
    ['- [ ] Follow-up: a', '- [x] Follow-up: b', '- [ ] not a followup'].join('\n')
  );
  assert.equal(tasks.length, 2);
  assert.equal(tasks[0].checked, false);
  assert.equal(tasks[1].checked, true);
});

test('normalizeDescription collapses whitespace and lowercases', () => {
  assert.equal(normalizeDescription('  Hello   WORLD\ttest '), 'hello world test');
});

test('normalizeKey lowercases, collapses whitespace, strips trailing punctuation', () => {
  assert.equal(normalizeKey('  Hello   World.  '), 'hello world');
});
