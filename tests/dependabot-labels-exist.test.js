'use strict';

/**
 * Regression test: every label Dependabot is told to apply must be a label the
 * repository actually has.
 *
 * Dependabot does not create custom labels. When `.github/dependabot.yml`
 * listed "npm", every npm update failed with "The following labels could not
 * be found: npm" and Dependabot asked for the config to be fixed. The label is
 * not in the canonical allowlist (config/labels-allowlist.yml), which caps the
 * label set, so the fix removes it from the config instead of creating it.
 *
 * A label passes if it is in the allowlist, in .github/labels.yml (which
 * sync-labels.yml creates on the repo), or in KNOWN_REPO_LABELS below.
 */

const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const YAML = require('yaml');

const ROOT = path.join(__dirname, '..');

// Labels that exist on the repo but are not (yet) in the allowlist.
// "github-actions": Dependabot's error for the npm entries named only "npm"
// as missing, while the github-actions entry applies this label without error.
const KNOWN_REPO_LABELS = new Set(['github-actions']);

function readYaml(rel) {
  return YAML.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
}

function knownLabels() {
  const names = new Set(KNOWN_REPO_LABELS);
  for (const l of readYaml('config/labels-allowlist.yml').labels || []) names.add(l.name);
  for (const l of readYaml('.github/labels.yml').labels || []) if (l && l.name) names.add(l.name);
  return names;
}

test('every Dependabot label exists on the repository', () => {
  const known = knownLabels();
  const missing = [];
  for (const u of readYaml('.github/dependabot.yml').updates || []) {
    for (const label of u.labels || []) {
      if (!known.has(label)) missing.push(`${u['package-ecosystem']} ${u.directory}: ${label}`);
    }
  }
  assert.deepEqual(missing, [], `Dependabot labels that do not exist:\n  ${missing.join('\n  ')}`);
});

test('the check catches the label that broke Dependabot', () => {
  assert.equal(knownLabels().has('npm'), false);
});
