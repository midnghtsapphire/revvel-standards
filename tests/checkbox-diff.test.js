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

test('reordered checkboxes are still detected correctly', () => {
  const oldBody = [
    '- [ ] Follow-up: alpha',
    '- [ ] Follow-up: beta',
  ].join('\n');
  const newBody = [
    '- [ ] Follow-up: beta',
    '- [x] Follow-up: alpha',
  ].join('\n');
  const result = findNewlyCheckedFollowUps(oldBody, newBody);
  assert.equal(result.length, 1);
  assert.equal(result[0].description, 'alpha');
});

test('prefix casing variants: FOLLOW-UP:', () => {
  const oldBody = '- [ ] FOLLOW-UP: uppercase prefix';
  const newBody = '- [x] FOLLOW-UP: uppercase prefix';
  const result = findNewlyCheckedFollowUps(oldBody, newBody);
  assert.equal(result.length, 1);
});

test('prefix casing variants: Followup: (no hyphen)', () => {
  const oldBody = '- [ ] Followup: no hyphen';
  const newBody = '- [x] Followup: no hyphen';
  const result = findNewlyCheckedFollowUps(oldBody, newBody);
  assert.equal(result.length, 1);
  assert.equal(result[0].description, 'no hyphen');
});

test('prefix whitespace variant: Follow  up:', () => {
  const oldBody = '- [ ] Follow  up: spaces';
  const newBody = '- [x] Follow  up: spaces';
  const result = findNewlyCheckedFollowUps(oldBody, newBody);
  assert.equal(result.length, 1);
});

test('follow-up with no description is skipped', () => {
  const oldBody = '- [ ] Follow-up: ';
  const newBody = '- [x] Follow-up: ';
  const result = findNewlyCheckedFollowUps(oldBody, newBody);
  assert.equal(result.length, 0);
});

test('newly-added-and-checked in same edit is NOT reported', () => {
  const oldBody = 'some body without any followups';
  const newBody = '- [x] Follow-up: brand new item';
  const result = findNewlyCheckedFollowUps(oldBody, newBody);
  assert.equal(result.length, 0);
});
