#!/usr/bin/env node
'use strict';

// Regression guard for the Neon preview-branch workflow (PR #16855 review).
// The original version shipped under `workflows/` (never executed by GitHub),
// advertised job outputs from a step id that did not exist, used floating
// action tags, had no permissions block, ran for fork/Dependabot PRs where
// NEON_API_KEY is unavailable, and deleted branches non-idempotently.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const { execFile } = require('node:child_process');
const yaml = require('yaml');

const root = path.resolve(__dirname, '..');
const workflowPath = path.join(root, '.github/workflows/neon-branch.yml');

test('Neon workflow lives where GitHub Actions reads workflows', () => {
  assert.ok(fs.existsSync(workflowPath), 'expected .github/workflows/neon-branch.yml');
  assert.ok(
    !fs.existsSync(path.join(root, 'workflows/NEON_Workflow.yaml')),
    'the inert copy under workflows/ must not come back'
  );
});

test('Neon is registered in the connections SSOT', () => {
  // docs/CONNECTIONS_REGISTRY_STANDARD.md: a new integration must be added to
  // config/connections.yml, or the generated registry views go stale.
  const registry = yaml.parse(fs.readFileSync(path.join(root, 'config/connections.yml'), 'utf8'));
  const neon = registry.connections.find((c) => c.id === 'neon');
  assert.ok(neon, 'expected a `neon` entry in config/connections.yml');
  assert.equal(neon.env, 'NEON_API_KEY');
  assert.ok(neon.used_by.includes('neon-branch.yml'));
});

test('Neon workflow is wired correctly', () => {
  const wf = fs.readFileSync(workflowPath, 'utf8');

  // Job outputs must read the step that actually exists, using the v6 action's
  // real output names (`db_url`, `db_url_pooled`).
  assert.doesNotMatch(wf, /create_neon_branch_encode/);
  assert.doesNotMatch(wf, /db_url_with_pooler/);
  assert.match(wf, /db_url_pooled:\s*\$\{\{ steps\.create_neon_branch\.outputs\.db_url_pooled \}\}/);

  // Least privilege, and no secret-less runs from forks or Dependabot.
  assert.match(wf, /^permissions:\n {2}contents: read$/m);
  assert.match(wf, /github\.event\.pull_request\.head\.repo\.full_name == github\.repository/);
  assert.match(wf, /github\.actor != 'dependabot\[bot\]'/);

  // Cleanup tolerates an already-expired branch without failing the check.
  assert.match(wf, /if: steps\.check_branch\.outputs\.exists == 'true'/);

  // CLAUDE.md gotcha #8: third-party actions pinned to full commit SHAs,
  // including the commented-out schema-diff example.
  const uses = wf.match(/uses:\s*\S+/g) || [];
  assert.ok(uses.length > 0, 'expected at least one action reference');
  for (const line of uses) {
    assert.match(line, /uses:\s*[\w.-]+\/[\w.-]+@[0-9a-f]{40}$/, `unpinned action: ${line}`);
  }
});

// ── branch lookup ───────────────────────────────────────────────────────────
//
// The lookup is inline in the workflow (it must run without a checkout), so the
// tests extract that exact `run:` block and execute it against a stub Neon API.
// Anything asserted here is therefore true of the code GitHub actually runs.

const BRANCH = 'preview/pr-1-feat';

function checkBranchScript() {
  const doc = yaml.parse(fs.readFileSync(workflowPath, 'utf8'));
  const step = doc.jobs.delete_neon_branch.steps.find((s) => s.id === 'check_branch');
  assert.ok(step && step.run, 'expected a check_branch step with a run: block');
  return step.run;
}

