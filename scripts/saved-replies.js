'use strict';

/**
 * saved-replies.js
 *
 * Loader/validator/CLI for the repo saved-reply registry
 * (`config/saved-replies.yml`).
 *
 * Why this exists: GitHub saved replies live in each user's account settings
 * (https://github.com/settings/replies) and there is no public write API to
 * create them programmatically. So the repo keeps a canonical registry here,
 * validates it in CI (tests/saved-replies.test.js), and humans mirror the
 * entries into the GitHub UI following docs/SAVED_REPLIES.md. Agents and
 * workflows can also pull the exact reply body from this module instead of
 * hard-coding the string.
 *
 * CLI:
 *   node scripts/saved-replies.js --list          # keys + titles
 *   node scripts/saved-replies.js --body <key>    # print exact body text
 *   node scripts/saved-replies.js --check         # validate registry, exit 1 on problems
 *
 * Exit codes reflect the postcondition (registry valid / key found), not just
 * "the script ran" — per the green-main exit-code rule.
 */

const fs = require('node:fs');
const path = require('node:path');
const YAML = require('yaml');

const REGISTRY_PATH = path.join(__dirname, '..', 'config', 'saved-replies.yml');

const KEY_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/**
 * Load and parse the registry file. Throws on unreadable/unparseable YAML.
 * @param {string} [registryPath]
 * @returns {{replies: Array<object>}}
 */
function loadRegistry(registryPath = REGISTRY_PATH) {
  const raw = fs.readFileSync(registryPath, 'utf8');
  const parsed = YAML.parse(raw);
  if (!parsed || typeof parsed !== 'object') {
    throw new Error(`Registry at ${registryPath} did not parse to an object`);
  }
  return parsed;
}

/**
 * Validate a parsed registry. Returns a list of human-readable problems;
 * empty list means valid.
 * @param {{replies?: unknown}} registry
 * @returns {string[]}
 */
function validateRegistry(registry) {
  const problems = [];
  const replies = registry && registry.replies;
  if (!Array.isArray(replies)) {
    return ['`replies` must be a list'];
  }
  if (replies.length === 0) {
    problems.push('`replies` must contain at least one entry');
  }
  const seen = new Set();
  replies.forEach((entry, i) => {
    const where = `replies[${i}]`;
    if (!entry || typeof entry !== 'object') {
      problems.push(`${where} must be a mapping`);
      return;
    }
    for (const field of ['key', 'title', 'body', 'usage']) {
      if (typeof entry[field] !== 'string' || entry[field].trim() === '') {
        problems.push(`${where}.${field} must be a non-empty string`);
      }
    }
    if (typeof entry.key === 'string') {
      if (!KEY_RE.test(entry.key)) {
        problems.push(`${where}.key "${entry.key}" must be kebab-case`);
      }
      if (seen.has(entry.key)) {
        problems.push(`${where}.key "${entry.key}" is duplicated`);
      }
      seen.add(entry.key);
    }
    // Bodies are inserted verbatim into PR/issue comments; a trailing or
    // leading space would ship into every comment, so reject it here.
    if (typeof entry.body === 'string' && entry.body !== entry.body.trim()) {
      problems.push(`${where}.body must not have leading/trailing whitespace`);
    }
  });
  return problems;
}

/**
 * Look up a reply entry by key.
 * @param {string} key
 * @param {{replies: Array<object>}} [registry]
 * @returns {object|undefined}
 */
function getReply(key, registry = loadRegistry()) {
  return (registry.replies || []).find((r) => r && r.key === key);
}

function main(argv) {
  const args = argv.slice(2);
  const registry = loadRegistry();

  if (args[0] === '--check') {
    const problems = validateRegistry(registry);
    if (problems.length > 0) {
      for (const p of problems) console.error(`saved-replies: ${p}`);
      return 1;
    }
    const n = registry.replies.length;
    console.log(`saved-replies: ${n} ${n === 1 ? 'entry' : 'entries'} valid`);
    return 0;
  }

  if (args[0] === '--body') {
    const reply = getReply(args[1], registry);
    if (!reply) {
      console.error(`saved-replies: no reply with key "${args[1]}"`);
      return 1;
    }
    console.log(reply.body);
    return 0;
  }

  // Default / --list: print keys and titles.
  for (const r of registry.replies || []) {
    console.log(`${r.key}\t${r.title}`);
  }
  return 0;
}

if (require.main === module) {
  process.exitCode = main(process.argv);
}

module.exports = { REGISTRY_PATH, loadRegistry, validateRegistry, getReply };
