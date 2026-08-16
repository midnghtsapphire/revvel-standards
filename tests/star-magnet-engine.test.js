'use strict';

/**
 * Regression tests for the self-optimizing star magnet automation bundle.
 * Guards script presence, offline markdown generation, and hourly workflow shape.
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawnSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..');
const SCRIPT = path.join(ROOT, 'prioritize_and_optimize.py');
const WORKFLOW = path.join(
  ROOT,
  '.github',
  'workflows',
  'hourly-growth-prioritizer.yml',
);
const PRODUCT_ENGINE = path.join(
  ROOT,
  'products',
  'self-optimizing-star-magnet',
  'app',
  'data',
  'engine.ts',
);

test('star magnet product engine module exists', () => {
  assert.ok(fs.existsSync(PRODUCT_ENGINE));
  const src = fs.readFileSync(PRODUCT_ENGINE, 'utf8');
  assert.match(src, /export function calculatePriorityScore/);
  assert.match(src, /export function generatePrioritizedMarkdown/);
  assert.match(src, /export function mergeDiscoveryTopics/);
  assert.match(src, /TRENDING_TOPICS/);
});

test('prioritize_and_optimize.py ships with scoring + opt-in topics', () => {
  assert.ok(fs.existsSync(SCRIPT));
  const src = fs.readFileSync(SCRIPT, 'utf8');
  assert.match(src, /def calculate_priority_score/);
  assert.match(src, /def generate_markdown/);
  assert.match(src, /ENABLE_TOPIC_UPDATES/);
  assert.match(src, /PRIORITIZED_STARS\.md/);
  assert.match(src, /star to stay updated/i);
});

test('hourly growth workflow is scheduled, concurrent, and SHA-pinned', () => {
  const yml = fs.readFileSync(WORKFLOW, 'utf8');
  assert.match(yml, /^name:\s*Hourly Star Growth & Prioritization Engine/m);
  assert.match(yml, /cron:\s*["']0 \* \* \* \*["']/);
  assert.match(yml, /group:\s*hourly-star-growth/);
  assert.match(yml, /prioritize_and_optimize\.py/);
  assert.match(yml, /\[skip ci\]/);
  // third-party / core actions must not use floating tags only
  assert.doesNotMatch(yml, /uses:\s*actions\/checkout@v\d+\s*$/m);
  assert.doesNotMatch(yml, /uses:\s*actions\/setup-python@v\d+\s*$/m);
  assert.doesNotMatch(yml, /uses:\s*stefanzweifel\/git-auto-commit-action@v\d+\s*$/m);
  assert.match(yml, /uses:\s*actions\/checkout@[0-9a-f]{40}/);
  assert.match(yml, /uses:\s*actions\/setup-python@[0-9a-f]{40}/);
  assert.match(yml, /uses:\s*stefanzweifel\/git-auto-commit-action@[0-9a-f]{40}/);
});

test('offline engine writes PRIORITIZED_STARS.md from cached state', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'star-magnet-'));
  const statePath = path.join(tmp, 'stars_state.json');
  const outPath = path.join(tmp, 'PRIORITIZED_STARS.md');
  const now = new Date();
  const recent = new Date(now.getTime() - 2 * 86400000).toISOString();
  const stale = new Date(now.getTime() - 400 * 86400000).toISOString();

  fs.writeFileSync(
    statePath,
    JSON.stringify({
      cursor: null,
      has_next: false,
      repos: {
        'acme/fresh': {
          nameWithOwner: 'acme/fresh',
          url: 'https://github.com/acme/fresh',
          stargazerCount: 500,
          pushedAt: recent,
          starredAt: recent,
          primaryLanguage: { name: 'TypeScript' },
          releases: { nodes: [{ createdAt: recent }] },
          repositoryTopics: { nodes: [{ topic: { name: 'mcp' } }] },
        },
        'acme/stale': {
          nameWithOwner: 'acme/stale',
          url: 'https://github.com/acme/stale',
          stargazerCount: 500,
          pushedAt: stale,
          starredAt: stale,
          primaryLanguage: { name: 'Go' },
          releases: { nodes: [] },
          repositoryTopics: { nodes: [] },
        },
      },
    }),
    'utf8',
  );

  const result = spawnSync('python3', [SCRIPT], {
    env: {
      ...process.env,
      STAR_MAGNET_OFFLINE: '1',
      STAR_MAGNET_STATE_FILE: statePath,
      STAR_MAGNET_OUTPUT_FILE: outPath,
      ENABLE_TOPIC_UPDATES: 'false',
      // ensure we do not accidentally hit the network
      GH_PAT: '',
      GITHUB_TOKEN: '',
    },
    encoding: 'utf8',
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.ok(fs.existsSync(outPath), 'markdown output missing');
  const md = fs.readFileSync(outPath, 'utf8');
  assert.match(md, /Prioritized & Trending Open-Source Index/);
  assert.match(md, /acme\/fresh/);
  assert.match(md, /Give this repository a ⭐ star/);
  // fresh repo should appear before stale in the ranked table
  assert.ok(md.indexOf('acme/fresh') < md.indexOf('acme/stale'));
});
