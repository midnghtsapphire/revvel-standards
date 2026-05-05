#!/usr/bin/env node
'use strict';

/**
 * Regression tests for the in-tree WR / PR Control Plane MCP server.
 *
 * The server is implemented in Python at
 *   mcp-servers/wr-control-plane/wr_control_plane/server.py
 * and is wired into:
 *   - .mcp.json (disabled by default until credentials are provisioned)
 *   - .env.example
 *   - templates/mcp/.env.mcp.example
 *   - templates/mcp/mcp.revvel-custom.json
 *   - scripts/setup-mcp.sh
 *   - docs/MCP_REVVEL_CATALOG.md
 *
 * These tests assert:
 *   1. The Python source files exist and compile cleanly (no syntax errors).
 *   2. The server module imports and exposes the documented tools/resources
 *      via the FastMCP compatibility shim — no FastMCP install required.
 *   3. URL extraction, integration detection, PDF detection, and the
 *      credential matrix all behave correctly on representative WR text.
 *   4. control_plane_status() returns a structured readiness payload.
 *   5. render_control_plane_mcp_entry() returns the documented .mcp.json
 *      entry for both `repo` and `template` profiles.
 *   6. Documentation, env templates, and config templates reference the
 *      server consistently.
 */

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');
const SERVER_DIR = path.join(REPO_ROOT, 'mcp-servers', 'wr-control-plane');
const SERVER_FILE = path.join(SERVER_DIR, 'wr_control_plane', 'server.py');
const PYPROJECT = path.join(SERVER_DIR, 'pyproject.toml');
const README = path.join(SERVER_DIR, 'README.md');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`PASS: ${name}`);
    passed++;
  } catch (e) {
    console.log(`FAIL: ${name}\n    ${e.stack || e.message}`);
    failed++;
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg || 'assertion failed');
}

