#!/usr/bin/env node
'use strict';

/**
 * CLI: GitHub commit message → Linear issue sync (Agent Factory).
 *
 * Examples:
 *   node scripts/linear-api-sync.js --message "fix: ENG-105" --dry-run
 *   node scripts/linear-api-sync.js --payload ./push.json --live
 *
 * Secrets (env names only): LINEAR_API_KEY, LINEAR_DONE_STATE_ID
 */

const fs = require('fs');
const path = require('path');
const {
  planLinearUpdates,
  syncGithubPayloadToLinear,
  getPublicConfig,
} = require('../products/linear-api-sync/lib/sync.js');

function printHelp() {
  console.log(`Usage:
  node scripts/linear-api-sync.js --message "fix: ENG-105" [--author name] [--url url] [--sha sha] [--dry-run|--live]
  node scripts/linear-api-sync.js --payload ./github-push.json [--dry-run|--live]
  node scripts/linear-api-sync.js --stdin [--dry-run|--live]

Env:
  LINEAR_API_KEY          required for --live
  LINEAR_DONE_STATE_ID    optional Done workflow state UUID
`);
}

function parseArgs(argv) {
  /** @type {Record<string, string | boolean>} */
  const out = { dryRun: true };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--help' || a === '-h') out.help = true;
    else if (a === '--dry-run') out.dryRun = true;
    else if (a === '--live') out.dryRun = false;
    else if (a === '--stdin') out.stdin = true;
    else if (a === '--message' || a === '-m') out.message = argv[++i];
    else if (a === '--author') out.author = argv[++i];
    else if (a === '--url') out.url = argv[++i];
    else if (a === '--sha') out.sha = argv[++i];
    else if (a === '--payload' || a === '-p') out.payloadPath = argv[++i];
    else if (a === '--done-state-id') out.doneStateId = argv[++i];
    else throw new Error(`Unknown argument: ${a}`);
  }
  return out;
}

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
  let args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err));
    printHelp();
    process.exit(2);
  }

  if (args.help) {
    printHelp();
    process.exit(0);
  }

  /** @type {unknown} */
  let payload;
  if (args.payloadPath) {
    const abs = path.resolve(String(args.payloadPath));
    payload = JSON.parse(fs.readFileSync(abs, 'utf8'));
  } else if (args.stdin) {
    const raw = await readStdin();
    payload = JSON.parse(raw);
  } else if (args.message) {
    payload = {
      message: String(args.message),
      author: args.author ? String(args.author) : 'cli',
      url: args.url ? String(args.url) : '',
      sha: args.sha ? String(args.sha) : '',
    };
  } else {
    printHelp();
    process.exit(2);
  }

  const doneStateId =
    (args.doneStateId && String(args.doneStateId)) ||
    process.env.LINEAR_DONE_STATE_ID ||
    null;

  const dryRun = args.dryRun !== false;
  if (dryRun) {
    const plans = planLinearUpdates(payload, { doneStateId });
    console.log(
      JSON.stringify(
        {
          dryRun: true,
          config: getPublicConfig(process.env),
          planned: plans.length,
          plans: plans.map((p) => ({
            issueId: p.issueId,
            mode: p.mutation.mode,
            variables: p.mutation.variables,
            commentText: p.commentText,
          })),
        },
        null,
        2,
      ),
    );
    process.exit(0);
  }

  const result = await syncGithubPayloadToLinear(payload, {
    dryRun: false,
    apiKey: process.env.LINEAR_API_KEY,
    doneStateId,
  });
  console.log(JSON.stringify({ config: getPublicConfig(process.env), ...result }, null, 2));
  const failed = result.results.some((r) => r.status === 'error');
  process.exit(failed ? 1 : 0);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.stack || err.message : String(err));
  process.exit(1);
});
