import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  fileWorkRequest,
  findingFingerprint,
  main,
  postProsecutionReport,
  prosecutionReportMarker,
  workRequestIssueTitle
} from '../action/run-prosecutor.mjs';

function jsonResponse(payload, { ok = true, status = 200, statusText = 'OK', link = null } = {}) {
  const text = typeof payload === 'string' ? payload : JSON.stringify(payload);
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
      return typeof payload === 'string' ? JSON.parse(payload) : payload;
    },
    async text() {
      return text;
    }
  };
}

test('work request title is the [WR] ignition the call chain reads', () => {
  assert.equal(
    workRequestIssueTitle('Fix Unresolved Merge Conflicts', '7'),
    '[WR] Fix Unresolved Merge Conflicts (PR #7)'
  );
  assert.equal(findingFingerprint(['conflicts', 'o/r', '7']).length, 20);
});

test('fileWorkRequest opens a GitHub issue and writes the runner file', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'mp-wr-'));
  const calls = [];
  const fetchImpl = async (url, opts = {}) => {
    calls.push({ url, method: opts.method || 'GET', body: opts.body });
    if (url.includes('/search/issues')) {
      return jsonResponse({ items: [] });
    }
    if (opts.method === 'POST' && url.endsWith('/issues')) {
      return jsonResponse({ number: 42, html_url: 'https://github.com/o/r/issues/42' });
    }
    throw new Error(`unexpected ${opts.method || 'GET'} ${url}`);
  };

  try {
    const filed = await fileWorkRequest({
      title: 'Fix Unresolved Merge Conflicts',
      issueContext: '- a.js: <<<<<<< HEAD',
      learnings: 'Conflict markers were left in the codebase.',
      rootDir: dir,
      token: 't',
      repo: 'o/r',
      prNumber: '7',
      kind: 'conflicts',
      detailKey: 'conflicts',
      fetchImpl
    });

    assert.equal(filed.issue.created, true);
    assert.equal(filed.issue.html_url, 'https://github.com/o/r/issues/42');
    assert.equal(filed.issueError, null);
    assert.equal(filed.issueTitle, '[WR] Fix Unresolved Merge Conflicts (PR #7)');
    const create = calls.find((call) => call.method === 'POST');
    const payload = JSON.parse(create.body);
    assert.match(payload.body, new RegExp(`mpkey${filed.fingerprint}`));
    assert.match(payload.body, /This GitHub issue is the Work Request/);
    const local = readFileSync(filed.localPath, 'utf8');
    assert.match(local, /https:\/\/github.com\/o\/r\/issues\/42/);
    assert.match(local, /runner is discarded when the job ends/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('fileWorkRequest does not open a second issue when the search token is already open', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'mp-wr-'));
  const calls = [];
  const fetchImpl = async (url, opts = {}) => {
    calls.push({ url, method: opts.method || 'GET' });
    if (url.includes('/search/issues')) {
      return jsonResponse({
        items: [{ number: 9, html_url: 'https://github.com/o/r/issues/9' }]
      });
    }
    throw new Error(`unexpected ${opts.method || 'GET'} ${url}`);
  };

  try {
    const filed = await fileWorkRequest({
      title: 'Fix Unresolved Merge Conflicts',
      issueContext: '- a.js: <<<<<<< HEAD',
      learnings: 'Conflict markers were left in the codebase.',
      rootDir: dir,
      token: 't',
      repo: 'o/r',
      prNumber: '7',
      kind: 'conflicts',
      detailKey: 'conflicts',
      fetchImpl
    });
    assert.equal(filed.issue.created, false);
    assert.equal(filed.issue.html_url, 'https://github.com/o/r/issues/9');
    assert.equal(calls.some((call) => call.method === 'POST'), false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('a 403 on issue create is returned, and the job is not told the WR exists', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'mp-wr-'));
  const fetchImpl = async (url, opts = {}) => {
    if (url.includes('/search/issues')) return jsonResponse({ items: [] });
    if (opts.method === 'POST') {
      return jsonResponse('nope', { ok: false, status: 403, statusText: 'Forbidden' });
    }
    throw new Error(`unexpected ${url}`);
  };

  const filed = await fileWorkRequest({
    title: 'Address Dismissive Comment from reviewer',
    issueContext: 'Body: not my bug',
    learnings: 'Dismissive comments need a real WR.',
    rootDir: dir,
    token: 't',
    repo: 'o/r',
    prNumber: '7',
    kind: 'dismissive',
    detailKey: 'https://github.com/o/r/pull/7#issuecomment-1',
    fetchImpl
  });

  assert.equal(filed.issue, null);
  assert.equal(filed.issueError.status, 403);
  assert.match(filed.issueError.message, /WR issue create failed/);
  assert.match(filed.issueError.message, /fork/);
  const local = readFileSync(filed.localPath, 'utf8');
  assert.match(local, /not opened on this run/);
  rmSync(dir, { recursive: true, force: true });
});

