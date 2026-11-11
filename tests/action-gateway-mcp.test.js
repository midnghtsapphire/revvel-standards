'use strict';

/**
 * WRs #18288 and #18290 register one DigitalOcean action-gateway endpoint
 * for Claude (HTTP transport in .mcp.json) and Codex (url in .codex/config.toml).
 * The URL is public on those issues. Auth is `claude mcp login`, so this
 * test fails if a token, header, or env secret is added beside the URL.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const ENDPOINT = 'https://actions.do-ai.run/mcp/endpoint/158ed24e-cf7e-4f82-b37b-74abd1c5691a';
const CLAUDE_ADD = 'claude mcp add --transport http action-gateway "' + ENDPOINT + '"';
const CLAUDE_LOGIN = 'claude mcp login action-gateway';
const CODEX_ADD = 'codex mcp add action-gateway --url "' + ENDPOINT + '"';

test('Claude .mcp.json registers action-gateway as HTTP with the public URL and no secret', () => {
  const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, '.mcp.json'), 'utf8'));
  const entry = cfg.mcpServers && cfg.mcpServers['action-gateway'];
  assert.ok(entry, 'action-gateway missing from .mcp.json');
  assert.equal(entry.type, 'http');
  assert.equal(entry.url, ENDPOINT);
  assert.equal(entry.disabled, undefined);
  // Auth stays on the operator machine. A warning comment may name the words
  // "token" and "Authorization"; the entry itself must not carry those fields.
  const keys = Object.keys(entry).sort();
  assert.deepEqual(keys, ['_comment', 'type', 'url']);
  assert.equal(entry.env, undefined);
  assert.equal(entry.headers, undefined);
});

test('Codex .codex/config.toml registers action-gateway by url and no secret', () => {
  const toml = fs.readFileSync(path.join(ROOT, '.codex/config.toml'), 'utf8');
  assert.match(toml, /\[mcp_servers\.action-gateway\]/);
  assert.match(toml, new RegExp('url = "' + ENDPOINT.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '"'));
  const assignments = toml
    .split('\n')
    .filter((line) => line.trim() && !line.trim().startsWith('#'))
    .filter((line) => !line.trim().startsWith('['));
  assert.deepEqual(assignments, ['url = "' + ENDPOINT + '"']);
});

test('existing MCP docs include the Claude login step and both client commands', () => {
  const catalog = fs.readFileSync(path.join(ROOT, 'docs/MCP_REVVEL_CATALOG.md'), 'utf8');
  const standard = fs.readFileSync(path.join(ROOT, 'docs/Master_Inventory/MCP_STANDARD.md'), 'utf8');
  for (const doc of [catalog, standard]) {
    assert.ok(doc.includes(CLAUDE_ADD), 'missing Claude add command');
    assert.ok(doc.includes(CLAUDE_LOGIN), 'missing Claude login step');
    assert.ok(doc.includes(CODEX_ADD), 'missing Codex add command');
  }
});
