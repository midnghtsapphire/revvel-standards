/**
 * Drift-proofing tests for .github/workflows/pr-lifecycle.yml's
 * workflow_run allowlist.
 *
 * Guarantees:
 *   1. Every allowlisted name matches a real workflow's top-level `name:` field.
 *   2. The list is kept in case-insensitive alphabetical order.
 *   3. The list never contains the "*" wildcard (scoping is intentional).
 *
 * These invariants encode the review feedback from PR #15892 so future edits
 * to the allowlist can't silently drift.
 */

const fs = require('fs');
const path = require('path');

let yaml;
try {
  yaml = require('js-yaml');
} catch (_) {
  // Fallback: minimal extraction if js-yaml isn't installed in this env.
  yaml = null;
}

const WORKFLOWS_DIR = path.join(__dirname, '..', '.github', 'workflows');
const PR_LIFECYCLE = path.join(WORKFLOWS_DIR, 'pr-lifecycle.yml');

function loadYaml(file) {
  const text = fs.readFileSync(file, 'utf8');
  if (yaml) return yaml.load(text);
  // Extremely small fallback parser: only used to extract top-level `name:`
  // and the workflow_run.workflows list. Not a general YAML parser.
  const out = { name: null, on: { workflow_run: { workflows: [] } } };
  const nameMatch = text.match(/^name:\s*(.+?)\s*$/m);
  if (nameMatch) {
    out.name = nameMatch[1].replace(/^["']|["']$/g, '');
  }
  const wfBlock = text.match(/workflows:\s*\n((?:\s{6}-\s.+\n?)+)/);
  if (wfBlock) {
    out.on.workflow_run.workflows = wfBlock[1]
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.startsWith('- '))
      .map((l) => l.slice(2).trim().replace(/^["']|["']$/g, ''));
  }
  return out;
}

function getAllowlist() {
  const doc = loadYaml(PR_LIFECYCLE);
  const on = doc && (doc.on || doc[true]); // YAML `on:` can parse as boolean true
  const wr = on && on.workflow_run;
  if (!wr || !Array.isArray(wr.workflows)) {
    throw new Error('pr-lifecycle.yml: on.workflow_run.workflows missing or not a list');
  }
  return wr.workflows;
}

function collectWorkflowNames() {
  const files = fs
    .readdirSync(WORKFLOWS_DIR)
    .filter((f) => f.endsWith('.yml') || f.endsWith('.yaml'));
  const names = new Set();
  for (const f of files) {
    try {
      const doc = loadYaml(path.join(WORKFLOWS_DIR, f));
      if (doc && typeof doc.name === 'string') names.add(doc.name);
    } catch (_) {
      // A malformed workflow file elsewhere in the repo (e.g. duplicate keys)
      // shouldn't blind us to the workflows that *do* parse. Skip and move on;
      // the allowlist check below will still fail loudly if a real name is
      // missing from the set we managed to collect.
    }
  }
  return names;
}

describe('pr-lifecycle.yml workflow_run allowlist', () => {
  const allowlist = getAllowlist();

  test('never contains the "*" wildcard', () => {
    expect(allowlist).not.toContain('*');
  });

  test('is sorted case-insensitively alphabetical', () => {
    const sorted = [...allowlist].sort((a, b) =>
      a.toLowerCase().localeCompare(b.toLowerCase())
    );
    expect(allowlist).toEqual(sorted);
  });

  test('every entry matches a real workflow name: field', () => {
    const realNames = collectWorkflowNames();
    const missing = allowlist.filter((n) => !realNames.has(n));
    expect(missing).toEqual([]);
  });
});
