#!/usr/bin/env node
'use strict';

/*
 * client-stacks / run-engagement.js — reference client engagement runner.
 *
 * Runs one contract engagement end-to-end against a client repo checkout:
 *   1. Detect the client's stack (detect-stack.js).
 *   2. Load the matching polyglot lane pack (prompt pack + THEIR verify
 *      commands — the fleet runs the client's tests, never ours).
 *   3. Produce the engagement plan: client-style PR (branch, title, body),
 *      verify commands, and prompt-pack constraints for the coding lane.
 *   4. Emit an append-only action log (JSONL) — every action the fleet takes
 *      in a client system is auditable per the isolation rules in
 *      docs/CLIENT_ENGAGEMENT_KIT.md.
 *
 * SAFETY / ISOLATION:
 *   - Default mode is --dry-run: nothing is executed and no client system is
 *     touched; the plan + action log are emitted so a human (or the pipeline)
 *     can review before the coding lane runs. Live execution is done by the
 *     coding lane (openrouter-coder / agent workflow), not by this script.
 *   - The action log NEVER contains secrets — only what/where/when/who.
 *   - Client secrets never enter this repo; the log path defaults to
 *     logs/client-engagements/<client>.jsonl and is per-client scoped.
 *
 * Usage:
 *   node run-engagement.js --repo <path> --task "<description>" \
 *     [--client <name>] [--log <path>] [--json]
 */

const fs = require('fs');
const path = require('path');
const { detect } = require('./detect-stack');

// Default per-client action-log directory (repo-relative). Per isolation
// rules each client gets its own file so logs can be handed over / purged
// per contract without touching other clients' history.
const DEFAULT_LOG_DIR = path.join(__dirname, '..', '..', 'logs', 'client-engagements');

function slugify(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'unnamed';
}

/**
 * Build the engagement plan (pure — no side effects) so it can be tested
 * and reviewed before anything runs in a client system.
 */
function buildEngagementPlan({ repoPath, task, client = 'sample-client' }) {
  const profile = detect(repoPath);
  if (profile.stack === 'unknown' || !profile.lane) {
    throw new Error(
      `Could not detect a supported stack at ${repoPath}. ` +
      `Candidates scored: ${JSON.stringify(profile.all_scores)}. ` +
      'Add a lane pack under skills/client-stacks/stacks/ or point at the service root.'
    );
  }

  const taskSlug = slugify(task);
  return {
    client,
    task,
    profile,
    // Client-style PR: neutral branch prefix + imperative title. pr_style in
    // the lane pack tells the coding lane how to adapt to the client's
    // conventions (work-item refs, Conventional Commits, etc.).
    pr: {
      branch: `contract/${slugify(client)}/${taskSlug}`,
      title: task,
      style: profile.lane.prompt_pack.pr_style,
      body:
        `## Contract engagement\n\n${task}\n\n` +
        `- Stack: ${profile.stack} (${profile.language}, ${profile.framework})\n` +
        `- Verified with the client's own commands:\n` +
        profile.lane.verify.map((c) => `  - \`${c}\``).join('\n') +
        `\n\n_Executed by the Revvel contract fleet. Full action log available on request._`,
    },
    verify: profile.lane.verify,
    prompt_pack: profile.lane.prompt_pack,
    steps: [
      { step: 'detect-stack', detail: `${profile.stack} via ${profile.matched.join('; ')}` },
      { step: 'load-lane', detail: profile.lane.file },
      { step: 'execute-task', detail: task },
      { step: 'verify', detail: profile.lane.verify.join(' && ') },
      { step: 'open-pr', detail: `client-style PR on branch contract/${slugify(client)}/${taskSlug}` },
    ],
  };
}

/**
 * Append one audit entry per plan step to the per-client JSONL action log.
 * Entries record what/where/when/mode only — never secrets, never client
 * file contents. Returns the log path.
 */
function emitActionLog(plan, { logPath, dryRun = true } = {}) {
  const file = logPath || path.join(DEFAULT_LOG_DIR, `${slugify(plan.client)}.jsonl`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const now = new Date().toISOString();
  const lines = plan.steps.map((s) =>
    JSON.stringify({
      ts: now,
      client: plan.client,
      actor: 'revvel-contract-fleet',
      mode: dryRun ? 'dry-run' : 'live',
      stack: plan.profile.stack,
      action: s.step,
      detail: s.detail,
      task: plan.task,
    })
  );
  fs.appendFileSync(file, lines.join('\n') + '\n');
  return file;
}

function main() {
  const argv = process.argv.slice(2);
  const opt = (name) => {
    const i = argv.indexOf(`--${name}`);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  const repoPath = opt('repo');
  const task = opt('task');
  const asJson = argv.includes('--json');

  if (!repoPath || !task) {
    console.log(`
Client engagement runner (dry-run planner + action log)

Usage:
  node run-engagement.js --repo <path-to-client-checkout> --task "<what to do>" \\
    [--client <name>] [--log <action-log-path>] [--json]

Emits the engagement plan (stack profile, client verify commands,
client-style PR spec) and appends an audit trail to the per-client
action log. Nothing is executed; the coding lane runs the plan.
`);
    return repoPath || task ? 1 : 0;
  }

  const plan = buildEngagementPlan({ repoPath, task, client: opt('client') || 'sample-client' });
  const logFile = emitActionLog(plan, { logPath: opt('log'), dryRun: true });

  if (asJson) {
    console.log(JSON.stringify({ ...plan, action_log: logFile }, null, 2));
    return 0;
  }

  console.log(`Engagement plan for ${plan.client}`);
  console.log(`Stack:  ${plan.profile.stack} (${plan.profile.language}, ${plan.profile.framework})`);
  console.log(`CI:     ${plan.profile.ci}`);
  console.log(`PR:     [${plan.pr.branch}] ${plan.pr.title}`);
  console.log('Verify (client commands):');
  for (const c of plan.verify) console.log(`  $ ${c}`);
  console.log('Steps:');
  for (const s of plan.steps) console.log(`  - ${s.step}: ${s.detail}`);
  console.log(`Action log: ${logFile}`);
  return 0;
}

if (require.main === module) {
  process.exit(main());
}

module.exports = { buildEngagementPlan, emitActionLog, slugify };
