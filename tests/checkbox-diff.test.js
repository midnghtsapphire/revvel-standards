'use strict';

const { findNewlyCheckedFollowUps } = require('../scripts/checkbox-diff');

function assertEqual(actual, expected, label) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) {
    throw new Error(`FAIL ${label}\n  expected: ${e}\n  actual:   ${a}`);
  }
  // eslint-disable-next-line no-console
  console.log(`ok - ${label}`);
}

function descriptions(results) {
  return results.map((r) => r.description);
}

// 1. single item checked
(function () {
  const oldB = '- [ ] Follow-up: refactor router';
  const newB = '- [x] Follow-up: refactor router';
  assertEqual(descriptions(findNewlyCheckedFollowUps(oldB, newB)), ['refactor router'], 'single item checked');
})();

// 2. multiple items checked in one edit
(function () {
  const oldB = '- [ ] Follow-up: alpha\n- [ ] Follow-up: beta';
  const newB = '- [x] Follow-up: alpha\n- [x] Follow-up: beta';
  assertEqual(descriptions(findNewlyCheckedFollowUps(oldB, newB)).sort(), ['alpha', 'beta'], 'multiple checked');
})();

// 3. unrelated (non-follow-up) checkbox checked
(function () {
  const oldB = '- [ ] Some other task';
  const newB = '- [x] Some other task';
  assertEqual(findNewlyCheckedFollowUps(oldB, newB), [], 'non-followup ignored');
})();

// 4. already-checked not re-reported
(function () {
  const oldB = '- [x] Follow-up: done thing';
  const newB = '- [x] Follow-up: done thing';
  assertEqual(findNewlyCheckedFollowUps(oldB, newB), [], 'already checked ignored');
})();

// 5. null oldBody
(function () {
  const newB = '- [x] Follow-up: whatever';
  assertEqual(findNewlyCheckedFollowUps(null, newB), [], 'null oldBody');
})();

// 6. null newBody
(function () {
  const oldB = '- [ ] Follow-up: whatever';
  assertEqual(findNewlyCheckedFollowUps(oldB, null), [], 'null newBody');
})();

// 7. undefined bodies
(function () {
  assertEqual(findNewlyCheckedFollowUps(undefined, undefined), [], 'both undefined');
})();

// 8. added-and-checked in same edit ignored
(function () {
  const oldB = 'Some prose without followup';
  const newB = 'Some prose without followup\n- [x] Follow-up: brand new';
  assertEqual(findNewlyCheckedFollowUps(oldB, newB), [], 'added-and-checked skipped');
})();

// 9. reordered lines still detected
(function () {
  const oldB = '- [ ] Follow-up: alpha\nother line\n- [ ] Follow-up: beta';
  const newB = '- [x] Follow-up: beta\nother line\n- [ ] Follow-up: alpha';
  assertEqual(descriptions(findNewlyCheckedFollowUps(oldB, newB)), ['beta'], 'reordered detected');
})();

// 10. uppercase X accepted
(function () {
  const oldB = '- [ ] Follow-up: gamma';
  const newB = '- [X] Follow-up: gamma';
  assertEqual(descriptions(findNewlyCheckedFollowUps(oldB, newB)), ['gamma'], 'uppercase X');
})();

// 11. prefix casing variant
(function () {
  const oldB = '- [ ] follow-up: lowercase prefix';
  const newB = '- [x] FOLLOW-UP: lowercase prefix';
  assertEqual(descriptions(findNewlyCheckedFollowUps(oldB, newB)), ['lowercase prefix'], 'prefix casing');
})();

// 12. "Followup" no hyphen
(function () {
  const oldB = '- [ ] Followup: no hyphen';
  const newB = '- [x] Followup: no hyphen';
  assertEqual(descriptions(findNewlyCheckedFollowUps(oldB, newB)), ['no hyphen'], 'no hyphen variant');
})();

// 13. extra whitespace tolerance
(function () {
  const oldB = '   -   [ ]   Follow-up:   spaced   out   ';
  const newB = '   -   [x]   Follow-up:   spaced   out   ';
  assertEqual(descriptions(findNewlyCheckedFollowUps(oldB, newB)), ['spaced   out'], 'whitespace tolerance');
})();

