import test from 'node:test';
import assert from 'node:assert/strict';
import {
  detectDuplicatedBlocks,
  detectUnresolvedConflicts,
  detectUnimplementedSuggestions,
  isHumanReviewer,
  isAiReviewerComment,
  extractCodeBlocks,
  suggestionLineMatches,
  isDismissiveComment,
  parseNextLink,
  fetchPaginatedJson,
  resolveDiff,
  GitHubApiError,
  computeLevenshtein,
  boundedLevenshtein
} from '../action/run-prosecutor.mjs';

test('bounded edit distance agrees with exact legacy distance for small strings and all limits', () => {
  const strings = [''];
  for (let length = 1; length <= 4; length++) {
    for (let bits = 0; bits < 2 ** length; bits++) strings.push(bits.toString(2).padStart(length, '0'));
  }
  for (const a of strings) for (const b of strings) {
    const exact = computeLevenshtein(a, b);
    for (let limit = 0; limit <= 5; limit++) {
      assert.equal(boundedLevenshtein(a, b, limit), Math.min(exact, limit + 1), JSON.stringify({ a, b, limit }));
    }
  }
});

test('bounded comparison aborts excessive work explicitly and skips impossible length gaps', () => {
  assert.equal(boundedLevenshtein('a'.repeat(10000), 'b', 2, { remaining: 0 }), 3);
  assert.throws(() => boundedLevenshtein('a'.repeat(1000), 'b'.repeat(1000), 200, { remaining: 10 }), /work budget exceeded/);
});

test('character-count lower bound preserves exact distances on mixed Unicode and reordered strings', () => {
  const strings = ['abcdabcd', 'dcbaabcd', 'aaaaaaa', 'bbbbbbb', 'a😀b', 'b😀a', 'e\u0301é', 'ééé', 'prefix-123-suffix', 'prefix-456-suffix'];
  for (const a of strings) for (const b of strings) for (let limit = 0; limit <= 8; limit++) {
    assert.equal(boundedLevenshtein(a, b, limit), Math.min(computeLevenshtein(a, b), limit + 1));
  }
});

test('actual batched webhook retry observations with multiline expected primitives are distinct cases', () => {
  const diff = `+++ b/arbitrary-observer.js
+assert.deepEqual(await drainPending(app, app.inbox), {
+  processed: 25, failed: 1, pending: 1, batches: 2,
+  status: 'retry_pending', exitCode: 1, publicCheckout: false,
+});
+assert.deepEqual(await drainPending(app, app.inbox), {
+  processed: 0, failed: 0, pending: 1, batches: 0,
+  status: 'retry_pending', exitCode: 1, publicCheckout: false,
+});
`;
  assert.deepEqual(detectDuplicatedBlocks(diff), []);
});

function newFileDiff(path, text) {
  const lines = text.split('\n');
  return `diff --git a/${path} b/${path}\n--- /dev/null\n+++ b/${path}\n@@ -0,0 +1,${lines.length} @@\n` + lines.map(line => '+' + line).join('\n');
}

test('whole strict JSON records are data independent of path, while code in .json remains checked', () => {
  const records = Array.from({ length: 96 }, (_, index) => ({ path: `standards/${index}.md`, bytes: 4558, sha256: String(index).padStart(64, '0'), status: 'read-complete' }));
  assert.deepEqual(detectDuplicatedBlocks(newFileDiff('arbitrary-runtime.js', JSON.stringify(records, null, 2))), []);
  const code = 'executeTask(context);\nrecordTaskResult(context);\nexecuteTask(context);\nrecordTaskResult(context);';
  assert.ok(detectDuplicatedBlocks(newFileDiff('records.json', code)).length > 0);
});

test('strict JSON duplicate keys fail exactly including escaped aliases, distinct object keys remain valid', () => {
  assert.throws(() => detectDuplicatedBlocks(newFileDiff('records.json', '{"key":1,"key":2}')), /Duplicate JSON object key/);
  assert.throws(() => detectDuplicatedBlocks(newFileDiff('records.json', '{"key":1,"\\u006bey":2}')), /Duplicate JSON object key/);
  assert.deepEqual(detectDuplicatedBlocks(newFileDiff('records.json', JSON.stringify([{ key: 'brace } and escaped " quote' }, { key: 2 }]))), []);
});

