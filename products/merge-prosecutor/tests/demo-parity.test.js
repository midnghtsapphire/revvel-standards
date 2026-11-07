import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as action from '../action/run-prosecutor.mjs';
import * as page from '../browser/checks.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const pageHtml = readFileSync(join(here, '../../../docs/merge-prosecutor/index.html'), 'utf8');

const names = [
  'detectDuplicatedBlocks',
  'detectUnresolvedConflicts',
  'detectUnimplementedSuggestions',
  'isDismissiveComment',
  'isHumanReviewer',
  'extractCodeBlocks',
  'suggestionLineMatches'
];

test('the live page loads the browser checks and can be operated from the keyboard', () => {
  assert.match(pageHtml, /from '\.\.\/\.\.\/products\/merge-prosecutor\/browser\/checks\.mjs'/);
  assert.match(pageHtml, /<label for="diff">/);
  assert.match(pageHtml, /<label for="comment">/);
  assert.match(pageHtml, /id="run"/);
  assert.match(pageHtml, /aria-live="polite"/);
  assert.match(pageHtml, /does not open a GitHub issue/);
  assert.match(pageHtml, /refuses an empty diff/);
});

test('browser checks match the Action on the fixtures the gate cares about', () => {
  const keepBoth = `
+++ b/test.js
+function test() {
+  console.log("hello");
+}
+function test() {
+  console.log("hello");
+}
`;
  const idiom = `
+++ b/action/run-prosecutor.mjs
+async function fetchComments(response) {
+  const body = await response.text().catch(() => '');
+  throw new GitHubApiError('comments failed ' + body.slice(0, 200));
+}
+async function fetchDiff(response) {
+  const extra = 'unrelated added line so the two copies are not back-to-back';
+  const more = 'another separator so keep-both cannot align on a 2-line window';
+  const body = await response.text().catch(() => '');
+  throw new GitHubApiError('diff failed ' + body.slice(0, 200));
+}
`;
  const closerOnly = `
+++ b/test.js
+function test() {
+>>>>>>> main
`;
  const suggestionDiff = `
+++ b/test.js
+function sayHello() {
+  console.log("hello");
+}
`;
  const comments = [{
    body: "You should use `console.error` instead:\n```javascript\nfunction sayHello() {\n  console.error(\"hello\");\n}\n```",
    html_url: 'http://example.com/comment1',
    user: { login: 'reviewer1' }
  }];

  assert.deepEqual(page.detectDuplicatedBlocks(keepBoth), action.detectDuplicatedBlocks(keepBoth));
  assert.equal(page.detectDuplicatedBlocks(keepBoth).length > 0, true);
  assert.deepEqual(page.detectDuplicatedBlocks(idiom), action.detectDuplicatedBlocks(idiom));
  assert.equal(page.detectDuplicatedBlocks(idiom).length, 0);
  assert.deepEqual(page.detectUnresolvedConflicts(closerOnly), action.detectUnresolvedConflicts(closerOnly));
  assert.equal(page.detectUnresolvedConflicts(closerOnly).length, 1);
  assert.deepEqual(
    page.detectUnimplementedSuggestions(suggestionDiff, comments),
    action.detectUnimplementedSuggestions(suggestionDiff, comments)
  );
  assert.equal(page.isDismissiveComment('please leave items in the queue'), false);
  assert.equal(page.isDismissiveComment('not my bug, leave it'), true);
  assert.equal(action.isDismissiveComment('not my bug, leave it'), page.isDismissiveComment('not my bug, leave it'));

  for (const name of names) {
    assert.equal(typeof page[name], 'function');
    assert.equal(typeof action[name], 'function');
  }
});
