import assert from 'node:assert';
import { detectDuplicatedBlocks, detectUnresolvedConflicts } from '../action/run-prosecutor.mjs';

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

testDuplicates();
testConflicts();
