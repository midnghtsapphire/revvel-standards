'use strict';

/**
 * Every products/<app>/package.json and package-lock.json must be parseable JSON.
 *
 * Why this exists: PR #18016 merged with all five CircleCI contexts green while
 * leaving products/affiliate-hub/package.json syntactically invalid. Dependabot
 * merged main into a two-month-old branch and its conflict resolution emitted
 * BOTH sides of the dependencies block, concatenated, with no comma between them:
 *
 *     "dependencies": {
 *       "next": "^15.5.25",
 *       "react": "^19.2.8",
 *       "react-dom": "^19.2.8"      <-- no comma
 *       "next": "^15.5.28",         <-- duplicate key
 *       "react": "^19.3.1",
 *       "react-dom": "^19.3.1"
 *     },
 *
 * `npm ci` in that product would have failed outright. Nothing in CI noticed,
 * because no gate parses product manifests — lint-and-test covers the repo root.
 * A green check that cannot observe the file it is supposed to protect is a
 * decoration (RVS-VERIFY-001, standards/VERIFY_THE_POSTCONDITION.md).
 *
 * Duplicate keys are checked separately: JSON.parse accepts them silently
 * (last value wins), so a lockfile can parse and still mean something nobody
 * intended. The raw-text check below is what actually catches that class.
 */

const { test } = require('node:test');
const assert   = require('node:assert/strict');
const path     = require('node:path');
const fs       = require('node:fs');

const PRODUCTS_DIR = path.join(__dirname, '..', 'products');
const MANIFESTS = ['package.json', 'package-lock.json'];

function productDirs() {
  if (!fs.existsSync(PRODUCTS_DIR)) return [];
  return fs.readdirSync(PRODUCTS_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();
}

test('products/ exists and holds at least one app', () => {
  const dirs = productDirs();
  assert.ok(dirs.length > 0, 'no product directories found — has products/ moved?');
});

test('every product manifest parses as JSON', () => {
  const failures = [];
  for (const product of productDirs()) {
    for (const name of MANIFESTS) {
      const file = path.join(PRODUCTS_DIR, product, name);
      if (!fs.existsSync(file)) continue; // not every product ships both
      try {
        JSON.parse(fs.readFileSync(file, 'utf8'));
      } catch (e) {
        failures.push(`products/${product}/${name}: ${e.message}`);
      }
    }
  }
  assert.deepEqual(failures, [], `unparseable product manifest(s):\n  ${failures.join('\n  ')}`);
});

test('no product package.json declares a dependency twice', () => {
  // JSON.parse silently keeps the last duplicate, so parse alone cannot see this.
  // Scan the raw text of each dependency block for a repeated key instead.
  const failures = [];
  for (const product of productDirs()) {
    const file = path.join(PRODUCTS_DIR, product, 'package.json');
    if (!fs.existsSync(file)) continue;
    const raw = fs.readFileSync(file, 'utf8');
    for (const block of ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies']) {
      const m = raw.match(new RegExp(`"${block}"\\s*:\\s*\\{([^}]*)\\}`));
      if (!m) continue;
      const keys = [...m[1].matchAll(/"([^"]+)"\s*:/g)].map((k) => k[1]);
      const seen = new Set();
      const dupes = new Set();
      for (const k of keys) {
        if (seen.has(k)) dupes.add(k);
        seen.add(k);
      }
      if (dupes.size > 0) {
        failures.push(`products/${product}/package.json ${block}: duplicate key(s) ${[...dupes].join(', ')}`);
      }
    }
  }
  assert.deepEqual(failures, [], `duplicate dependency declarations:\n  ${failures.join('\n  ')}`);
});
