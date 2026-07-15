/**
 * Workflow YAML validation tests
 *
 * Ensures the pr-lifecycle check-state allowlist stays drift-proof:
 *   - every allowlisted workflow name matches a real workflow's `name:` field
 *   - the list is sorted case-insensitively alphabetical
 *   - the list never contains a `"*"` wildcard
 */

const fs = require('fs');
const path = require('path');

function loadYaml(filePath) {
  let yaml;
  try {
    yaml = require('js-yaml');
  } catch (e) {
    // Minimal fallback: only extract top-level `name:` from workflow files.
    return null;
  }
  return yaml.load(fs.readFileSync(filePath, 'utf8'));
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
  const content = fs.readFileSync(prLifecyclePath, 'utf8');
  // Look for a block that defines the allowlist. We accept either:
  //   ALLOWLIST=("A" "B" ...)
  // or a YAML list under a key like `allowed_workflows:` / `workflow_allowlist:`.
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

  // Fallback: scan for lines like `- "Some Workflow"` inside a block that
  // mentions "allow" in the preceding key.
  const lines = content.split('\n');
  const names = [];
  let inAllowBlock = false;
  for (const line of lines) {
    if (/allow(?:ed|list)/i.test(line) && /:\s*$/.test(line)) {
      inAllowBlock = true;
      continue;
    }
    if (inAllowBlock) {
      const itemMatch = line.match(/^\s*-\s*["']?([^"'\n]+?)["']?\s*$/);
      if (itemMatch) {
        names.push(itemMatch[1].trim());
      } else if (line.trim() && !line.startsWith(' ') && !line.startsWith('\t') && !line.startsWith('-')) {
        inAllowBlock = false;
      }
    }
  }
  return names;
}

describe('pr-lifecycle check-state workflow allowlist', () => {
  const workflowsDir = path.join(__dirname, '..', '.github', 'workflows');
  const prLifecyclePath = path.join(workflowsDir, 'pr-lifecycle.yml');

  let allowlist;
  let workflowNames;

  beforeAll(() => {
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
