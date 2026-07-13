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