test('main files a [WR] issue for a conflict marker and fails the job', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'mp-main-'));
  const calls = [];
  const fetchImpl = async (url, opts = {}) => {
    calls.push({ url, method: opts.method || 'GET', body: opts.body });
    if (url.includes('/search/issues')) return jsonResponse({ items: [] });
    if (opts.method === 'POST' && url.endsWith('/repos/o/r/issues')) {
      return jsonResponse({ number: 42, html_url: 'https://github.com/o/r/issues/42' });
    }
    if (url.includes('/comments') && opts.method === 'POST') {
      return jsonResponse({ id: 1 });
    }
    if (url.includes('/comments')) return jsonResponse([]);
    throw new Error(`unexpected ${opts.method || 'GET'} ${url}`);
  };

  const previous = process.exitCode;
  process.exitCode = undefined;
  try {
    await main({
      GITHUB_TOKEN: 't',
      GITHUB_REPOSITORY: 'o/r',
      PR_NUMBER: '7',
      DIFF_CONTENT: '+++ b/a.js\n+<<<<<<< HEAD\n+const x = 1;\n',
      WORKSPACE_DIR: dir,
      TEST_COMMAND: ''
    }, fetchImpl);
    assert.equal(process.exitCode, 1);
    const create = calls.find((call) => call.method === 'POST' && call.url.endsWith('/repos/o/r/issues'));
    assert.ok(create, 'expected an issue create');
    const payload = JSON.parse(create.body);
    assert.match(payload.title, /^\[WR\] Fix Unresolved Merge Conflicts \(PR #7\)$/);
    const report = calls.find((call) => call.method === 'POST' && call.url.includes('/comments'));
    assert.ok(report, 'expected a pull request report comment');
    assert.match(JSON.parse(report.body).body, /https:\/\/github.com\/o\/r\/issues\/42/);
  } finally {
    process.exitCode = previous;
    rmSync(dir, { recursive: true, force: true });
  }
});

test('main files a WR for a dismissive comment on an otherwise clean diff', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'mp-main-'));
  const calls = [];
  const fetchImpl = async (url, opts = {}) => {
    calls.push({ url, method: opts.method || 'GET', body: opts.body });
    if (url.includes('/search/issues')) return jsonResponse({ items: [] });
    if (opts.method === 'POST' && url.endsWith('/repos/o/r/issues')) {
      return jsonResponse({ number: 43, html_url: 'https://github.com/o/r/issues/43' });
    }
    if (url.includes('/comments') && opts.method === 'POST') return jsonResponse({ id: 2 });
    if (url.includes('/issues/7/comments')) {
      return jsonResponse([{
        id: 5,
        body: 'not my bug, leave it',
        html_url: 'https://github.com/o/r/pull/7#issuecomment-5',
        user: { login: 'reviewer', type: 'User' }
      }]);
    }
    if (url.includes('/comments')) return jsonResponse([]);
    throw new Error(`unexpected ${opts.method || 'GET'} ${url}`);
  };

  const previous = process.exitCode;
  process.exitCode = undefined;
  try {
    await main({
      GITHUB_TOKEN: 't',
      GITHUB_REPOSITORY: 'o/r',
      PR_NUMBER: '7',
      DIFF_CONTENT: '+++ b/a.js\n+const ok = true;\n',
      WORKSPACE_DIR: dir,
      TEST_COMMAND: ''
    }, fetchImpl);
    assert.equal(process.exitCode, 1);
    const create = calls.find((call) => call.method === 'POST' && call.url.endsWith('/repos/o/r/issues'));
    const payload = JSON.parse(create.body);
    assert.match(payload.title, /Address Dismissive Comment from reviewer/);
    assert.match(payload.body, /not my bug, leave it/);
  } finally {
    process.exitCode = previous;
    rmSync(dir, { recursive: true, force: true });
  }
});

test('prosecution report is not posted twice for the same findings', async () => {
  const filings = [{
    fingerprint: 'def',
    issueTitle: '[WR] x',
    issue: { html_url: 'https://example.test/1', created: true }
  }];
  const marker = prosecutionReportMarker(filings.map((filing) => filing.fingerprint));
  let posts = 0;
  const fetchImpl = async () => {
    posts += 1;
    return jsonResponse({ id: 1 });
  };
  const result = await postProsecutionReport({
    token: 't',
    repo: 'o/r',
    prNumber: '7',
    filings,
    existingComments: [{ body: `hello\n${marker}\n` }],
    fetchImpl
  });
  assert.equal(result, null);
  assert.equal(posts, 0);
});
