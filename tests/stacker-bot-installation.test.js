'use strict';

/**
 * Regression tests for stacker-bot GitHub App wiring (#16874).
 *
 * Guards the install documentation, connections registry entry, subscription
 * inventory row, labels, and skill so the free stacked-PR bot stays discoverable
 * after the human install at installations/150619571.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const YAML = require('yaml');

const ROOT = path.join(__dirname, '..');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function exists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

const REQUIRED_FILES = [
  'docs/STACKER_BOT_INSTALLATION.md',
  'docs/STACKER_BOT_INTEGRATION.md',
  'skills/stacker-bot/SKILL.md',
  'skills/stacker-bot/stacker-bot.skill.yml',
  'config/connections.yml',
  'data/subscriptions.yml',
  '.github/labels.yml',
];

test('required stacker-bot wiring files exist', () => {
  for (const rel of REQUIRED_FILES) {
    assert.ok(exists(rel), `missing ${rel}`);
  }
});

test('connections.yml registers verified stacker-bot app', () => {
  const doc = YAML.parse(read('config/connections.yml'));
  const entry = (doc.connections || []).find((c) => c.id === 'stacker-bot');
  assert.ok(entry, 'stacker-bot connection missing');
  assert.equal(entry.type, 'app');
  assert.equal(entry.status, 'verified');
  assert.equal(entry.auth, 'free');
  assert.match(String(entry.note || ''), /150619571/);
  assert.ok(
    (entry.access || []).includes('stacked-prs'),
    'access must include stacked-prs'
  );
  assert.ok(
    (entry.used_by || []).some((u) => String(u).includes('STACKER_BOT_INSTALLATION')),
    'used_by must reference installation doc'
  );
});

test('subscriptions.yml tracks free stacker-bot install', () => {
  const doc = YAML.parse(read('data/subscriptions.yml'));
  const entry = (doc.subscriptions || []).find(
    (s) => /stacker/i.test(s.name || '')
  );
  assert.ok(entry, 'Stacker subscription missing');
  assert.equal(entry.type, 'github_app');
  assert.equal(entry.status, 'active');
  assert.equal(entry.billing_cycle, 'free');
  assert.equal(Number(entry.cost), 0);
  assert.match(String(entry.dashboard_url || ''), /150619571/);
  assert.match(String(entry.decision_doc || ''), /STACKER_BOT_INSTALLATION/);
});

test('labels.yml defines stacker and stacker:stacked', () => {
  const doc = YAML.parse(read('.github/labels.yml'));
  const names = new Set((doc.labels || []).map((l) => l.name));
  assert.ok(names.has('stacker'), 'stacker label missing');
  assert.ok(names.has('stacker:stacked'), 'stacker:stacked label missing');
});

test('installation doc records install id, permissions, and click path', () => {
  const md = read('docs/STACKER_BOT_INSTALLATION.md');
  assert.match(md, /150619571/);
  assert.match(md, /stacker-bot/);
  assert.match(md, /github\.com\/settings\/installations\/150619571/);
  assert.match(md, /Pull requests/i);
  assert.match(md, /Checks/i);
  assert.match(md, /brew tap stackedpr\/stacker/);
  assert.match(md, /#16874|16874/);
});

test('integration doc documents merge-top-down and labels', () => {
  const md = read('docs/STACKER_BOT_INTEGRATION.md');
  assert.match(md, /stacker:stacked/);
  assert.match(md, /top/i);
  assert.match(md, /merge/i);
  assert.match(md, /GRAPHITE_INTEGRATION/);
});

test('skill points at install id and forbids invented secrets', () => {
  const skill = read('skills/stacker-bot/SKILL.md');
  assert.match(skill, /150619571/);
  assert.match(skill, /No API key/i);
  assert.match(skill, /STACKER_\*/);
  const yml = YAML.parse(read('skills/stacker-bot/stacker-bot.skill.yml'));
  assert.equal(yml.installation_id, '150619571');
  assert.deepEqual(yml.secrets, []);
});

test('Graphite docs mention Stacker as installed free alternative', () => {
  const md = read('docs/GRAPHITE_INTEGRATION.md');
  assert.match(md, /[Ss]tacker/);
  assert.match(md, /150619571|STACKER_BOT/);
});
