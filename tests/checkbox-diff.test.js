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

// 1. Single item checked
run('single follow-up newly checked', () => {
  const oldB = '- [ ] Follow-up: refactor foo';
  const newB = '- [x] Follow-up: refactor foo';
  const r = findNewlyCheckedFollowUps(oldB, newB);
  assert.strictEqual(r.length, 1);
  assert.strictEqual(r[0].description, 'refactor foo');
});

// 2. Multiple items checked in one edit
run('multiple newly checked', () => {
  const oldB = '- [ ] Follow-up: a\n- [ ] Follow-up: b\n- [ ] Follow-up: c';
  const newB = '- [x] Follow-up: a\n- [x] Follow-up: b\n- [ ] Follow-up: c';
  const r = findNewlyCheckedFollowUps(oldB, newB);
  assert.strictEqual(r.length, 2);
});

// 3. Non-follow-up checkbox checked -> ignored
run('non follow-up checkbox ignored', () => {
  const oldB = '- [ ] something else';
  const newB = '- [x] something else';
  const r = findNewlyCheckedFollowUps(oldB, newB);
  assert.strictEqual(r.length, 0);
});

// 4. Already checked in old -> not re-reported
run('already checked not re-reported', () => {
  const oldB = '- [x] Follow-up: a';
  const newB = '- [x] Follow-up: a';
  const r = findNewlyCheckedFollowUps(oldB, newB);
  assert.strictEqual(r.length, 0);
});

// 5. Null oldBody
run('null oldBody', () => {
  const r = findNewlyCheckedFollowUps(null, '- [x] Follow-up: a');
  assert.strictEqual(r.length, 0); // no prior unchecked state
});

// 6. Null newBody
run('null newBody', () => {
  const r = findNewlyCheckedFollowUps('- [ ] Follow-up: a', null);
  assert.strictEqual(r.length, 0);
});

// 7. Undefined both
run('undefined both', () => {
  const r = findNewlyCheckedFollowUps(undefined, undefined);
  assert.strictEqual(r.length, 0);
});

// 8. Reordered lines still match by normalized text
run('reordered lines match by text', () => {
  const oldB = '- [ ] Follow-up: alpha\n- [ ] Follow-up: beta';
  const newB = '- [ ] Follow-up: beta\n- [x] Follow-up: alpha';
  const r = findNewlyCheckedFollowUps(oldB, newB);
  assert.strictEqual(r.length, 1);
  assert.strictEqual(r[0].description, 'alpha');
});

// 9. Prefix casing variants
run('prefix casing variants', () => {
  const oldB = '- [ ] follow-up: lower\n- [ ] FOLLOW-UP: upper';
  const newB = '- [x] follow-up: lower\n- [x] FOLLOW-UP: upper';
  const r = findNewlyCheckedFollowUps(oldB, newB);
  assert.strictEqual(r.length, 2);
});

// 10. Whitespace/hyphen variants ("Follow up:", "Followup:")
run('whitespace and hyphen variants of prefix', () => {
  const oldB = '- [ ] Follow up: x\n- [ ] Followup: y';
  const newB = '- [x] Follow up: x\n- [x] Followup: y';
  const r = findNewlyCheckedFollowUps(oldB, newB);
  assert.strictEqual(r.length, 2);
});

// 11. Newly added AND checked in same edit -> not reported
run('newly added already checked not reported', () => {
  const oldB = '';
  const newB = '- [x] Follow-up: brand new item';
  const r = findNewlyCheckedFollowUps(oldB, newB);
  assert.strictEqual(r.length, 0);
});

// 12. Empty description ignored
run('empty description ignored', () => {
  const oldB = '- [ ] Follow-up: ';
  const newB = '- [x] Follow-up: ';
  const r = findNewlyCheckedFollowUps(oldB, newB);
  assert.strictEqual(r.length, 0);
});

// 13. Different bullet markers (* and +)
run('different bullet markers accepted', () => {
  const oldB = '* [ ] Follow-up: star\n+ [ ] Follow-up: plus';
  const newB = '* [x] Follow-up: star\n+ [x] Follow-up: plus';
  const r = findNewlyCheckedFollowUps(oldB, newB);
  assert.strictEqual(r.length, 2);
});

// 14. Indented checkbox
run('indented checkbox accepted', () => {
  const oldB = '    - [ ] Follow-up: indented';
  const newB = '    - [x] Follow-up: indented';
  const r = findNewlyCheckedFollowUps(oldB, newB);
  assert.strictEqual(r.length, 1);
});

// 15. Unchecking an item does not fire
run('unchecking does not fire', () => {
  const oldB = '- [x] Follow-up: a';
  const newB = '- [ ] Follow-up: a';
  const r = findNewlyCheckedFollowUps(oldB, newB);
  assert.strictEqual(r.length, 0);
});

// 16. Mixed: one newly checked, one already checked, one unrelated
run('mixed scenario', () => {
  const oldB = [
    '- [ ] Follow-up: fresh',
    '- [x] Follow-up: old',
    '- [ ] something unrelated',
  ].join('\n');
  const newB = [
    '- [x] Follow-up: fresh',
    '- [x] Follow-up: old',
    '- [x] something unrelated',
  ].join('\n');
  const r = findNewlyCheckedFollowUps(oldB, newB);
  assert.strictEqual(r.length, 1);
  assert.strictEqual(r[0].description, 'fresh');
});

if (process.exitCode) {
  process.exit(process.exitCode);
}
