'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  findNewlyCheckedFollowUps,
  parseFollowUpTasks,
  normalizeText,
} = require('../scripts/checkbox-diff');

test('single follow-up item checked', () => {
  const oldBody = '- [ ] Follow-up: refactor the router';
  const newBody = '- [x] Follow-up: refactor the router';
  const res = findNewlyCheckedFollowUps(oldBody, newBody);
  assert.equal(res.length, 1);
  assert.equal(res[0].description, 'refactor the router');
});

test('multiple items checked in one edit', () => {
  const oldBody = [
    '- [ ] Follow-up: item one',
    '- [ ] Follow-up: item two',
    '- [ ] Follow-up: item three',
  ].join('\n');
  const newBody = [
    '- [x] Follow-up: item one',
    '- [ ] Follow-up: item two',
    '- [X] Follow-up: item three',
  ].join('\n');
  const res = findNewlyCheckedFollowUps(oldBody, newBody);
  assert.equal(res.length, 2);
  const descs = res.map((r) => r.description).sort();
  assert.deepEqual(descs, ['item one', 'item three']);
});

test('unrelated (non-follow-up) checkbox checked is ignored', () => {
  const oldBody = [
    '- [ ] Some random task',
    '- [ ] Follow-up: not touched',
  ].join('\n');
  const newBody = [
    '- [x] Some random task',
    '- [ ] Follow-up: not touched',
  ].join('\n');
  const res = findNewlyCheckedFollowUps(oldBody, newBody);
  assert.deepEqual(res, []);
});

test('already-checked item is not re-reported', () => {
  const oldBody = '- [x] Follow-up: already done';
  const newBody = '- [x] Follow-up: already done';
  const res = findNewlyCheckedFollowUps(oldBody, newBody);
  assert.deepEqual(res, []);
});

test('null oldBody returns empty (no prior state to compare)', () => {
  const res = findNewlyCheckedFollowUps(null, '- [x] Follow-up: whatever');
  assert.deepEqual(res, []);
});

test('undefined oldBody returns empty', () => {
  const res = findNewlyCheckedFollowUps(undefined, '- [x] Follow-up: whatever');
  assert.deepEqual(res, []);
});

test('null newBody returns empty', () => {
  const res = findNewlyCheckedFollowUps('- [ ] Follow-up: whatever', null);
  assert.deepEqual(res, []);
});

test('undefined newBody returns empty', () => {
  const res = findNewlyCheckedFollowUps('- [ ] Follow-up: whatever', undefined);
  assert.deepEqual(res, []);
});

test('reordered lines still match by content', () => {
  const oldBody = [
    '- [ ] Follow-up: alpha',
    '- [ ] Follow-up: beta',
  ].join('\n');
  const newBody = [
    '- [ ] Follow-up: beta',
    '- [x] Follow-up: alpha',
  ].join('\n');
  const res = findNewlyCheckedFollowUps(oldBody, newBody);
  assert.equal(res.length, 1);
  assert.equal(res[0].description, 'alpha');
});

test('prefix case variants: Follow-up / follow-up / FOLLOW-UP', () => {
  const oldBody = [
    '- [ ] follow-up: lower case',
    '- [ ] FOLLOW-UP: upper case',
    '- [ ] Follow-Up: mixed case',
  ].join('\n');
  const newBody = [
    '- [x] follow-up: lower case',
    '- [x] FOLLOW-UP: upper case',
    '- [x] Follow-Up: mixed case',
  ].join('\n');
  const res = findNewlyCheckedFollowUps(oldBody, newBody);
  assert.equal(res.length, 3);
});

test('prefix whitespace/hyphen tolerance: "Follow up:" and "Followup:"', () => {
  const oldBody = [
    '- [ ] Follow up: with space',
    '- [ ] Followup: no separator',
  ].join('\n');
  const newBody = [
    '- [x] Follow up: with space',
    '- [x] Followup: no separator',
  ].join('\n');
  const res = findNewlyCheckedFollowUps(oldBody, newBody);
  assert.equal(res.length, 2);
});

test('item added-and-checked in same edit is not fired', () => {
  const oldBody = '- [ ] Follow-up: existing item';
  const newBody = [
    '- [ ] Follow-up: existing item',
    '- [x] Follow-up: brand new item',
  ].join('\n');
  const res = findNewlyCheckedFollowUps(oldBody, newBody);
  assert.deepEqual(res, []);
});

test('empty description follow-up is skipped', () => {
  const oldBody = '- [ ] Follow-up:';
  const newBody = '- [x] Follow-up:';
  const res = findNewlyCheckedFollowUps(oldBody, newBody);
  assert.deepEqual(res, []);
});

test('parseFollowUpTasks extracts checked state and description', () => {
  const body = [
    '- [ ] Follow-up: one',
    '- [x] Follow-up: two',
    '- [X] Follow-up: three',
    '- [ ] not a follow-up',
    'random text',
  ].join('\n');
  const tasks = parseFollowUpTasks(body);
  assert.equal(tasks.length, 3);
  assert.equal(tasks[0].checked, false);
  assert.equal(tasks[1].checked, true);
  assert.equal(tasks[2].checked, true);
  assert.equal(tasks[0].description, 'one');
});

test('normalizeText collapses whitespace and lowercases', () => {
  assert.equal(normalizeText('  Hello   World  '), 'hello world');
  assert.equal(normalizeText(null), '');
  assert.equal(normalizeText(undefined), '');
});

test('duplicate follow-up text: only reported once when checked', () => {
  const oldBody = [
    '- [ ] Follow-up: same thing',
    '- [ ] Follow-up: same thing',
  ].join('\n');
  const newBody = [
    '- [x] Follow-up: same thing',
    '- [x] Follow-up: same thing',
  ].join('\n');
  const res = findNewlyCheckedFollowUps(oldBody, newBody);
  assert.equal(res.length, 1);
  assert.equal(res[0].description, 'same thing');
});
