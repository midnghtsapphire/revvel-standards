import assert from 'node:assert';
import { detectDuplicatedBlocks, detectUnresolvedConflicts, detectUnimplementedSuggestions } from '../action/run-prosecutor.mjs';

function testDuplicates() {
  const diffText = `
diff --git a/test.js b/test.js
--- a/test.js
+++ b/test.js
@@ -1,3 +1,6 @@
+function test() {
+  console.log("hello");
+}
+function test() {
+  console.log("hello");
+}
`;

  const duplicates = detectDuplicatedBlocks(diffText);
  assert(duplicates.length > 0, 'Should detect duplicate block');
  console.log('testDuplicates passed');
}

function testConflicts() {
  const diffText = `
diff --git a/test.js b/test.js
--- a/test.js
+++ b/test.js
@@ -1,3 +1,6 @@
+<<<<<<< HEAD
+function test() {
+=======
+function test2() {
+>>>>>>> main
`;

  const conflicts = detectUnresolvedConflicts(diffText);
  assert(conflicts.length > 0, 'Should detect unresolved conflict');
  console.log('testConflicts passed');
}

function testUnimplementedSuggestions() {
  const diffText = `
diff --git a/test.js b/test.js
--- a/test.js
+++ b/test.js
@@ -1,3 +1,6 @@
+function sayHello() {
+  console.log("hello");
+}
`;

  const comments = [
    {
      body: "You should use `console.error` instead:\n```javascript\nfunction sayHello() {\n  console.error(\"hello\");\n}\n```",
      html_url: "http://example.com/comment1",
      user: { login: "reviewer1" }
    },
    {
      body: "This is implemented:\n```javascript\nfunction sayHello() {\n  console.log(\"hello\");\n}\n```",
      html_url: "http://example.com/comment2",
      user: { login: "reviewer2" }
    }
  ];

  const unimplemented = detectUnimplementedSuggestions(diffText, comments);

  assert.strictEqual(unimplemented.length, 1, 'Should detect exactly 1 unimplemented suggestion');
  assert.strictEqual(unimplemented[0].user, "reviewer1", 'Should identify the correct unimplemented comment');

  console.log('testUnimplementedSuggestions passed');
}

testDuplicates();
testConflicts();
testUnimplementedSuggestions();