// 14. empty description skipped
(function () {
  const oldB = '- [ ] Follow-up: ';
  const newB = '- [x] Follow-up: ';
  assertEqual(findNewlyCheckedFollowUps(oldB, newB), [], 'empty description skipped');
})();

// 15. mixed: one newly checked, one still unchecked, one unrelated
(function () {
  const oldB = [
    '- [ ] Follow-up: item one',
    '- [ ] Follow-up: item two',
    '- [ ] some other checkbox',
  ].join('\n');
  const newB = [
    '- [x] Follow-up: item one',
    '- [ ] Follow-up: item two',
    '- [x] some other checkbox',
  ].join('\n');
  assertEqual(descriptions(findNewlyCheckedFollowUps(oldB, newB)), ['item one'], 'mixed edit');
})();

// 16. asterisk bullet accepted
(function () {
  const oldB = '* [ ] Follow-up: asterisk bullet';
  const newB = '* [x] Follow-up: asterisk bullet';
  assertEqual(descriptions(findNewlyCheckedFollowUps(oldB, newB)), ['asterisk bullet'], 'asterisk bullet');
})();

// eslint-disable-next-line no-console
console.log('checkbox-diff: all 16 tests passed');
const test = require('node:test');
const assert = require('node:assert');

const {
  findNewlyCheckedFollowUps,
  parseTaskItems,
  normalizeKey,
} = require('../scripts/checkbox-diff');

// ── findNewlyCheckedFollowUps ───────────────────────────────────────────────

test('reports a single follow-up item checked in this edit', () => {
  const oldBody = [
    '## Summary',
    '',
    '- [ ] Follow-up: circle back on the flaky retry logic',
  ].join('\n');
  const newBody = [
    '## Summary',
    '',
    '- [x] Follow-up: circle back on the flaky retry logic',
  ].join('\n');

  const result = findNewlyCheckedFollowUps(oldBody, newBody);
  assert.deepStrictEqual(result, ['circle back on the flaky retry logic']);
});

test('reports multiple follow-up items checked in the same edit', () => {
  const oldBody = [
    '- [ ] Follow-up: item one',
    '- [ ] Follow-up: item two',
    '- [ ] some unrelated task',
  ].join('\n');
  const newBody = [
    '- [x] Follow-up: item one',
    '- [x] Follow-up: item two',
    '- [x] some unrelated task',
  ].join('\n');

  const result = findNewlyCheckedFollowUps(oldBody, newBody);
  assert.deepStrictEqual(result, ['item one', 'item two']);
});

test('does not match a checked box whose text is not a follow-up item', () => {
  const oldBody = '- [ ] Deploy to staging';
  const newBody = '- [x] Deploy to staging';

  const result = findNewlyCheckedFollowUps(oldBody, newBody);
  assert.deepStrictEqual(result, []);
});

test('does not re-report a follow-up that was already checked before this edit', () => {
  const oldBody = [
    '- [x] Follow-up: already tracked, do not refire',
    '- [ ] Follow-up: newly checked this time',
  ].join('\n');
  const newBody = [
    '- [x] Follow-up: already tracked, do not refire',
    '- [x] Follow-up: newly checked this time',
  ].join('\n');

  const result = findNewlyCheckedFollowUps(oldBody, newBody);
  assert.deepStrictEqual(result, ['newly checked this time']);
});

test('returns an empty array when oldBody is missing/null (e.g. issue just created)', () => {
  const newBody = '- [x] Follow-up: brand new item checked on creation';
  assert.deepStrictEqual(findNewlyCheckedFollowUps(null, newBody), []);
  assert.deepStrictEqual(findNewlyCheckedFollowUps(undefined, newBody), []);
  assert.deepStrictEqual(findNewlyCheckedFollowUps('', newBody), []);
});

test('returns an empty array when newBody is missing/null', () => {
  const oldBody = '- [ ] Follow-up: something';
  assert.deepStrictEqual(findNewlyCheckedFollowUps(oldBody, null), []);
  assert.deepStrictEqual(findNewlyCheckedFollowUps(oldBody, undefined), []);
});

