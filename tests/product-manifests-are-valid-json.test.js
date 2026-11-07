'use strict';

/**
 * Every products/<app>/package.json and package-lock.json must be parseable
 * JSON, and must not declare the same key twice inside one object.
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
 * The missing comma is the loud version. The quiet version is the same merge
 * with commas intact: valid JSON, duplicate keys, and JSON.parse silently keeps
 * the LAST value. The file parses, `npm ci` succeeds, and the resolved version
 * is whichever side the merge happened to put second. In a lockfile that means a
 * duplicated `version`/`resolved`/`integrity` pinning a tarball nobody chose.
 * So parsing is necessary but not sufficient — hence duplicateKeys() below,
 * which walks the whole document rather than one block of one file.
 *
 * An earlier revision of this test claimed to catch that class and did not: it
 * read only package.json, and used a non-global regex that saw only the first
 * dependencies block. Both gaps are now covered by fixtures that fail on bad
 * input, because a guard nobody has watched go red is the bug it guards against.
 */

const { test } = require('node:test');
const assert   = require('node:assert/strict');
const path     = require('node:path');
const fs       = require('node:fs');

const PRODUCTS_DIR = path.join(__dirname, '..', 'products');
const MANIFESTS = ['package.json', 'package-lock.json'];

/**
 * Find keys declared more than once within the same JSON object.
 *
 * JSON.parse cannot report this — it keeps the last value and discards the
 * collision — so this walks the raw text. Tokens are JSON strings (optionally
 * followed by a colon, which is what makes them keys) and the four structural
 * brackets. A Set per open object tracks the keys seen at that level; arrays
 * push a null scope because array elements have no keys. Matching whole strings
 * first means braces or colons inside a string value are never mistaken for
 * structure.
 *
 * Returns dotted paths, e.g. ["dependencies.next"], so a duplicate deep inside
 * a lockfile is identifiable. The same key in SIBLING objects is not a
 * duplicate — lockfiles legitimately repeat "version" thousands of times.
 */
function duplicateKeys(raw) {
  const TOKEN = /"(?:[^"\\]|\\.)*"(\s*:)?|[{}[\]]/g;
  const scopes = [];           // Set for objects, null for arrays
  const names  = [];           // key that introduced each scope
  const dupes  = [];
  let pendingName = null;      // key most recently seen at this level
  let m;

  while ((m = TOKEN.exec(raw)) !== null) {
    const tok = m[0];

    if (tok === '{' || tok === '[') {
      scopes.push(tok === '{' ? new Set() : null);
      names.push(pendingName);
      pendingName = null;
      continue;
    }
    if (tok === '}' || tok === ']') {
      scopes.pop();
      names.pop();
      continue;
    }

    // A string token. It is a key only when a colon follows it.
    if (!m[1]) continue;
    const key = tok.slice(1, tok.lastIndexOf('"'));
    pendingName = key;

    const scope = scopes[scopes.length - 1];
    if (!scope) continue; // top level outside any object, or inside an array
    if (scope.has(key)) {
      const trail = names.filter(Boolean);
      dupes.push([...trail, key].join('.'));
    } else {
      scope.add(key);
    }
  }
  return dupes;
}

function productDirs() {
  if (!fs.existsSync(PRODUCTS_DIR)) return [];
  return fs.readdirSync(PRODUCTS_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();
}

// ── fixtures: prove the detector fails on bad input ──────────────────────────

test('duplicateKeys: clean manifest has none', () => {
  const raw = `{
    "name": "app",
    "dependencies": { "next": "^15.5.28", "react": "^19.3.1" },
    "devDependencies": { "typescript": "^5" }
  }`;
  assert.deepEqual(duplicateKeys(raw), []);
});

test('duplicateKeys: catches the #18016 collision once commas are added', () => {
  // The quiet version of the real defect: valid JSON, last value silently wins.
  const raw = `{
    "dependencies": {
      "next": "^15.5.25",
      "react": "^19.2.8",
      "react-dom": "^19.2.8",
      "next": "^15.5.28",
      "react": "^19.3.1",
      "react-dom": "^19.3.1"
    }
  }`;
  assert.equal(JSON.parse(raw).dependencies.next, '^15.5.28', 'JSON.parse keeps the last value');
  assert.deepEqual(
    duplicateKeys(raw).sort(),
    ['dependencies.next', 'dependencies.react', 'dependencies.react-dom'],
  );
});

test('duplicateKeys: catches two whole top-level dependencies blocks', () => {
  // The gap that defeated the previous revision's non-global, first-block regex.
  const raw = `{
    "dependencies": { "next": "^15.5.25" },
    "dependencies": { "next": "^15.5.28" }
  }`;
  assert.deepEqual(duplicateKeys(raw), ['dependencies']);
});

test('duplicateKeys: catches a duplicated version pin inside a lockfile entry', () => {
  const raw = `{
    "packages": {
      "node_modules/next": {
        "version": "15.5.25",
        "resolved": "https://registry.npmjs.org/next/-/next-15.5.25.tgz",
        "version": "15.5.28",
        "resolved": "https://registry.npmjs.org/next/-/next-15.5.28.tgz"
      }
    }
  }`;
  const found = duplicateKeys(raw).sort();
  assert.deepEqual(found, [
    'packages.node_modules/next.resolved',
    'packages.node_modules/next.version',
  ]);
});

test('duplicateKeys: the same key in sibling objects is not a duplicate', () => {
  // Lockfiles repeat "version" thousands of times legitimately. If this ever
  // fails, the scanner is useless on real lockfiles.
  const raw = `{
    "packages": {
      "node_modules/a": { "version": "1.0.0" },
      "node_modules/b": { "version": "2.0.0" }
    }
  }`;
  assert.deepEqual(duplicateKeys(raw), []);
});

test('duplicateKeys: brackets and colons inside string values are not structure', () => {
  const raw = `{
    "scripts": { "odd": "echo {\\"a\\": 1} [x]: y", "next": "next build" },
    "name": "app"
  }`;
  assert.deepEqual(duplicateKeys(raw), []);
});

test('duplicateKeys: array elements have no keys', () => {
  const raw = `{ "files": ["a", "b", "a"], "browserslist": ["defaults"] }`;
  assert.deepEqual(duplicateKeys(raw), []);
});

// ── the sweep over real product manifests ────────────────────────────────────

test('products/ exists and holds at least one app', () => {
  assert.ok(productDirs().length > 0, 'no product directories found — has products/ moved?');
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

test('no product manifest declares the same key twice in one object', () => {
  const failures = [];
  for (const product of productDirs()) {
    for (const name of MANIFESTS) {
      const file = path.join(PRODUCTS_DIR, product, name);
      if (!fs.existsSync(file)) continue;
      const dupes = duplicateKeys(fs.readFileSync(file, 'utf8'));
      for (const d of dupes) {
        failures.push(`products/${product}/${name}: duplicate key ${d}`);
      }
    }
  }
  assert.deepEqual(failures, [], `duplicate key(s) in product manifest(s):\n  ${failures.join('\n  ')}`);
});
