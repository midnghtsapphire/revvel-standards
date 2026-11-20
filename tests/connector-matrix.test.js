'use strict';

/**
 * Connector matrix database tests (Decipherer, PR #18475).
 *
 * scripts/connectors-db.js needs node:sqlite. On Node 22.5 to 22.12 (the CircleCI
 * node-executor image is 22.11) that needs --experimental-sqlite, so every call that
 * touches the database runs in a child process with the flag. Node 22.13+ ignores it.
 */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const SCRIPT = path.join(ROOT, 'scripts/connectors-db.js');
const FLAG = '--experimental-sqlite';
const { carryMatrixBlock } = require('../scripts/connections-registry');

function cli(...args) {
  return spawnSync(process.execPath, [FLAG, SCRIPT, ...args], { cwd: ROOT, encoding: 'utf8' });
}
/** Run `code` in a child with the database module loaded as `m`; return parsed JSON from stdout. */
function evalInChild(code) {
  const out = execFileSync(
    process.execPath,
    [FLAG, '-e', `const m = require(${JSON.stringify(SCRIPT)}); ${code}`],
    { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }
  );
  return JSON.parse(out);
}

test('drift check: the four generated views match the database and every row is healthy', () => {
  const r = cli('--check');
  assert.strictEqual(r.status, 0, `${r.stdout}\n${r.stderr}`);
  assert.match(r.stdout, /connector matrix OK/);
});

test('the database loads with every connector, a source each, and valid enums', () => {
  const model = JSON.parse(cli('--json').stdout);
  assert.ok(model.connectors.length >= 15);
  for (const c of model.connectors) {
    assert.ok(['audrey-confirmed', 'doc-verified', 'unverified'].includes(c.tier_source), c.id);
    assert.ok(['connected-working', 'connected', 'available', 'unverified'].includes(c.status), c.id);
    assert.ok(c.sources.length > 0, `${c.id} has no source`);
    if (c.stale) assert.ok(c.stale_note, `${c.id} stale without a note`);
  }
  assert.ok(model.staleRows.length >= 4);
  assert.ok(model.questions.length >= 4);
});

test('connector links are many-to-many through the target table', () => {
  const model = JSON.parse(cli('--json').stdout);
  const circle = model.connectors.find((c) => c.id === 'circleci');
  const slack = model.connectors.find((c) => c.id === 'slack');
  assert.ok(circle.links.some((l) => l.id === 'slack'));
  assert.ok(slack.links.some((l) => l.id === 'circleci'));
});

test('the schema rejects bad rows', () => {
  const result = evalInChild(`
    const db = m.openDb();
    const tries = {
      badTier: "INSERT INTO connector (id, app, plan_tier, tier_source, status, free_workaround, added_on) VALUES ('x1','X','p','guess','available','w','2026-11-19')",
      badStatus: "INSERT INTO connector (id, app, plan_tier, tier_source, status, free_workaround, added_on) VALUES ('x2','X','p','unverified','maybe','w','2026-11-19')",
      staleNoNote: "INSERT INTO connector (id, app, plan_tier, tier_source, status, free_workaround, added_on, stale) VALUES ('x3','X','p','unverified','available','w','2026-11-19',1)",
      badDate: "INSERT INTO connector (id, app, plan_tier, tier_source, status, free_workaround, added_on) VALUES ('x4','X','p','unverified','available','w','soon')",
      orphanLink: "INSERT INTO connector_link (connector_id, target_id) VALUES ('circleci','no-such-target')",
      httpSource: "INSERT INTO connector_source (connector_id, label, url) VALUES ('circleci','x','http://example.com')",
      duplicateId: "INSERT INTO connector (id, app, plan_tier, tier_source, status, free_workaround, added_on) VALUES ('circleci','X','p','unverified','available','w','2026-11-19')",
      answeredNoAnswer: "INSERT INTO open_question (id, question, asked_on, answered) VALUES (99,'q','2026-11-19',1)",
    };
    const out = {};
    for (const [k, sql] of Object.entries(tries)) { try { db.exec(sql); out[k] = 'accepted'; } catch (e) { out[k] = 'rejected'; } }
    console.log(JSON.stringify(out));
  `);
  for (const [k, v] of Object.entries(result)) assert.strictEqual(v, 'rejected', k);
});

