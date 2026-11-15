'use strict';

// Check only the integrity of the public design-evidence references. Source
// presence cannot prove deployed effectiveness; never emit a compliance score.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const documents = [
  'NIST_COMPLIANCE.md',
  'SP-800-53-OVERLAYS.md',
  // 2026-11-11 Rules-Steward, WR #18343: same path check for the readiness mapping.
  'NIST_READINESS.md',
];
const REPO_PATH = /^(?:products|scripts|mcp-servers|\.github|\.circleci)\//;

function toRepoRelative(filePath) {
  return filePath.split(path.sep).join('/');
}

// Backtick paths stay limited to the prefixes the 2026-11-10 checker used.
// Commands and field names in backticks are not files.
function isBacktickRepoPath(token) {
  return REPO_PATH.test(token) || token === '.mcp.json';
}

// 2026-11-11 Rules-Steward, WR #18343, Bugbot on PR #18365: the readiness
// mapping cites evidence as markdown links (`../../scripts/...`), not as
// backtick paths under those prefixes. A deleted citation was still
// `missing: []`. Relative links are resolved from the document directory.
// http(s) links are sources, not repository files, and are skipped.
function collectReferences(text, docDir) {
  const references = new Set();
  for (const match of text.matchAll(/`([^`\n]+)`/g)) {
    if (isBacktickRepoPath(match[1])) references.add(match[1]);
  }
  for (const match of text.matchAll(/\[[^\]]*\]\(([^)\s]+)\)/g)) {
    const target = match[1].split('#')[0];
    if (!target || /^[a-z][a-z0-9+.-]*:/i.test(target)) continue;
    const resolved = path.resolve(docDir, target);
    const rel = path.relative(root, resolved);
    if (!rel || rel.startsWith('..') || path.isAbsolute(rel)) continue;
    references.add(toRepoRelative(rel));
  }
  return references;
}

function missingReferences(references) {
  return [...references].filter(file => !fs.existsSync(path.join(root, file)));
}

function checkDocuments() {
  const references = new Set();
  for (const name of documents) {
    const docDir = path.join(root, 'docs/compliance');
    const text = fs.readFileSync(path.join(docDir, name), 'utf8');
    for (const file of collectReferences(text, docDir)) references.add(file);
  }
  const missing = missingReferences(references);
  return { assessmentStatus: 'unassessed', purpose: 'design-evidence reference integrity only', checked: references.size, missing };
}

module.exports = { collectReferences, missingReferences, checkDocuments, root };

if (require.main === module) {
  const report = checkDocuments();
  console.log(JSON.stringify(report, null, 2));
  if (report.missing.length) process.exitCode = 1;
}
