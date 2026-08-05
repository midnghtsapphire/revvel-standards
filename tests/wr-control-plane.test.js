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
    TAVILY_API_KEY: '',
    CREWAI_API_KEY: '',
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
      'import asyncio; print(json.dumps(sorted([t.name for t in asyncio.run(mcp.list_tools())])))'
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

// Four merged PRs each appended their own fix to the shim, leaving six
// list_tools definitions stacked; Python keeps the last one, which read the
// pre-rename `self.tools` and made introspection raise AttributeError while
// the suite stayed green by reading `_tools` directly.
test('shim defines each introspection method exactly once', () => {
  const src = fs.readFileSync(SERVER_FILE, 'utf8');
  for (const method of ['list_tools', 'list_resources']) {
    const defs = src.match(new RegExp(`^\\s*async def ${method}\\b`, 'gm')) || [];
    assertEq(defs.length, 1, `${method} definition count`);
  }
});

test('module exposes both documented MCP resources', () => {
  const data = pyJson(
    "import json, sys; sys.path.insert(0, r'" +
      path.join(SERVER_DIR) +
      "'); from wr_control_plane.server import mcp; " +
      'import asyncio; print(json.dumps(sorted([str(r.uri) for r in asyncio.run(mcp.list_resources())])))'
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

test('TAVILY_API_KEY becomes required when WR signals contain URLs', () => {
  const snippet =
    "import json, sys; sys.path.insert(0, r'" +
    path.join(SERVER_DIR) +
    "'); from wr_control_plane.server import _credential_matrix, IssueSignalSet;" +
    "sigs = IssueSignalSet(urls=['https://example.com'], pdf_urls=[], comments_count=0, has_research_findings=False, requested_integrations=[]);" +
    "m = {item['secret']: item for item in _credential_matrix(sigs)};" +
    "print(json.dumps({'required': m['TAVILY_API_KEY']['required'], 'configured': m['TAVILY_API_KEY']['configured']}))";
  const data = pyJson(snippet);
  assertEq(data, { required: true, configured: false }, 'tavily required when WR has URLs');
});

test('research_mode = jules-only when no URLs and no research credentials', () => {
  const snippet =
    "import json, sys; sys.path.insert(0, r'" +
    path.join(SERVER_DIR) +
    "'); from wr_control_plane.server import _control_plane_readiness, IssueSignalSet;" +
    "sigs = IssueSignalSet(urls=[], pdf_urls=[], comments_count=0, has_research_findings=False, requested_integrations=[]);" +
    "r = _control_plane_readiness(sigs); print(json.dumps(r['research_mode']))";
  const data = pyJson(snippet);
  assertEq(data, 'jules-only', 'research_mode for empty signals');
});

test('research_mode = firecrawl-agent when URLs + only Firecrawl key', () => {
  const env = {
    ...process.env,
    PYTHONPATH: path.join(SERVER_DIR),
    GITHUB_TOKEN: '', OPENROUTER_API_KEY: '', ANTHROPIC_API_KEY: '',
    JULES_API_KEY: '', COMPOSIO_API_KEY: '',
    FIRECRAWL_API_KEY: 'fc-test', TAVILY_API_KEY: '', CREWAI_API_KEY: '',
    OBOT_BASE_URL: '', OBOT_IDP_CONFIG: '', OBOT_ALLOWED_HOSTS: '',
    WR_DEFAULT_REPO: 'midnghtsapphire/revvel-standards',
  };
  const snippet =
    "import json, sys; sys.path.insert(0, r'" +
    path.join(SERVER_DIR) +
    "'); from wr_control_plane.server import _control_plane_readiness, IssueSignalSet;" +
    "sigs = IssueSignalSet(urls=['https://example.com'], pdf_urls=[], comments_count=0, has_research_findings=False, requested_integrations=[]);" +
    "print(json.dumps(_control_plane_readiness(sigs)['research_mode']))";
  const r = spawnSync('python3', ['-c', snippet], { encoding: 'utf8', env });
  if (r.status !== 0) throw new Error(r.stderr);
  assertEq(JSON.parse(r.stdout.trim()), 'firecrawl-agent', 'firecrawl-agent mode');
});

test('research_mode = tavily-search when URLs + only Tavily key', () => {
  const env = {
    ...process.env,
    PYTHONPATH: path.join(SERVER_DIR),
    GITHUB_TOKEN: '', OPENROUTER_API_KEY: '', ANTHROPIC_API_KEY: '',
    JULES_API_KEY: '', COMPOSIO_API_KEY: '',
    FIRECRAWL_API_KEY: '', TAVILY_API_KEY: 'tvly-test', CREWAI_API_KEY: '',
    OBOT_BASE_URL: '', OBOT_IDP_CONFIG: '', OBOT_ALLOWED_HOSTS: '',
    WR_DEFAULT_REPO: 'midnghtsapphire/revvel-standards',
  };
  const snippet =
    "import json, sys; sys.path.insert(0, r'" +
    path.join(SERVER_DIR) +
    "'); from wr_control_plane.server import _control_plane_readiness, IssueSignalSet;" +
    "sigs = IssueSignalSet(urls=['https://example.com'], pdf_urls=[], comments_count=0, has_research_findings=False, requested_integrations=[]);" +
    "print(json.dumps(_control_plane_readiness(sigs)['research_mode']))";
  const r = spawnSync('python3', ['-c', snippet], { encoding: 'utf8', env });
  if (r.status !== 0) throw new Error(r.stderr);
  assertEq(JSON.parse(r.stdout.trim()), 'tavily-search', 'tavily-search mode');
});

test('research_mode = jules-plus-firecrawl-and-tavily when URLs + both keys', () => {
  const env = {
    ...process.env,
    PYTHONPATH: path.join(SERVER_DIR),
    GITHUB_TOKEN: '', OPENROUTER_API_KEY: '', ANTHROPIC_API_KEY: '',
    JULES_API_KEY: '', COMPOSIO_API_KEY: '',
    FIRECRAWL_API_KEY: 'fc-test', TAVILY_API_KEY: 'tvly-test', CREWAI_API_KEY: '',
    OBOT_BASE_URL: '', OBOT_IDP_CONFIG: '', OBOT_ALLOWED_HOSTS: '',
    WR_DEFAULT_REPO: 'midnghtsapphire/revvel-standards',
  };
  const snippet =
    "import json, sys; sys.path.insert(0, r'" +
    path.join(SERVER_DIR) +
    "'); from wr_control_plane.server import _control_plane_readiness, IssueSignalSet;" +
    "sigs = IssueSignalSet(urls=['https://example.com'], pdf_urls=[], comments_count=0, has_research_findings=False, requested_integrations=[]);" +
    "print(json.dumps(_control_plane_readiness(sigs)['research_mode']))";
  const r = spawnSync('python3', ['-c', snippet], { encoding: 'utf8', env });
  if (r.status !== 0) throw new Error(r.stderr);
  assertEq(JSON.parse(r.stdout.trim()), 'jules-plus-firecrawl-and-tavily', 'both-tools mode');
});

test('research_mode = jules-plus-firecrawl-pdf when PDF URLs + Firecrawl key', () => {
  const env = {
    ...process.env,
    PYTHONPATH: path.join(SERVER_DIR),
    GITHUB_TOKEN: '', OPENROUTER_API_KEY: '', ANTHROPIC_API_KEY: '',
    JULES_API_KEY: '', COMPOSIO_API_KEY: '',
    FIRECRAWL_API_KEY: 'fc-test', TAVILY_API_KEY: 'tvly-test',
    OBOT_BASE_URL: '', OBOT_IDP_CONFIG: '', OBOT_ALLOWED_HOSTS: '',
    WR_DEFAULT_REPO: 'midnghtsapphire/revvel-standards',
  };
  const snippet =
    "import json, sys; sys.path.insert(0, r'" +
    path.join(SERVER_DIR) +
    "'); from wr_control_plane.server import _control_plane_readiness, IssueSignalSet;" +
    "sigs = IssueSignalSet(urls=['https://example.com/spec.pdf'], pdf_urls=['https://example.com/spec.pdf'], comments_count=0, has_research_findings=False, requested_integrations=[]);" +
    "print(json.dumps(_control_plane_readiness(sigs)['research_mode']))";
  const r = spawnSync('python3', ['-c', snippet], { encoding: 'utf8', env });
  if (r.status !== 0) throw new Error(r.stderr);
  assertEq(JSON.parse(r.stdout.trim()), 'jules-plus-firecrawl-pdf', 'pdf mode wins');
});

test('_issue_packet handles GitHub `"user": null` without crashing', () => {
  const snippet =
    "import json, sys; sys.path.insert(0, r'" +
    path.join(SERVER_DIR) +
    "'); from wr_control_plane.server import _issue_packet;" +
    "issue = {'number': 42, 'title': '[WR] X', 'body': 'b', 'state': 'open', 'labels': [], 'user': None};" +
    "comments = [{'body': 'c1', 'user': None, 'created_at': '2026-01-01'}];" +
    "p = _issue_packet(issue, comments, 'midnghtsapphire/revvel-standards');" +
    "print(json.dumps({'author': p['author'], 'comment_authors': [c['author'] for c in p['recent_comments']]}))";
  const data = pyJson(snippet);
  assertEq(data.author, null, 'issue author None-safe');
  assertEq(data.comment_authors, [null], 'comment author None-safe');
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
    'tavily',
    'crewai',
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
    'TAVILY_API_KEY',
    'CREWAI_API_KEY',
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
    'template profile should reference the ${REVVEL_STANDARDS_PATH} env variable'
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
  for (const v of ['FIRECRAWL_API_KEY', 'TAVILY_API_KEY', 'CREWAI_API_KEY', 'OBOT_ALLOWED_HOSTS', 'WR_DEFAULT_REPO']) {
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

test('architecture_summary advertises Tavily on the next research layer', () => {
  const snippet =
    "import json, sys; sys.path.insert(0, r'" +
    path.join(SERVER_DIR) +
    "'); from wr_control_plane.server import architecture_summary; print(json.dumps(architecture_summary()))";
  const data = pyJson(snippet);
  assert(
    data.next_research_layer.some((s) => /tavily/i.test(s)),
    'Tavily must appear in next_research_layer'
  );
  assert(
    data.next_research_layer.some((s) => /firecrawl/i.test(s)),
    'Firecrawl must remain in next_research_layer'
  );
});

test('architecture_summary exposes machine-readable v0_1_0_trade_offs', () => {
  const snippet =
    "import json, sys; sys.path.insert(0, r'" +
    path.join(SERVER_DIR) +
    "'); from wr_control_plane.server import architecture_summary; print(json.dumps(architecture_summary()))";
  const data = pyJson(snippet);
  assert(Array.isArray(data.v0_1_0_trade_offs), 'v0_1_0_trade_offs must be a list');
  assert(data.v0_1_0_trade_offs.length >= 3, 'expect at least 3 documented trade-offs');
  const blob = data.v0_1_0_trade_offs.join(' ').toLowerCase();
  assert(/substring|tokenizer|integration/.test(blob), 'trade-offs should cover substring match');
  assert(/paginat|comment/.test(blob), 'trade-offs should cover pagination');
  assert(/env|memois|cache/.test(blob), 'trade-offs should cover env reads / caching');
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
    'TAVILY_API_KEY',
    'CREWAI_API_KEY',
    'OBOT_BASE_URL',
    'OBOT_IDP_CONFIG',
    'OBOT_ALLOWED_HOSTS',
    'WR_DEFAULT_REPO',
    'JULES_API_KEY',
  ]) {
    assert(env.includes(v + '='), `.env.example missing ${v}`);
  }
  assert(/api\.tavily\.com/.test(env), '.env.example OBOT_ALLOWED_HOSTS must include api.tavily.com');
});

test('templates/mcp/.env.mcp.example mirrors the control-plane variables', () => {
  const env = fs.readFileSync(
    path.join(REPO_ROOT, 'templates', 'mcp', '.env.mcp.example'),
    'utf8'
  );
  for (const v of [
    'COMPOSIO_API_KEY',
    'FIRECRAWL_API_KEY',
    'TAVILY_API_KEY',
    'CREWAI_API_KEY',
    'OBOT_BASE_URL',
    'OBOT_IDP_CONFIG',
    'OBOT_ALLOWED_HOSTS',
    'WR_DEFAULT_REPO',
  ]) {
    assert(env.includes(v + '='), `template env example missing ${v}`);
  }
  assert(/api\.tavily\.com/.test(env),
    'template .env.mcp.example OBOT_ALLOWED_HOSTS must include api.tavily.com');
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
  assert(entry.env && 'TAVILY_API_KEY' in entry.env,
    'template wr-pr-control-plane entry must wire TAVILY_API_KEY');
  assert(entry.env && 'CREWAI_API_KEY' in entry.env,
    'template wr-pr-control-plane entry must wire CREWAI_API_KEY');
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
  assert(/Tavily/i.test(cat), 'catalog must mention Tavily');
  assert(/v0\.1\.0 trade-offs/i.test(cat), 'catalog must include v0.1.0 trade-offs section');
  assert(/TAVILY_API_KEY/.test(cat), 'catalog must show TAVILY_API_KEY in MCP entry');
  assert(/CREWAI_API_KEY/.test(cat), 'catalog must show CREWAI_API_KEY in MCP entry');
});

test('mcp-servers/wr-control-plane/README.md documents trade-offs and Tavily', () => {
  const readme = fs.readFileSync(README, 'utf8');
  assert(/Tavily/i.test(readme), 'server README must mention Tavily');
  assert(/Known v0\.1\.0 trade-offs/i.test(readme),
    'server README must include a Known v0.1.0 trade-offs section');
  assert(/research_mode|jules-only|tavily-search|firecrawl-agent/i.test(readme),
    'server README must document research_mode values');
  assert(/TAVILY_API_KEY/.test(readme), 'server README must list TAVILY_API_KEY in env block');
  assert(/CREWAI_API_KEY/.test(readme), 'server README must list CREWAI_API_KEY in env block');
});

test('SYSTEM_STATE.md records the wr-pr-control-plane MCP server', () => {
  const sys = fs.readFileSync(path.join(REPO_ROOT, 'SYSTEM_STATE.md'), 'utf8');
  assert(/wr-pr-control-plane/.test(sys), 'SYSTEM_STATE.md missing wr-pr-control-plane');
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
