#!/usr/bin/env node
'use strict';

/**
 * Regression tests for WR #16270 — Markdown Image Alt-text Checker.
 *
 * Covers:
 *   - local scanner detects `![](url)` and ignores proper `![alt](url)`
 *   - workflow wires the marketplace action at the pinned v1 SHA
 *   - workflow keeps the local script as the PR-blocking gate
 *   - third-party action is registered for the freshness audit disposition
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { execFileSync } = require('node:child_process');
const yaml = require('yaml');

const root = path.resolve(__dirname, '..');
const scriptPath = path.join(root, 'scripts/markdown-image-alt-text-checker.js');
const workflowPath = path.join(root, '.github/workflows/markdown-image-alt-text-checker.yml');
const auditScriptPath = path.join(root, 'scripts/audit-third-party-actions.sh');

const {
  checkMarkdownImageAlt,
  findEmptyAltInContent,
} = require(scriptPath);

const PINNED_SHA = 'a30c7afd02e2af7048f4e84f06e2f422052e2153';
const ACTION_REF = `ruthtxh/markdown-image-alt-text-checker@${PINNED_SHA}`;

// ── unit: scanner ───────────────────────────────────────────────────────────

test('findEmptyAltInContent flags empty alt and ignores filled alt', () => {
  const content = [
    '# Title',
    '',
    'Good: ![a cat sitting on a laptop](https://example.com/cat.png)',
    'Bad: ![](https://example.com/missing.png)',
    'Also bad: inline ![](./local.jpg) text',
    'Not an image: [link](https://example.com)',
    '',
    '```markdown',
    '![](https://example.com/in-fence.png)',
    '```',
    '',
  ].join('\n');

  const hits = findEmptyAltInContent('demo.md', content);
  assert.equal(hits.length, 2);
  assert.equal(hits[0].line, 4);
  assert.equal(hits[0].url, 'https://example.com/missing.png');
  assert.equal(hits[1].line, 5);
  assert.equal(hits[1].url, './local.jpg');
});

test('checkMarkdownImageAlt returns ok for clean files', () => {
  const result = checkMarkdownImageAlt({
    root: '/tmp',
    files: [
      {
        path: 'ok.md',
        content: '![diagram of the pipeline](./pipe.png)\n',
      },
    ],
  });
  assert.equal(result.ok, true);
  assert.equal(result.findings.length, 0);
  assert.equal(result.scanned, 1);
});

test('checkMarkdownImageAlt fails when any empty-alt image is present', () => {
  const result = checkMarkdownImageAlt({
    root: '/tmp',
    files: [
      { path: 'a.md', content: '![ok](a.png)\n' },
      { path: 'b.md', content: 'intro\n![](b.png)\n' },
    ],
  });
  assert.equal(result.ok, false);
  assert.equal(result.findings.length, 1);
  assert.equal(result.findings[0].file, 'b.md');
  assert.equal(result.findings[0].url, 'b.png');
});

test('CLI exits 0 on a clean tree and 1 when empty alt is present', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'md-alt-'));
  try {
    fs.writeFileSync(path.join(dir, 'clean.md'), '![ok alt](x.png)\n');
    execFileSync(process.execPath, [scriptPath], {
      cwd: dir,
      env: { ...process.env, ROOT: dir },
      encoding: 'utf8',
    });

    fs.writeFileSync(path.join(dir, 'dirty.md'), '![](y.png)\n');
    let threw = false;
    try {
      execFileSync(process.execPath, [scriptPath], {
        cwd: dir,
        env: { ...process.env, ROOT: dir },
        encoding: 'utf8',
      });
    } catch (err) {
      threw = true;
      assert.equal(err.status, 1);
      assert.match(String(err.stdout || ''), /Missing alt-text/);
    }
    assert.equal(threw, true, 'CLI must exit non-zero on empty alt');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// ── workflow wiring ─────────────────────────────────────────────────────────

test('workflow file exists and parses', () => {
  assert.ok(fs.existsSync(workflowPath), 'expected workflow file');
  const raw = fs.readFileSync(workflowPath, 'utf8');
  const doc = yaml.parse(raw);
  assert.equal(doc.name, 'Markdown Image Alt-text Checker');
  assert.ok(doc.on.pull_request, 'must run on pull_request');
  assert.ok(doc.on.push, 'must run on push');
  assert.ok(doc.on.workflow_dispatch !== undefined, 'must support workflow_dispatch');
  assert.deepEqual(doc.permissions, { contents: 'read', checks: 'write' });
});

test('workflow pins every third-party action to a full commit SHA', () => {
  const raw = fs.readFileSync(workflowPath, 'utf8');
  assert.match(
    raw,
    new RegExp(
      `uses:\\s*ruthtxh/markdown-image-alt-text-checker@${PINNED_SHA}`
    ),
    `expected pinned uses: ${ACTION_REF}`
  );
  // CLAUDE.md gotcha #8: no floating tags on live uses: lines.
  const usesLines = raw.split('\n').filter((l) => /^\s*uses:\s*/.test(l));
  assert.ok(usesLines.length >= 3, 'checkout + setup-node + marketplace');
  for (const line of usesLines) {
    assert.match(
      line,
      /uses:\s*[\w.-]+\/[\w.-]+@[0-9a-f]{40}\b/,
      `unpinned action: ${line.trim()}`
    );
  }
});

test('workflow keeps local script as the PR gate and marketplace on dispatch', () => {
  const raw = fs.readFileSync(workflowPath, 'utf8');
  const doc = yaml.parse(raw);
  const steps = doc.jobs.check.steps;
  const local = steps.find((s) => s.name && /Local markdown image alt-text scan/i.test(s.name));
  const market = steps.find(
    (s) => s.uses && s.uses.startsWith('ruthtxh/markdown-image-alt-text-checker@')
  );
  assert.ok(local, 'local scan step required');
  assert.match(local.run, /markdown-image-alt-text-checker\.js/);
  assert.ok(market, 'marketplace action step required by WR #16270');
  assert.equal(
    market.if,
    "github.event_name == 'workflow_dispatch'",
    'marketplace API walk must stay dispatch-only on this monorepo'
  );
  assert.equal(market.with.owner, '${{ github.repository_owner }}');
  assert.equal(market.with.repo, '${{ github.event.repository.name }}');
  assert.equal(market.with.token, '${{ secrets.GITHUB_TOKEN }}');
  assert.ok(doc.jobs.check['timeout-minutes'] <= 15);
});

test('third-party audit lists the action as an accepted single-author pin', () => {
  // Disposition per docs/THIRD_PARTY_ACTION_AUDIT.md: pin SHA + accept the
  // exact owner/repo so the quarterly audit does not re-open a WR every run.
  const audit = fs.readFileSync(auditScriptPath, 'utf8');
  assert.match(
    audit,
    /ruthtxh\/markdown-image-alt-text-checker/,
    'add exact action to ACCEPTED_SINGLE_AUTHOR_ACTIONS'
  );
});
