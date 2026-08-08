'use strict';

/**
 * Ensures the weekly audit WR (#16947) left durable artifacts in-repo:
 * refreshed queue docs + method memory + allowlist triage note.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const REPO_ROOT = path.join(__dirname, '..');

const AUDIT_README = path.join(
  REPO_ROOT,
  'wr',
  'pending',
  'weekly-audit-2026-08-05',
  'README.md',
);
const AUDIT_MEMORY = path.join(
  REPO_ROOT,
  'wr',
  'memory',
  'weekly-audit-2026-07-29-to-2026-08-05.md',
);
const TRIAGE_2026_08_08 = path.join(
  REPO_ROOT,
  'disaster-recovery',
  'pack-2026-08-05',
  'artifacts',
  'PR_BACKLOG_TRIAGE_2026-08-08.md',
);

test('weekly audit README exists and records human_gate + live refresh', () => {
  assert.ok(fs.existsSync(AUDIT_README), 'missing weekly audit README');
  const body = fs.readFileSync(AUDIT_README, 'utf8');
  assert.match(body, /#16947|#16947/);
  assert.match(body, /human_gate|Human gate|human undraft/i);
  assert.match(body, /ready-to-merge/);
  assert.match(body, /#16929/);
  assert.match(body, /#16897/);
  assert.match(body, /2026-08-08/);
  assert.match(body, /Click-by-click|click-by-click/);
});

test('weekly audit README marks sheaf pick and governance pack as done', () => {
  const body = fs.readFileSync(AUDIT_README, 'utf8');
  assert.match(body, /#16944/);
  assert.match(body, /merged/i);
  assert.match(body, /Close as duplicate|#16905|#16895/);
});

test('method memory file exists for the next auditor', () => {
  assert.ok(fs.existsSync(AUDIT_MEMORY), 'missing audit method memory');
  const body = fs.readFileSync(AUDIT_MEMORY, 'utf8');
  assert.match(body, /ready-to-merge/);
  assert.match(body, /label-allowlist/);
});

test('2026-08-08 backlog triage artifact exists and points at remaining Tier A', () => {
  assert.ok(fs.existsSync(TRIAGE_2026_08_08), 'missing 2026-08-08 triage note');
  const body = fs.readFileSync(TRIAGE_2026_08_08, 'utf8');
  assert.match(body, /#16929/);
  assert.match(body, /#16873/);
  assert.match(body, /No auto-merge/i);
});
