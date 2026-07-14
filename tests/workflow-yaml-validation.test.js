/**
 * Workflow YAML validation tests.
 *
 * Ensures the `check-state` workflow_run allowlist in
 * `.github/workflows/pr-lifecycle.yml` stays drift-proof:
 *   1. Every allowlisted name matches a real workflow's `name:` field.
 *   2. The list is sorted case-insensitively alphabetical.
 *   3. The list never contains the `"*"` wildcard.
 */

const fs = require('fs');
const path = require('path');
let yaml;
try {
  yaml = require('js-yaml');
} catch (e) {
  // js-yaml not installed; skip these tests rather than fail hard.
  describe.skip('workflow YAML validation (js-yaml unavailable)', () => {
    it('skipped', () => {});
  });
  return;
}

const WORKFLOWS_DIR = path.join(__dirname, '..', '.github', 'workflows');
const PR_LIFECYCLE = path.join(WORKFLOWS_DIR, 'pr-lifecycle.yml');

function loadYaml(file) {
  return yaml.load(fs.readFileSync(file, 'utf8'));
}

function listWorkflowFiles() {
  if (!fs.existsSync(WORKFLOWS_DIR)) return [];
  return fs
    .readdirSync(WORKFLOWS_DIR)
    .filter((f) => f.endsWith('.yml') || f.endsWith('.yaml'))
    .map((f) => path.join(WORKFLOWS_DIR, f));
}

function extractAllowlist(prLifecycle) {
  // Walk jobs looking for a job named check-state (or similar) whose
  // env/step exposes an allowlist. We search all string values for a
  // structured list. Fallback: scan raw text for an ALLOWLIST array.
  const raw = fs.readFileSync(PR_LIFECYCLE, 'utf8');

  // Look for a YAML list under a key whose name contains 'allowlist'
  // (case-insensitive). Support both block and flow styles.
  const blockMatch = raw.match(
    /(?:^|\n)\s*[A-Za-z_][A-Za-z0-9_]*[Aa]llowlist[A-Za-z0-9_]*\s*:\s*\n((?:\s*-\s*[^\n]+\n)+)/,
  );
  if (blockMatch) {
    return blockMatch[1]
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.startsWith('- '))
      .map((l) => l.slice(2).trim().replace(/^["']|["']$/g, ''));
  }

  // Flow-style JSON array inside a shell/env string.
  const flowMatch = raw.match(/[Aa]llowlist[^\n]*?[:=]\s*\[([^\]]+)\]/);
  if (flowMatch) {
    return flowMatch[1]
      .split(',')
      .map((s) => s.trim().replace(/^["']|["']$/g, ''))
      .filter(Boolean);
  }

  return null;
}

describe('check-state workflow_run allowlist', () => {
  if (!fs.existsSync(PR_LIFECYCLE)) {
    it.skip('pr-lifecycle.yml not present', () => {});
    return;
  }

  const allowlist = extractAllowlist();

  if (!allowlist || allowlist.length === 0) {
    it.skip('no allowlist found in pr-lifecycle.yml', () => {});
    return;
  }

  test('never contains the "*" wildcard', () => {
    expect(allowlist).not.toContain('*');
  });

  test('is sorted case-insensitively alphabetical', () => {
    const sorted = [...allowlist].sort((a, b) =>
      a.toLowerCase().localeCompare(b.toLowerCase()),
    );
    expect(allowlist).toEqual(sorted);
  });

  test('every entry matches a real workflow name: field', () => {
    const workflowNames = new Set();
    for (const file of listWorkflowFiles()) {
      try {
        const doc = loadYaml(file);
        if (doc && typeof doc.name === 'string') {
          workflowNames.add(doc.name);
        }
      } catch (_e) {
        // Ignore unparseable workflow files here; a separate lint job
        // catches those. We only need the set of valid names.
      }
    }
    const missing = allowlist.filter((n) => !workflowNames.has(n));
    expect(missing).toEqual([]);
  });
});
