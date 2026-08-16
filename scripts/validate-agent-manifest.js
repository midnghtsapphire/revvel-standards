#!/usr/bin/env node
'use strict';

/**
 * CLI: validate one or more agent manifest JSON files against registry_rules.
 *
 * Usage:
 *   node scripts/validate-agent-manifest.js path/to/manifest.json
 *   node scripts/validate-agent-manifest.js --stdin < manifest.json
 *   echo '{"persona_id":"..."}' | node scripts/validate-agent-manifest.js --stdin
 *
 * Exit codes:
 *   0 — every input is valid
 *   1 — one or more manifests failed validation (or usage error)
 *
 * Secrets: none. This tool is pure offline schema enforcement.
 */

const fs = require('fs');
const path = require('path');
const {
  validateAgentManifest,
  formatValidationAlert,
  sampleValidManifest,
} = require('./lib/validate-agent-manifest');

const REPO_ROOT = path.resolve(__dirname, '..');
const SCHEMA_PATH = path.join(REPO_ROOT, 'schemas', 'registry_rules.json');

function printHelp() {
  process.stdout.write(`validate-agent-manifest — enforce schemas/registry_rules.json

Usage:
  node scripts/validate-agent-manifest.js <file.json> [more.json ...]
  node scripts/validate-agent-manifest.js --stdin
  node scripts/validate-agent-manifest.js --sample
  node scripts/validate-agent-manifest.js --schema-path

Options:
  --stdin         Read a single JSON document from stdin
  --sample        Print a valid sample manifest and exit 0
  --schema-path   Print absolute path to registry_rules.json
  --alert         On failure, also emit the n8n markdown alert cargo
  --json          Machine-readable JSON result on stdout
  -h, --help      Show this help

Exit 0 only when every checked manifest is valid.
`);
}

/**
 * @param {string} raw
 * @param {string} label
 */
function parseJson(raw, label) {
  try {
    return JSON.parse(raw);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`${label}: invalid JSON (${message})`);
  }
}

/**
 * @param {unknown} manifest
 * @param {string} label
 * @param {{ alert: boolean, json: boolean }} opts
 * @returns {boolean} true when valid
 */
function reportResult(manifest, label, opts) {
  const result = validateAgentManifest(manifest);
  if (opts.json) {
    process.stdout.write(
      `${JSON.stringify({ file: label, ...result }, null, 2)}\n`,
    );
  } else if (result.valid) {
    process.stdout.write(
      `PASS ${label} — ${result.summary}` +
        (result.skill_budget_remaining !== null
          ? ` (skills remaining: ${result.skill_budget_remaining})`
          : '') +
        '\n',
    );
  } else {
    process.stderr.write(`FAIL ${label} — ${result.summary}\n`);
    for (const err of result.errors) {
      process.stderr.write(`  - ${err.path || '(root)'}: ${err.message}\n`);
    }
    if (opts.alert) {
      const cargo = formatValidationAlert({
        workflowName: 'validate-agent-manifest CLI',
        executionId: label,
        errorName: 'SchemaViolationException',
        errorMessage: result.summary,
      });
      process.stderr.write(`\n--- alert cargo ---\n${cargo}\n`);
    }
  }
  return result.valid;
}

function main(argv) {
  const args = argv.slice(2);
  if (args.length === 0 || args.includes('-h') || args.includes('--help')) {
    printHelp();
    process.exit(args.length === 0 ? 1 : 0);
  }

  if (args.includes('--schema-path')) {
    process.stdout.write(`${SCHEMA_PATH}\n`);
    process.exit(0);
  }

  if (args.includes('--sample')) {
    process.stdout.write(`${JSON.stringify(sampleValidManifest(), null, 2)}\n`);
    process.exit(0);
  }

  const opts = {
    alert: args.includes('--alert'),
    json: args.includes('--json'),
  };

  /** @type {string[]} */
  const files = args.filter((a) => !a.startsWith('--'));
  let allValid = true;

  if (args.includes('--stdin')) {
    const raw = fs.readFileSync(0, 'utf8');
    const manifest = parseJson(raw, 'stdin');
    allValid = reportResult(manifest, 'stdin', opts) && allValid;
  }

  for (const file of files) {
    const abs = path.resolve(process.cwd(), file);
    if (!fs.existsSync(abs)) {
      process.stderr.write(`FAIL ${file} — file not found\n`);
      allValid = false;
      continue;
    }
    const raw = fs.readFileSync(abs, 'utf8');
    try {
      const manifest = parseJson(raw, file);
      allValid = reportResult(manifest, file, opts) && allValid;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      process.stderr.write(`FAIL ${file} — ${message}\n`);
      allValid = false;
    }
  }

  if (!args.includes('--stdin') && files.length === 0) {
    printHelp();
    process.exit(1);
  }

  process.exit(allValid ? 0 : 1);
}

if (require.main === module) {
  main(process.argv);
}

module.exports = { main };
