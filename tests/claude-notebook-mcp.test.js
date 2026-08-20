#!/usr/bin/env node
'use strict';

/**
 * Regression tests for WR #17733 Claude Notebook MCP.
 *
 * Server: mcp-servers/claude-notebook-mcp/
 *
 * Asserts:
 *   1. Package layout + Python compile
 *   2. FastMCP shim tools/resources register without FastMCP installed
 *   3. Notebook CRUD + cell execute with persistent Python state
 *   4. Markdown render, attachments, widgets, export/import
 *   5. Every registered tool is callable (purchase validation)
 *   6. Docs / .mcp.json / catalog wiring present
 */

const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');
const SERVER_DIR = path.join(REPO_ROOT, 'mcp-servers', 'claude-notebook-mcp');
const PKG = path.join(SERVER_DIR, 'claude_notebook_mcp');
const SERVER_FILE = path.join(PKG, 'server.py');
const ENGINE_FILE = path.join(PKG, 'engine.py');
const PYPROJECT = path.join(SERVER_DIR, 'pyproject.toml');
const README = path.join(SERVER_DIR, 'README.md');
const EXAMPLE = path.join(SERVER_DIR, 'examples', 'example_call.py');
const SNIPPET = path.join(SERVER_DIR, '.mcp.snippet.json');

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
    throw new Error(
      `${msg || 'mismatch'}: expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`
    );
  }
}

function runPython(snippet, extraEnv = {}) {
  const env = {
    ...process.env,
    PYTHONPATH: SERVER_DIR,
    ...extraEnv,
  };
  const r = spawnSync('python3', ['-c', snippet], {
    encoding: 'utf8',
    env,
    cwd: REPO_ROOT,
    maxBuffer: 10 * 1024 * 1024,
  });
  if (r.status !== 0) {
    throw new Error(`python exit ${r.status}\nSTDERR: ${r.stderr}\nSTDOUT: ${r.stdout}`);
  }
  return r.stdout.trim();
}

function pyJson(snippet, extraEnv = {}) {
  const out = runPython(snippet, extraEnv);
  const last = out.split('\n').filter(Boolean).pop();
  return JSON.parse(last);
}

// ── 1. Layout ───────────────────────────────────────────────────────────────

test('package source files exist', () => {
  for (const f of [
    SERVER_FILE,
    ENGINE_FILE,
    PYPROJECT,
    README,
    EXAMPLE,
    SNIPPET,
    path.join(PKG, '__init__.py'),
    path.join(PKG, '__main__.py'),
  ]) {
    assert(fs.statSync(f).isFile(), `missing ${f}`);
  }
});

test('server package compiles cleanly', () => {
  const r = spawnSync('python3', ['-m', 'compileall', '-q', SERVER_DIR], {
    encoding: 'utf8',
  });
  if (r.status !== 0) {
    throw new Error(`compileall failed: ${r.stderr || r.stdout}`);
  }
});

// ── 2. FastMCP shim / tools ─────────────────────────────────────────────────

const EXPECTED_TOOLS = [
  'attachment_add',
  'attachment_list',
  'attachment_remove',
  'cell_add',
  'cell_delete',
  'cell_execute',
  'cell_execute_all',
  'cell_get',
  'cell_list',
  'cell_update',
  'kernel_reset',
  'kernel_variables',
  'list_server_tools',
  'markdown_render',
  'notebook_create',
  'notebook_delete',
  'notebook_export',
  'notebook_get',
  'notebook_health',
  'notebook_import',
  'notebook_list',
  'notebook_load_session',
  'notebook_rename',
  'notebook_save_session',
  'render_claude_notebook_mcp_entry',
  'widget_create',
  'widget_delete',
  'widget_list',
  'widget_update',
].sort();

