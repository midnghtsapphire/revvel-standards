#!/usr/bin/env node
/**
 * Agent Self-Heal Harness
 *
 * Generates self-healing recovery packets when an agent (e.g., OpenRouter
 * weekly-research orchestrator) fails. Emits fallback routing labels and a
 * structured payload that downstream workflows can consume to keep WR moving.
 *
 * Usage:
 *   node scripts/agent-self-heal.js \
 *     --agent openrouter \
 *     --failure "403 from provider" \
 *     --context weekly-research \
 *     --issue 123
 */

'use strict';

const fs = require('fs');
const path = require('path');

const FALLBACK_MAP = {
  openrouter: {
    labels: ['agent:fallback', 'route:retry', 'needs-triage'],
    nextAgents: ['anthropic', 'openai', 'local-llm'],
  },
  anthropic: {
    labels: ['agent:fallback', 'route:retry'],
    nextAgents: ['openrouter', 'openai'],
  },
  openai: {
    labels: ['agent:fallback', 'route:retry'],
    nextAgents: ['openrouter', 'anthropic'],
  },
  default: {
    labels: ['agent:fallback', 'needs-triage'],
    nextAgents: ['orchestrator'],
  },
};

const CONTEXT_LABELS = {
  'weekly-research': ['weekly-research', 'wr:in-progress', 'deep-research'],
  wr: ['work-request', 'wr:in-progress'],
  'agent-factory': ['work-request', 'wr:in-progress', 'agent:fallback', 'route:retry'],
};

function parseArgs(argv) {
  const args = {
    agent: 'default',
    failure: '',
    context: '',
    issue: '',
    output: '',
  };
  for (let i = 2; i < argv.length; i += 1) {
    const a = argv[i];
    const next = argv[i + 1];
    if (a === '--agent' && next) { args.agent = next; i += 1; }
    else if (a === '--failure' && next) { args.failure = next; i += 1; }
    else if (a === '--context' && next) { args.context = next; i += 1; }
    else if (a === '--issue' && next) { args.issue = next; i += 1; }
    else if (a === '--output' && next) { args.output = next; i += 1; }
  }
  return args;
}

function buildPacket({ agent, failure, context, issue }) {
  const config = FALLBACK_MAP[agent] || FALLBACK_MAP.default;
  const ctxLabels = CONTEXT_LABELS[context] || [];
  const labels = Array.from(new Set([...ctxLabels, ...config.labels]));
  return {
    timestamp: new Date().toISOString(),
    agent,
    failure: failure || 'unspecified failure',
    context: context || 'unspecified',
    issue: issue || null,
    fallbackLabels: labels,
    nextAgents: config.nextAgents,
    recovery: {
      action: 'route-fallback',
      retry: true,
      maxRetries: 3,
    },
  };
}

function emit(packet, outputPath) {
  const payload = `${JSON.stringify(packet, null, 2)}\n`;
  if (outputPath) {
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, payload);
  }
  process.stdout.write(payload);
  // GitHub Actions outputs
  if (process.env.GITHUB_OUTPUT) {
    const lines = [
      `labels=${packet.fallbackLabels.join(',')}`,
      `next_agent=${packet.nextAgents[0] || ''}`,
      `retry=${packet.recovery.retry}`,
    ];
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `${lines.join('\n')}\n`);
  }
}

function main() {
  const args = parseArgs(process.argv);
  const packet = buildPacket(args);
  emit(packet, args.output);
}

module.exports = { buildPacket, FALLBACK_MAP, CONTEXT_LABELS };

if (require.main === module) {
  main();
}
