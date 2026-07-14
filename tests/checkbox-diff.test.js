'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  findNewlyCheckedFollowUps,
  parseFollowUpCheckboxes,
  normalizeDescription,
} = require('../scripts/checkbox-diff');

test('single follow-up transitions from unchecked to checked', () => {
  const oldBody = '- [ ] Follow-up: refactor the widget loader';
  const newBody = '- [x] Follow-up: refactor the widget loader';
  const result = findNewlyCheckedFollowUps(oldBody, newBody);
  assert.equal(result.length, 1);
  assert.equal(result[0].description, 'refactor the widget loader');
});

test('uppercase [X] also counts as checked', () => {
  const oldBody = '- [ ] Follow-up: something';
  const newBody = '- [X] Follow-up: something';
  const result = findNewlyCheckedFollowUps(oldBody, newBody);
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
  assert.equal(result.length, 2);
  assert.deepEqual(
    result.map((r) => r.description),
    ['alpha task', 'gamma task']
  );
});

test('non-follow-up checkbox being checked is ignored', () => {
  const oldBody = [
    '- [ ] Follow-up: keep this one',
    '- [ ] Random task not a follow-up',
  ].join('\n');
  const newBody = [
    '- [ ] Follow-up: keep this one',
    '- [x] Random task not a follow-up',
  ].join('\n');
  const result = findNewlyCheckedFollowUps(oldBody, newBody);
  assert.equal(result.length, 0);
});

test('already-checked follow-up is not re-reported', () => {
  const oldBody = '- [x] Follow-up: was already done';
  const newBody = '- [x] Follow-up: was already done';
  const result = findNewlyCheckedFollowUps(oldBody, newBody);
  assert.equal(result.length, 0);
});

test('follow-up added and checked in same edit does not fire', () => {
  const oldBody = 'no follow-ups here yet';
  const newBody = '- [x] Follow-up: brand new task';
  const result = findNewlyCheckedFollowUps(oldBody, newBody);
  assert.equal(result.length, 0);
});

test('null oldBody is handled without throwing', () => {
  const result = findNewlyCheckedFollowUps(null, '- [x] Follow-up: x');
  assert.equal(result.length, 0);
});

test('undefined oldBody is handled without throwing', () => {
  const result = findNewlyCheckedFollowUps(
    undefined,
    '- [x] Follow-up: x'
  );
  assert.equal(result.length, 0);
});

test('null newBody yields no results', () => {
  const result = findNewlyCheckedFollowUps('- [ ] Follow-up: x', null);
  assert.equal(result.length, 0);
});

test('both bodies null yields no results', () => {
  const result = findNewlyCheckedFollowUps(null, null);
  assert.equal(result.length, 0);
});

test('reordered lines still match by content', () => {
  const oldBody = [
    '- [ ] Follow-up: first item',
    '- [ ] Follow-up: second item',
  ].join('\n');
  const newBody = [
    '- [ ] Follow-up: second item',
    '- [x] Follow-up: first item',
  ].join('\n');
  const result = findNewlyCheckedFollowUps(oldBody, newBody);
  assert.equal(result.length, 1);
  assert.equal(result[0].description, 'first item');
});

test('prefix casing variants are accepted', () => {
  const oldBody = '- [ ] FOLLOW-UP: casing variant';
  const newBody = '- [x] follow-up: casing variant';
  const result = findNewlyCheckedFollowUps(oldBody, newBody);
  assert.equal(result.length, 1);
});

test('prefix with space instead of hyphen is accepted', () => {
  const oldBody = '- [ ] Follow up: spaced variant';
  const newBody = '- [x] Follow up: spaced variant';
  const result = findNewlyCheckedFollowUps(oldBody, newBody);
  assert.equal(result.length, 1);
  assert.equal(result[0].description, 'spaced variant');
});

test('extra whitespace around description still matches', () => {
  const oldBody = '- [ ]  Follow-up:   whitespace   test  ';
  const newBody = '- [x] Follow-up: whitespace test';
  const result = findNewlyCheckedFollowUps(oldBody, newBody);
  assert.equal(result.length, 1);
});

test('follow-up with empty description parses but has empty text', () => {
  const parsed = parseFollowUpCheckboxes('- [ ] Follow-up:');
  assert.equal(parsed.length, 1);
  assert.equal(parsed[0].description, '');
});

test('normalizeDescription collapses whitespace and lowercases', () => {
  assert.equal(
    normalizeDescription('  Hello   WORLD\ttest '),
    'hello world test'
  );
});

test('interleaved unrelated content does not confuse matcher', () => {
  const oldBody = [
    'Some intro prose.',
    '',
    '- [ ] Follow-up: real task',
    '',
    '## Section header',
    '',
    '- [ ] a plain checkbox',
    'trailing text',
  ].join('\n');
  const newBody = [
    'Some intro prose (edited).',
    '',
    '- [x] Follow-up: real task',
    '',
    '## Section header',
    '',
    '- [x] a plain checkbox',
    'trailing text',
  ].join('\n');
  const result = findNewlyCheckedFollowUps(oldBody, newBody);
  assert.equal(result.length, 1);
  assert.equal(result[0].description, 'real task');
});