test('retained comments, unchanged context and separate hunks do not create adjacent copies', () => {
  const block = '+executeTask(context);\n+recordTaskResult(context);\n';
  for (const separator of [' unchanged_source();\n', '@@ -30,0 +35,2 @@\n', '+// retired historical implementation\n']) {
    assert.deepEqual(detectDuplicatedBlocks('+++ b/run.js\n' + block + separator + block), []);
  }
  assert.deepEqual(detectDuplicatedBlocks('+++ b/run.js\n+/* retained history\n' + block + block + '+*/\n'), []);
  assert.ok(detectDuplicatedBlocks('+++ b/run.js\n' + block + block).length > 0);
});

test('ordinary line comments and JSDoc cannot hide adjacent duplicate executable bodies', () => {
  const block = '+executeTask(context);\n+recordTaskResult(context);\n';
  for (const documentation of [
    '+// Explain the next invocation\n',
    '+/** Explain the next invocation */\n',
    '+/**\n+ * Explain the next invocation.\n+ * No behavior changes here.\n+ */\n',
    '+# Explain the next invocation\n',
  ]) {
    assert.ok(detectDuplicatedBlocks('+++ b/run.js\n' + block + documentation + block).length > 0, documentation);
  }
});

test('ordinary retired/history prose is documentation while explicit archive headers retain boundaries', () => {
  const block = '+executeTask(context);\n+recordTaskResult(context);\n';
  for (const comment of [
    '+// Process retired tasks before recording results.\n',
    '+// Explain the retained history before proceeding.\n',
    '+/** Read the historical implementation notes first. */\n',
  ]) assert.ok(detectDuplicatedBlocks('+++ b/run.js\n' + block + comment + block).length > 0, comment);
  for (const header of [
    '+// retired historical implementation\n',
    '+/* retained history */\n',
    '+// historical implementation\n',
    '+// REVVEL-DISABLED | AGENT: codex | DATE: 2026-11-10\n',
  ]) assert.deepEqual(detectDuplicatedBlocks('+++ b/run.js\n' + block + header + block), [], header);
});

test('unclosed added block comment cannot hide executable duplicates in another hunk or context region', () => {
  const block = '+executeTask(context);\n+recordTaskResult(context);\n';
  for (const boundary of ['@@ -20,0 +22,4 @@\n', ' unchanged_source();\n']) {
    const diff = '+++ b/run.js\n@@ -1,0 +1,1 @@\n+/* earlier partial comment\n' + boundary + block + block;
    assert.ok(detectDuplicatedBlocks(diff).length > 0, boundary);
  }
});

test('multiline JavaScript fixture content remains data while actual following copies are checked', () => {
  const block = '+executeTask(context);\n+recordTaskResult(context);\n';
  const fixture = '+++ b/arbitrary-source.js\n+const fixture = `\n' + block + block + '+`;\n';
  assert.deepEqual(detectDuplicatedBlocks(fixture), []);
  assert.ok(detectDuplicatedBlocks(fixture + block + block).length > 0);
});

test('template interpolations and tagged templates remain executable duplicate candidates', () => {
  const interpolation = '+${executeTask(context)}\n+${recordTaskResult(context)}\n';
  const diff = '+++ b/active.js\n+const results = `\n' + interpolation + interpolation + '+`;\n';
  assert.ok(detectDuplicatedBlocks(diff).length > 0, 'all four interpolation calls execute');
  const tagged = '+++ b/active.js\n+const results = executeTemplate`\n' + interpolation + interpolation + '+`;\n';
  assert.ok(detectDuplicatedBlocks(tagged).length > 0, 'tagged templates are never classified as inert data');
  const block = '+executeTask(context);\n+recordTaskResult(context);\n';
  assert.deepEqual(detectDuplicatedBlocks('+++ b/active.js\n+const fixture = `\n' + block + block + '+`;\n'), []);
});

test('odd backticks in a regex literal cannot hide following executable duplicates', () => {
  const diff = '+++ b/active.js\n+const CODE_BLOCK_RE = /```[^`]*```/g;\n' +
    '+executeTask(context);\n+recordTaskResult(context);\n+executeTask(context);\n+recordTaskResult(context);\n';
  assert.ok(detectDuplicatedBlocks(diff).length > 0);
});

