'use strict';

const assert = require('assert');
const { findNewlyCheckedFollowUps } = require('../scripts/checkbox-diff');

function run(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (e) {
    console.error(`not ok - ${name}`);
    console.error(e && e.stack ? e.stack : e);
    process.exitCode = 1;
  }
}

run('single follow-up item checked', () => {
  const oldBody = '- [ ] Follow-up: revisit caching layer';
  const newBody = '- [x] Follow-up: revisit caching layer';
  const r = findNewlyCheckedFollowUps(oldBody, newBody);
  assert.strictEqual(r.length, 1);
  assert.strictEqual(r[0].description, 'revisit caching layer');
});

run('multiple items checked in one edit', () => {
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
  const r = findNewlyCheckedFollowUps(oldBody, newBody);
  assert.strictEqual(r.length, 2);
  assert.deepStrictEqual(
    r.map((x) => x.description).sort(),
    ['item one', 'item three']
  );
});

run('unrelated (non-follow-up) checkbox ignored', () => {
  const oldBody = '- [ ] some random task';
  const newBody = '- [x] some random task';
  const r = findNewlyCheckedFollowUps(oldBody, newBody);
  assert.strictEqual(r.length, 0);
});

run('already-checked item not reported', () => {
  const oldBody = '- [x] Follow-up: already done';
  const newBody = '- [x] Follow-up: already done';
  const r = findNewlyCheckedFollowUps(oldBody, newBody);
  assert.strictEqual(r.length, 0);
});

run('null oldBody -> no results', () => {
  const r = findNewlyCheckedFollowUps(null, '- [x] Follow-up: something');
  assert.strictEqual(r.length, 0);
});

run('null newBody -> no results', () => {
  const r = findNewlyCheckedFollowUps('- [ ] Follow-up: something', null);
  assert.strictEqual(r.length, 0);
});

run('undefined bodies -> no results', () => {
  const r = findNewlyCheckedFollowUps(undefined, undefined);
  assert.strictEqual(r.length, 0);
});

run('added-and-checked in same edit is skipped', () => {
  const oldBody = 'no checkboxes here';
  const newBody = '- [x] Follow-up: brand new';
  const r = findNewlyCheckedFollowUps(oldBody, newBody);
  assert.strictEqual(r.length, 0);
});

run('reordered lines still detected', () => {
  const oldBody = [
    '- [ ] Follow-up: alpha',
    'some text',
    '- [ ] Follow-up: beta',
  ].join('\n');
  const newBody = [
    '- [ ] Follow-up: beta',
    'some text',
    '- [x] Follow-up: alpha',
  ].join('\n');
  const r = findNewlyCheckedFollowUps(oldBody, newBody);
  assert.strictEqual(r.length, 1);
  assert.strictEqual(r[0].description, 'alpha');
});

run('prefix casing variant: FOLLOW-UP', () => {
  const oldBody = '- [ ] FOLLOW-UP: uppercase prefix';
  const newBody = '- [x] FOLLOW-UP: uppercase prefix';
  const r = findNewlyCheckedFollowUps(oldBody, newBody);
  assert.strictEqual(r.length, 1);
  assert.strictEqual(r[0].description, 'uppercase prefix');
});

run('prefix whitespace variant: "Follow - up:"', () => {
  const oldBody = '- [ ] Follow - up : spaced prefix';
  const newBody = '- [x] Follow - up : spaced prefix';
  const r = findNewlyCheckedFollowUps(oldBody, newBody);
  assert.strictEqual(r.length, 1);
  assert.strictEqual(r[0].description, 'spaced prefix');
});

run('no description after Follow-up: still recognized as follow-up', () => {
  const oldBody = '- [ ] Follow-up: ';
  const newBody = '- [x] Follow-up: ';
  const r = findNewlyCheckedFollowUps(oldBody, newBody);
  // Empty description still counts as a transition; description is empty string.
  assert.strictEqual(r.length, 1);
  assert.strictEqual(r[0].description, '');
});

run('checked -> unchecked transition not reported', () => {
  const oldBody = '- [x] Follow-up: was done';
  const newBody = '- [ ] Follow-up: was done';
  const r = findNewlyCheckedFollowUps(oldBody, newBody);
  assert.strictEqual(r.length, 0);
});

run('star and plus list markers accepted', () => {
  const oldBody = ['* [ ] Follow-up: star', '+ [ ] Follow-up: plus'].join('\n');
  const newBody = ['* [x] Follow-up: star', '+ [x] Follow-up: plus'].join('\n');
  const r = findNewlyCheckedFollowUps(oldBody, newBody);
  assert.strictEqual(r.length, 2);
});

run('indented task line accepted', () => {
  const oldBody = '  - [ ] Follow-up: indented';
  const newBody = '  - [x] Follow-up: indented';
  const r = findNewlyCheckedFollowUps(oldBody, newBody);
  assert.strictEqual(r.length, 1);
  assert.strictEqual(r[0].description, 'indented');
});

run('duplicate follow-up text only fires once', () => {
  const oldBody = [
    '- [ ] Follow-up: dedupe me',
    '- [ ] Follow-up: dedupe me',
  ].join('\n');
  const newBody = [
    '- [x] Follow-up: dedupe me',
    '- [x] Follow-up: dedupe me',
  ].join('\n');
  const r = findNewlyCheckedFollowUps(oldBody, newBody);
  assert.strictEqual(r.length, 1);
});

if (!process.exitCode) {
  console.log('# checkbox-diff.test.js: all cases passed');
}
