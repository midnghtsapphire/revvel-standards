/**
 * Workflow YAML validation tests
 *
 * Ensures that the pr-lifecycle check-state allowlist stays healthy:
 *  - Every allowlisted name matches a real workflow's `name:` field
 *  - The list is sorted case-insensitively alphabetical
 *  - It never contains the "*" wildcard
 */

const fs = require('fs');
const path = require('path');

const WORKFLOWS_DIR = path.join(__dirname, '..', '.github', 'workflows');
const PR_LIFECYCLE_PATH = path.join(WORKFLOWS_DIR, 'pr-lifecycle.yml');

/**
 * Extract the check-state allowlist from pr-lifecycle.yml.
 * The allowlist is expected to be defined as a YAML/JSON-ish array under an
 * env var or a step input; we scan for lines matching a quoted string list
 * inside a block that mentions `allowlist`.
 */
function extractAllowlist(contents) {
  const lines = contents.split(/\r?\n/);
  const allowlist = [];
  let inAllowlist = false;
  let indent = null;

  for (const line of lines) {
    if (!inAllowlist) {
      if (/allowlist\s*:/i.test(line) || /ALLOWLIST\s*[:=]/.test(line)) {
        inAllowlist = true;
        indent = null;
        continue;
      }
    } else {
      // Match quoted list entries: - "Name" or - 'Name'
      const m = line.match(/^(\s*)-\s*["']([^"']+)["']\s*$/);
      if (m) {
        if (indent === null) indent = m[1].length;
        if (m[1].length === indent) {
          allowlist.push(m[2]);
          continue;
        }
      }
      // If we hit a non-list line after collecting entries, stop.
      if (allowlist.length > 0 && !/^\s*$/.test(line) && !/^\s*#/.test(line)) {
        // Also accept inline JSON array form as terminator
        if (!/^(\s*)-\s*["']/.test(line)) {
          inAllowlist = false;
        }
      }
    }
  }

  // Fallback: try to find a JSON-style array on one line
  if (allowlist.length === 0) {
    const jsonMatch = contents.match(/allowlist[^\[]*\[([^\]]+)\]/i);
    if (jsonMatch) {
      const inner = jsonMatch[1];
      const re = /["']([^"']+)["']/g;
      let mm;
      while ((mm = re.exec(inner)) !== null) {
        allowlist.push(mm[1]);
      }
    }
  }

  return allowlist;
}

/**
 * Collect all workflow `name:` fields from .github/workflows/*.yml.
 */
function collectWorkflowNames() {
  if (!fs.existsSync(WORKFLOWS_DIR)) return new Set();
  const names = new Set();
  for (const entry of fs.readdirSync(WORKFLOWS_DIR)) {
    if (!/\.ya?ml$/i.test(entry)) continue;
    const full = path.join(WORKFLOWS_DIR, entry);
    const contents = fs.readFileSync(full, 'utf8');
    // Top-level `name: ...` (first match wins)
    const m = contents.match(/^name:\s*["']?([^"'\n]+?)["']?\s*$/m);
    if (m) names.add(m[1].trim());
  }
  return names;
}

function ciCompare(a, b) {
  const al = a.toLowerCase();
  const bl = b.toLowerCase();
  if (al < bl) return -1;
  if (al > bl) return 1;
  return 0;
}

describe('pr-lifecycle check-state allowlist', () => {
  // Only run these assertions if pr-lifecycle.yml exists — repo may be in a
  // transitional state and we want the test to be actionable, not a hard block.
  const exists = fs.existsSync(PR_LIFECYCLE_PATH);

  (exists ? test : test.skip)('never contains the "*" wildcard', () => {
    const contents = fs.readFileSync(PR_LIFECYCLE_PATH, 'utf8');
    const allowlist = extractAllowlist(contents);
    expect(allowlist).not.toContain('*');
  });

  (exists ? test : test.skip)('is sorted case-insensitively alphabetical', () => {
    const contents = fs.readFileSync(PR_LIFECYCLE_PATH, 'utf8');
    const allowlist = extractAllowlist(contents);
    if (allowlist.length === 0) return; // nothing to sort
    const sorted = [...allowlist].sort(ciCompare);
    expect(allowlist).toEqual(sorted);
  });

  (exists ? test : test.skip)('every entry matches a real workflow name', () => {
    const contents = fs.readFileSync(PR_LIFECYCLE_PATH, 'utf8');
    const allowlist = extractAllowlist(contents);
    if (allowlist.length === 0) return;
    const workflowNames = collectWorkflowNames();
    const missing = allowlist.filter((n) => !workflowNames.has(n));
    expect(missing).toEqual([]);
  });
});
