/**
 * Workflow YAML validation tests
 *
 * Guards the `check-state` job's allowlist in `.github/workflows/pr-lifecycle.yml`
 * against drift:
 *   - Every allowlisted workflow name must match a real workflow's `name:` field.
 *   - The allowlist must stay sorted case-insensitively alphabetical.
 *   - The allowlist must never contain the `"*"` wildcard.
 */

const fs = require('fs');
const path = require('path');

let yaml;
try {
  yaml = require('js-yaml');
} catch (e) {
  // js-yaml is optional in some environments; skip gracefully.
  console.warn('js-yaml not installed; skipping workflow YAML validation tests');
  return;
}

const WORKFLOWS_DIR = path.join(__dirname, '..', '.github', 'workflows');
const PR_LIFECYCLE = path.join(WORKFLOWS_DIR, 'pr-lifecycle.yml');

function loadWorkflowNames() {
  const names = new Set();
  if (!fs.existsSync(WORKFLOWS_DIR)) return names;
  for (const f of fs.readdirSync(WORKFLOWS_DIR)) {
    if (!/\.ya?ml$/.test(f)) continue;
    const full = path.join(WORKFLOWS_DIR, f);
    try {
      const doc = yaml.load(fs.readFileSync(full, 'utf8'));
      if (doc && typeof doc.name === 'string') {
        names.add(doc.name);
      }
    } catch (_) {
      // skip unparseable files; other tests cover parse errors
    }
  }
  return names;
}

function extractAllowlist() {
  if (!fs.existsSync(PR_LIFECYCLE)) return null;
  const src = fs.readFileSync(PR_LIFECYCLE, 'utf8');
  // Look for an ALLOWLIST-style array of quoted names in the check-state job.
  // Match either a YAML list under `allowlist:` or a bash/js array literal.
  const listMatch = src.match(/allowlist\s*[:=]\s*(?:\[[\s\S]*?\]|\n(?:\s*-\s*.+\n)+)/);
  if (!listMatch) return null;
  const chunk = listMatch[0];
  const names = [];
  const re = /["']([^"']+)["']/g;
  let m;
  while ((m = re.exec(chunk)) !== null) {
    names.push(m[1]);
  }
  return names;
}

describe('pr-lifecycle check-state allowlist', () => {
  const allowlist = extractAllowlist();

  test('allowlist is extractable', () => {
    expect(Array.isArray(allowlist)).toBe(true);
  });

  test('allowlist never contains the "*" wildcard', () => {
    if (!allowlist) return;
    expect(allowlist).not.toContain('*');
  });

  test('allowlist stays sorted case-insensitively alphabetical', () => {
    if (!allowlist) return;
    const sorted = [...allowlist].sort((a, b) =>
      a.toLowerCase().localeCompare(b.toLowerCase())
    );
    expect(allowlist).toEqual(sorted);
  });

  test('every allowlisted name matches a real workflow name:', () => {
    if (!allowlist) return;
    const real = loadWorkflowNames();
    const missing = allowlist.filter((n) => !real.has(n));
    expect(missing).toEqual([]);
  });
});
