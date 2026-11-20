#!/usr/bin/env node
'use strict';

/**
 * Connector matrix generator. The database is the source of truth.
 *
 * The database is two text files, data/connectors/schema.sql and
 * data/connectors/seed.sql. This script loads them into an in-memory SQLite
 * (node:sqlite, no install, no account, no network), checks them, and renders
 * every connector table in the repo from the rows:
 *   - docs/TOOL_COST_INDEX.md        full matrix, stale rows, open questions
 *   - docs/CONNECTIONS_REGISTRY.md   compact matrix (block survives connections-registry.js)
 *   - README.md                      summary block after the connections block
 *   - connector-matrix-dashboard.html  filterable dashboard
 *
 *   node --experimental-sqlite scripts/connectors-db.js --write   regenerate (default)
 *   node --experimental-sqlite scripts/connectors-db.js --check   exit 1 on drift or a broken row
 *   node --experimental-sqlite scripts/connectors-db.js --json    dump the rows as JSON
 *   node --experimental-sqlite scripts/connectors-db.js --db out.sqlite   export a SQLite file
 *   node --experimental-sqlite scripts/connectors-db.js --csv out.csv     export for Airtable or Notion import
 *
 * --experimental-sqlite is required only on Node 22.5 to 22.12 (the CircleCI
 * node-executor image is 22.11). Node 22.13 and later ignore it harmlessly.
 * Output is deterministic: no timestamps, so --check can compare byte for byte.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SCHEMA_PATH = path.join(ROOT, 'data/connectors/schema.sql');
const SEED_PATH = path.join(ROOT, 'data/connectors/seed.sql');
const REGISTRY_YML = path.join(ROOT, 'config/connections.yml');
const TOOL_COST_PATH = path.join(ROOT, 'docs/TOOL_COST_INDEX.md');
const REGISTRY_DOC_PATH = path.join(ROOT, 'docs/CONNECTIONS_REGISTRY.md');
const README_PATH = path.join(ROOT, 'README.md');
const HTML_PATH = path.join(ROOT, 'connector-matrix-dashboard.html');

const M_BEGIN = '<!-- BEGIN:connector-matrix -->';
const M_END = '<!-- END:connector-matrix -->';
const CONNECTIONS_END = '<!-- END:connections -->';
const MATRIX_ANCHOR = 'connector-matrix-database-generated';

const STATUS_LABEL = {
  'connected-working': 'connected and working',
  connected: 'connected',
  available: 'available',
  unverified: 'unverified',
};

function getSqlite() {
  try {
    return require('node:sqlite');
  } catch (e) {
    throw new Error(
      'node:sqlite is not available. Use Node 22.13 or later, or run with `node --experimental-sqlite` on Node 22.5 to 22.12. ' +
        `(${e.code || e.message})`
    );
  }
}

/** Build the database in memory (or at `file`) from schema.sql and seed.sql. */
function openDb(file = ':memory:', schemaSql = fs.readFileSync(SCHEMA_PATH, 'utf8'), seedSql = fs.readFileSync(SEED_PATH, 'utf8')) {
  const { DatabaseSync } = getSqlite();
  const db = new DatabaseSync(file);
  db.exec(schemaSql);
  db.exec(seedSql);
  return db;
}

function loadModel(db) {
  const connectors = db.prepare('SELECT * FROM connector ORDER BY sort_order, id').all().map((c) => ({ ...c }));
  const links = db
    .prepare(
      `SELECT l.connector_id, l.target_id, l.note, t.name AS target_name
         FROM connector_link l JOIN target t ON t.id = l.target_id
        ORDER BY l.connector_id, l.sort_order, l.target_id`
    )
    .all();
  const sources = db.prepare('SELECT * FROM connector_source ORDER BY connector_id, sort_order, label').all();
  for (const c of connectors) {
    c.links = links.filter((l) => l.connector_id === c.id).map((l) => ({ id: l.target_id, name: l.target_name, note: l.note }));
    c.sources = sources.filter((s) => s.connector_id === c.id).map((s) => ({ label: s.label, url: s.url }));
  }
  const staleRows = db.prepare('SELECT * FROM stale_row ORDER BY id').all().map((r) => ({ ...r }));
  const questions = db.prepare('SELECT * FROM open_question ORDER BY id').all().map((r) => ({ ...r }));
  return { connectors, staleRows, questions };
}

