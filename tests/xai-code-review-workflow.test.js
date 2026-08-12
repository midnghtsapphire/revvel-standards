'use strict';

/**
 * Regression tests for the xAI Code Review marketplace integration (#16876).
 *
 * Guards the contract that keeps this lane advisory and roll-out-safe:
 *   - secret soft-skip (missing XAI_API_KEY → warning, not red)
 *   - continue-on-error on the review step
 *   - [skip-review] + draft bypass
 *   - active workflow pins the third-party action to a full commit SHA
 *   - template + docs stay wired together
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const ACTIVE = 'xai-code-review.yml';
const TEMPLATE = path.join('templates', 'cicd', ACTIVE);
const WORKFLOW = path.join('.github', 'workflows', ACTIVE);
const DOCS = path.join('docs', 'XAI_CODE_REVIEW.md');
const ACTION = 'tarmojussila/xai-code-review';
const PIN_SHA = '0a0ec8e6ae59ed29819ac73ba1b8a983f40ca255';

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

function loadYaml(rel) {
  let yaml;
  try {
    yaml = require('js-yaml');
  } catch {
    return null;
  }
  return yaml.load(read(rel));
}

test('template and active xAI code review workflows exist', () => {
  assert.ok(fs.existsSync(path.join(root, TEMPLATE)), TEMPLATE);
  assert.ok(fs.existsSync(path.join(root, WORKFLOW)), WORKFLOW);
  assert.ok(fs.existsSync(path.join(root, DOCS)), DOCS);
});

test('workflows declare name, on, and pull_request + workflow_dispatch', () => {
  for (const rel of [TEMPLATE, WORKFLOW]) {
    const doc = loadYaml(rel);
    if (!doc) {
      // js-yaml missing — fall back to textual contract checks.
      const text = read(rel);
      assert.match(text, /^name:\s*xAI Code Review/m);
      assert.match(text, /pull_request:/);
      assert.match(text, /workflow_dispatch:/);
      continue;
    }
    assert.equal(doc.name, 'xAI Code Review', rel);
    assert.ok(doc.on, `${rel} missing on:`);
    assert.ok(doc.on.pull_request, `${rel} missing pull_request trigger`);
    assert.ok(
      Object.prototype.hasOwnProperty.call(doc.on, 'workflow_dispatch'),
      `${rel} missing workflow_dispatch`
    );
  }
});

test('both workflows soft-skip when XAI_API_KEY is missing', () => {
  for (const rel of [TEMPLATE, WORKFLOW]) {
    const text = read(rel);
    assert.match(text, /XAI_API_KEY:\s*\$\{\{\s*secrets\.XAI_API_KEY\s*\}\}/);
    assert.match(text, /::warning::XAI_API_KEY is not set/);
    assert.match(text, /if:\s*env\.XAI_API_KEY\s*!=\s*''/);
  }
});

test('both workflows honor draft and [skip-review] bypasses', () => {
  for (const rel of [TEMPLATE, WORKFLOW]) {
    const text = read(rel);
    assert.match(text, /pull_request\.draft\s*==\s*false/);
    assert.match(text, /\[skip-review\]/);
  }
});

test('review step is advisory (continue-on-error) and never gates merge', () => {
  for (const rel of [TEMPLATE, WORKFLOW]) {
    const text = read(rel);
    assert.match(text, /continue-on-error:\s*true/);
    // Must not request contents: write — no autofix push surface.
    assert.doesNotMatch(text, /contents:\s*write/);
  }
});

test('active workflow pins tarmojussila/xai-code-review to the v0.1.0 commit SHA', () => {
  const text = read(WORKFLOW);
  const re = new RegExp(`uses:\\s*${ACTION}@([0-9a-f]{40})`);
  const match = text.match(re);
  assert.ok(match, `expected SHA-pinned uses: ${ACTION}@<40-hex>`);
  assert.equal(match[1], PIN_SHA);
  assert.match(text, /#\s*v0\.1\.0|pin:.*v0\.1\.0/);
});

test('template also pins tarmojussila/xai-code-review to the v0.1.0 commit SHA', () => {
  const text = read(TEMPLATE);
  const re = new RegExp(`uses:\\s*${ACTION}@([0-9a-f]{40})`);
  const match = text.match(re);
  assert.ok(match, `expected SHA-pinned uses: ${ACTION}@<40-hex> in template`);
  assert.equal(match[1], PIN_SHA);
  assert.match(text, /marketplace\/actions\/xai-code-review/);
});

test('docs inventory links template, secret, and marketplace URL', () => {
  const docs = read(DOCS);
  assert.match(docs, /marketplace\/actions\/xai-code-review/);
  assert.match(docs, /XAI_API_KEY/);
  assert.match(docs, /templates\/cicd\/xai-code-review\.yml/);
  assert.match(docs, new RegExp(PIN_SHA));
  assert.match(docs, /GitHub stars/i);
});

test('templates/cicd README lists xai-code-review.yml', () => {
  const readme = read(path.join('templates', 'cicd', 'README.md'));
  assert.match(readme, /xai-code-review\.yml/);
  assert.match(readme, /tarmojussila\/xai-code-review/);
});

test('third-party audit allowlists tarmojussila/xai-code-review', () => {
  const script = read(path.join('scripts', 'audit-third-party-actions.sh'));
  assert.match(script, /tarmojussila\/xai-code-review/);
});