test('integrity: stale flag and stale rows must agree; audrey-confirmed needs a date', () => {
  const problems = evalInChild(`
    const model = m.build();
    const c = model.connectors.find((x) => x.id === 'cubic');
    c.stale = 1; // no stale_row names cubic
    const d = model.connectors.find((x) => x.id === 'chunk');
    d.verified_on = null; // audrey-confirmed without a date
    console.log(JSON.stringify(m.integrityProblems(model, null)));
  `);
  assert.ok(problems.some((p) => /cubic.*no stale_row/.test(p)));
  assert.ok(problems.some((p) => /chunk.*verified_on/.test(p)));
});

test('every registry_id is a real id in config/connections.yml', () => {
  const problems = evalInChild(`
    const model = m.build();
    console.log(JSON.stringify(m.integrityProblems(model, m.registryIdSet()).filter((p) => /registry_id/.test(p))));
  `);
  assert.deepStrictEqual(problems, []);
});

test('a hand edit inside a generated block is caught, and regenerating is idempotent', () => {
  const r = evalInChild(`
    const model = m.build();
    const real = m.expectedOutputs(model);
    const tc = Object.keys(real).find((p) => p.endsWith('TOOL_COST_INDEX.md'));
    const edited = real[tc].replace('Audrey-confirmed, 2026-11-14', 'Audrey-confirmed, 2026-11-15');
    const again = m.expectedOutputs(model, (p) => (p === tc ? edited : real[p]));
    const twice = m.expectedOutputs(model, (p) => real[p]);
    console.log(JSON.stringify({
      handEditIsOverwritten: again[tc] === real[tc] && edited !== real[tc],
      idempotent: Object.keys(real).every((p) => twice[p] === real[p]),
    }));
  `);
  assert.strictEqual(r.handEditIsOverwritten, true);
  assert.strictEqual(r.idempotent, true);
});

test('nothing was lost: every app in the retired hand-written matrix is in the database', () => {
  const md = fs.readFileSync(path.join(ROOT, 'docs/TOOL_COST_INDEX.md'), 'utf8');
  const retired = md.slice(md.indexOf('RETIRED 2026-11-19'), md.indexOf('-->', md.indexOf('RETIRED 2026-11-19')));
  const firstTable = retired.split('### Stale rows')[0];
  const apps = firstTable
    .split('\n')
    .filter((l) => l.startsWith('| ') && !l.startsWith('| App') && !l.startsWith('| ---'))
    .map((l) => l.split('|')[1].trim());
  assert.ok(apps.length >= 14, `found ${apps.length} retired rows`);
  const model = JSON.parse(cli('--json').stdout);
  const names = new Set(model.connectors.map((c) => c.app));
  for (const a of apps) assert.ok(names.has(a), `retired row "${a}" is missing from the database`);
});

test('the old hand-written text is kept, commented out, not deleted', () => {
  const md = fs.readFileSync(path.join(ROOT, 'docs/TOOL_COST_INDEX.md'), 'utf8');
  assert.match(md, /RETIRED 2026-11-19 by Decipherer/);
  assert.match(md, /## Connector matrix \(2026-11-19\)/);
  assert.match(md, /<!-- BEGIN:connector-matrix -->/);
});

test('connections-registry.js keeps the connector block when it regenerates the registry doc', () => {
  const begin = '<!-- BEGIN:connector-matrix -->';
  const end = '<!-- END:connector-matrix -->';
  const prior = `old\n\n${begin}\nMATRIX\n${end}\n`;
  const next = '# Registry\n';
  const merged = carryMatrixBlock(prior, next);
  assert.match(merged, /MATRIX/);
  assert.strictEqual(carryMatrixBlock('no block here', next), next);
  assert.strictEqual(carryMatrixBlock(prior, merged), merged);
});

test('exports: --csv and --db produce files for Airtable import or a SQLite viewer', () => {
  const dir = fs.mkdtempSync(path.join(require('os').tmpdir(), 'connectors-'));
  const csv = path.join(dir, 'c.csv');
  const db = path.join(dir, 'c.sqlite');
  assert.strictEqual(cli('--csv', csv).status, 0);
  assert.strictEqual(cli('--db', db).status, 0);
  assert.match(fs.readFileSync(csv, 'utf8'), /^id,app,registry_id,plan_tier,tier_source/);
  assert.ok(fs.statSync(db).size > 4096);
  fs.rmSync(dir, { recursive: true, force: true });
});
