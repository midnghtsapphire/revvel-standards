/**
 * Workflow YAML validation test
 *
 * Ensures the `check-state` allowlist in `.github/workflows/pr-lifecycle.yml`
 * stays drift-proof:
 *   1. Every allowlisted workflow name matches a real workflow's `name:` field.
 *   2. The allowlist is sorted case-insensitively alphabetical.
 *   3. The allowlist never contains the `"*"` wildcard.
 */

const fs = require('fs');
const path = require('path');

// Minimal YAML `name:` extractor. We intentionally avoid a full YAML parser
// dependency because this repo already has YAML-parse issues elsewhere that
// break `js-yaml`; a line-based scan for the top-level `name:` key is enough.
function extractWorkflowName(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/);
  for (const line of lines) {
    // Top-level `name:` (no leading whitespace)
    const match = line.match(/^name:\s*(.+?)\s*$/);
    if (match) {
      let name = match[1].trim();
      // Strip surrounding quotes if present
      if ((name.startsWith('"') && name.endsWith('"')) ||
          (name.startsWith("'") && name.endsWith("'"))) {
        name = name.slice(1, -1);
      }
      return name;
    }
  }
  return null;
}

function collectWorkflowNames(workflowsDir) {
  if (!fs.existsSync(workflowsDir)) return new Set();
  const names = new Set();
  const entries = fs.readdirSync(workflowsDir);
  for (const entry of entries) {
    if (!/\.ya?ml$/i.test(entry)) continue;
    const full = path.join(workflowsDir, entry);
    try {
      const name = extractWorkflowName(full);
      if (name) names.add(name);
    } catch (_e) {
      // Ignore individual unreadable files; other tests cover parse health.
    }
  }
  return names;
}

function extractAllowlist(prLifecyclePath) {
  const content = fs.readFileSync(prLifecyclePath, 'utf8');
  const lines = content.split(/\r?\n/);
  // Find a block that looks like:
  //   ALLOWED_WORKFLOWS: |
  //     Name One
  //     Name Two
  // OR a YAML list under a key containing "allow" and "workflow".
  const allowlist = [];

  // Strategy: scan for lines under a key whose name contains both
  // "allow" and "workflow" (case-insensitive), collect subsequent
  // indented list items or literal-block lines until indent decreases.
  let inBlock = false;
  let blockIndent = -1;
  let blockStyle = null; // 'literal' or 'list'

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const keyMatch = line.match(/^(\s*)([A-Za-z0-9_\-]+)\s*:\s*(\|?)\s*$/);
    if (keyMatch) {
      const [, indent, key, pipe] = keyMatch;
      if (/allow/i.test(key) && /workflow/i.test(key)) {
        inBlock = true;
        blockIndent = indent.length;
        blockStyle = pipe === '|' ? 'literal' : 'list';
        continue;
      }
      // Any other key at same or lower indent ends the block.
      if (inBlock && indent.length <= blockIndent) {
        inBlock = false;
      }
    }

    if (inBlock) {
      if (line.trim() === '') continue;
      const leading = line.match(/^(\s*)/)[1].length;
      if (leading <= blockIndent) {
        inBlock = false;
        continue;
      }
      if (blockStyle === 'literal') {
        allowlist.push(line.trim());
      } else {
        const item = line.match(/^\s*-\s*(.+?)\s*$/);
        if (item) {
          let v = item[1];
          if ((v.startsWith('"') && v.endsWith('"')) ||
              (v.startsWith("'") && v.endsWith("'"))) {
            v = v.slice(1, -1);
          }
          allowlist.push(v);
        }
      }
    }
  }

  return allowlist.filter(Boolean);
}

function run() {
  const repoRoot = path.resolve(__dirname, '..');
  const workflowsDir = path.join(repoRoot, '.github', 'workflows');
  const prLifecyclePath = path.join(workflowsDir, 'pr-lifecycle.yml');

  const failures = [];

  if (!fs.existsSync(prLifecyclePath)) {
    // Nothing to validate — treat as skipped, not failed.
    console.log('[workflow-yaml-validation] pr-lifecycle.yml not present; skipping.');
    return 0;
  }

  const allowlist = extractAllowlist(prLifecyclePath);
  const realNames = collectWorkflowNames(workflowsDir);

  // 1. No wildcard.
  if (allowlist.includes('*')) {
    failures.push('Allowlist must never contain the "*" wildcard.');
  }

  // 2. Sorted case-insensitively.
  const sorted = [...allowlist].sort((a, b) =>
    a.toLowerCase().localeCompare(b.toLowerCase())
  );
  for (let i = 0; i < allowlist.length; i++) {
    if (allowlist[i] !== sorted[i]) {
      failures.push(
        `Allowlist is not sorted case-insensitively. Expected "${sorted[i]}" at index ${i}, got "${allowlist[i]}".`
      );
      break;
    }
  }

  // 3. Every entry matches a real workflow name.
  for (const name of allowlist) {
    if (!realNames.has(name)) {
      failures.push(
        `Allowlist entry "${name}" does not match any workflow's top-level \`name:\` field.`
      );
    }
  }

  if (failures.length > 0) {
    console.error('[workflow-yaml-validation] FAIL');
    for (const f of failures) console.error(' - ' + f);
    return 1;
  }

  console.log(
    `[workflow-yaml-validation] OK — validated ${allowlist.length} allowlisted workflow name(s).`
  );
  return 0;
}

if (require.main === module) {
  process.exit(run());
}

module.exports = {
  extractWorkflowName,
  collectWorkflowNames,
  extractAllowlist,
  run,
};