test('module imports without FastMCP and registers expected tools', () => {
  const data = pyJson(
    "import json; from claude_notebook_mcp.server import mcp; " +
      'tools = getattr(mcp, "_tools", getattr(mcp, "tools", {})); ' +
      'print(json.dumps(sorted(tools.keys() if isinstance(tools, dict) else list(tools))))'
  );
  assertEq(data, EXPECTED_TOOLS, 'tool list');
  assert(data.length >= 20, 'expected full tool surface');
});

test('resources register', () => {
  const data = pyJson(
    "import json; from claude_notebook_mcp.server import mcp; " +
      'res = getattr(mcp, "_resources", getattr(mcp, "resources", {})); ' +
      'print(json.dumps(sorted(res.keys() if isinstance(res, dict) else list(res))))'
  );
  assert(data.includes('data://claude-notebook/env-schema'), 'env-schema');
  assert(data.includes('data://claude-notebook/architecture'), 'architecture');
});

// ── 3. Engine behaviour ─────────────────────────────────────────────────────

test('notebook CRUD + persistent python kernel', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'claude-nb-test-'));
  const data = pyJson(
    `
import json, os
os.environ['CLAUDE_NOTEBOOK_DIR'] = ${JSON.stringify(tmp)}
from claude_notebook_mcp.engine import NotebookEngine
eng = NotebookEngine(root=${JSON.stringify(tmp)})
nb = eng.create_notebook(title='T')
nid = nb['id']
c1 = eng.add_cell(nid, cell_type='code', source='x = 21')
r1 = eng.execute_cell(nid, c1['cell']['id'])
c2 = eng.add_cell(nid, cell_type='code', source='print(x * 2)\\nx * 2')
r2 = eng.execute_cell(nid, c2['cell']['id'])
texts = []
for o in r2['outputs']:
    texts.append(o.get('text',''))
vars_ = eng.kernel_variables(nid)['variables']
print(json.dumps({
  'id': nid,
  'r2_texts': texts,
  'vars': vars_,
  'listed': len(eng.list_notebooks()),
  'renamed': eng.rename_notebook(nid, 'T2')['title'],
}))
`,
    { CLAUDE_NOTEBOOK_DIR: tmp }
  );
  assert(data.listed >= 1, 'listed');
  assert(data.renamed === 'T2', 'rename');
  assert(data.vars.x === 'int', 'persistent var');
  const joined = (data.r2_texts || []).join('\n');
  assert(joined.includes('42'), `expected 42 in outputs, got ${joined}`);
});

test('markdown, attachments, widgets, export/import', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'claude-nb-md-'));
  const data = pyJson(
    `
import json
from claude_notebook_mcp.engine import NotebookEngine
eng = NotebookEngine(root=${JSON.stringify(tmp)})
nb = eng.create_notebook(title='MD')
nid = nb['id']
md = eng.add_cell(nid, cell_type='markdown', source='# Title\\n\\n**bold** and ` + '`code`' + `')
rendered = eng.render_cell_markdown(nid, md['cell']['id'])
att = eng.add_attachment(nid, name='a.txt', text_content='hello', mime_type='text/plain')
w = eng.create_widget(nid, widget_type='slider', label='n', value=3, min_value=0, max_value=10, step=1)
exported = eng.export_notebook(nid, format='ipynb')
imported = eng.import_notebook(exported['content'], title='Imported')
print(json.dumps({
  'html': rendered['html'],
  'att_name': att['name'],
  'att_size': att['size'],
  'widget': w['widget_type'],
  'export_fmt': exported['format'],
  'imported_title': imported['title'],
  'imported_cells': len(imported['cells']),
}))
`,
    { CLAUDE_NOTEBOOK_DIR: tmp }
  );
  assert(data.html.includes('<h1>'), 'h1');
  assert(data.html.includes('<strong>bold</strong>'), 'bold');
  assert(data.att_name === 'a.txt', 'att name');
  assert(data.att_size === 5, 'att size');
  assert(data.widget === 'slider', 'widget');
  assert(data.export_fmt === 'ipynb', 'ipynb');
  assert(data.imported_title === 'Imported', 'import title');
  assert(data.imported_cells >= 1, 'import cells');
});

