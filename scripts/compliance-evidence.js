'use strict';

// Check only the integrity of the public design-evidence references. Source
// presence cannot prove deployed effectiveness; never emit a compliance score.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const documents = ['NIST_COMPLIANCE.md', 'SP-800-53-OVERLAYS.md'];
const references = new Set();
for (const name of documents) {
  const text = fs.readFileSync(path.join(root, 'docs/compliance', name), 'utf8');
  for (const match of text.matchAll(/`([^`\n]+)`/g)) {
    // Only repository file paths, not commands or protocol field names.
    if (/^(?:products|scripts|mcp-servers|\.github|\.circleci)\//.test(match[1]) || match[1] === '.mcp.json') references.add(match[1]);
  }
}
const missing = [...references].filter(file => !fs.existsSync(path.join(root, file)));
console.log(JSON.stringify({ assessmentStatus: 'unassessed', purpose: 'design-evidence reference integrity only', checked: references.size, missing }, null, 2));
if (missing.length) process.exitCode = 1;
