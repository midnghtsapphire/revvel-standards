#!/usr/bin/env node
'use strict';

/**
 * WR-16450 — every workflow must declare a least-privilege `permissions:` block
 * (workflow-level and/or job-level), and known write-API consumers must grant
 * the matching write scope so they do not 403 silently.
 */

const fs = require('fs');
const path = require('path');
const { describe, test } = require('node:test');
const assert = require('node:assert/strict');

const WORKFLOWS_DIR = path.join(__dirname, '..', '.github', 'workflows');

function listWorkflowFiles(dir = WORKFLOWS_DIR) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...listWorkflowFiles(full));
      continue;
    }
    if (/\.ya?ml$/i.test(entry.name)) out.push(full);
  }
  return out.sort();
}

function hasPermissionsBlock(content) {
  // Top-level or job-level `permissions:` key (2–6 spaces of indent for jobs).
  return /(?:^|\n) {0,6}permissions:\s*$/m.test(content);
}

describe('workflow permissions (WR-16450)', () => {
  const files = listWorkflowFiles();

  test('discovers the workflow fleet', () => {
    assert.ok(files.length >= 50, `expected many workflows, found ${files.length}`);
  });

  test('every workflow file declares a permissions block', () => {
    const missing = files.filter((f) => {
      const content = fs.readFileSync(f, 'utf8');
      return !hasPermissionsBlock(content);
    });
    assert.deepEqual(
      missing.map((f) => path.relative(path.join(__dirname, '..'), f)),
      [],
      'workflows missing permissions: block'
    );
  });

  test('ship-to-market deliver-mobile grants actions: write for createWorkflowDispatch', () => {
    const content = fs.readFileSync(
      path.join(WORKFLOWS_DIR, 'ship-to-market.yml'),
      'utf8'
    );
    assert.match(content, /createWorkflowDispatch/);
    // Slice from deliver-mobile: to the next sibling job key (2-space indent +
    // word + colon at line start) so long comments/env blocks cannot push
    // `actions: write` past a fixed byte budget.
    const mobileIdx = content.indexOf('deliver-mobile:');
    assert.ok(mobileIdx >= 0, 'deliver-mobile job missing');
    const after = content.slice(mobileIdx + 'deliver-mobile:'.length);
    const nextJob = after.search(/\n  [A-Za-z0-9_-]+:\s*(?:#.*)?\n/);
    const slice = nextJob >= 0 ? after.slice(0, nextJob) : after;
    assert.match(slice, /permissions:\s*\n(?:[ \t]+[a-z-]+:[ \t]*[a-z]+\s*\n)*[ \t]+actions:\s*write/);
  });

  test('conflict-helper grants issues: write for gh issue edit labeling', () => {
    const content = fs.readFileSync(
      path.join(WORKFLOWS_DIR, 'conflict-helper.yml'),
      'utf8'
    );
    assert.match(content, /gh issue edit/);
    assert.match(content, /issues:\s*write/);
  });

  test('previously bare workflows now declare contents: read', () => {
    const bare = [
      'free-llm-router.yml',
      'daily-news-briefing.yml',
      'news-with-cache.yml',
      'ui-audit-logger.yml',
      path.join('cron', 'api-monitor.yml'),
      path.join('cron', 'health-check.yml'),
      path.join('cron', 'link-checker.yml'),
      'saml-sso-registration.yml',
    ];
    for (const rel of bare) {
      const content = fs.readFileSync(path.join(WORKFLOWS_DIR, rel), 'utf8');
      assert.match(
        content,
        /permissions:\s*\n[ \t]+contents:\s*read/,
        `${rel} must declare contents: read`
      );
    }
  });
});
