'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
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

test('fallback block renders the ordered chain from meta', () => {
  const doc = {
    meta: {
      fallback_chain: [
        { id: 'openrouter', role: 'orchestrator', note: 'routes recursively' },
        { id: 'openhands', role: 'free fallback', note: 'autonomy' },
      ],
      fallback_retired: [{ id: 'cursor', note: 'removed #14539' }],
    },
    connections: [],
  };
  const block = reg.renderFallbackBlock(doc);
  assert.match(block, /1\. \*\*openrouter\*\*/);
  assert.match(block, /2\. \*\*openhands\*\*/);
  assert.match(block, /recursively/);
  assert.match(block, /Retired:.*cursor/);
});

test('injectReadme targets a specific marker pair and no-ops when absent', () => {
  const readme = `a\n${reg.FB_BEGIN}\nOLD\n${reg.FB_END}\nb`;
  const next = reg.injectReadme(readme, `${reg.FB_BEGIN}\nNEW\n${reg.FB_END}`, reg.FB_BEGIN, reg.FB_END);
  assert.match(next, /NEW/);
  assert.doesNotMatch(next, /OLD/);
  // absent markers -> unchanged
  assert.equal(reg.injectReadme('no markers', 'x', reg.FB_BEGIN, reg.FB_END), 'no markers');
});

test('SSOT defines a fallback chain', () => {
  const doc = reg.load(path.join(__dirname, '../config/connections.yml'));
  assert.ok((doc.meta.fallback_chain || []).length >= 2, 'SSOT must define a fallback chain');
});

test('html dashboard embeds the data and filter controls', () => {
  const html = reg.renderHtml(sampleDoc);
  assert.match(html, /Connections Dashboard/);
  assert.match(html, /const DATA = \[/);
  assert.match(html, /vade/);
});

test('markdown notes autolink bare URLs (MD034) and escape pipes', () => {
  // Regression: docs/CONNECTIONS_REGISTRY.md is generated, and CircleCI's
  // lint-and-test gate lints *changed* Markdown. A single bare URL typed into
  // a note in config/connections.yml therefore turned the generated file red
  // on every PR that regenerated it, reporting the error against the generated
  // file rather than the note that caused it. Two live notes did exactly that
  // (mergeme.dev and a vercel.com support link) and failed PR #17701.
  const doc = {
    meta: { fallback_chain: ['a', 'b'] },
    connections: [
      {
        id: 'x',
        name: 'X',
        type: 'app',
        auth: 'free',
        status: 'verified',
        note: 'see https://example.com/page for details',
      },
      {
        id: 'y',
        name: 'Y',
        type: 'app',
        auth: 'free',
        status: 'verified',
        note: 'already <https://ok.example> and [linked](https://l.example) and a|pipe',
      },
    ],
  };
  const md = reg.renderMarkdown(doc);

  assert.match(md, /<https:\/\/example\.com\/page>/, 'bare URL must be autolinked');
  assert.doesNotMatch(md, /[^<(]https:\/\/example\.com\/page/, 'no bare form may survive');

  // Already-safe forms must not be double-wrapped.
  assert.doesNotMatch(md, /<<https/, 'must not double-wrap an existing autolink');
  assert.doesNotMatch(md, /\(<https:\/\/l\.example>\)/, 'must not wrap a markdown link target');

  // Pipes still escaped, or the cell ends early.
  assert.match(md, /a\\\|pipe/);
});

test('the committed CONNECTIONS_REGISTRY.md has no bare URLs', () => {
  // Deliberately reads the file ON DISK rather than re-rendering it. Rendering
  // would pass through mdNote(), which is the thing doing the fixing — so a
  // render-based assertion is tautological and can never fail. The invariant
  // that actually matters is that the *committed* generated file is clean,
  // which also catches a hand-edit or a regeneration someone forgot to commit.
  const md = fs.readFileSync(
    path.join(__dirname, '../docs/CONNECTIONS_REGISTRY.md'),
    'utf8'
  );
  const bare = md
    .split('\n')
    .filter((l) => l.startsWith('|'))
    .map((l) => l.replace(/\[[^\]]*\]\([^)]*\)/g, '').replace(/<https?:\/\/[^>]*>/g, ''))
    .filter((l) => /https?:\/\//.test(l));
  assert.deepEqual(
    bare.map((l) => l.slice(0, 70)),
    [],
    'bare URLs in the committed registry fail MD034 in the CircleCI gate'
  );
});