test('returns an empty array when there are no task-list lines at all', () => {
  const oldBody = 'Just a plain description with no checkboxes.';
  const newBody = 'Just a plain description with no checkboxes, edited.';
  assert.deepStrictEqual(findNewlyCheckedFollowUps(oldBody, newBody), []);
});

test('ignores an item newly added and checked in the same edit (no prior unchecked state to transition from)', () => {
  const oldBody = '- [ ] Follow-up: existing item';
  const newBody = [
    '- [ ] Follow-up: existing item',
    '- [x] Follow-up: item that appeared already checked',
  ].join('\n');

  const result = findNewlyCheckedFollowUps(oldBody, newBody);
  assert.deepStrictEqual(result, []);
});

test('matches follow-up items by text even when unrelated lines are reordered', () => {
  const oldBody = [
    '- [ ] alpha task',
    '- [ ] Follow-up: track the migration cleanup',
    '- [ ] beta task',
  ].join('\n');
  const newBody = [
    '- [x] beta task',
    '- [x] Follow-up: track the migration cleanup',
    '- [ ] alpha task',
  ].join('\n');

  const result = findNewlyCheckedFollowUps(oldBody, newBody);
  assert.deepStrictEqual(result, ['track the migration cleanup']);
});

test('handles case-insensitive and hyphen/colon variations of the Follow-up prefix', () => {
  const oldBody = [
    '- [ ] FOLLOWUP no colon or hyphen',
    '- [ ] followup: no hyphen, with colon',
    '- [ ] Follow-Up:  extra   spacing',
  ].join('\n');
  const newBody = [
    '- [x] FOLLOWUP no colon or hyphen',
    '- [x] followup: no hyphen, with colon',
    '- [x] Follow-Up:  extra   spacing',
  ].join('\n');

  const result = findNewlyCheckedFollowUps(oldBody, newBody);
  assert.deepStrictEqual(result, [
    'no colon or hyphen',
    'no hyphen, with colon',
    'extra   spacing',
  ]);
});

test('does not match "Follow up:" with a bare space (convention requires the hyphenated form)', () => {
  const oldBody = '- [ ] Follow up: with a bare space';
  const newBody = '- [x] Follow up: with a bare space';
  assert.deepStrictEqual(findNewlyCheckedFollowUps(oldBody, newBody), []);
});

test('tolerates minor whitespace differences between old and new line text when matching', () => {
  const oldBody = '- [ ]   Follow-up:   trim me   ';
  const newBody = '- [x] Follow-up:   trim me';

  const result = findNewlyCheckedFollowUps(oldBody, newBody);
  assert.deepStrictEqual(result, ['trim me']);
});

test('drops a Follow-up item with no description text', () => {
  const oldBody = '- [ ] Follow-up:';
  const newBody = '- [x] Follow-up:';
  assert.deepStrictEqual(findNewlyCheckedFollowUps(oldBody, newBody), []);
});

// ── parseTaskItems ───────────────────────────────────────────────────────

test('parseTaskItems parses checked/unchecked markers and strips marker syntax', () => {
  const body = [
    '- [ ] unchecked item',
    '- [x] checked lowercase',
    '- [X] checked uppercase',
    '* [x] asterisk bullet',
    '+ [x] plus bullet',
    'not a task line',
  ].join('\n');

  assert.deepStrictEqual(parseTaskItems(body), [
    { checked: false, text: 'unchecked item' },
    { checked: true, text: 'checked lowercase' },
    { checked: true, text: 'checked uppercase' },
    { checked: true, text: 'asterisk bullet' },
    { checked: true, text: 'plus bullet' },
  ]);
});

test('parseTaskItems returns an empty array for null/undefined/empty input', () => {
  assert.deepStrictEqual(parseTaskItems(null), []);
  assert.deepStrictEqual(parseTaskItems(undefined), []);
  assert.deepStrictEqual(parseTaskItems(''), []);
});

// ── normalizeKey ─────────────────────────────────────────────────────────

test('normalizeKey folds case and collapses whitespace', () => {
  assert.strictEqual(normalizeKey('  Follow-Up:   Do The Thing  '), 'follow-up: do the thing');
});
