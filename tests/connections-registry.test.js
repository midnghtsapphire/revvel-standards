'use strict';

const test = require('node:test');
const assert = require('node:assert');
const path = require('path');

const reg = require('../scripts/connections-registry');

const sampleDoc = {
  meta: { owner: 'x', updated: '2026-06-13' },
  connections: [
    { id: 'openrouter', name: 'OpenRouter', type: 'agent', auth: 'key', status: 'verified', access: ['code-gen'], connects_to: ['github'] },
    { id: 'mcp-notion', name: 'Notion MCP', type: 'mcp', auth: 'oauth', status: 'verified', access: ['pages'] },
    { id: 'vade', name: 'VADE', type: 'agent', auth: 'unknown', status: 'unverified', note: 'wire it in' },
  ],
};

test('the real config/connections.yml loads and is non-empty', () => {
  const doc = reg.load(path.join(__dirname, '../config/connections.yml'));
  assert.ok(doc.connections.length > 10);
  assert.ok(doc.connections.every((c) => c.id && c.type && c.status));
});

test('groupByType buckets entries', () => {
  const g = reg.groupByType(sampleDoc.connections);
  assert.equal(g.get('agent').length, 2);
  assert.equal(g.get('mcp').length, 1);
});

test('markdown render shows counts and flags unverified', () => {
  const md = reg.renderMarkdown(sampleDoc);
  assert.match(md, /\*\*3\*\* connections/);
  assert.match(md, /2\*\* verified/);
  assert.match(md, /⚠️ unverified/);
  assert.match(md, /do not edit by hand/);
});

test('injectReadme replaces only the marked block', () => {
  const readme = `top\n${reg.BEGIN}\nOLD\n${reg.END}\nbottom`;
  const next = reg.injectReadme(readme, `${reg.BEGIN}\nNEW\n${reg.END}`);
  assert.match(next, /NEW/);
  assert.doesNotMatch(next, /OLD/);
  assert.match(next, /^top/);
  assert.match(next, /bottom$/);
});

test('drift flags repo inventory missing from the registry', () => {
  const missing = reg.detectDrift(sampleDoc, [
    { key: 'openrouter', source: '.env.example' }, // known
    { key: 'mystery', source: '.env.example' }, // unknown -> drift
  ]);
  assert.equal(missing.length, 1);
  assert.equal(missing[0].key, 'mystery');
});

test('the shipped registry has no drift against the repo .env.example', () => {
  const doc = reg.load(path.join(__dirname, '../config/connections.yml'));
  const missing = reg.detectDrift(doc, reg.scanRepoInventory());
  assert.deepEqual(missing, [], `unexpected drift: ${missing.map((m) => m.key).join(', ')}`);
});

test('html dashboard embeds the data and filter controls', () => {
  const html = reg.renderHtml(sampleDoc);
  assert.match(html, /Connections Dashboard/);
  assert.match(html, /const DATA = \[/);
  assert.match(html, /vade/);
});
