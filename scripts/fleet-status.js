#!/usr/bin/env node
/**
 * fleet-status.js — live "who is doing what, where, right now" for Revvel repos.
 *
 * 2026-11-16 — Kimi (visiting agent), requested by Audrey:
 * "I want labels so I know at anytime who is doing what where at that second...
 *  everyone leaves detailed comments... no one says ready to merge... I need to
 *  know when OpenRouter was instantiated or became Copilot."
 *
 * Why this file exists and what breaks without it:
 * Agents hand work to each other (OpenRouter -> Copilot -> Gitar -> Jules) with
 * no visible record. The owner cannot tell if an item is claimed, being worked,
 * blocked, or merge-ready. This tool stamps two label families and a comment on
 * every state change so the issue/PR page IS the status board:
 *
 *   agent:<name>      — exactly one. Who holds it RIGHT NOW. Swaps on handoff.
 *   status:<state>    — exactly one lifecycle state at a time.
 *
 * Without it, handoffs are invisible and "fixed it / didn't fix it / no idea"
 * becomes the default owner experience.
 *
 * Reversible: labels are additive; comments are append-only; nothing is deleted.
 * Requires: gh CLI authenticated (keyring). No paid services. Runs anywhere gh runs
 * (laptop CI, Gitar, CircleCI, self-hosted runner) — no GitHub-hosted Actions needed.
 *
 * Usage:
 *   node scripts/fleet-status.js claim  --repo owner/repo --number 123 --agent openrouter [--note "..."]
 *   node scripts/fleet-status.js status --repo owner/repo --number 123 --to in-progress [--note "..."]
 *   node scripts/fleet-status.js ready  --repo owner/repo --number 45  --agent kimi --evidence "CircleCI green, 27/27 tests"
 *   node scripts/fleet-status.js block  --repo owner/repo --number 123 --reason "needs Doppler secret X"
 *   node scripts/fleet-status.js board  --repo owner/repo   (prints who-owns-what table)
 */

const { execFileSync } = require('child_process');

// Canonical lifecycle order for status:* labels (existing repo labels included).
const STATES = ['claimed', 'in-progress', 'checks-failing', 'checks-passing',
  'waiting-for-review', 'ready-to-merge', 'needs-action', 'blocked', 'needs-audrey'];

// 2026-11-16 kimi-agent: resolve the gh binary instead of assuming PATH.
// Portable installs (e.g. tools/bin/gh.exe) are not on PATH; check GH_PATH env,
// then PATH, then a GH_BIN relative to this repo checkout. If it fails: install
// gh or set GH_PATH=<full path to gh.exe>.
const path = require('path');
const fs = require('fs');
function resolveGh() {
  const candidates = [
    process.env.GH_PATH,
    process.env.GH_BIN,
    path.join(__dirname, '..', '..', 'tools', 'bin', 'gh.exe'),
    path.join(__dirname, '..', '..', 'tools', 'bin', 'gh'),
  ].filter(Boolean);
  for (const c of candidates) {
    try { if (fs.existsSync(c)) return c; } catch { /* keep looking */ }
  }
  return 'gh'; // last resort: PATH lookup (laptop / CI where gh is installed)
}
const GH_BIN = resolveGh();

function gh(args) {
  return execFileSync(GH_BIN, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) out[a.slice(2)] = argv[++i];
    else out._.push(a);
  }
  return out;
}

function currentLabels(repo, number) {
  const json = gh(['issue', 'view', String(number), '--repo', repo, '--json', 'labels']);
  return JSON.parse(json).labels.map((l) => l.name);
}

function swapFamily(repo, number, labels, prefix, next) {
  const toRemove = labels.filter((l) => l.startsWith(prefix) && l !== next);
  const args = ['issue', 'edit', String(number), '--repo', repo, '--add-label', next];
  for (const l of toRemove) args.push('--remove-label', l);
  gh(args);
}

function comment(repo, number, body) {
  gh(['issue', 'comment', String(number), '--repo', repo, '--body', body]);
}

const stamp = () => new Date().toISOString().replace('T', ' ').slice(0, 16) + ' UTC';

const cmd = process.argv[2];
const args = parseArgs(process.argv.slice(3));
const repo = args.repo || 'midnghtsapphire/revvel-standards';
const number = args.number && Number(args.number);

function need(value, name) {
  if (!value) {
    console.error(`missing --${name}`);
    process.exit(2);
  }
}

if (cmd === 'claim') {
  need(number, 'number'); need(args.agent, 'agent');
  const labels = currentLabels(repo, number);
  swapFamily(repo, number, labels, 'agent:', `agent:${args.agent}`);
  swapFamily(repo, number, labels, 'status:', 'status:claimed');
  comment(repo, number, `🤖 **${args.agent}** claimed this at ${stamp()}.${args.note ? `\n\n${args.note}` : ''}`);
  console.log(`${repo}#${number} -> agent:${args.agent}, status:claimed`);
} else if (cmd === 'status') {
  need(number, 'number'); need(args.to, 'to');
  if (!STATES.includes(args.to)) { console.error(`unknown state. Valid: ${STATES.join(', ')}`); process.exit(2); }
  const labels = currentLabels(repo, number);
  swapFamily(repo, number, labels, 'status:', `status:${args.to}`);
  const agent = labels.find((l) => l.startsWith('agent:')) || 'agent:unknown';
  comment(repo, number, `📍 **${agent.replace('agent:', '')}** moved this to **${args.to}** at ${stamp()}.${args.note ? `\n\n${args.note}` : ''}`);
  console.log(`${repo}#${number} -> status:${args.to}`);
} else if (cmd === 'ready') {
  need(number, 'number'); need(args.agent, 'agent'); need(args.evidence, 'evidence');
  const labels = currentLabels(repo, number);
  swapFamily(repo, number, labels, 'status:', 'status:ready-to-merge');
  comment(repo, number, `✅ **Ready to merge** — ${args.agent} at ${stamp()}.\n\nVerified: ${args.evidence}`);
  console.log(`${repo}#${number} -> status:ready-to-merge`);
} else if (cmd === 'block') {
  need(number, 'number'); need(args.reason, 'reason');
  const labels = currentLabels(repo, number);
  swapFamily(repo, number, labels, 'status:', 'status:blocked');
  const agent = labels.find((l) => l.startsWith('agent:')) || 'agent:unknown';
  comment(repo, number, `⛔ **Blocked** — ${agent.replace('agent:', '')} at ${stamp()}.\n\nReason: ${args.reason}\n\nNext action needed from: ${args.needs || 'owner'}`);
  console.log(`${repo}#${number} -> status:blocked`);
} else if (cmd === 'board') {
  const json = gh(['issue', 'list', '--repo', repo, '--state', 'open', '--limit', '100',
    '--json', 'number,title,labels']);
  const rows = JSON.parse(json).map((i) => {
    const names = i.labels.map((l) => l.name);
    return {
      number: i.number,
      agent: (names.find((n) => n.startsWith('agent:')) || '—').replace('agent:', ''),
      status: (names.find((n) => n.startsWith('status:')) || '—').replace('status:', ''),
      title: i.title.slice(0, 60),
    };
  });
  console.table ? console.table(rows) : console.log(JSON.stringify(rows, null, 2));
} else {
  console.error('commands: claim | status | ready | block | board   (see header comment)');
  process.exit(2);
}
