/**
 * Workflow YAML validation tests
 *
 * Ensures the check-state allowlist in .github/workflows/pr-lifecycle.yml stays
 * consistent with the actual workflows in the repository:
 *   - Every allowlisted name matches a real workflow's `name:` field
 *   - The list stays sorted (case-insensitive alphabetical)
 *   - It never contains the "*" wildcard
 */

const fs = require('fs');
const path = require('path');

// Minimal YAML helpers — we intentionally avoid a hard dep on `js-yaml` so this
// test can run in a bare CI environment. We only need to extract the top-level
// `name:` field from each workflow and the allowlist array from pr-lifecycle.yml.

const WORKFLOWS_DIR = path.join(__dirname, '..', '.github', 'workflows');
const PR_LIFECYCLE = path.join(WORKFLOWS_DIR, 'pr-lifecycle.yml');

function readWorkflowName(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  // Match a top-level `name:` (no leading whitespace). Handles quoted and bare forms.
  const match = content.match(/^name:\s*(.+?)\s*$/m);
  if (!match) return null;
  let name = match[1].trim();
  if ((name.startsWith('"') && name.endsWith('"')) ||
      (name.startsWith("'") && name.endsWith("'"))) {
    name = name.slice(1, -1);
  }
  return name;
}

function extractAllowlist(prLifecycleContent) {
  // Find the check-state allowlist. We look for a marker comment or the
  // `workflow_run:` -> `workflows:` block. Fall back to any `workflows:` list
  // under a `workflow_run:` key.
  const lines = prLifecycleContent.split('\n');
  let inWorkflowRun = false;
  let inWorkflowsList = false;
  let listIndent = -1;
  const names = [];

  for (const rawLine of lines) {
    const line = rawLine.replace(/\r$/, '');
    const trimmed = line.trim();

    if (/^workflow_run:\s*$/.test(trimmed)) {
      inWorkflowRun = true;
      inWorkflowsList = false;
      continue;
    }

    if (inWorkflowRun && /^workflows:\s*$/.test(trimmed)) {
      inWorkflowsList = true;
      listIndent = line.search(/\S/);
      continue;
    }

    if (inWorkflowsList) {
      const currentIndent = line.search(/\S/);
      if (trimmed === '' ) continue;
      // List items must be more indented than the `workflows:` key itself.
      if (currentIndent <= listIndent) {
        inWorkflowsList = false;
        inWorkflowRun = false;
        continue;
      }
      const itemMatch = trimmed.match(/^-\s*(.+?)\s*$/);
      if (itemMatch) {
        let value = itemMatch[1].trim();
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        names.push(value);
      }
    }
  }

  return names;
}

function collectRealWorkflowNames() {
  if (!fs.existsSync(WORKFLOWS_DIR)) return new Set();
  const files = fs.readdirSync(WORKFLOWS_DIR)
    .filter(f => f.endsWith('.yml') || f.endsWith('.yaml'));
  const names = new Set();
  for (const f of files) {
    const name = readWorkflowName(path.join(WORKFLOWS_DIR, f));
    if (name) names.add(name);
  }
  return names;
}

function isSortedCaseInsensitive(arr) {
  for (let i = 1; i < arr.length; i++) {
    if (arr[i - 1].toLowerCase().localeCompare(arr[i].toLowerCase()) > 0) {
      return { sorted: false, at: i, prev: arr[i - 1], curr: arr[i] };
    }
  }
  return { sorted: true };
}

// Tiny test harness so we don't require jest/mocha to be installed.
const results = [];
function test(name, fn) {
  try {
    fn();
    results.push({ name, ok: true });
    console.log(`ok - ${name}`);
  } catch (err) {
    results.push({ name, ok: false, err });
    console.error(`not ok - ${name}`);
    console.error(`  ${err.message}`);
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg || 'assertion failed');
}

if (!fs.existsSync(PR_LIFECYCLE)) {
  console.log('# pr-lifecycle.yml not present — skipping allowlist validation');
  process.exit(0);
}

const prLifecycleContent = fs.readFileSync(PR_LIFECYCLE, 'utf8');
const allowlist = extractAllowlist(prLifecycleContent);
const realNames = collectRealWorkflowNames();

test('allowlist is non-empty', () => {
  assert(allowlist.length > 0, 'expected at least one entry in workflow_run allowlist');
});

test('allowlist does not contain "*" wildcard', () => {
  assert(!allowlist.includes('*'), 'allowlist must not contain the "*" wildcard');
});

test('allowlist is sorted case-insensitively', () => {
  const result = isSortedCaseInsensitive(allowlist);
  assert(result.sorted,
    result.sorted
      ? ''
      : `allowlist not sorted at index ${result.at}: "${result.prev}" should come after "${result.curr}"`);
});

test('every allowlisted name matches a real workflow name', () => {
  const missing = allowlist.filter(n => !realNames.has(n));
  assert(missing.length === 0,
    `allowlisted names with no matching workflow: ${JSON.stringify(missing)}`);
});

const failed = results.filter(r => !r.ok);
if (failed.length > 0) {
  process.exit(1);
}