test('distinct state assertions and CLI exception cases are not keep-both application logic', () => {
  const states = `+++ b/observer.js
+assert.deepEqual(await app.processPending(), { processed: 0, failed: 1 });
+assert.equal((await fetch(\`\${app.base}/health\`)).status, 503);
+assert.equal(app.inbox.db.prepare('SELECT last_error FROM inbox').get().last_error, 'reconciliation_failed');
+assert.deepEqual(await app.processPending(), { processed: 0, failed: 0 });
+assert.equal((await fetch(\`\${app.base}/health\`)).status, 503);
`;
  assert.deepEqual(detectDuplicatedBlocks(states), []);
  const cli = `+++ b/cli.py
+with self.assertRaises(ValueError):
+    main([*arguments, '--issue', '18337'])
+with self.assertRaises(ValueError):
+    main([*arguments, '--resume', 'continue'])
`;
  assert.deepEqual(detectDuplicatedBlocks(cli), []);
  const repeated = '+assert.equal(first, expected);\n+assert.equal(second, expected);\n';
  assert.ok(detectDuplicatedBlocks('+++ b/check.js\n' + repeated + repeated).length > 0);
});

test('detects duplicate added blocks', () => {
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
  assert.ok(duplicates.length > 0, 'Should detect duplicate block');
});

test('distinct real HULL parser option identities are not duplicate merge blocks', () => {
  const diff = `+++ b/scripts/wr_langgraph.py
+parser.add_argument('--skills-dir', type=Path, required=True)
+parser.add_argument('--mapping', type=Path, required=True)
+parser.add_argument('--policy', type=Path, required=True)
+parser.add_argument('--receipts', type=Path, required=True)
`;
  assert.deepEqual(detectDuplicatedBlocks(diff), []);
});

test('repeated parser option identities remain a duplicate even with changed defaults', () => {
  const diff = `+++ b/cli.py
+parser.add_argument('--policy', type=Path, required=True, default='one')
+parser.add_argument('--receipts', type=Path, required=True)
+parser.add_argument('--policy', type=Path, required=True, default='two')
+parser.add_argument('--receipts', type=Path, required=True)
`;
  assert.ok(detectDuplicatedBlocks(diff).length > 0);
});

test('overlapping option aliases are not exempted as distinct first literals', () => {
  const diff = `+++ b/cli.py
+parser.add_argument('-p', '--policy', type=Path, required=True)
+parser.add_argument('--receipts', type=Path, required=True)
+parser.add_argument('-P', '--policy', type=Path, required=True)
+parser.add_argument('--reports', type=Path, required=True)
`;
  assert.ok(detectDuplicatedBlocks(diff).length > 0);
});

test('near duplicate executable blocks still detect a real keep-both merge', () => {
  const diff = `+++ b/run.js
+function dispatchTask(context) {
+  const result = executeTask(context, 'primary');
+  recordTaskResult(context, result);
+}
+function dispatchTask(context) {
+  const result = executeTask(context, 'secondary');
+  recordTaskResult(context, result);
+}
`;
  assert.ok(detectDuplicatedBlocks(diff).length > 0);
});

test('does not flag a reused fail-closed idiom in two distant functions', () => {
  const diffText = `
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
  const duplicates = detectDuplicatedBlocks(diffText);
  assert.equal(duplicates.length, 0, 'reused error handling is not a keep-both merge');
});

test('does not flag similar test fixtures scattered through one file', () => {
  const diffText = `
+++ b/tests/prosecutor.test.js
+  const diffText = \`
+function sayHello() {
+  console.log("hello");
+}
+\`;
+  const comments = [{ user: { login: "reviewer1" } }];
+  const fetchImpl = async (url) => jsonResponse([], { ok: false, status: 403 });
+  const later = \`
+function sayHello() {
+  console.log("hello");
+}
+\`;
+  const fetchImpl2 = async () => jsonResponse(null, { ok: false, status: 502 });
`;
  const duplicates = detectDuplicatedBlocks(diffText);
  assert.equal(duplicates.length, 0, 'repeated fixtures are not a keep-both merge');
});

test('detects unresolved conflict markers', () => {
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
  assert.ok(conflicts.length > 0, 'Should detect unresolved conflict');
});

test('detects unimplemented console.error suggestion vs console.log add', () => {
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

  assert.equal(unimplemented.length, 1, 'Should detect exactly 1 unimplemented suggestion');
  assert.equal(unimplemented[0].user, "reviewer1", 'Should identify the correct unimplemented comment');
});

