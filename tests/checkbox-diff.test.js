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
const assert = require('assert');
const {
  findNewlyCheckedFollowUps,
  parseFollowUpTasks,
  normalizeKey,
} = require('../scripts/checkbox-diff');

let passed = 0;
let failed = 0;
const failures = [];

function test(name, fn) {
  try {
    fn();
    passed++;
    // eslint-disable-next-line no-console
    console.log(`  ok - ${name}`);
  } catch (err) {
    failed++;
    failures.push({ name, err });
    // eslint-disable-next-line no-console
    console.log(`  FAIL - ${name}: ${err && err.message}`);
  }
}

// eslint-disable-next-line no-console
console.log('checkbox-diff tests');

test('single follow-up newly checked is reported', () => {
  const oldBody = '- [ ] Follow-up: refactor thing';
  const newBody = '- [x] Follow-up: refactor thing';
  const r = findNewlyCheckedFollowUps(oldBody, newBody);
  assert.strictEqual(r.length, 1);
  assert.strictEqual(r[0].description, 'refactor thing');
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
  const r = findNewlyCheckedFollowUps(oldBody, newBody);
  assert.strictEqual(r.length, 2);
  const descs = r.map((x) => x.description).sort();
  assert.deepStrictEqual(descs, ['item one', 'item three']);
});

test('non-followup checkbox is ignored', () => {
  const oldBody = '- [ ] Some other task';
  const newBody = '- [x] Some other task';
  const r = findNewlyCheckedFollowUps(oldBody, newBody);
  assert.deepStrictEqual(r, []);
});

test('already-checked item not re-reported', () => {
  const oldBody = '- [x] Follow-up: already done';
  const newBody = '- [x] Follow-up: already done';
  const r = findNewlyCheckedFollowUps(oldBody, newBody);
  assert.deepStrictEqual(r, []);
});

test('null oldBody returns empty', () => {
  const r = findNewlyCheckedFollowUps(null, '- [x] Follow-up: x');
  assert.deepStrictEqual(r, []);
});

test('undefined oldBody returns empty', () => {
  const r = findNewlyCheckedFollowUps(undefined, '- [x] Follow-up: x');
  assert.deepStrictEqual(r, []);
});

test('null newBody returns empty', () => {
  const r = findNewlyCheckedFollowUps('- [ ] Follow-up: x', null);
  assert.deepStrictEqual(r, []);
});

test('undefined newBody returns empty', () => {
  const r = findNewlyCheckedFollowUps('- [ ] Follow-up: x', undefined);
  assert.deepStrictEqual(r, []);
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
    '- [ ] Follow-up: alpha',
    '- [ ] Follow-up: beta',
  ].join('\n');
  const newBody = [
    '- [ ] Follow-up: beta',
    '- [x] Follow-up: alpha',
  ].join('\n');
  const r = findNewlyCheckedFollowUps(oldBody, newBody);
  assert.strictEqual(r.length, 1);
  assert.strictEqual(r[0].description, 'alpha');
});

test('prefix casing variants: FOLLOW-UP:', () => {
  const oldBody = '- [ ] FOLLOW-UP: uppercase prefix';
  const newBody = '- [x] FOLLOW-UP: uppercase prefix';
  const r = findNewlyCheckedFollowUps(oldBody, newBody);
  assert.strictEqual(r.length, 1);
});

test('prefix casing variants: Followup: (no hyphen)', () => {
  const oldBody = '- [ ] Followup: no hyphen';
  const newBody = '- [x] Followup: no hyphen';
  const r = findNewlyCheckedFollowUps(oldBody, newBody);
  assert.strictEqual(r.length, 1);
  assert.strictEqual(r[0].description, 'no hyphen');
});

test('prefix whitespace variant: Follow  up:', () => {
  const oldBody = '- [ ] Follow  up: spaces';
  const newBody = '- [x] Follow  up: spaces';
  const r = findNewlyCheckedFollowUps(oldBody, newBody);
  assert.strictEqual(r.length, 1);
});

test('follow-up with no description is skipped', () => {
  const oldBody = '- [ ] Follow-up: ';
  const newBody = '- [x] Follow-up: ';
  const r = findNewlyCheckedFollowUps(oldBody, newBody);
  assert.deepStrictEqual(r, []);
});

test('newly-added-and-checked in same edit is NOT reported', () => {
  const oldBody = 'some body without any followups';
  const newBody = '- [x] Follow-up: brand new item';
  const r = findNewlyCheckedFollowUps(oldBody, newBody);
  assert.deepStrictEqual(r, []);
});

test('mixed: one transition, one newly-added-checked, one already-checked', () => {
  const oldBody = [
    '- [ ] Follow-up: will transition',
    '- [x] Follow-up: was already checked',
  ].join('\n');
  const newBody = [
    '- [x] Follow-up: will transition',
    '- [x] Follow-up: was already checked',
    '- [x] Follow-up: newly added and checked',
  ].join('\n');
  const r = findNewlyCheckedFollowUps(oldBody, newBody);
  assert.strictEqual(r.length, 1);
  assert.strictEqual(r[0].description, 'will transition');
});

test('parseFollowUpTasks returns entries with checked flag', () => {
  const body = [
    '- [ ] Follow-up: a',
    '- [x] Follow-up: b',
    '- [ ] not a followup',
  ].join('\n');
  const tasks = parseFollowUpTasks(body);
  assert.strictEqual(tasks.length, 2);
  assert.strictEqual(tasks[0].checked, false);
  assert.strictEqual(tasks[1].checked, true);
});

test('normalizeKey lowercases and collapses whitespace', () => {
  assert.strictEqual(normalizeKey('  Hello   World.  '), 'hello world');
});

// eslint-disable-next-line no-console
console.log(`\ncheckbox-diff: ${passed} passed, ${failed} failed`);

if (failed > 0) {
  for (const f of failures) {
    // eslint-disable-next-line no-console
    console.error(f.name, f.err);
  }
  process.exit(1);
}
