/**
 * Workflow YAML validation tests
 *
 * Guards the `check-state` job's allowlist in `.github/workflows/pr-lifecycle.yml`
 * against drift:
 *   - Every allowlisted workflow name must match a real workflow's `name:` field.
 *   - The allowlist must stay sorted case-insensitively alphabetical.
 *   - The allowlist must never contain the `"*"` wildcard.
 * Ensures the pr-lifecycle check-state allowlist stays drift-proof:
 *   - every allowlisted workflow name matches a real workflow's `name:` field
 *   - the list is sorted case-insensitively alphabetical
 *   - the list never contains a `"*"` wildcard
 */

const fs = require('fs');
const path = require('path');
const { describe, test, before } = require('node:test');
const assert = require('node:assert');

// Lightweight expect shim over node:assert for compatibility with the
// test bodies that were originally written in Jest style.
function expect(actual) {
  return {
    toBe: (expected) => assert.strictEqual(actual, expected),
    toEqual: (expected) => assert.deepStrictEqual(actual, expected),
    toContain: (item) => assert.ok(
      Array.isArray(actual) ? actual.includes(item) : String(actual).includes(item),
      `Expected ${JSON.stringify(actual)} to contain ${JSON.stringify(item)}`
    ),
    not: {
      toContain: (item) => assert.ok(
        Array.isArray(actual) ? !actual.includes(item) : !String(actual).includes(item),
        `Expected ${JSON.stringify(actual)} not to contain ${JSON.stringify(item)}`
      ),
    },
    toBeGreaterThan: (n) => assert.ok(actual > n, `Expected ${actual} > ${n}`),
  };
}

let yaml;
try {
  yaml = require('js-yaml');
} catch (e) {
  // js-yaml is optional; tests that need it will skip gracefully.
  yaml = null;
}

const WORKFLOWS_DIR = path.join(__dirname, '..', '.github', 'workflows');
const PR_LIFECYCLE = path.join(WORKFLOWS_DIR, 'pr-lifecycle.yml');

function loadWorkflowNames() {
  const names = new Set();
  if (!yaml || !fs.existsSync(WORKFLOWS_DIR)) return names;
  for (const f of fs.readdirSync(WORKFLOWS_DIR)) {
    if (!/\.ya?ml$/.test(f)) continue;
    const full = path.join(WORKFLOWS_DIR, f);
    try {
      const doc = yaml.load(fs.readFileSync(full, 'utf8'));
      if (doc && typeof doc.name === 'string') {
        names.add(doc.name);
      }
    } catch (_) {
      // skip unparseable files
    }
  }
  return names;
}

function extractWorkflowName(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  // Match top-level `name: ...` (not indented).
  const match = content.match(/^name:\s*(.+?)\s*$/m);
  if (!match) return null;
  let name = match[1].trim();
  // Strip surrounding quotes if present.
  if ((name.startsWith('"') && name.endsWith('"')) ||
      (name.startsWith("'") && name.endsWith("'"))) {
    name = name.slice(1, -1);
  }
  return name;
}

function extractAllowlist(prLifecyclePath) {
  try {
    const content = fs.readFileSync(prLifecyclePath, 'utf8');
    // Look for a block that defines the allowlist. We accept either:
    //   ALLOWLIST=("A" "B" ...)
    // or a YAML list under a key like `workflows:` / `allowed_workflows:`.
    const bashArrayMatch = content.match(/ALLOW(?:ED|LIST)[A-Z_]*=\(([\s\S]*?)\)/);
    if (bashArrayMatch) {
      const body = bashArrayMatch[1];
      const names = [];
      const re = /"([^"]+)"|'([^']+)'/g;
      let m;
      while ((m = re.exec(body)) !== null) {
        names.push(m[1] || m[2]);
      }
      return names;
    }

    // Fallback: scan for lines like `- "Some Workflow"` inside a YAML block
    // whose key contains "workflow" or "allow" (covers `workflows:`,
    // `allowed_workflows:`, `workflow_allowlist:`, etc.).
    const lines = content.split('\n');
    const names = [];
    let inAllowBlock = false;
    for (const line of lines) {
      if (/(?:allow(?:ed|list)|workflows?)\s*:/i.test(line) && /:\s*$/.test(line)) {
        inAllowBlock = true;
        continue;
      }
      if (inAllowBlock) {
        const itemMatch = line.match(/^\s*-\s*["']([^"'\n]+?)["']\s*$/);
        if (itemMatch) {
          names.push(itemMatch[1].trim());
        } else if (line.trim() && !line.startsWith(' ') && !line.startsWith('\t') && !line.startsWith('-') && !line.startsWith('#')) {
          inAllowBlock = false;
        }
      }
    }
    return names;
  } catch (_) {
    // skip unparseable files; other tests cover parse errors
    return null;
  }
}

describe('pr-lifecycle check-state workflow allowlist', () => {
  const workflowsDir = path.join(__dirname, '..', '.github', 'workflows');
  const prLifecyclePath = path.join(workflowsDir, 'pr-lifecycle.yml');

  let allowlist;
  let workflowNames;

  before(() => {
    if (!fs.existsSync(prLifecyclePath)) {
      throw new Error(`pr-lifecycle.yml not found at ${prLifecyclePath}`);
    }
    allowlist = extractAllowlist(prLifecyclePath);

    workflowNames = new Set();
    if (fs.existsSync(workflowsDir)) {
      for (const file of fs.readdirSync(workflowsDir)) {
        if (!/\.ya?ml$/.test(file)) continue;
        const full = path.join(workflowsDir, file);
        const name = extractWorkflowName(full);
        if (name) workflowNames.add(name);
      }
    }
  });

  test('allowlist is non-empty', () => {
    expect(allowlist.length).toBeGreaterThan(0);
  });

  test('every allowlisted name matches a real workflow name', () => {
    const missing = allowlist.filter((n) => !workflowNames.has(n));
    expect(missing).toEqual([]);
  });

  test('allowlist is sorted case-insensitively alphabetical', () => {
    const sorted = [...allowlist].sort((a, b) =>
      a.toLowerCase().localeCompare(b.toLowerCase())
    );
    expect(allowlist).toEqual(sorted);
  });

  test('allowlist never contains a wildcard', () => {
    expect(allowlist).not.toContain('*');
  });
});