test('extracts fenced code with CRLF and mixed-case language tags', () => {
  const crlfBody = "please apply:\r\n```JavaScript\r\nfunction sayHello() {\r\n  console.error(\"hello\");\r\n}\r\n```\r\n";
  const blocks = extractCodeBlocks(crlfBody);
  assert.equal(blocks.length, 1, 'CRLF + JavaScript fence must yield a block');
  assert.match(blocks[0], /console\.error/);
});

test('extracts fenced code with c++ language tag (non [a-z] chars)', () => {
  const body = "```c++\nint main() { return 0; }\n```";
  const blocks = extractCodeBlocks(body);
  assert.equal(blocks.length, 1);
  assert.match(blocks[0], /int main/);
});

test('old [a-z]*\\n regex would miss these fences — detector still sees the suggestion', () => {
  const oldRegex = /```[a-z]*\n([\s\S]*?)```/gi;
  const crlfBody = "```JavaScript\r\nfunction sayHello() {\r\n  console.error(\"hello\");\r\n}\r\n```";
  assert.equal(oldRegex.exec(crlfBody), null, 'control: legacy regex misses CRLF + JavaScript');

  const diffText = `
+++ b/test.js
+function sayHello() {
+  console.log("hello");
+}
`;
  const unimplemented = detectUnimplementedSuggestions(diffText, [{
    body: crlfBody,
    html_url: "http://example.com/crlf",
    user: { login: "jules" }
  }]);
  assert.equal(unimplemented.length, 1, 'hardened extractor must still prosecute the CRLF suggestion');
});

test('does not treat a substring hit as an implemented suggestion line', () => {
  assert.equal(suggestionLineMatches('console.log', 'console.log("hello");'), false);
  assert.equal(suggestionLineMatches('console.log("hello");', 'console.log("hello");'), true);

  const diffText = `
+++ b/test.js
+  console.log("hello");
`;
  const comments = [{
    body: "use the exact call:\n```javascript\nconsole.log\n```",
    html_url: "http://example.com/substr",
    user: { login: "reviewer" }
  }];
  const unimplemented = detectUnimplementedSuggestions(diffText, comments);
  assert.equal(
    unimplemented.length,
    1,
    'includes() would have counted console.log inside console.log("hello"); as implemented'
  );
});

test('ignores bot-authored fenced comments so CI bots do not fail every PR', () => {
  const diffText = `
+++ b/test.js
+function sayHello() {
+  console.log("hello");
+}
`;
  const comments = [
    {
      body: "```javascript\nfunction unusedExample() {\n  return 42;\n}\n```",
      html_url: "http://example.com/bot",
      user: { login: "github-actions[bot]", type: "Bot" }
    }
  ];
  const unimplemented = detectUnimplementedSuggestions(diffText, comments);
  assert.equal(unimplemented.length, 0);
  assert.equal(isHumanReviewer(comments[0]), false);
  assert.equal(isHumanReviewer({ user: { login: "reviewer1" } }), true);
});

test('dismissive regex is word-bounded (leave items is not leave it)', () => {
  assert.equal(isDismissiveComment('not my bug'), true);
  assert.equal(isDismissiveComment('Not my error, leave it.'), true);
  assert.equal(isDismissiveComment('this is out of scope for this PR'), true);
  assert.equal(isDismissiveComment('not my fault'), true);
  assert.equal(isDismissiveComment('not my code'), true);
  assert.equal(isDismissiveComment('ignore it please'), true);
  assert.equal(isDismissiveComment('just ignore this'), true);
  assert.equal(isDismissiveComment("won't fix"), true);
  assert.equal(isDismissiveComment('please leave items in the queue'), false);
  assert.equal(isDismissiveComment('leave iteration counter alone'), false);
  assert.equal(isDismissiveComment('looks good to me'), false);
});

test('parseNextLink reads GitHub Link header', () => {
  const header = '<https://api.github.com/repos/o/r/issues/1/comments?page=2>; rel="next", <https://api.github.com/repos/o/r/issues/1/comments?page=4>; rel="last"';
  assert.equal(
    parseNextLink(header),
    'https://api.github.com/repos/o/r/issues/1/comments?page=2'
  );
  assert.equal(parseNextLink(null), null);
  assert.equal(parseNextLink(''), null);
});

function jsonResponse(items, { ok = true, status = 200, statusText = 'OK', link = null, body = '' } = {}) {
  return {
    ok,
    status,
    statusText,
    headers: {
      get(name) {
        return String(name).toLowerCase() === 'link' ? link : null;
      }
    },
    async json() {
      return items;
    },
    async text() {
      return body;
    }
  };
}

