#!/usr/bin/env node
/**
 * check-dependabot-split-deps.js
 *
 * Enforces formal path A from WR #16950 / PR #16791 structural_conflict:
 *   "split-deps-per-directory" beats "dependabot-group-bump".
 *
 * Hard rules:
 * 1. Never use the multi-directory key `directories:` (plural). Each update
 *    entry must target exactly one `directory:`.
 * 2. Group names must be unique across the whole file and must not be the
 *    Dependabot multi-dir default pattern `npm_and_yarn` / `npm-and-yarn`.
 * 3. Group names should be scoped to their directory (prefix or explicit).
 *
 * Exit 0 when the postcondition holds; non-zero otherwise (CLAUDE.md #6).
 *
 * Usage:
 *   node scripts/check-dependabot-split-deps.js [path/to/dependabot.yml]
 *   node scripts/check-dependabot-split-deps.js --json
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const FORBIDDEN_GROUP_NAMES = new Set([
  'npm_and_yarn',
  'npm-and-yarn',
  'npm-and-yarn-group',
  'all-dependencies',
  'all-npm',
]);

/**
 * @param {string} text
 * @param {string} [filePath]
 * @returns {{ ok: boolean, findings: Array<{rule:string,message:string}>, entries: number }}
 */
function checkDependabotSplitDeps(text, filePath = 'dependabot.yml') {
  const findings = [];
  let doc;
  try {
    // Prefer the repo's yaml package; fall back to a tiny structural scan.
    let YAML;
    try {
      YAML = require('yaml');
    } catch {
      YAML = null;
    }
    if (YAML) {
      doc = YAML.parse(text);
    } else {
      return checkWithRegexFallback(text, filePath);
    }
  } catch (err) {
    findings.push({
      rule: 'parse',
      message: `${filePath}: YAML parse failed: ${err.message}`,
    });
    return { ok: false, findings, entries: 0 };
  }

  if (!doc || doc.version !== 2) {
    findings.push({
      rule: 'version',
      message: `${filePath}: expected version: 2`,
    });
  }

  const updates = Array.isArray(doc && doc.updates) ? doc.updates : [];
  if (updates.length === 0) {
    findings.push({
      rule: 'updates',
      message: `${filePath}: updates[] is empty or missing`,
    });
    return { ok: false, findings, entries: 0 };
  }

  /** @type {Map<string, string>} groupName -> directory */
  const groupOwners = new Map();

  for (let i = 0; i < updates.length; i++) {
    const entry = updates[i] || {};
    const label = `${filePath} updates[${i}] (${entry['package-ecosystem'] || '?'})`;

    if (Object.prototype.hasOwnProperty.call(entry, 'directories')) {
      findings.push({
        rule: 'no-directories-plural',
        message:
          `${label}: uses directories: (plural). Formal path A requires one ` +
          `directory: per entry so Dependabot cannot open cross-directory group bumps ` +
          `(see PR #16791 structural_conflict / issue #16950).`,
      });
    }

    const directory = entry.directory;
    if (typeof directory !== 'string' || !directory.trim()) {
      // Only error when directories: is also absent — a pure directories: entry is
      // already flagged above.
      if (!Object.prototype.hasOwnProperty.call(entry, 'directories')) {
        findings.push({
          rule: 'single-directory',
          message: `${label}: missing directory: (required for split-deps-per-directory)`,
        });
      }
    }

    const groups = entry.groups && typeof entry.groups === 'object' ? entry.groups : null;
    if (!groups) continue;

    for (const groupName of Object.keys(groups)) {
      const normalized = String(groupName).toLowerCase();
      if (FORBIDDEN_GROUP_NAMES.has(normalized)) {
        findings.push({
          rule: 'forbidden-group-name',
          message:
            `${label}: group "${groupName}" is forbidden. Cross-directory ` +
            `names like npm_and_yarn caused PR #16791 structural_conflict. ` +
            `Use a directory-scoped name (e.g. root-tooling-patch-minor).`,
        });
      }

      const ownerKey = `${entry['package-ecosystem'] || 'any'}::${normalized}`;
      // Sentinel when directory: is absent (e.g. directories:-only entry) so
      // two multi-dir entries sharing a group name still collide.
      const ownerLabel =
        typeof directory === 'string' && directory.trim()
          ? directory
          : `<missing-directory@updates[${i}]>`;
      if (groupOwners.has(ownerKey)) {
        const prior = groupOwners.get(ownerKey);
        if (prior !== ownerLabel) {
          findings.push({
            rule: 'unique-group-per-directory',
            message:
              `${label}: group "${groupName}" is reused across directories ` +
              `"${prior}" and "${ownerLabel}". Shared group names let Dependabot ` +
              `open multi-directory bumps (path B). Scope the name per directory.`,
          });
        }
      } else {
        groupOwners.set(ownerKey, ownerLabel);
      }
    }
  }

  return { ok: findings.length === 0, findings, entries: updates.length };
}

/**
 * Regex fallback when the yaml package is unavailable (should be rare —
 * package.json declares yaml). Still catches the high-signal anti-patterns.
 * @param {string} text
 * @param {string} filePath
 */
function checkWithRegexFallback(text, filePath) {
  const findings = [];
  if (/^\s*directories\s*:/m.test(text)) {
    findings.push({
      rule: 'no-directories-plural',
      message: `${filePath}: directories: (plural) key detected (regex fallback)`,
    });
  }
  for (const bad of FORBIDDEN_GROUP_NAMES) {
    const re = new RegExp(`^\\s*${bad.replace(/[-_]/g, '[-_]')}\\s*:`, 'im');
    if (re.test(text)) {
      findings.push({
        rule: 'forbidden-group-name',
        message: `${filePath}: forbidden group name "${bad}" detected (regex fallback)`,
      });
    }
  }
  return { ok: findings.length === 0, findings, entries: -1 };
}

function main(argv = process.argv.slice(2)) {
  const asJson = argv.includes('--json');
  const positional = argv.filter((a) => !a.startsWith('--'));
  const target =
    positional[0] ||
    path.join(process.cwd(), '.github', 'dependabot.yml');

  if (!fs.existsSync(target)) {
    console.error(`missing ${target}`);
    process.exit(2);
  }

  const text = fs.readFileSync(target, 'utf8');
  const result = checkDependabotSplitDeps(text, target);

  if (asJson) {
    console.log(JSON.stringify(result, null, 2));
  } else if (result.ok) {
    console.log(
      `ok: ${target} passes split-deps-per-directory (${result.entries} update entries)`,
    );
  } else {
    console.error(`FAIL: ${target} violates split-deps-per-directory:\n`);
    for (const f of result.findings) {
      console.error(`  [${f.rule}] ${f.message}`);
    }
  }

  process.exit(result.ok ? 0 : 1);
}

if (require.main === module) {
  main();
}

module.exports = {
  checkDependabotSplitDeps,
  FORBIDDEN_GROUP_NAMES,
  main,
};
