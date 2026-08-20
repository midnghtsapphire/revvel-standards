'use strict';

/**
 * RVS-VERIFY-001 must not be a marker asserting a postcondition nothing
 * verified. That is the defect it exists to name.
 *
 * `standards/VERIFY_THE_POSTCONDITION.md` makes concrete, checkable claims:
 * that the agent loop points at it, that the playbook catalog cites it, and
 * that the ratchets it holds up as examples are name-based rather than counted.
 * Each of those is asserted here, so the document cannot quietly drift out of
 * agreement with the repository it describes.
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const STANDARD = path.join(ROOT, 'standards', 'VERIFY_THE_POSTCONDITION.md');

const read = (...p) => fs.readFileSync(path.join(ROOT, ...p), 'utf8');

test('the standard exists and carries its ID', () => {
  const src = fs.readFileSync(STANDARD, 'utf8');
  assert.match(src, /\*\*Standard ID:\*\* `RVS-VERIFY-001`/);
  assert.match(src, /\*\*Status:\*\* Active/);
});

test('CLAUDE.md points the agent loop at it', () => {
  // A standard nobody is routed to is the defect it describes.
  const claude = read('CLAUDE.md');
  assert.match(claude, /standards\/VERIFY_THE_POSTCONDITION\.md/);
  assert.match(claude, /RVS-VERIFY-001/);
  assert.match(
    claude,
    /A marker nobody checks is decoration/,
    'the gotcha list must carry the one-line form, not only the link',
  );
});

test('the self-healing playbook cites it from its pattern catalog', () => {
  const playbook = read('standards', 'AUDIT_AND_SELF_HEALING_PLAYBOOK.md');
  assert.match(playbook, /standards\/VERIFY_THE_POSTCONDITION\.md/);
  assert.match(
    playbook,
    /### 9\. A marker asserting a postcondition nothing verified/,
    'the catalog is a lookup table; the pattern must be findable there',
  );
});

test('every standard it cross-references exists', () => {
  const src = fs.readFileSync(STANDARD, 'utf8');
  // `[A-Z_]+` misses a digit, so `DELIVERY_MATRIX_V2.md` was not even captured
  // and a broken reference passed. Mutation-tested.
  const referenced = [...src.matchAll(/`([A-Z][A-Z0-9_-]*\.md)`/g)].map((m) => m[1]);
  assert.ok(referenced.length > 0, 'expected cross-references');
  const missing = [...new Set(referenced)].filter(
    (f) => !fs.existsSync(path.join(ROOT, 'standards', f)),
  );
  assert.deepEqual(missing, [], 'the standard points at documents that do not exist');
});

test('the ratchets it holds up as examples are named, not counted', () => {
  // §6 says a ratchet is "a frozen list of names, never a count", and names
  // three. If one of them regresses to a count, the standard is asserting
  // something untrue about its own repository.
  const syntax = read('tests', 'github-script-syntax.test.js');
  assert.match(syntax, /const KNOWN_BROKEN = Object\.freeze\(\[/);
  assert.doesNotMatch(syntax, /MAX_\w*ENTRIES\s*=\s*\d/);

  const actionsLint = read('tests', 'actions-lint-workflow.test.js');
  assert.match(actionsLint, /const RATCHET = Object\.freeze\(\[/);
  assert.doesNotMatch(actionsLint, /MAX_RATCHET_ENTRIES\s*=\s*\d/);

  const rootJunk = read('.github', 'workflows', 'no-root-junk.yml');
  assert.match(rootJunk, /RATCHET='\^\(/, 'the root-junk ratchet must list names');
});

test('the github-script ratchet is empty, as the standard states', () => {
  // §6 claims "now empty — all 227 workflows parse". Adding a name back would
  // make the document false, so the claim is checked rather than asserted.
  const syntax = read('tests', 'github-script-syntax.test.js');
  const block = /const KNOWN_BROKEN = Object\.freeze\(\[([\s\S]*?)\]\);/.exec(syntax);
  assert.ok(block, 'KNOWN_BROKEN must be present');
  const entries = [...block[1].matchAll(/^\s*'([^']+)'/gm)].map((m) => m[1]);
  assert.deepEqual(
    entries,
    [],
    'the standard says this list is empty; fix the workflow rather than listing it',
  );
});