/** Problems the schema cannot express. Returns a list of strings; empty means healthy. */
function integrityProblems(model, registryIds) {
  const problems = [];
  const staleIds = new Set(model.staleRows.map((r) => r.connector_id).filter(Boolean));
  for (const c of model.connectors) {
    if (c.registry_id && registryIds && !registryIds.has(c.registry_id)) {
      problems.push(`connector ${c.id}: registry_id "${c.registry_id}" is not an id in config/connections.yml`);
    }
    if (c.stale === 1 && !staleIds.has(c.id)) problems.push(`connector ${c.id}: stale = 1 but no stale_row names it`);
    if (c.stale === 0 && staleIds.has(c.id)) problems.push(`connector ${c.id}: has a stale_row but stale = 0`);
    if (c.tier_source === 'audrey-confirmed' && !c.verified_on) {
      problems.push(`connector ${c.id}: audrey-confirmed needs verified_on (the date she said it)`);
    }
    if (!c.sources.length) problems.push(`connector ${c.id}: no source`);
  }
  return problems;
}

function registryIdSet() {
  const YAML = require('yaml');
  const doc = YAML.parse(fs.readFileSync(REGISTRY_YML, 'utf8'));
  return new Set((doc.connections || []).map((c) => c.id));
}

// ---------- rendering ----------

/** One table cell: `|` would end the cell, newlines would end the row. */
function cell(s) {
  const t = String(s === null || s === undefined || s === '' ? '—' : s).replace(/\|/g, '\\|').replace(/\s*\n\s*/g, ' ').trim();
  return t;
}
const row = (cells) => `| ${cells.map(cell).join(' | ')} |`;
const sentence = (a, b) => (b ? `${a}. ${b}` : a);

function tierBadge(c) {
  const when = c.verified_on ? `, ${c.verified_on}` : '';
  if (c.tier_source === 'audrey-confirmed') return `*(Audrey-confirmed${when})*`;
  if (c.tier_source === 'doc-verified') return `*(doc-verified${when})*`;
  return '*(unverified)*';
}
const planCell = (c) => sentence(`${c.plan_tier} ${tierBadge(c)}`, c.tier_note);
const statusCell = (c) => sentence(STATUS_LABEL[c.status], c.status_note);
const appCell = (c) => (c.stale ? `${c.app} ⚠️ stale record` : c.app);
function connectsCell(c) {
  const parts = c.links.map((l) => (l.note ? `${l.name} (${l.note})` : l.name));
  if (c.connects_note) parts.push(c.connects_note);
  return parts.length ? parts.join(', ') : '—';
}
const sourcesCell = (c) => c.sources.map((s) => (s.url ? `[${s.label}](${s.url})` : s.label)).join(', ');

function renderFullTables(model) {
  const out = [];
  out.push(row(['App', 'Plan tier', 'Connects to', 'Status', 'Free workaround it enables', 'Source']));
  out.push('| --- | --- | --- | --- | --- | --- |');
  for (const c of model.connectors) {
    out.push(row([appCell(c), planCell(c), connectsCell(c), statusCell(c), c.free_workaround, sourcesCell(c)]));
  }
  return out;
}

function renderStale(model) {
  const out = [];
  out.push('### Stale rows (marked, not removed)');
  out.push('');
  out.push('Each line named here stays where it is. The current fact is here.');
  out.push('');
  out.push(row(['Where', 'What it says', 'Current fact', 'Noted', 'Source']));
  out.push('| --- | --- | --- | --- | --- |');
  for (const r of model.staleRows) {
    out.push(row([r.location, r.says, r.current_fact, r.noted_on, r.source_url ? `[${r.source_label}](${r.source_url})` : r.source_label]));
  }
  return out;
}

function renderQuestions(model) {
  const open = model.questions.filter((q) => !q.answered);
  const done = model.questions.filter((q) => q.answered);
  const out = ['### Open questions for Audrey', ''];
  if (!open.length) out.push('None open.');
  open.forEach((q, i) => out.push(`${i + 1}. ${q.question}`));
  if (done.length) {
    out.push('', '### Answered questions', '');
    done.forEach((q, i) => out.push(`${i + 1}. ${q.question} Answer: ${q.answer}`));
  }
  return out;
}

