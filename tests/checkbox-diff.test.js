'use strict';

const assert = require('assert');
const {
  findNewlyCheckedFollowUps,
  parseTaskListItems,
  extractFollowUpDescription,
} = require('../scripts/checkbox-diff');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ok  ${name}`);
  } catch (err) {
    failed++;
    console.error(`  FAIL ${name}`);
    console.error(err && err.stack ? err.stack : err);
  }
}

console.log('checkbox-diff');

// 1. Single item transitioned from unchecked to checked.
test('detects a single newly-checked follow-up', () => {
  const oldBody = '- [ ] Follow-up: revisit caching strategy';
  const newBody = '- [x] Follow-up: revisit caching strategy';
  const result = findNewlyCheckedFollowUps(oldBody, newBody);
  assert.deepStrictEqual(result, ['revisit caching strategy']);
});

// 2. Multiple items checked in the same edit.
test('detects multiple newly-checked follow-ups in one edit', () => {
  const oldBody = [
    '- [ ] Follow-up: first item',
    '- [ ] Follow-up: second item',
    '- [ ] Follow-up: third item',
  ].join('\n');
  const newBody = [
    '- [x] Follow-up: first item',
    '- [ ] Follow-up: second item',
    '- [X] Follow-up: third item',
  ].join('\n');
  const result = findNewlyCheckedFollowUps(oldBody, newBody);
  assert.deepStrictEqual(result, ['first item', 'third item']);
});

// 3. An unrelated (non-follow-up) checkbox being checked is ignored.
test('ignores non-follow-up checkboxes', () => {
  const oldBody = [
    '- [ ] Some random task',
    '- [ ] Closes #N is present',
  ].join('\n');
  const newBody = [
    '- [x] Some random task',
    '- [x] Closes #N is present',
  ].join('\n');
  const result = findNewlyCheckedFollowUps(oldBody, newBody);
  assert.deepStrictEqual(result, []);
});

// 4. Already-checked item is not re-reported.
test('does not re-report already-checked items', () => {
  const oldBody = '- [x] Follow-up: previously handled';
  const newBody = '- [x] Follow-up: previously handled';
  const result = findNewlyCheckedFollowUps(oldBody, newBody);
  assert.deepStrictEqual(result, []);
});

// 5. Item added-and-checked in the same edit (no prior unchecked state) is
//    NOT reported — that's the anti-overfire rule.
test('does not report items added-and-checked in the same edit', () => {
  const oldBody = 'Some description with no checkboxes yet.';
  const newBody = [
    'Some description with no checkboxes yet.',
    '- [x] Follow-up: brand new item',
  ].join('\n');
  const result = findNewlyCheckedFollowUps(oldBody, newBody);
  assert.deepStrictEqual(result, []);
});

// 6. Null / undefined oldBody handled gracefully.
test('handles null oldBody without throwing', () => {
  const newBody = '- [x] Follow-up: something';
  const result = findNewlyCheckedFollowUps(null, newBody);
  // No prior state to transition from → nothing reported.
  assert.deepStrictEqual(result, []);
});

// 7. Null / undefined newBody handled gracefully.
test('handles null newBody without throwing', () => {
  const oldBody = '- [ ] Follow-up: something';
  const result = findNewlyCheckedFollowUps(oldBody, null);
  assert.deepStrictEqual(result, []);
});

// 8. Both bodies null — returns empty, no throw.
test('handles both bodies null', () => {
  const result = findNewlyCheckedFollowUps(null, null);
  assert.deepStrictEqual(result, []);
});

// 9. Reordered lines between old and new body still match by content.
test('matches items across reordering', () => {
  const oldBody = [
    '- [ ] Follow-up: item A',
    '- [ ] Follow-up: item B',
  ].join('\n');
  const newBody = [
    '- [x] Follow-up: item B',
    '- [ ] Follow-up: item A',
  ].join('\n');
  const result = findNewlyCheckedFollowUps(oldBody, newBody);
  assert.deepStrictEqual(result, ['item B']);
});

// 10. Prefix casing variants — "follow-up:", "Follow-Up:", "FOLLOW-UP:".
test('recognizes case-insensitive Follow-up prefix', () => {
  const oldBody = '- [ ] follow-up: lowercase prefix';
  const newBody = '- [x] FOLLOW-UP: lowercase prefix';
  const result = findNewlyCheckedFollowUps(oldBody, newBody);
  assert.deepStrictEqual(result, ['lowercase prefix']);
});

// 11. Whitespace-variant prefix ("Follow up:" with space, "Followup:" without hyphen).
test('tolerates minor whitespace/hyphen variants on the prefix', () => {
  assert.strictEqual(extractFollowUpDescription('Follow up: no hyphen'), 'no hyphen');
  assert.strictEqual(extractFollowUpDescription('Followup: joined'), 'joined');
  assert.strictEqual(extractFollowUpDescription('Follow-up : trailing space'), 'trailing space');
});

// 12. Follow-up line with no description is skipped (not actionable).
test('skips follow-up lines with no description', () => {
  const oldBody = '- [ ] Follow-up:';
  const newBody = '- [x] Follow-up:';
  const result = findNewlyCheckedFollowUps(oldBody, newBody);
  assert.deepStrictEqual(result, []);
});

// 13. Different list markers (`*`, `+`) still parsed.
test('parses task lists with * and + markers', () => {
  const items = parseTaskListItems('* [ ] Follow-up: star marker\n+ [x] Follow-up: plus marker');
  assert.strictEqual(items.length, 2);
  assert.strictEqual(items[0].followUpDescription, 'star marker');
  assert.strictEqual(items[1].followUpDescription, 'plus marker');
  assert.strictEqual(items[1].checked, true);
});

// 14. Mixed edit: one newly checked, one unchecked, one unrelated toggled.
test('mixed edit reports only the newly-checked follow-up', () => {
  const oldBody = [
    '- [ ] Follow-up: relevant transition',
    '- [ ] Follow-up: still unchecked',
    '- [ ] Some unrelated checkbox',
  ].join('\n');
  const newBody = [
    '- [x] Follow-up: relevant transition',
    '- [ ] Follow-up: still unchecked',
    '- [x] Some unrelated checkbox',
  ].join('\n');
  const result = findNewlyCheckedFollowUps(oldBody, newBody);
  assert.deepStrictEqual(result, ['relevant transition']);
});

// 15. Empty bodies handled.
test('handles empty-string bodies', () => {
  assert.deepStrictEqual(findNewlyCheckedFollowUps('', ''), []);
  assert.deepStrictEqual(findNewlyCheckedFollowUps('', '- [x] Follow-up: anything'), []);
});

// 16. Duplicated follow-up in newBody deduplicated in output.
test('deduplicates identical follow-up descriptions within newBody', () => {
  const oldBody = [
    '- [ ] Follow-up: same text',
    '- [ ] Follow-up: same text',
  ].join('\n');
  const newBody = [
    '- [x] Follow-up: same text',
    '- [x] Follow-up: same text',
  ].join('\n');
  const result = findNewlyCheckedFollowUps(oldBody, newBody);
  assert.deepStrictEqual(result, ['same text']);
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exit(1);
}
