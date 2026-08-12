#!/usr/bin/env node
'use strict';

/**
 * CLI for CI: validate a multi-line env block, optionally write GITHUB_ENV.
 *
 * Usage:
 *   node validate-cli.js --file path.env
 *   node validate-cli.js --stdin
 *   EASY_ENV_BLOCK=$'A=1\nB=$A' node validate-cli.js --env-var EASY_ENV_BLOCK
 *   node validate-cli.js --stdin --write-github-env
 *
 * Exit codes:
 *   0 — valid (warnings allowed)
 *   1 — validation errors
 *   2 — usage / IO error
 */

const fs = require('node:fs');
const path = require('node:path');
const { parseEnvBlock, PINNED_SHA, PINNED_TAG } = require('./parse-env');

function printUsage() {
  process.stderr.write(
    `Usage: node validate-cli.js (--file PATH | --stdin | --env-var NAME) [--write-github-env] [--json]\n`
  );
}

/**
 * @param {string[]} argv
 */
function parseArgs(argv) {
  /** @type {{ file?: string, stdin: boolean, envVar?: string, writeGithubEnv: boolean, json: boolean }} */
  const opts = { stdin: false, writeGithubEnv: false, json: false };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--file') opts.file = argv[++i];
    else if (a === '--stdin') opts.stdin = true;
    else if (a === '--env-var') opts.envVar = argv[++i];
    else if (a === '--write-github-env') opts.writeGithubEnv = true;
    else if (a === '--json') opts.json = true;
    else if (a === '--help' || a === '-h') {
      printUsage();
      process.exit(0);
    } else {
      process.stderr.write(`Unknown argument: ${a}\n`);
      printUsage();
      process.exit(2);
    }
  }
  return opts;
}

/**
 * @returns {Promise<string>}
 */
function readStdin() {
  return new Promise((resolve, reject) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => {
      data += chunk;
    });
    process.stdin.on('end', () => resolve(data));
    process.stdin.on('error', reject);
  });
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  let text = '';

  if (opts.file) {
    text = fs.readFileSync(path.resolve(opts.file), 'utf8');
  } else if (opts.envVar) {
    text = process.env[opts.envVar] || '';
    if (!text) {
      process.stderr.write(`Environment variable ${opts.envVar} is empty or unset\n`);
      process.exit(2);
    }
  } else if (opts.stdin) {
    text = await readStdin();
  } else {
    printUsage();
    process.exit(2);
  }

  const result = parseEnvBlock(text, {
    existingEnv: process.env,
  });

  if (opts.json) {
    process.stdout.write(
      `${JSON.stringify(
        {
          ok: result.ok,
          resolved: result.resolved,
          findings: result.findings,
          pinned: { tag: PINNED_TAG, sha: PINNED_SHA },
        },
        null,
        2
      )}\n`
    );
  } else {
    for (const f of result.findings) {
      const loc = f.line ? `line ${f.line}: ` : '';
      process.stdout.write(`[${f.severity}] ${loc}${f.message}\n`);
    }
    if (result.ok) {
      process.stdout.write(
        `OK — ${Object.keys(result.resolved).length} variable(s) ready for briantist/ezenv@${PINNED_TAG} (${PINNED_SHA.slice(0, 12)})\n`
      );
      for (const [k, v] of Object.entries(result.resolved)) {
        process.stdout.write(`  ${k}=${v}\n`);
      }
    } else {
      process.stdout.write(
        `FAIL — ${result.findings.filter((f) => f.severity === 'error').length} error(s)\n`
      );
    }
  }

  if (result.ok && opts.writeGithubEnv) {
    const ghEnv = process.env.GITHUB_ENV;
    if (!ghEnv) {
      process.stderr.write('GITHUB_ENV is not set; cannot write\n');
      process.exit(2);
    }
    fs.appendFileSync(ghEnv, `${result.githubEnv}\n`, 'utf8');
    process.stdout.write(`Wrote ${Object.keys(result.resolved).length} vars to GITHUB_ENV\n`);
  }

  process.exit(result.ok ? 0 : 1);
}

main().catch((err) => {
  process.stderr.write(`${err instanceof Error ? err.stack : String(err)}\n`);
  process.exit(2);
});