test('fetchPaginatedJson walks page 1 then page 2', async () => {
  const calls = [];
  const fetchImpl = async (url) => {
    calls.push(url);
    const page = new URL(url).searchParams.get('page') || '1';
    if (page === '1') {
      return jsonResponse([{ id: 1, body: 'first page comment' }], {
        link: '<https://api.github.com/repos/o/r/issues/9/comments?page=2&per_page=100>; rel="next"'
      });
    }
    if (url.includes('page=2')) {
      return jsonResponse([{ id: 2, body: 'second page comment' }]);
    }
    throw new Error(`unexpected url ${url}`);
  };

  const rows = await fetchPaginatedJson(
    'https://api.github.com/repos/o/r/issues/9/comments',
    { token: 't', fetchImpl }
  );
  assert.equal(rows.length, 2);
  assert.equal(rows[1].body, 'second page comment');
  assert.ok(calls.length >= 2, 'must not stop after page 1');
});

test('fetchPaginatedJson fail-closes on 403 instead of returning []', async () => {
  const fetchImpl = async (url) => jsonResponse([], {
    ok: false,
    status: 403,
    statusText: 'Forbidden',
    body: 'nope'
  });

  await assert.rejects(
    () => fetchPaginatedJson('https://api.github.com/repos/o/r/issues/9/comments', { token: 't', fetchImpl }),
    (err) => err instanceof GitHubApiError && err.status === 403
  );
});

test('fetchPaginatedJson fail-closes on non-array JSON', async () => {
  const fetchImpl = async () => ({
    ok: true,
    status: 200,
    statusText: 'OK',
    headers: { get() { return null; } },
    async json() { return { message: 'not a list' }; },
    async text() { return ''; }
  });

  await assert.rejects(
    () => fetchPaginatedJson('https://api.github.com/repos/o/r/issues/9/comments', { token: 't', fetchImpl }),
    GitHubApiError
  );
});

test('resolveDiff fail-closes when the diff API errors', async () => {
  const fetchImpl = async () => jsonResponse(null, {
    ok: false,
    status: 502,
    statusText: 'Bad Gateway',
    body: 'upstream'
  });

  await assert.rejects(
    () => resolveDiff({ token: 't', repo: 'o/r', prNumber: '1', diffContent: '', fetchImpl }),
    (err) => err instanceof GitHubApiError && err.status === 502
  );
});

test('resolveDiff fail-closes when credentials and DIFF_CONTENT are missing', async () => {
  await assert.rejects(
    () => resolveDiff({ token: '', repo: '', prNumber: '', diffContent: '' }),
    GitHubApiError
  );
});

test('resolveDiff uses provided DIFF_CONTENT without calling fetch', async () => {
  let called = 0;
  const fetchImpl = async () => {
    called += 1;
    throw new Error('should not fetch');
  };
  const text = await resolveDiff({
    token: 't',
    repo: 'o/r',
    prNumber: '1',
    diffContent: 'diff --git a/x b/x\n',
    fetchImpl
  });
  assert.match(text, /diff --git/);
  assert.equal(called, 0);
});

test('AI reviewers posting through a human PAT are not human reviewers', () => {
  // Same PAT-backed account for all three — the account is what makes these
  // indistinguishable, so the marker in the body has to be the discriminator.
  const from = body => ({ user: { login: 'midnghtsapphire', type: 'User' }, body });
  const snippet = '```yaml\nenv:\n  WR_MODEL: example\n```';

  const aiComment = from(`<!-- ai-pr-reviewer -->\nAI Code Review\n${snippet}`);
  const summaryComment = from('Looks fine to me.\n\n#ai-review-summary');
  const humanComment = from(`Please rename this variable.\n${snippet}`);

  assert.equal(isAiReviewerComment(aiComment), true);
  assert.equal(isAiReviewerComment(summaryComment), true);
  assert.equal(isAiReviewerComment(humanComment), false);

  assert.equal(isHumanReviewer(aiComment), false);
  assert.equal(isHumanReviewer(summaryComment), false);
  assert.equal(isHumanReviewer(humanComment), true);

  // An AI snippet must not block the merge; a human one still must.
  const diffText = 'diff --git a/x.yml b/x.yml\n+          nothing: related\n';
  assert.equal(detectUnimplementedSuggestions(diffText, [aiComment]).length, 0);
  assert.equal(detectUnimplementedSuggestions(diffText, [humanComment]).length, 1);
});
