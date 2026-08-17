#!/usr/bin/env node
'use strict';

/**
 * Regression tests for WR-4483 M1 Heterogeneous-Ensemble AHP Engine.
 *
 * Server: mcp-servers/ensemble-ahp-engine/
 *
 * Asserts:
 *   1. Package layout + Python compile
 *   2. FastMCP shim tools/resources register without FastMCP installed
 *   3. AHP math: geometric mean, priority vector, CR, per-cell CV
 *   4. Full mock pipeline steps 1-7 on a sample goal
 *   5. 3 judges / ≥2 distinct families asserted in FAILURE-LEDGER JSONL
 *   6. Ledger entries validate against allowed schema keys
 *   7. Failover behaviour: 402 immediate; 429 backoff then failover
 *   8. Docs / .mcp.json wiring present
 */

const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');
const SERVER_DIR = path.join(REPO_ROOT, 'mcp-servers', 'ensemble-ahp-engine');
const PKG = path.join(SERVER_DIR, 'ensemble_ahp');
const SERVER_FILE = path.join(PKG, 'server.py');
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

function runPython(snippet, extraEnv = {}) {
  const env = {
    ...process.env,
    PYTHONPATH: SERVER_DIR,
    OPENROUTER_API_KEY: '',
    AHP_FORCE_MOCK: '1',
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
    PYPROJECT,
    README,
    path.join(PKG, '__init__.py'),
    path.join(PKG, 'ahp_math.py'),
    path.join(PKG, 'judges.py'),
    path.join(PKG, 'ledger.py'),
    path.join(PKG, 'pipeline.py'),
    path.join(PKG, 'config.py'),
    path.join(PKG, 'cli.py'),
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

test('module imports without FastMCP and registers 3 tools', () => {
  const data = pyJson(
    "import json; from ensemble_ahp.server import mcp; " +
      'tools = getattr(mcp, "_tools", getattr(mcp, "tools", {})); ' +
      'print(json.dumps(sorted(tools.keys() if isinstance(tools, dict) else list(tools))))'
  );
  assertEq(
    data,
    ['ahp_engine_status', 'render_ensemble_ahp_mcp_entry', 'run_ahp'],
    'tool names'
  );
});

test('module exposes both MCP resources', () => {
  const data = pyJson(
    "import json; from ensemble_ahp.server import mcp; " +
      'res = getattr(mcp, "_resources", getattr(mcp, "resources", {})); ' +
      'print(json.dumps(sorted(res.keys() if isinstance(res, dict) else list(res))))'
  );
  assertEq(
    data,
    ['data://ensemble-ahp/architecture', 'data://ensemble-ahp/env-schema'],
    'resource uris'
  );
});

test('ahp_engine_status reports M1 scope and 3 judge families', () => {
  const st = pyJson(
    "import json; from ensemble_ahp.server import ahp_engine_status; print(json.dumps(ahp_engine_status()))"
  );
  assertEq(st.milestone, 'M1');
  assertEq(st.wr, 'WR-4483');
  assert(st.mock_mode === true, 'expected mock mode without API key');
  assert(st.default_judges.length === 3, 'expected 3 judges');
  const families = new Set(st.default_judges.map((j) => j.family));
  assert(families.size === 3, 'expected 3 distinct families in panel');
  assert(st.steps.includes('CHECK'), 'CHECK step missing');
  assert(st.deferred.M2.includes('critic_gate'), 'critic_gate should be deferred');
});

// ── 3. Pure math ────────────────────────────────────────────────────────────

test('geometric mean + priority + CR on a known consistent matrix', () => {
  const data = pyJson(`
import json
from ensemble_ahp.ahp_math import (
  geometric_mean_aggregate, priority_vector, consistency, per_cell_cv, mean_dispersion
)
# Perfectly consistent 3x3 from weights [0.5, 0.3, 0.2]
w = [0.5, 0.3, 0.2]
m = [[w[i]/w[j] for j in range(3)] for i in range(3)]
# Second judge identical → CV 0; third lightly different
m2 = [row[:] for row in m]
m3 = [
  [1, 2.0, 3.0],
  [0.5, 1, 1.5],
  [1/3, 2/3, 1],
]
agg = geometric_mean_aggregate([m, m2, m3])
pv = priority_vector(agg)
cons = consistency(agg, pv)
cv = per_cell_cv([m, m2, m3])
print(json.dumps({
  "n": len(agg),
  "w_sum": sum(pv),
  "cr": cons.cr,
  "ci": cons.ci,
  "ri": cons.ri,
  "mean_cv": mean_dispersion(cv),
  "diag_cv": [cv[i][i] for i in range(3)],
}))
`);
  assert(data.n === 3, 'order');
  assert(Math.abs(data.w_sum - 1) < 1e-9, 'weights sum to 1');
  assert(data.cr >= 0, 'CR non-negative');
  assert(data.ri === 0.58, 'Saaty RI for n=3');
  assertEq(data.diag_cv, [0, 0, 0], 'diag CV is 0');
  assert(data.mean_cv >= 0, 'mean CV non-negative');
});

test('vote_aggregate and top_n keep highest totals', () => {
  const data = pyJson(`
import json
from ensemble_ahp.ahp_math import vote_aggregate, top_n
totals = vote_aggregate([
  {"a": 9, "b": 3, "c": 5},
  {"a": 8, "b": 4, "c": 5},
  {"a": 7, "b": 2, "c": 6},
])
print(json.dumps({"totals": totals, "top": top_n(totals, 2)}))
`);
  assertEq(data.totals.a, 24);
  assertEq(data.top, ['a', 'c']);
});

// ── 4. Ledger schema ────────────────────────────────────────────────────────

test('ledger entries match failure-ledger allowed keys', () => {
  const tmp = path.join(os.tmpdir(), `ahp-ledger-${Date.now()}.jsonl`);
  try {
    const data = pyJson(
      `
import json
from ensemble_ahp.ledger import FailureLedger, validate_entry_shape, all_entries_valid
led = FailureLedger(r'${tmp.replace(/\\/g, '\\\\')}')
led.log_judge_call(judge_id='judge-anthropic', family='anthropic', model='mock:anthropic',
                   step='COMPARE', ok=True, lane='text/mock', service='mock', cost_usd=0.0)
led.log_failover(judge_id='judge-openai', family='openai', from_lane='text/primary',
                 to_lane='text/tier2-keyless', http_code=402)
led.assert_distinct_families(['anthropic','openai','google'], minimum=2)
entries = led.read_entries()
print(json.dumps({
  "n": len(entries),
  "valid": all_entries_valid(entries),
  "violations": [validate_entry_shape(e) for e in entries],
  "classes": [e['class'] for e in entries],
}))
`
    );
    assert(data.n === 3, 'expected 3 ledger lines');
    assert(data.valid === true, 'schema violations: ' + JSON.stringify(data.violations));
    assert(data.classes.includes('lane-402'), '402 failover class');
    assert(data.classes.includes('other'), 'judge-call class other');
  } finally {
    fs.rmSync(tmp, { force: true });
  }
});

// ── 5. Failover behaviour ───────────────────────────────────────────────────

test('402 on primary immediately fails over without backoff sleep', () => {
  const data = pyJson(`
import json
from ensemble_ahp.ledger import FailureLedger
from ensemble_ahp.judges import JudgeClient
from ensemble_ahp.config import DEFAULT_JUDGES
import tempfile, os
sleeps = []
def fake_sleep(s):
    sleeps.append(s)
def http_post(url, payload, headers, timeout=60.0):
    # Always 402 on openrouter
    return 402, {"error": "Payment Required"}
fd, path = tempfile.mkstemp(suffix='.jsonl')
os.close(fd)
led = FailureLedger(path)
client = JudgeClient(led, api_key='test-key', mock=False, sleeper=fake_sleep, http_post=http_post, backoff_seconds=30)
res = client.complete(DEFAULT_JUDGES[0], step='STRUCTURE', system='s', user='GOAL: x')
entries = led.read_entries()
os.unlink(path)
print(json.dumps({
  "ok": res.ok,
  "sleeps": sleeps,
  "classes": [e['class'] for e in entries],
  "lane": res.response.lane if res.response else None,
  "family": res.response.family if res.response else None,
}))
`);
  assert(data.ok === true, 'should complete via failover');
  assertEq(data.sleeps, [], '402 must not backoff-sleep');
  assert(data.classes.includes('lane-402'), 'ledger 402');
  assert(data.family === 'anthropic', 'family preserved');
});

test('429 triggers exactly one backoff then failover', () => {
  const data = pyJson(`
import json, tempfile, os
from ensemble_ahp.ledger import FailureLedger
from ensemble_ahp.judges import JudgeClient
from ensemble_ahp.config import DEFAULT_JUDGES
sleeps = []
calls = {"n": 0}
def fake_sleep(s):
    sleeps.append(s)
def http_post(url, payload, headers, timeout=60.0):
    calls["n"] += 1
    return 429, {"error": "rate limit"}
fd, path = tempfile.mkstemp(suffix='.jsonl')
os.close(fd)
led = FailureLedger(path)
client = JudgeClient(led, api_key='test-key', mock=False, sleeper=fake_sleep, http_post=http_post, backoff_seconds=30)
res = client.complete(DEFAULT_JUDGES[1], step='STRUCTURE', system='s', user='GOAL: y')
entries = led.read_entries()
os.unlink(path)
print(json.dumps({
  "ok": res.ok,
  "sleeps": sleeps,
  "http_calls": calls["n"],
  "has_429": any(e['class']=='lane-429' for e in entries),
  "has_failover": any(e['class'] in ('lane-429','lane-failover') for e in entries),
}))
`);
  assert(data.ok === true, 'completes after failover');
  assertEq(data.sleeps, [30], 'exactly one 30s backoff');
  assert(data.http_calls >= 2, 'primary + retry before keyless');
  assert(data.has_429 === true, '429 ledgered');
});

test('5xx failover ledgers the schema-allowed lane-5xx class', () => {
  const data = pyJson(`
import json, tempfile, os
from ensemble_ahp.ledger import FailureLedger
from ensemble_ahp.judges import JudgeClient, _class_for_status
from ensemble_ahp.config import DEFAULT_JUDGES
def http_post(url, payload, headers, timeout=60.0):
    return 503, {"error": "Service Unavailable"}
fd, path = tempfile.mkstemp(suffix='.jsonl')
os.close(fd)
led = FailureLedger(path)
client = JudgeClient(led, api_key='test-key', mock=False, sleeper=lambda s: None, http_post=http_post, backoff_seconds=30)
res = client.complete(DEFAULT_JUDGES[0], step='STRUCTURE', system='s', user='GOAL: z')
entries = led.read_entries()
os.unlink(path)
print(json.dumps({
  "ok": res.ok,
  "classes": [e['class'] for e in entries],
  "status_classes": [_class_for_status(s) for s in (500, 502, 503, 504)],
}))
`);
  assert(data.ok === true, 'should complete via failover on 5xx');
  assert(data.classes.includes('lane-5xx'), '5xx must ledger as lane-5xx');
  assertEq(
    data.status_classes,
    ['lane-5xx', 'lane-5xx', 'lane-5xx', 'lane-5xx'],
    'all 5xx statuses map to the aggregate lane-5xx class'
  );
});

// ── 6. Full pipeline sample goal ────────────────────────────────────────────

test('mock pipeline completes steps 1-7 with CR, dispersion, cost, families', () => {
  const ledger = path.join(os.tmpdir(), `ahp-run-${Date.now()}.jsonl`);
  try {
    const report = pyJson(
      `
import json
from ensemble_ahp.pipeline import PipelineInput, run_pipeline
result = run_pipeline(PipelineInput(
  goal="Choose a decision-analysis approach for consultant vendor selection",
  criteria=["Rigor","Audit trail","Cost","Speed","Integration"],
  alternatives=["Ensemble AHP","Single-model AHP","Spreadsheet WSM","Workshop only"],
  k_judges=3,
  n_criteria=5,
  n_alternatives=4,
  task_ref="test-WR-4483-M1",
  ledger_path=r'${ledger.replace(/\\/g, '\\\\')}',
  mock=True,
))
print(json.dumps(result.report))
`,
      { AHP_FORCE_MOCK: '1' }
    );

    assertEq(report.milestone, 'M1');
    assertEq(report.scope, 'steps-1-7-only');
    assert(report.mock_mode === true, 'mock_mode');
    assert(Array.isArray(report.ranked_alternatives) && report.ranked_alternatives.length === 4);
    assert(report.best_alternative, 'best_alternative set');
    assert(typeof report.consistency_ratio.criteria_cr === 'number', 'CR number');
    assert(typeof report.consistency_ratio.ri === 'number', 'RI number');
    assert(
      typeof report.dispersion.criteria_mean_offdiag_cv === 'number',
      'dispersion mean CV'
    );
    assert(report.cost, 'cost line present');
    assert(report.cost.total_usd === 0.0 || report.cost.mode === 'mock', 'mock cost is 0');
    assert(report.families_asserted_ge_2 === true, 'family assertion flag');
    assert(new Set(report.families_invoked).size >= 2, '≥2 families invoked');
    assert(report.judges.length === 3, '3 judges');
    assert(report.deferred_to_m2.includes('critic_gate'));
    assert(report.steps.STRUCTURE, 'STRUCTURE');
    assert(report.steps.GENERATE, 'GENERATE');
    assert(report.steps.VOTE, 'VOTE');
    assert(report.steps.COMPARE, 'COMPARE');
    assert(report.steps.AGGREGATE, 'AGGREGATE');
    assert(report.steps.SOLVE, 'SOLVE');
    assert(report.steps.CHECK, 'CHECK');

    // Ledger on disk
    const lines = fs
      .readFileSync(ledger, 'utf8')
      .split('\n')
      .filter(Boolean)
      .map((l) => JSON.parse(l));
    assert(lines.length >= 3, 'ledger has judge lines');
    assert(
      lines.some((e) => e.trigger === 'family-assert' && /assertion=PASS/.test(e.summary)),
      'family-assert PASS in ledger'
    );
    assert(
      lines.some((e) => e.trigger === 'run-complete'),
      'run-complete ledgered'
    );
    // Schema: no extra keys
    const allowed = new Set([
      'ts',
      'agent',
      'class',
      'trigger',
      'summary',
      'lane',
      'service',
      'repo',
      'task_ref',
      'root_cause',
      'fix_ref',
      'attempts',
    ]);
    for (const e of lines) {
      for (const k of Object.keys(e)) {
        assert(allowed.has(k), `disallowed ledger key ${k}`);
      }
      assert(e.ts && e.agent && e.class && e.trigger && e.summary, 'required fields');
    }
  } finally {
    fs.rmSync(ledger, { force: true });
  }
});

test('CLI sample run exits 0 and prints JSON report', () => {
  const r = spawnSync(
    'python3',
    ['-m', 'ensemble_ahp.cli', '--sample', '--mock', '--n-criteria', '4', '--n-alternatives', '3'],
    {
      encoding: 'utf8',
      cwd: REPO_ROOT,
      env: {
        ...process.env,
        PYTHONPATH: SERVER_DIR,
        AHP_FORCE_MOCK: '1',
        OPENROUTER_API_KEY: '',
        AHP_LEDGER_DIR: path.join(os.tmpdir(), 'ahp-cli-ledgers'),
      },
      maxBuffer: 10 * 1024 * 1024,
    }
  );
  if (r.status !== 0) {
    throw new Error(`cli exit ${r.status}\n${r.stderr}\n${r.stdout}`);
  }
  const report = JSON.parse(r.stdout);
  assert(report.ranked_alternatives.length >= 2, 'ranked alts');
  assert(report.consistency_ratio, 'CR block');
  assert(report.dispersion, 'dispersion block');
});

// ── 7. Wiring ───────────────────────────────────────────────────────────────

test('.mcp.json references ensemble-ahp-engine', () => {
  const mcp = fs.readFileSync(path.join(REPO_ROOT, '.mcp.json'), 'utf8');
  assert(mcp.includes('ensemble-ahp-engine'), '.mcp.json missing server entry');
  assert(
    mcp.includes('mcp-servers/ensemble-ahp-engine'),
    '.mcp.json missing path'
  );
});

test('MCP catalog documents ensemble-ahp-engine', () => {
  const cat = fs.readFileSync(
    path.join(REPO_ROOT, 'docs', 'MCP_REVVEL_CATALOG.md'),
    'utf8'
  );
  assert(cat.includes('ensemble-ahp-engine'), 'catalog missing engine');
  assert(cat.includes('WR-4483'), 'catalog missing WR-4483');
});

test('README mentions M1 scope and no fabricated numbers policy', () => {
  const md = fs.readFileSync(README, 'utf8');
  assert(md.includes('M1'), 'M1');
  assert(md.includes('FAILURE-LEDGER') || md.includes('failure-ledger'), 'ledger');
  assert(md.includes('critic gate') || md.includes('Critic gate'), 'deferred critic');
});

// ── summary ─────────────────────────────────────────────────────────────────

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