// Serves one stubbed page per request, in order, so a lookup that stops at page 1
// leaves entries unconsumed (asserted via `requests`).
async function stubNeon(pages) {
  const requests = [];
  const server = http.createServer((req, res) => {
    requests.push(req.url);
    if (req.headers.authorization !== 'Bearer test-key') {
      res.writeHead(401).end(JSON.stringify({ message: 'unauthorized' }));
      return;
    }
    const cursor = new URL(req.url, 'http://stub').searchParams.get('cursor');
    const page = pages.find((p) => (p.cursor ?? null) === cursor) || {};
    res.writeHead(page.status ?? 200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(page.body ?? {}));
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  return { requests, port: server.address().port, close: () => new Promise((r) => server.close(r)) };
}

// Runs the extracted step the way the runner does, and reports what it wrote to
// $GITHUB_OUTPUT (or how it failed).
function runCheckBranch({ port, apiKey = 'test-key' }) {
  const scriptPath = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'neon-step-')), 'check.sh');
  fs.writeFileSync(scriptPath, checkBranchScript());
  const outputFile = `${scriptPath}.output`;
  fs.writeFileSync(outputFile, '');

  return new Promise((resolve) => {
    execFile(
      'bash',
      [scriptPath],
      {
        env: {
          ...process.env,
          NEON_API_KEY: apiKey,
          NEON_PROJECT_ID: 'proj-1',
          NEON_BRANCH: BRANCH,
          NEON_API_HOST: `http://127.0.0.1:${port}/api/v2`,
          GITHUB_OUTPUT: outputFile,
        },
      },
      (error, stdout, stderr) => {
        resolve({
          code: error ? error.code : 0,
          output: fs.readFileSync(outputFile, 'utf8').trim(),
          stdout,
          stderr,
        });
      }
    );
  });
}

test('cleanup lookup follows every page of the paginated listing', async () => {
  // Regression: a single unpaginated request missed the branch when it sat past
  // page 1, so cleanup skipped a delete it should have done and the preview
  // branch (and its cost) survived until expiry.
  const neon = await stubNeon([
    { cursor: null, body: { branches: [{ name: 'preview/pr-2-other' }], pagination: { next: 'cur2' } } },
    { cursor: 'cur2', body: { branches: [{ name: BRANCH }] } },
  ]);
  try {
    const result = await runCheckBranch({ port: neon.port });
    assert.equal(result.code, 0, result.stderr);
    assert.equal(result.output, 'exists=true');
    assert.equal(neon.requests.length, 2);
    assert.match(neon.requests[0], /search=preview%2Fpr-1-feat/);
    assert.match(neon.requests[1], /cursor=cur2/);
  } finally {
    await neon.close();
  }
});

test('cleanup lookup reports a genuinely absent branch, and stops on a repeated cursor', async () => {
  const neon = await stubNeon([
    { cursor: null, body: { branches: [{ name: 'main' }], pagination: { next: 'loop' } } },
    { cursor: 'loop', body: { branches: [{ name: 'main' }], pagination: { next: 'loop' } } },
  ]);
  try {
    const result = await runCheckBranch({ port: neon.port });
    assert.equal(result.code, 0, result.stderr);
    assert.equal(result.output, 'exists=false');
    assert.equal(neon.requests.length, 2, 'a repeated cursor must not loop forever');
  } finally {
    await neon.close();
  }
});

test('cleanup lookup fails loudly on a rejected API key', async () => {
  // Regression: the Authorization header was once emitted as literal `******`,
  // so every request 401'd. Silently reading that as "branch absent" would skip
  // cleanup on every closed PR; it must fail the job instead.
  const neon = await stubNeon([{ cursor: null, body: { branches: [] } }]);
  try {
    const result = await runCheckBranch({ port: neon.port, apiKey: 'wrong-key' });
    assert.notEqual(result.code, 0);
    assert.match(result.stdout, /HTTP 401/);
    assert.equal(result.output, '');
  } finally {
    await neon.close();
  }
});

test('cleanup lookup fails loudly on a malformed 200 (no branches array)', async () => {
  const neon = await stubNeon([{ cursor: null, body: { message: 'unexpected payload' } }]);
  try {
    const result = await runCheckBranch({ port: neon.port });
    assert.notEqual(result.code, 0);
    assert.match(result.stdout, /malformed response/);
    assert.equal(result.output, '');
  } finally {
    await neon.close();
  }
});

test('cleanup lookup keeps the API key out of argv', () => {
  // CLAUDE.md gotcha #4: a secret on a command line is readable via ps/proc.
  const script = checkBranchScript();
  assert.doesNotMatch(script, /-H\s+"Authorization/);
  assert.match(script, /curl[^|]*--config -/s);
});
