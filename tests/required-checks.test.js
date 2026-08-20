'use strict';

/**
 * Required-vs-informational check registry (WR #17738).
 *
 * Pins the intended merge gate so "what is required" is explicit rather than
 * whatever happened to be clicked in the GitHub ruleset UI last. The live
 * ruleset still enforces; this file makes drift reviewable in CI.
 *
 * GREEN_MAIN_STANDARD.md rule 5 + #17738: do not de-require a real gate to
 * look green, and do not require always-red vendor account/quota checks.
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const yaml = require('yaml');

const ROOT = path.join(__dirname, '..');
const REGISTRY = path.join(ROOT, 'config', 'required-checks.yml');
const KNOWN_RED = path.join(ROOT, 'config', 'known-red-checks.yml');
const RUNBOOK = path.join(ROOT, 'docs', 'PR_SIGNAL_HYGIENE.md');
const REMINDERS = path.join(ROOT, 'REMINDERS.md');
const DECISIONS = path.join(ROOT, 'DECISIONS.md');

const load = (p) => yaml.parse(fs.readFileSync(p, 'utf8'));

const EXPECTED_REQUIRED = [
  'check-for-scaffolding',
  'ci/circleci: lint-and-test',
  'GitGuardian Security Checks',
];

test('required-checks.yml lists exactly the ruleset trio as required', () => {
  const doc = load(REGISTRY);
  assert.equal(doc.version, 1);
  assert.equal(doc.ruleset.id, 17149543);
  const contexts = doc.required.map((r) => r.context);
  assert.deepEqual(
    contexts,
    EXPECTED_REQUIRED,
    'required list must match the active main ruleset (id 17149543)',
  );
  for (const entry of doc.required) {
    assert.ok(entry.why && String(entry.why).length > 20, `${entry.context}: why is required`);
    assert.ok(entry.owner_lane, `${entry.context}: owner_lane is required`);
  }
});

test('always-red vendor checks are informational, never required', () => {
  const doc = load(REGISTRY);
  const required = new Set(doc.required.map((r) => r.context));
  const informational = doc.informational.map((r) => r.context);

  for (const ctx of [
    'Vercel – standards',
    'Vercel – revvel-standards',
    'Vercel – marketplace-relister',
    'Octopus Review',
    'recurseml/analysis',
  ]) {
    assert.ok(informational.includes(ctx), `${ctx} must be listed as informational`);
    assert.equal(required.has(ctx), false, `${ctx} must NOT be required`);
  }
});

test('every known-red context is either expected or listed informational', () => {
  // A check we admit is always red must not be a merge gate, unless it is the
  // deliberate Octopus end-of-quota steady state (still informational).
  const known = load(KNOWN_RED).checks.map((c) => c.context);
  const informational = new Set(load(REGISTRY).informational.map((r) => r.context));
  const required = new Set(load(REGISTRY).required.map((r) => r.context));

  for (const ctx of known) {
    assert.equal(required.has(ctx), false, `${ctx}: known-red must never be required`);
    assert.ok(
      informational.has(ctx),
      `${ctx}: known-red entry must appear under informational in required-checks.yml`,
    );
  }
});

test('runbook and reminders document owner-only Vercel + Octopus steps', () => {
  const runbook = fs.readFileSync(RUNBOOK, 'utf8');
  const reminders = fs.readFileSync(REMINDERS, 'utf8');

  assert.match(runbook, /Disconnect/i);
  assert.match(runbook, /Vercel/);
  assert.match(runbook, /Only select repositories/);
  assert.match(runbook, /Octopus Review/);
  assert.match(runbook, /20/);
  assert.match(runbook, /mute/i);
  assert.match(runbook, /not automatable|manual monthly/i);

  assert.match(reminders, /Vercel/);
  assert.match(reminders, /Octopus/);
  assert.match(reminders, /PR_SIGNAL_HYGIENE/);
  assert.match(reminders, /out of credits|mute/i);
});

test('decisions D022–D024 are recorded', () => {
  const text = fs.readFileSync(DECISIONS, 'utf8');
  for (const id of ['D022', 'D023', 'D024']) {
    assert.match(
      text,
      new RegExp(`^\\|\\s*${id}\\s*\\|`, 'm'),
      `${id} must be in DECISIONS.md so the hygiene choices survive reverts`,
    );
  }
  assert.match(text, /Vercel/i);
  assert.match(text, /Octopus/i);
  assert.match(text, /required/i);
});

test('required-checks registry is not consumed to skip gates', () => {
  // Same posture as known-red-checks: the file is a record. Workflows must not
  // read it to bypass or auto-approve. (Human ruleset edits remain the
  // enforcement path.)
  const searched = [];
  const walk = (dir) => {
    for (const name of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, name.name);
      if (name.isDirectory()) {
        if (['node_modules', '.git'].includes(name.name)) continue;
        walk(full);
      } else if (/\.(ya?ml|js|mjs|cjs|sh)$/.test(name.name)) {
        searched.push(full);
      }
    }
  };
  walk(path.join(ROOT, '.github'));
  walk(path.join(ROOT, 'scripts'));

  const readers = searched.filter((f) => {
    if (f.endsWith('required-checks.yml')) return false;
    return fs.readFileSync(f, 'utf8').includes('required-checks.yml');
  });

  assert.deepEqual(
    readers.map((f) => path.relative(ROOT, f)),
    [],
    'nothing under .github/ or scripts/ may consume required-checks.yml to alter gates',
  );
});
