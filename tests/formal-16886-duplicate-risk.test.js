'use strict';

/**
 * Regression: formal duplicate_risk on PR #16886 must remain resolved with
 * documented human override + scorecard evidence (issue #16951).
 *
 * Would have failed when the WR pack only had the open formal:fail stub and
 * no scorecard line — the acceptance criteria for #16951.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const WR_PATH = path.join(
  ROOT,
  'wr/pending/formal/WR-formal-16886-duplicate_risk.md',
);
const SCORECARD_PATH = path.join(ROOT, 'wr/memory/agent-scorecard.jsonl');
const INDEX_PATH = path.join(ROOT, 'wr/pending/formal/INDEX.md');

test('WR-formal-16886 documents hybrid human_override resolution', () => {
  const body = fs.readFileSync(WR_PATH, 'utf8');
  assert.match(body, /Resolved — documented human override/i);
  assert.match(body, /resolution:\s*human_override/);
  assert.match(body, /resolution_path:\s*hybrid/);
  assert.match(body, /#16884/);
  assert.match(body, /close-as-duplicate-only/);
  assert.match(body, /ocean2-maintenance/);
  assert.match(body, /9600/);
  assert.match(body, /midnghtsapphire merged/);
  assert.match(body, /Closes[^#\n]*#16951/i);
});

test('scorecard logs formal duplicate_risk pass for PR 16886', () => {
  const lines = fs
    .readFileSync(SCORECARD_PATH, 'utf8')
    .split(/\r?\n/)
    .filter((ln) => ln.trim());
  assert.ok(lines.length >= 1, 'scorecard must not be empty');

  const entries = lines.map((ln, i) => {
    try {
      return JSON.parse(ln);
    } catch (err) {
      throw new Error(`scorecard line ${i + 1} is not valid JSON: ${err.message}`);
    }
  });

  const hit = entries.find(
    (e) => e.pr === 16886 && e.issue === 16951 && e.verdict === 'pass',
  );
  assert.ok(hit, 'expected scorecard entry for pr=16886 issue=16951 verdict=pass');
  assert.equal(hit.resolution, 'human_override');
  assert.equal(hit.resolution_path, 'hybrid');
  assert.equal(hit.canonical_open_wr, 16884);
  assert.match(
    String(hit.note || ''),
    /formal duplicate_risk resolved by human override/i,
  );
});

test('formal INDEX marks PR 16886 as resolved', () => {
  const index = fs.readFileSync(INDEX_PATH, 'utf8');
  assert.match(index, /#16886[^\n]*resolved/i);
  assert.match(index, /WR-formal-16886-duplicate_risk\.md/);
});
