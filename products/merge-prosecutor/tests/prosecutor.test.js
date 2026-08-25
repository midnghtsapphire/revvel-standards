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
  GitHubApiError
} from '../action/run-prosecutor.mjs';

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