test('invalid cell type is rejected', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'claude-nb-bad-'));
  const data = pyJson(
    `
import json
from claude_notebook_mcp.engine import NotebookEngine, NotebookError
eng = NotebookEngine(root=${JSON.stringify(tmp)})
nb = eng.create_notebook()
try:
    eng.add_cell(nb['id'], cell_type='sql')
    print(json.dumps({'ok': True}))
except NotebookError as e:
    print(json.dumps({'ok': False, 'message': str(e)}))
`
  );
  assert(data.ok === false, 'should reject');
  assert(/sql/.test(data.message), 'message names type');
});

// ── 4. Purchase validation — every tool ─────────────────────────────────────

test('example_call.py exercises every tool and exits 0', () => {
  const r = spawnSync('python3', [EXAMPLE], {
    encoding: 'utf8',
    cwd: REPO_ROOT,
    env: { ...process.env, PYTHONPATH: SERVER_DIR },
    maxBuffer: 10 * 1024 * 1024,
  });
  if (r.status !== 0) {
    throw new Error(`example_call exit ${r.status}\n${r.stderr}\n${r.stdout}`);
  }
  assert(/All \d+ tool calls succeeded/.test(r.stdout), 'success banner');
  assert(/list_server_tools/.test(r.stdout), 'listed tools');
});

test('list_server_tools tool returns full catalog', () => {
  const data = pyJson(
    `
import json
from claude_notebook_mcp.server import list_server_tools
print(json.dumps(list_server_tools()))
`
  );
  assert(data.ok === true, 'ok');
  assert(data.count === EXPECTED_TOOLS.length, `count ${data.count}`);
  assertEq(data.tools, EXPECTED_TOOLS, 'tools');
});

// ── 5. Wiring ───────────────────────────────────────────────────────────────

test('.mcp.json references claude-notebook-mcp and gemini-notebook-mcp', () => {
  const mcp = fs.readFileSync(path.join(REPO_ROOT, '.mcp.json'), 'utf8');
  assert(mcp.includes('claude-notebook-mcp'), 'claude entry');
  assert(
    mcp.includes('mcp-servers/claude-notebook-mcp'),
    'claude path'
  );
  assert(mcp.includes('gemini-notebook-mcp'), 'gemini claude-link entry');
  assert(
    mcp.includes('mcp-servers/gemini-notebook-mcp-cli'),
    'gemini path'
  );
});

test('MCP catalog documents claude-notebook-mcp and WR 17733', () => {
  const cat = fs.readFileSync(
    path.join(REPO_ROOT, 'docs', 'MCP_REVVEL_CATALOG.md'),
    'utf8'
  );
  assert(cat.includes('claude-notebook-mcp'), 'catalog missing server');
  assert(cat.includes('17733'), 'catalog missing WR');
  assert(cat.includes('gemini-notebook-mcp'), 'catalog missing gemini link');
  assert(
    cat.includes('jacob-bd/gemini-notebook-mcp-cli'),
    'catalog missing upstream'
  );
});

test('README documents Claude Desktop click-path and tools', () => {
  const md = fs.readFileSync(README, 'utf8');
  assert(md.includes('Claude Desktop'), 'desktop');
  assert(md.includes('Settings'), 'settings path');
  assert(md.includes('cell_execute'), 'tool');
  assert(md.includes('example_call.py'), 'example');
  assert(md.includes('.mcp.json') || md.includes('mcpServers'), 'config');
});

test('snippet JSON is valid and names both servers', () => {
  const sn = JSON.parse(fs.readFileSync(SNIPPET, 'utf8'));
  assert(sn.mcpServers['claude-notebook-mcp'], 'claude snippet');
  assert(sn.mcpServers['gemini-notebook-mcp'], 'gemini snippet');
});

// ── summary ─────────────────────────────────────────────────────────────────

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
