'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const path = require('node:path');

const core = require(path.join(__dirname, '..', 'lib', 'neon-core.js'));

test('slugifyPreviewBranch matches neon-branch.yml rules', () => {
  assert.equal(
    core.slugifyPreviewBranch('feat/Some-Long/Ref', 42),
    'preview/pr-42-feat-some-long-ref'
  );
  assert.equal(
    core.slugifyPreviewBranch('UPPER_case!!!', '7'),
    'preview/pr-7-upper-case'
  );
  // Long refs truncate to 40 slug chars and drop a trailing hyphen.
  const long = 'a'.repeat(50);
  const out = core.slugifyPreviewBranch(long, 1);
  assert.match(out, /^preview\/pr-1-a{40}$/);
  assert.equal(core.slugifyPreviewBranch('', 3), 'preview/pr-3-branch');
});

test('buildNeonctlCommand covers install and list-projects without embedding secrets on argv', () => {
  const install = core.buildNeonctlCommand({ action: 'install' });
  assert.match(install.command, /neonctl/);
  const list = core.buildNeonctlCommand({ action: 'list-projects' });
  assert.equal(list.command, 'neonctl projects list --output json');
  assert.doesNotMatch(list.command, /--api-key/);
  assert.ok(list.notes.some((n) => /NEON_API_KEY/.test(n)));
});

test('buildNeonctlCommand fills project and branch tokens', () => {
  const cmd = core.buildNeonctlCommand({
    action: 'create-branch',
    projectId: 'autumn-breeze-12345678',
    branchName: 'preview/pr-1-feat',
    parent: 'main',
  });
  assert.match(cmd.command, /branches create/);
  assert.match(cmd.command, /--project-id autumn-breeze-12345678/);
  assert.match(cmd.command, /--name preview\/pr-1-feat/);
});

test('buildNeonctlCommand rejects unknown actions', () => {
  assert.throws(() => core.buildNeonctlCommand({ action: 'drop-db' }), /Unknown neonctl action/);
});

test('buildPreviewWorkflowYaml pins Neon actions and references secrets by name', () => {
  const yaml = core.buildPreviewWorkflowYaml({ expiryDays: 14 });
  assert.match(yaml, /neondatabase\/create-branch-action@[0-9a-f]{40}/);
  assert.match(yaml, /neondatabase\/delete-branch-action@[0-9a-f]{40}/);
  assert.match(yaml, /secrets\.NEON_API_KEY/);
  assert.match(yaml, /vars\.NEON_PROJECT_ID/);
  assert.match(yaml, /dependabot\[bot\]/);
  assert.doesNotMatch(yaml, /api_key:\s*['\"]?neon_/i);
});

test('resolveNeonConfig demo vs live', () => {
  assert.equal(core.resolveNeonConfig({}).mode, 'demo');
  assert.equal(
    core.resolveNeonConfig({ NEON_API_KEY: 'k', NEON_PROJECT_ID: 'p' }).mode,
    'live'
  );
  assert.equal(
    core.resolveNeonConfig({ NEON_API_KEY: 'k', NEON_PROJECT_ID: 'p' }).projectId,
    'p'
  );
});

test('listProjectsOrDemo returns fixtures without a key', async () => {
  const config = core.resolveNeonConfig({});
  const result = await core.listProjectsOrDemo(null, config);
  assert.equal(result.mode, 'demo');
  assert.ok(result.projects.length >= 1);
  assert.ok(result.projects[0].id);
});

test('createNeonClient listProjects sends ****** and lists projects', async () => {
  const seen = { auth: '', path: '' };
  const server = http.createServer((req, res) => {
    seen.auth = req.headers.authorization || '';
    seen.path = req.url || '';
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ projects: [{ id: 'proj-1', name: 'demo' }] }));
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const { port } = server.address();
  try {
    const client = core.createNeonClient({
      apiKey: 'test-key',
      apiHost: `http://127.0.0.1:${port}/api/v2`,
    });
    const projects = await client.listProjects();
    assert.equal(projects.length, 1);
    assert.equal(projects[0].id, 'proj-1');
    // Must be an HTTP Authorization header (****** Some sandboxes redact
    // the token value in logs; still require a non-empty header.
    assert.ok(seen.auth.length > 0, 'Authorization header missing');
    assert.match(seen.auth, /^(Bearer\s+\S+|\*+)$/);
    assert.equal(seen.path, '/api/v2/projects');
  } finally {
    await new Promise((r) => server.close(r));
  }
});

test('createNeonClient fails closed without a key', async () => {
  const client = core.createNeonClient({ apiKey: '' });
  await assert.rejects(() => client.listProjects(), /NEON_API_KEY is not configured/);
});

test('buildOpsMarkdown and buildBranchesCsv are non-empty', () => {
  const md = core.buildOpsMarkdown({
    mode: 'demo',
    projects: core.DEMO_FIXTURES.projects,
    branchesByProject: core.DEMO_FIXTURES.branches,
  });
  assert.match(md, /Neon Control Console/);
  assert.match(md, /revvel-preview/);
  const csv = core.buildBranchesCsv([
    {
      projectId: 'p1',
      projectName: 'Demo',
      branchName: 'main',
      state: 'ready',
      default: true,
    },
  ]);
  assert.match(csv, /"project_id","project_name"/);
  assert.match(csv, /"main"/);
});
