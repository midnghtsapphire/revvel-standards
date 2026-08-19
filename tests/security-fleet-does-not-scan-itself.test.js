#!/usr/bin/env node
'use strict';

// The security-fleet event lane was filing issues about its own issues.
//
// Every finding it files renders the excerpt into the new issue's body:
//
//   - `exfil-directive`: upload-sarif`, with fallbacks for missing secrets
//
// and that line re-matches the very detector that produced it — @sentinel's
// `exfil-directive` rule is /\b(upload)\b[^.\n]{0,60}\b(secrets?)\b/i. The
// workflow triggers on `issues: [opened, edited]` with no exclusion for its own
// output, so filing one raised a new `issues: opened` event, which scanned the
// new issue, which matched, which filed another.
//
// Observed on this repo: #17546 -> #17709 -> #17713, each labelled priority-p0,
// each a false positive, and the chain had no natural end.
//
// The dedup already in the workflow cannot stop it. Its key is
// `[security-fleet] finding on #<subject>` and the subject is a different issue
// number at every link, so each new one looks unseen.
//
// Two assertions: the workflow must exclude its own issues, and the excerpt it
// writes must still be shown to re-trigger the detector — because the day that
// stops being true is the day someone deletes the guard as unnecessary.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const YAML = require('yaml');

const { scanPromptInjection } = require('../scripts/security-fleet.js');

const repoRoot = path.resolve(__dirname, '..');
const workflowPath = path.join(repoRoot, '.github/workflows/security-fleet.yml');

test('the event lane refuses to scan issues the fleet itself filed', () => {
  const doc = YAML.parse(fs.readFileSync(workflowPath, 'utf8'));
  const lane = doc.jobs['event-lane'];
  assert.ok(lane, 'event-lane job is missing');

  const condition = String(lane.if || '').replace(/\s+/g, ' ');
  assert.match(
    condition,
    /!contains\(\s*github\.event\.issue\.labels\.\*\.name,\s*'security-fleet'\s*\)/,
    'the event lane must skip issues carrying the security-fleet label, or it ' +
      'will scan its own output and file a new issue for every issue it files',
  );

  // The guard must not accidentally switch the lane off for pull requests,
  // where github.event.issue is null and the label check is meaningless.
  assert.match(
    condition,
    /github\.event_name == 'pull_request'/,
    'pull_request events must still reach the lane',
  );
});

test('a filed finding body still re-triggers the detector it came from', () => {
  // This is the mechanism, reproduced. If this ever stops matching, the loop is
  // gone for a different reason and the guard above deserves a fresh look —
  // but until then, removing the guard restores the chain.
  const filedBody = [
    '[security-fleet] finding on #17709',
    '',
    'Automated finding from the `security-fleet` event lane (`scripts/security-fleet.js`).',
    '',
    'Source: https://github.com/midnghtsapphire/revvel-standards/issues/17709',
    '',
    '**@sentinel** (1 finding(s)):',
    '- `exfil-directive`: upload-sarif`, with fallbacks for missing secrets',
    '',
    'Report-only — a human must confirm before any action.',
  ].join('\n');

  const findings = scanPromptInjection(filedBody);
  assert.ok(
    findings.length > 0,
    'the rendered finding body no longer matches any detector — see comment',
  );
  assert.ok(
    findings.some((f) => JSON.stringify(f).includes('exfil-directive')),
    'expected the exfil-directive rule to match the body it wrote',
  );
});

test('the dedup key alone cannot break the chain', () => {
  // Documented so nobody "fixes" this by tightening dedup instead: the key
  // embeds the subject number, which is new at every link.
  const raw = fs.readFileSync(workflowPath, 'utf8');
  assert.match(
    raw,
    /finding on \$\{subject\}/,
    'dedup title format changed — re-check whether it is still subject-scoped',
  );
});