function assertEq(a, b, msg) {
  if (JSON.stringify(a) !== JSON.stringify(b)) {
    throw new Error(`${msg || 'mismatch'}: expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
  }
}

function runPython(snippet) {
  const env = {
    ...process.env,
    PYTHONPATH: path.join(SERVER_DIR),
    GITHUB_TOKEN: '',
    OPENROUTER_API_KEY: '',
    ANTHROPIC_API_KEY: '',
    JULES_API_KEY: '',
    COMPOSIO_API_KEY: '',
    FIRECRAWL_API_KEY: '',
    OBOT_BASE_URL: '',
    OBOT_IDP_CONFIG: '',
    OBOT_ALLOWED_HOSTS: '',
    WR_DEFAULT_REPO: 'midnghtsapphire/revvel-standards',
  };
  const r = spawnSync('python3', ['-c', snippet], { encoding: 'utf8', env });
  if (r.status !== 0) {
    throw new Error(
      `python exit ${r.status}\nSTDERR: ${r.stderr}\nSTDOUT: ${r.stdout}`
    );
  }
  return r.stdout.trim();
}

function pyJson(snippet) {
  const out = runPython(snippet);
  const last = out.split('\n').filter(Boolean).pop();
  return JSON.parse(last);
}

// ────────────────────────────────────────────────────────────────────────────
// 1. File layout
// ────────────────────────────────────────────────────────────────────────────

test('server source files exist', () => {
  assert(fs.statSync(SERVER_FILE).isFile(), 'server.py missing');
  assert(fs.statSync(PYPROJECT).isFile(), 'pyproject.toml missing');
  assert(fs.statSync(README).isFile(), 'README.md missing');
  assert(
    fs.statSync(path.join(SERVER_DIR, 'wr_control_plane', '__init__.py')).isFile(),
    '__init__.py missing'
  );
});

test('server.py compiles cleanly with python3', () => {
  const r = spawnSync('python3', ['-m', 'compileall', '-q', SERVER_DIR], {
    encoding: 'utf8',
  });
  if (r.status !== 0) {
    throw new Error(`compileall failed: ${r.stderr || r.stdout}`);
  }
});

// ────────────────────────────────────────────────────────────────────────────
// 2. FastMCP shim — module imports and exposes documented tools/resources
// ────────────────────────────────────────────────────────────────────────────

test('module imports without FastMCP and registers all 4 tools', () => {
  const data = pyJson(
    "import json, sys; sys.path.insert(0, r'" +
      path.join(SERVER_DIR) +
      "'); from wr_control_plane.server import mcp; " +
      'print(json.dumps(sorted(mcp.tools.keys())))'
  );
  assertEq(
    data,
    [
      'build_wr_issue_packet',
      'control_plane_status',
      'detect_wr_credential_requirements',
      'render_control_plane_mcp_entry',
    ],
    'tool names'
  );
});

test('module exposes both documented MCP resources', () => {
  const data = pyJson(
    "import json, sys; sys.path.insert(0, r'" +
      path.join(SERVER_DIR) +
      "'); from wr_control_plane.server import mcp; " +
      'print(json.dumps(sorted(mcp.resources.keys())))'
  );
  assertEq(
    data,
    [
      'data://wr-control-plane/architecture',
      'data://wr-control-plane/env-schema',
    ],
    'resource URIs'
  );
});

// ────────────────────────────────────────────────────────────────────────────
// 3. Pure helper functions — URL/PDF/integration detection + credential matrix
// ────────────────────────────────────────────────────────────────────────────

test('_extract_urls dedupes URLs and strips trailing punctuation', () => {
  const data = pyJson(
    "import json, sys; sys.path.insert(0, r'" +
      path.join(SERVER_DIR) +
      "'); from wr_control_plane.server import _extract_urls; " +
      "print(json.dumps(_extract_urls('See https://example.com/a, also https://example.com/a and https://docs.example.com/spec.pdf?x=1.')))"
  );
  assertEq(
    data,
    ['https://example.com/a', 'https://docs.example.com/spec.pdf?x=1'],
    'extract_urls'
  );
});

test('_collect_issue_signals detects PDFs, integrations, and research findings', () => {
  const snippet =
    "import json, sys; sys.path.insert(0, r'" +
    path.join(SERVER_DIR) +
    "'); from wr_control_plane.server import _collect_issue_signals; " +
    "issue = {'title': '[WR] Add slack + notion integration', 'body': 'See https://example.com/spec.pdf for context.'};" +
    "comments = [{'body': 'Research Findings: see github docs'}, {'body': 'plain comment'}];" +
    'sigs = _collect_issue_signals(issue, comments);' +
    "print(json.dumps({'urls': sigs.urls, 'pdf_urls': sigs.pdf_urls, 'comments_count': sigs.comments_count, 'has_research_findings': sigs.has_research_findings, 'requested_integrations': sorted(sigs.requested_integrations)}))";
  const data = pyJson(snippet);
  assertEq(data.urls, ['https://example.com/spec.pdf'], 'urls');
  assertEq(data.pdf_urls, ['https://example.com/spec.pdf'], 'pdf_urls');
  assertEq(data.comments_count, 2, 'comments_count');
  assertEq(data.has_research_findings, true, 'has_research_findings');
  assertEq(data.requested_integrations, ['github', 'notion', 'slack'], 'integrations');
});

test('_credential_matrix flags every required secret as missing when env empty', () => {
  const snippet =
    "import json, sys; sys.path.insert(0, r'" +
    path.join(SERVER_DIR) +
    "'); from wr_control_plane.server import _credential_matrix, IssueSignalSet;" +
    'sigs = IssueSignalSet(urls=[], pdf_urls=[], comments_count=0, has_research_findings=False, requested_integrations=[]);' +
    'm = _credential_matrix(sigs);' +
    "print(json.dumps(sorted([item['secret'] for item in m if item['required'] and not item['configured']])))";
  const data = pyJson(snippet);
  assertEq(
    data,
    [
      'ANTHROPIC_API_KEY',
      'COMPOSIO_API_KEY',
      'GITHUB_TOKEN',
      'JULES_API_KEY',
      'OBOT_BASE_URL',
      'OBOT_IDP_CONFIG',
      'OPENROUTER_API_KEY',
    ],
    'required missing secrets'
  );
});

test('FIRECRAWL_API_KEY becomes required when WR signals contain URLs', () => {
  const snippet =
    "import json, sys; sys.path.insert(0, r'" +
    path.join(SERVER_DIR) +
    "'); from wr_control_plane.server import _credential_matrix, IssueSignalSet;" +
    "sigs = IssueSignalSet(urls=['https://example.com'], pdf_urls=[], comments_count=0, has_research_findings=False, requested_integrations=[]);" +
    "m = {item['secret']: item for item in _credential_matrix(sigs)};" +
    "print(json.dumps({'required': m['FIRECRAWL_API_KEY']['required'], 'configured': m['FIRECRAWL_API_KEY']['configured']}))";
  const data = pyJson(snippet);
  assertEq(data, { required: true, configured: false }, 'firecrawl required');
});

// ────────────────────────────────────────────────────────────────────────────
// 4. control_plane_status — structured readiness payload
// ────────────────────────────────────────────────────────────────────────────

test('control_plane_status returns server, default_repo, providers, readiness', () => {
  const snippet =
    "import json, sys; sys.path.insert(0, r'" +
    path.join(SERVER_DIR) +
    "'); from wr_control_plane.server import control_plane_status;" +
    'data = control_plane_status();' +
    'print(json.dumps(data))';
  const data = pyJson(snippet);
  assertEq(data.server, 'wr-pr-control-plane', 'server name');
  assertEq(data.default_repo, 'midnghtsapphire/revvel-standards', 'default_repo');
  assert(typeof data.providers === 'object', 'providers payload');
  for (const provider of [
    'github',
    'openrouter',
    'anthropic',
    'jules',
    'composio',
    'firecrawl',
    'obot',
  ]) {
    assert(provider in data.providers, `providers.${provider} missing`);
  }
  assert(typeof data.readiness === 'object', 'readiness payload');
  assert(Array.isArray(data.readiness.required_missing), 'required_missing array');
  assert(
    Array.isArray(data.readiness.recommended_next_steps),
    'recommended_next_steps array'
  );
  assert(Array.isArray(data.allowed_hosts), 'allowed_hosts array');
});

// ────────────────────────────────────────────────────────────────────────────
// 5. render_control_plane_mcp_entry — repo + template profiles
// ────────────────────────────────────────────────────────────────────────────

test('render_control_plane_mcp_entry returns documented entry for repo profile', () => {
  const snippet =
    "import json, sys; sys.path.insert(0, r'" +
    path.join(SERVER_DIR) +
    "'); from wr_control_plane.server import render_control_plane_mcp_entry;" +
    "print(json.dumps(render_control_plane_mcp_entry('repo')))";
  const data = pyJson(snippet);
  const entry = data['wr-pr-control-plane'];
  assert(entry, 'wr-pr-control-plane key missing');
  assertEq(entry.command, 'uv', 'command');
  assert(
    entry.args.some((a) => a.includes('mcp-servers/wr-control-plane/wr_control_plane/server.py')),
    'args contain server path'
  );
  for (const env of [
    'GITHUB_TOKEN',
    'OPENROUTER_API_KEY',
    'COMPOSIO_API_KEY',
    'FIRECRAWL_API_KEY',
    'OBOT_BASE_URL',
    'OBOT_IDP_CONFIG',
    'OBOT_ALLOWED_HOSTS',
    'WR_DEFAULT_REPO',
  ]) {
    assert(env in entry.env, `env.${env} missing`);
  }
});

test('render_control_plane_mcp_entry uses template path for template profile', () => {
  const snippet =
    "import json, sys; sys.path.insert(0, r'" +
    path.join(SERVER_DIR) +
    "'); from wr_control_plane.server import render_control_plane_mcp_entry;" +
    "print(json.dumps(render_control_plane_mcp_entry('template')))";
  const data = pyJson(snippet);
  const args = data['wr-pr-control-plane'].args;
  assert(
    args.some((a) => a.includes('${REVVEL_STANDARDS_PATH}')),
    'template profile should use ${REVVEL_STANDARDS_PATH} placeholder'
  );
});

test('render_control_plane_mcp_entry rejects unknown profiles', () => {
  const r = spawnSync(
    'python3',
    [
      '-c',
      "import sys; sys.path.insert(0, r'" +
        path.join(SERVER_DIR) +
        "'); from wr_control_plane.server import render_control_plane_mcp_entry;" +
        "render_control_plane_mcp_entry('bogus')",
    ],
    { encoding: 'utf8' }
  );
  assert(r.status !== 0, 'expected non-zero exit on bogus profile');
  assert(/profile must be 'repo' or 'template'/.test(r.stderr), 'expected ValueError message');
});

// ────────────────────────────────────────────────────────────────────────────
// 6. env-schema and architecture resources expose the documented contract
// ────────────────────────────────────────────────────────────────────────────

test('env_schema lists every required and optional variable', () => {
  const snippet =
    "import json, sys; sys.path.insert(0, r'" +
    path.join(SERVER_DIR) +
    "'); from wr_control_plane.server import env_schema; print(json.dumps(env_schema()))";
  const data = pyJson(snippet);
  for (const v of [
    'GITHUB_TOKEN',
    'OPENROUTER_API_KEY',
    'ANTHROPIC_API_KEY',
    'JULES_API_KEY',
    'COMPOSIO_API_KEY',
    'OBOT_BASE_URL',
    'OBOT_IDP_CONFIG',
  ]) {
    assert(data.required.includes(v), `required missing ${v}`);
  }
  for (const v of ['FIRECRAWL_API_KEY', 'OBOT_ALLOWED_HOSTS', 'WR_DEFAULT_REPO']) {
    assert(data.optional.includes(v), `optional missing ${v}`);
  }
  assertEq(
    data.defaults.WR_DEFAULT_REPO,
    'midnghtsapphire/revvel-standards',
    'default repo'
  );
});

test('architecture_summary documents both current and next layers', () => {
  const snippet =
    "import json, sys; sys.path.insert(0, r'" +
    path.join(SERVER_DIR) +
    "'); from wr_control_plane.server import architecture_summary; print(json.dumps(architecture_summary()))";
  const data = pyJson(snippet);
  assert(data.current_research_layer.includes('Jules'), 'Jules in current_research_layer');
  assert(
    data.next_execution_layer.some((s) => /composio/i.test(s)),
    'Composio in next_execution_layer'
  );
  assert(
    data.governance_layer.some((s) => /obot/i.test(s)),
    'Obot in governance_layer'
  );
  assert(data.review_layer.includes('BITO AI'), 'BITO AI in review_layer');
});

// ────────────────────────────────────────────────────────────────────────────
// 7. Repo wiring — .mcp.json, .env.example, templates, scripts, docs
// ────────────────────────────────────────────────────────────────────────────

test('.mcp.json includes a disabled wr-pr-control-plane entry', () => {
  const cfg = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, '.mcp.json'), 'utf8'));
  const entry = cfg.mcpServers && cfg.mcpServers['wr-pr-control-plane'];
  assert(entry, 'wr-pr-control-plane missing from .mcp.json');
  assertEq(entry.disabled, true, '.mcp.json entry must be disabled by default');
  assert(entry.disabledReason && /credentials/i.test(entry.disabledReason),
    'disabledReason must explain credentials path');
  assert(entry.env && entry.env.GITHUB_TOKEN, 'GITHUB_TOKEN env wiring');
  assert(entry.env.COMPOSIO_API_KEY, 'COMPOSIO_API_KEY env wiring');
  assert(entry.env.OBOT_BASE_URL, 'OBOT_BASE_URL env wiring');
});

test('.env.example documents every required control-plane variable', () => {
  const env = fs.readFileSync(path.join(REPO_ROOT, '.env.example'), 'utf8');
  for (const v of [
    'COMPOSIO_API_KEY',
    'FIRECRAWL_API_KEY',
    'OBOT_BASE_URL',
    'OBOT_IDP_CONFIG',
    'OBOT_ALLOWED_HOSTS',
    'WR_DEFAULT_REPO',
    'JULES_API_KEY',
  ]) {
    assert(env.includes(v + '='), `.env.example missing ${v}`);
  }
});

test('templates/mcp/.env.mcp.example mirrors the control-plane variables', () => {
  const env = fs.readFileSync(
    path.join(REPO_ROOT, 'templates', 'mcp', '.env.mcp.example'),
    'utf8'
  );
  for (const v of [
    'COMPOSIO_API_KEY',
    'FIRECRAWL_API_KEY',
    'OBOT_BASE_URL',
    'OBOT_IDP_CONFIG',
    'OBOT_ALLOWED_HOSTS',
    'WR_DEFAULT_REPO',
  ]) {
    assert(env.includes(v + '='), `template env example missing ${v}`);
  }
});

test('templates/mcp/mcp.revvel-custom.json exposes the wr-pr-control-plane entry', () => {
  const cfg = JSON.parse(
    fs.readFileSync(
      path.join(REPO_ROOT, 'templates', 'mcp', 'mcp.revvel-custom.json'),
      'utf8'
    )
  );
  const entry = cfg.mcpServers && cfg.mcpServers['wr-pr-control-plane'];
  assert(entry, 'wr-pr-control-plane missing from mcp.revvel-custom.json');
  assert(
    entry.args.some((a) => a.includes('mcp-servers/wr-control-plane')),
    'template entry must reference the in-tree server path'
  );
});

test('scripts/setup-mcp.sh references the control-plane install path', () => {
  const script = fs.readFileSync(path.join(REPO_ROOT, 'scripts', 'setup-mcp.sh'), 'utf8');
  assert(/mcp-servers\/wr-control-plane/.test(script),
    'setup-mcp.sh missing wr-control-plane reference');
  assert(/uv pip install -e \./.test(script), 'setup-mcp.sh missing uv pip install hint');
});

test('docs/MCP_REVVEL_CATALOG.md documents the wr-pr-control-plane entry', () => {
  const cat = fs.readFileSync(
    path.join(REPO_ROOT, 'docs', 'MCP_REVVEL_CATALOG.md'),
    'utf8'
  );
  assert(/wr-pr-control-plane/.test(cat), 'catalog missing wr-pr-control-plane');
  assert(/`mcp-servers\/wr-control-plane`/i.test(cat) ||
         /mcp-servers\/wr-control-plane/.test(cat),
    'catalog must link to in-tree server path');
});

test('SYSTEM_STATE.md records the wr-pr-control-plane MCP server', () => {
  const sys = fs.readFileSync(path.join(REPO_ROOT, 'SYSTEM_STATE.md'), 'utf8');
  assert(/wr-pr-control-plane/.test(sys), 'SYSTEM_STATE.md missing wr-pr-control-plane');
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
