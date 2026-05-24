'use strict';

const assert = require('assert');
const { buildPacket, FALLBACK_MAP } = require('../scripts/agent-self-heal');

function testOpenRouterFallback() {
  const packet = buildPacket({
    agent: 'openrouter',
    failure: '403 provider',
    context: 'weekly-research',
    issue: '42',
  });
  assert.ok(packet.fallbackLabels.includes('weekly-research'));
  assert.ok(packet.fallbackLabels.includes('wr:in-progress'));
  assert.ok(packet.fallbackLabels.includes('agent:fallback'));
  assert.deepStrictEqual(packet.nextAgents, FALLBACK_MAP.openrouter.nextAgents);
  assert.strictEqual(packet.recovery.retry, true);
  console.log('ok openrouter fallback');
}

function testDefaultAgent() {
  const packet = buildPacket({ agent: 'unknown-agent', context: 'wr' });
  assert.ok(packet.fallbackLabels.includes('agent:fallback'));
  assert.ok(packet.fallbackLabels.includes('work-request'));
  console.log('ok default agent');
}

function testNoContext() {
  const packet = buildPacket({ agent: 'openai' });
  assert.strictEqual(packet.context, 'unspecified');
  assert.ok(packet.fallbackLabels.length > 0);
  console.log('ok no context');
}

testOpenRouterFallback();
testDefaultAgent();
testNoContext();

console.log('agent-self-heal: all tests passed');
