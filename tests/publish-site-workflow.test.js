#!/usr/bin/env node
'use strict';

/**
 * Guardrail tests for .github/workflows/publish-site.yml (WR #16213).
 *
 * The WR asked for:
 *   - name: Publish site
 *     uses: publish-site/action@v2
 *
 * These tests lock the complete, non-scaffold delivery:
 *   - workflow file exists and parses
 *   - step name is exactly "Publish site"
 *   - third-party action is SHA-pinned to the v2 commit (not a floating tag)
 *   - missing secrets skip (exit 0) instead of failing the default Pages path
 *   - permissions stay read-only (action only needs the checkout + SSH secrets)
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const WORKFLOW = path.resolve(__dirname, '..', '.github', 'workflows', 'publish-site.yml');
const V2_SHA = '87b4aac36b939dece84e413b179523af1c7c9d8b';

const raw = fs.readFileSync(WORKFLOW, 'utf8');

let doc;
try {
  // Prefer the `yaml` package used elsewhere; fall back to js-yaml.
  let parse;
  try {
    parse = require('yaml').parse;
  } catch {
    parse = require('js-yaml').load;
  }
  doc = parse(raw);
} catch (err) {
  throw new Error(`publish-site.yml failed to parse: ${err.message}`);
}

test('publish-site workflow file exists and has the expected name', () => {
  assert.equal(doc.name, 'Publish site');
});

test('publish-site triggers on main pushes and workflow_dispatch', () => {
  const on = doc.on || doc.true || doc[true];
  assert.ok(on, 'workflow must declare an on: block');
  assert.ok(on.push, 'must run on push');
  assert.ok(
    (on.push.branches || []).includes('main'),
    'push trigger must include main',
  );
  assert.ok(on.workflow_dispatch, 'must allow manual dispatch');
});

test('Publish site step uses publish-site/action pinned to the v2 commit SHA', () => {
  // Exact step name from the WR title (may appear as job name + step name).
  assert.match(raw, /^\s*-\s*name:\s*Publish site\s*$/m);

  // Only real workflow `uses:` lines count — header comments may mention @v2.
  const usesLines = raw
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('uses:'));

  const publishUses = usesLines.filter((line) =>
    line.includes('publish-site/action@'),
  );
  assert.equal(
    publishUses.length,
    1,
    `expected exactly one publish-site/action uses line, got: ${JSON.stringify(publishUses)}`,
  );

  // Floating tags are forbidden for this third-party action (supply-chain write
  // path via SSH). Must be the full 40-char SHA of the v2 tag, with a "# v2"
  // comment so humans can see which release the pin tracks.
  const pin = new RegExp(
    String.raw`^uses:\s*publish-site/action@${V2_SHA}\s*#\s*v2\s*$`,
  );
  assert.match(publishUses[0], pin);
});

test('missing secrets skip the publish step instead of failing the job', () => {
  assert.match(raw, /skip=true/);
  assert.match(raw, /steps\.verify\.outputs\.skip\s*!=\s*'true'/);
  assert.match(raw, /PUBLISH_SITE_URL/);
  assert.match(raw, /PUBLISH_SITE_PRIVKEY/);
  // Skip notice must mention the default Pages path so operators know
  // the public site still deploys when this optional lane is dark.
  assert.match(raw, /static\.yml/);
});

test('permissions are contents: read only', () => {
  assert.deepEqual(doc.permissions, { contents: 'read' });
});

test('job has a hard timeout and concurrency group', () => {
  const job = doc.jobs && doc.jobs.publish;
  assert.ok(job, 'jobs.publish must exist');
  assert.ok(
    Number(job['timeout-minutes']) > 0 && Number(job['timeout-minutes']) <= 30,
    'timeout-minutes must be set and <= 30',
  );
  assert.equal(doc.concurrency && doc.concurrency.group, 'publish-site');
  assert.equal(doc.concurrency['cancel-in-progress'], false);
});

test('publish directory rejects path traversal', () => {
  // The resolve step must reject absolute paths and ".." segments so a
  // misconfigured dir input cannot rsync outside the checkout.
  // Match the case arm itself — a bare /\.\./ would also hit unrelated text.
  assert.match(raw, /\/\*|~\*|\*"\.\."\*/);
  assert.match(raw, /relative path inside the repo/);
});
