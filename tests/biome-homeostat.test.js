'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const {
  assessKeyHealth,
  buildHomeostatSection,
  buildStatusBody,
  shouldTriggerRecovery,
  STATUS_MARKER,
  TRACKED_KEYS,
} = require('../scripts/biome/homeostat');

test('assessKeyHealth treats empty/whitespace/undefined as missing', () => {
  const env = { OPENROUTER_API_KEY: 'real', ANTHROPIC_API_KEY: '', PERPLEXITY_API_KEY: '   ' };
  const a = assessKeyHealth(env);
  assert.deepEqual(a.present, ['OPENROUTER_API_KEY']);
  assert.deepEqual(a.missing.sort(), ['ANTHROPIC_API_KEY', 'PERPLEXITY_API_KEY'].sort());
  assert.equal(a.aiLanesOffline, true);
});

test('assessKeyHealth all present -> lanes online', () => {
  const env = {};
  for (const k of TRACKED_KEYS) env[k] = 'x';
  const a = assessKeyHealth(env);
  assert.equal(a.aiLanesOffline, false);
  assert.equal(a.missing.length, 0);
});

test('homeostat section stays healthy even when AI lanes are offline (credit-free by design)', () => {
  const a = assessKeyHealth({}); // all missing
  const section = buildHomeostatSection(a);
  assert.equal(section.status, 'healthy');
  assert.equal(section.detail.ai_lanes, 'offline');
  assert.match(section.summary, /rule-based/);
});

test('status body carries dedupe marker and reassures (not an outage)', () => {
  const a = assessKeyHealth({});
  const body = buildStatusBody(a, '2026-06-30T00:00:00Z');
  assert.ok(body.includes(STATUS_MARKER));
  assert.match(body, /not\*\* an outage|not.*outage/i);
});

test('shouldTriggerRecovery: only when AI lanes offline AND opt-in flag enabled', () => {
  const offline = { aiLanesOffline: true };
  const online = { aiLanesOffline: false };
  assert.equal(shouldTriggerRecovery(offline, { BIOME_RECOVER_KEYS: 'true' }), true);
  assert.equal(shouldTriggerRecovery(offline, { BIOME_RECOVER_KEYS: 'false' }), false);
  assert.equal(shouldTriggerRecovery(offline, {}), false); // flag absent => off by default
  assert.equal(shouldTriggerRecovery(online, { BIOME_RECOVER_KEYS: 'true' }), false);
});