function counts(model) {
  const by = (key, values) => values.map((v) => `${model.connectors.filter((c) => c[key] === v).length} ${v}`);
  return {
    total: model.connectors.length,
    tier: by('tier_source', ['audrey-confirmed', 'doc-verified', 'unverified']).join(', '),
    stale: model.connectors.filter((c) => c.stale === 1).length,
  };
}

function renderToolCostBlock(model) {
  const n = counts(model);
  const out = [M_BEGIN];
  out.push('## Connector matrix (database-generated)');
  out.push('');
  out.push(
    '<!-- generated by scripts/connectors-db.js from data/connectors/schema.sql and data/connectors/seed.sql. Do not edit by hand. -->'
  );
  out.push(
    'Generated from the connector database. To change a row, edit [`data/connectors/seed.sql`](../data/connectors/seed.sql) ' +
      'and run `npm run connectors`. `npm run connectors:check` fails when this block, the registry block, the README block ' +
      'or the dashboard differ from the database. It answers one question per app: what does it connect to, and which paid ' +
      'add-on does that connection let us skip. The wiring itself lives in [`config/connections.yml`](../config/connections.yml) ' +
      'and its view [`docs/CONNECTIONS_REGISTRY.md`](CONNECTIONS_REGISTRY.md).'
  );
  out.push('');
  out.push(
    'Plan tier words: *Audrey-confirmed* is her own word and carries the date she said it. *doc-verified* means a vendor ' +
      'page or a read-only API call. *unverified* means nobody has confirmed it. Status words: **connected and working** ' +
      'means Audrey said so. **connected** means the repo or an installed bot shows it. **available** means the vendor ' +
      'documents it and nothing here proves it is on.'
  );
  out.push('');
  out.push(`${n.total} apps: ${n.tier}. ${n.stale} with a stale record elsewhere in the repo.`);
  out.push('');
  out.push(...renderFullTables(model));
  out.push('');
  out.push(...renderStale(model));
  out.push('');
  out.push(...renderQuestions(model));
  out.push(M_END);
  return out.join('\n');
}

function renderRegistryBlock(model) {
  const out = [M_BEGIN];
  out.push('## Connector matrix');
  out.push('');
  out.push(
    '<!-- generated by scripts/connectors-db.js from data/connectors/seed.sql. Do not edit by hand. -->'
  );
  out.push(
    'Plan tier, status and connections for the paid apps, from the connector database ' +
      '([`data/connectors/seed.sql`](../data/connectors/seed.sql)). Free workarounds, sources, stale rows and open questions: ' +
      `[TOOL_COST_INDEX](TOOL_COST_INDEX.md#${MATRIX_ANCHOR}). Filterable view: [connector-matrix-dashboard.html](../connector-matrix-dashboard.html).`
  );
  out.push('');
  out.push(row(['App', 'Plan tier', 'Status', 'Connects to']));
  out.push('| --- | --- | --- | --- |');
  for (const c of model.connectors) out.push(row([appCell(c), planCell(c), statusCell(c), connectsCell(c)]));
  out.push(M_END);
  return out.join('\n');
}

function renderReadmeBlock(model) {
  const n = counts(model);
  return [
    M_BEGIN,
    '### 🧩 Connector matrix',
    '',
    `${n.total} paid or connected apps with plan tier, connections and free workarounds (${n.tier}). ` +
      'Database-generated: [`data/connectors/seed.sql`](data/connectors/seed.sql). ' +
      `Tables: [docs/TOOL_COST_INDEX.md](docs/TOOL_COST_INDEX.md#${MATRIX_ANCHOR}) · ` +
      '[docs/CONNECTIONS_REGISTRY.md](docs/CONNECTIONS_REGISTRY.md) · ' +
      'dashboard: [connector-matrix-dashboard.html](connector-matrix-dashboard.html).',
    M_END,
  ].join('\n');
}

