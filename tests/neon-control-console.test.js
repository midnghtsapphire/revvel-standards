#!/usr/bin/env node
'use strict';

/**
 * Root regression guard for products/neon-control-console (WR #16816).
 * Requires the pure CommonJS core — no Next.js runtime.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');

const root = path.resolve(__dirname, '..');
const productDir = path.join(root, 'products', 'neon-control-console');
const core = require(path.join(productDir, 'lib', 'neon-core.js'));

test('neon-control-console product layout ships complete surfaces', () => {
  const required = [
    'package.json',
    'README.md',
    'lib/neon-core.js',
    'app/page.tsx',
    'app/layout.tsx',
    'app/api/status/route.ts',
    'app/api/projects/route.ts',
    'app/api/branches/route.ts',
    'app/api/cli/route.ts',
    'app/api/workflow/route.ts',
    'tests/neon-core.test.js',
    '.env.example',
    'vercel.json',
  ];
  for (const rel of required) {
    assert.ok(
      fs.existsSync(path.join(productDir, rel)),
      `missing ${rel}`
    );
  }

  const readme = fs.readFileSync(path.join(productDir, 'README.md'), 'utf8');
  assert.match(readme, /## Live Deployment/);
  assert.match(readme, /revvel-standards\.vercel\.app\/docs\/neon-control-console/);
  assert.match(readme, /NEON_API_KEY/);
  assert.match(readme, /neonctl/);

  const envExample = fs.readFileSync(path.join(productDir, '.env.example'), 'utf8');
  assert.match(envExample, /^NEON_API_KEY=/m);
  assert.match(envExample, /^NEON_PROJECT_ID=/m);
  // Never ship real secret values.
  assert.doesNotMatch(envExample, /napi_[A-Za-z0-9]/);
});

test('docs live page and APP_REGISTRY list the product', () => {
  const docsIndex = path.join(root, 'docs', 'neon-control-console', 'index.html');
  assert.ok(fs.existsSync(docsIndex), 'docs/neon-control-console/index.html');
  const html = fs.readFileSync(docsIndex, 'utf8');
  assert.match(html, /neon-control-console/);
  assert.match(html, /Live deployment/i);

  const registry = fs.readFileSync(path.join(root, 'docs', 'APP_REGISTRY.md'), 'utf8');
  assert.match(registry, /neon-control-console/);

  const agents = fs.readFileSync(path.join(root, 'AGENTS.md'), 'utf8');
  assert.match(agents, /neon-control-console/);
  assert.match(agents, /3012/);
});

test('connections registry documents Neon API + console product', () => {
  const yaml = fs.readFileSync(path.join(root, 'config', 'connections.yml'), 'utf8');
  assert.match(yaml, /id:\s*neon\b/);
  assert.match(yaml, /NEON_API_KEY/);
  assert.match(yaml, /neon-control-console/);
  assert.match(yaml, /neon-branch\.yml/);
});

test('core: preview slug + workflow + cli generators are coherent', () => {
  const name = core.slugifyPreviewBranch('feat/Neon-CLI', 16816);
  assert.equal(name, 'preview/pr-16816-feat-neon-cli');

  const cli = core.buildNeonctlCommand({
    action: 'create-branch',
    projectId: 'proj_x',
    branchName: name,
  });
  assert.match(cli.command, /neonctl branches create/);
  assert.match(cli.command, /preview\/pr-16816-feat-neon-cli/);
  assert.doesNotMatch(cli.command, /--api-key/);

  const wf = core.buildPreviewWorkflowYaml();
  assert.match(wf, /create-branch-action@[0-9a-f]{40}/);
  assert.match(wf, /secrets\.NEON_API_KEY/);
});

test('core: demo fixtures and live client path', async () => {
  const demo = await core.listProjectsOrDemo(null, { mode: 'demo' });
  assert.equal(demo.mode, 'demo');
  assert.ok(demo.projects.length > 0);

  const branches = await core.listBranchesOrDemo(
    null,
    { mode: 'demo' },
    demo.projects[0].id
  );
  assert.ok(Array.isArray(branches.branches));

  const server = http.createServer((req, res) => {
    const auth = req.headers.authorization || '';
    const ok = /^(Bearer\s+\S+|\*+)$/.test(auth);
    if (!ok) {
      res.writeHead(401).end(JSON.stringify({ message: 'nope' }));
      return;
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ projects: [{ id: 'live-1', name: 'Live' }] }));
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  try {
    const port = server.address().port;
    const client = core.createNeonClient({
      apiKey: 'unit-test-key',
      apiHost: `http://127.0.0.1:${port}`,
    });
    const projects = await client.listProjects();
    assert.equal(projects[0].id, 'live-1');
  } finally {
    await new Promise((r) => server.close(r));
  }
});

test('SECRETS_MAP documents Neon secret names only', () => {
  const secretsMap = path.join(root, 'docs', 'SECRETS_MAP.md');
  assert.ok(fs.existsSync(secretsMap), 'docs/SECRETS_MAP.md must exist');
  const body = fs.readFileSync(secretsMap, 'utf8');
  assert.match(body, /NEON_API_KEY/);
  assert.match(body, /NEON_PROJECT_ID/);
  assert.doesNotMatch(body, /napi_[A-Za-z0-9]{8,}/);
});