function renderHtml(model) {
  const data = JSON.stringify(
    model.connectors.map((c) => ({
      id: c.id,
      app: c.app,
      plan: planCell(c).replace(/\*/g, ''),
      tier_source: c.tier_source,
      status: c.status,
      status_text: statusCell(c),
      connects: connectsCell(c),
      workaround: c.free_workaround,
      sources: c.sources,
      stale: c.stale === 1,
      stale_note: c.stale_note || '',
    }))
  ).replace(/</g, '\\u003c');
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>Connector Matrix</title>
<style>
  body{font:14px/1.5 system-ui,sans-serif;margin:1.5rem;color:#111}
  h1{margin:0 0 .25rem}
  .meta{color:#666;margin-bottom:1rem}
  .controls{display:flex;gap:.5rem;flex-wrap:wrap;margin-bottom:1rem}
  input,select{padding:.4rem .5rem;font:inherit;border:1px solid #ccc;border-radius:6px}
  table{border-collapse:collapse;width:100%}
  th,td{border-bottom:1px solid #eee;padding:.4rem .55rem;text-align:left;vertical-align:top}
  th{position:sticky;top:0;background:#fafafa;cursor:pointer}
  code{background:#f4f4f4;padding:.1rem .3rem;border-radius:4px}
  .a{color:#138000;font-weight:600}.d{color:#0b5cad;font-weight:600}.u{color:#b06b00;font-weight:600}
  .stale{background:#fff7e0}
</style>
</head>
<body>
<h1>Connector Matrix</h1>
<div class="meta">Generated from <code>data/connectors/seed.sql</code> by <code>scripts/connectors-db.js</code>. Do not edit by hand.</div>
<div class="controls">
  <input id="q" placeholder="filter by app, plan, connection, workaround" size="36"/>
  <select id="tier"><option value="">all plan sources</option><option>audrey-confirmed</option><option>doc-verified</option><option>unverified</option></select>
  <select id="status"><option value="">all statuses</option><option>connected-working</option><option>connected</option><option>available</option><option>unverified</option></select>
  <label><input type="checkbox" id="stale"/> stale records only</label>
  <span id="count" class="meta"></span>
</div>
<table id="t"><thead><tr>
  <th data-k="app">App</th><th data-k="plan">Plan tier</th><th data-k="status">Status</th>
  <th>Connects to</th><th>Free workaround</th><th>Sources</th>
</tr></thead><tbody></tbody></table>
<script>
const DATA = ${data};
const tbody = document.querySelector('#t tbody');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let sortK = 'app', asc = true;
function render() {
  const q = document.getElementById('q').value.toLowerCase();
  const tier = document.getElementById('tier').value, st = document.getElementById('status').value;
  const staleOnly = document.getElementById('stale').checked;
  const rows = DATA.filter((d) => (!q || JSON.stringify(d).toLowerCase().includes(q)) &&
    (!tier || d.tier_source === tier) && (!st || d.status === st) && (!staleOnly || d.stale));
  rows.sort((a, b) => String(a[sortK] || '').localeCompare(String(b[sortK] || '')) * (asc ? 1 : -1));
  tbody.innerHTML = rows.map((d) => '<tr class="' + (d.stale ? 'stale' : '') + '">' +
    '<td><b>' + esc(d.app) + '</b>' + (d.stale ? '<br><small>stale record: ' + esc(d.stale_note) + '</small>' : '') + '</td>' +
    '<td>' + esc(d.plan) + '</td>' +
    '<td class="' + (d.status.startsWith('connected') ? 'a' : d.status === 'available' ? 'd' : 'u') + '">' + esc(d.status_text) + '</td>' +
    '<td>' + esc(d.connects) + '</td><td>' + esc(d.workaround) + '</td>' +
    '<td>' + d.sources.map((s) => s.url ? '<a href="' + esc(s.url) + '">' + esc(s.label) + '</a>' : esc(s.label)).join(', ') + '</td></tr>').join('');
  document.getElementById('count').textContent = rows.length + ' / ' + DATA.length + ' shown';
}
document.querySelectorAll('th[data-k]').forEach((th) => th.onclick = () => { const k = th.dataset.k; asc = sortK === k ? !asc : true; sortK = k; render(); });
['q', 'tier', 'status', 'stale'].forEach((id) => document.getElementById(id).addEventListener('input', render));
render();
</script>
</body>
</html>
`;
}

function renderCsv(model) {
  const esc = (v) => `"${String(v === null || v === undefined ? '' : v).replace(/"/g, '""')}"`;
  const head = ['id', 'app', 'registry_id', 'plan_tier', 'tier_source', 'tier_note', 'status', 'status_note', 'connects_to', 'free_workaround', 'sources', 'verified_on', 'stale', 'stale_note'];
  const lines = [head.join(',')];
  for (const c of model.connectors) {
    lines.push(
      [c.id, c.app, c.registry_id, c.plan_tier, c.tier_source, c.tier_note, c.status, c.status_note, connectsCell(c), c.free_workaround,
        c.sources.map((s) => (s.url ? `${s.label} ${s.url}` : s.label)).join('; '), c.verified_on, c.stale, c.stale_note]
        .map(esc).join(',')
    );
  }
  return lines.join('\n') + '\n';
}

// ---------- injection ----------

/** Replace the marked block, or put `block` where `fallback(text, block)` says. Pure. */
function inject(text, block, fallback) {
  const b = text.indexOf(M_BEGIN);
  const e = text.indexOf(M_END);
  if (b !== -1 && e !== -1 && e > b) return text.slice(0, b) + block + text.slice(e + M_END.length);
  return fallback(text, block);
}
const appendAtEnd = (text, block) => `${text.replace(/\s*$/, '')}\n\n${block}\n`;
const afterConnections = (text, block) =>
  text.includes(CONNECTIONS_END)
    ? text.replace(CONNECTIONS_END, `${CONNECTIONS_END}\n\n${block}`)
    : appendAtEnd(text, block);

/** Everything this script owns, as { absolutePath: expectedContent }. Pure given the model and the current files. */
function expectedOutputs(model, read = (p) => (fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '')) {
  return {
    [TOOL_COST_PATH]: inject(read(TOOL_COST_PATH), renderToolCostBlock(model), appendAtEnd),
    [REGISTRY_DOC_PATH]: inject(read(REGISTRY_DOC_PATH), renderRegistryBlock(model), appendAtEnd),
    [README_PATH]: inject(read(README_PATH), renderReadmeBlock(model), afterConnections),
    [HTML_PATH]: renderHtml(model),
  };
}

function build() {
  const db = openDb();
  const model = loadModel(db);
  db.close();
  return model;
}

function main(argv = process.argv.slice(2)) {
  const arg = (name) => {
    const i = argv.indexOf(name);
    return i === -1 ? null : argv[i + 1];
  };
  if (argv.includes('--db')) {
    const file = arg('--db');
    if (!file) throw new Error('--db needs a path');
    openDb(path.resolve(file)).close();
    console.log(`wrote ${file}`);
    return 0;
  }
  const model = build();
  if (argv.includes('--json')) {
    process.stdout.write(JSON.stringify(model, null, 2) + '\n');
    return 0;
  }
  if (argv.includes('--csv')) {
    const file = arg('--csv');
    if (!file) throw new Error('--csv needs a path');
    fs.writeFileSync(path.resolve(file), renderCsv(model));
    console.log(`wrote ${file}`);
    return 0;
  }
  const problems = integrityProblems(model, registryIdSet());
  const want = expectedOutputs(model);
  if (argv.includes('--check')) {
    const drift = Object.entries(want)
      .filter(([p, content]) => !fs.existsSync(p) || fs.readFileSync(p, 'utf8') !== content)
      .map(([p]) => path.relative(ROOT, p));
    for (const p of problems) console.error(`BROKEN ROW: ${p}`);
    for (const p of drift) console.error(`DRIFT: ${p} differs from the connector database. Run: npm run connectors`);
    if (problems.length || drift.length) return 1;
    console.log(`connector matrix OK: ${model.connectors.length} connectors, 4 generated views match the database.`);
    return 0;
  }
  if (problems.length) {
    for (const p of problems) console.error(`BROKEN ROW: ${p}`);
    return 1;
  }
  for (const [p, content] of Object.entries(want)) {
    if (!fs.existsSync(p) || fs.readFileSync(p, 'utf8') !== content) fs.writeFileSync(p, content);
    console.log(`generated ${path.relative(ROOT, p)}`);
  }
  return 0;
}

module.exports = {
  M_BEGIN, M_END, MATRIX_ANCHOR, STATUS_LABEL,
  openDb, loadModel, integrityProblems, registryIdSet, build, inject, appendAtEnd, afterConnections,
  renderToolCostBlock, renderRegistryBlock, renderReadmeBlock, renderHtml, renderCsv, expectedOutputs, main,
};

if (require.main === module) process.exitCode = main();
