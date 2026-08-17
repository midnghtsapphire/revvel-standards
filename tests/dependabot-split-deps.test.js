'use strict';

/**
 * Regression vaccine for formal structural_conflict on PR #16791 / issue #16950.
 *
 * Path A (winner): split-deps-per-directory
 * Path B (loser):  dependabot-group-bump across many directories (npm_and_yarn)
 *
 * These tests would have failed on the pre-fix multi-directory group config
 * and must stay green so Dependabot cannot reintroduce cross-directory bumps.
 */

const fs = require('node:fs');
const path = require('node:path');
const { describe, test } = require('node:test');
const assert = require('node:assert/strict');

const {
  checkDependabotSplitDeps,
  FORBIDDEN_GROUP_NAMES,
} = require('../scripts/check-dependabot-split-deps');

const ROOT = path.join(__dirname, '..');
const LIVE_CONFIG = path.join(ROOT, '.github', 'dependabot.yml');
const FORMAL_RERUN = path.join(
  ROOT,
  'artifacts',
  'formal',
  'formal-report-16791-rerun.json',
);
const SCORECARD_EVENT = path.join(
  ROOT,
  'wr',
  'memory',
  'agent-scorecard.jsonl',
);

const DIRECTORIES_FROM_16791 = [
  '/',
  '/docs/marketplace-relister',
  '/products/affiliate-hub',
  '/products/ai-ad-generator',
  '/products/cli-engine',
  '/products/fda-design-controls',
  '/products/life-insurance-lead-engine/build',
  '/products/music-video-creator',
  '/products/prompt-generation-app',
  '/products/revvel-skill-runner',
];

describe('dependabot split-deps-per-directory (formal path A)', () => {
  test('live .github/dependabot.yml passes the split-deps checker', () => {
    const text = fs.readFileSync(LIVE_CONFIG, 'utf8');
    const result = checkDependabotSplitDeps(text, LIVE_CONFIG);
    assert.equal(
      result.ok,
      true,
      result.findings.map((f) => f.message).join('\n'),
    );
    assert.ok(result.entries >= 2, 'expected at least actions + root npm');
  });

  test('live config covers the 10 directories from rejected PR #16791', () => {
    const text = fs.readFileSync(LIVE_CONFIG, 'utf8');
    const YAML = require('yaml');
    const doc = YAML.parse(text);
    const dirs = new Set(
      (doc.updates || [])
        .filter((u) => u['package-ecosystem'] === 'npm')
        .map((u) => u.directory),
    );
    for (const d of DIRECTORIES_FROM_16791) {
      assert.ok(dirs.has(d), `missing npm directory entry for ${d}`);
    }
  });

  test('live config never uses directories: plural or npm_and_yarn group', () => {
    const text = fs.readFileSync(LIVE_CONFIG, 'utf8');
    assert.doesNotMatch(text, /^\s*directories\s*:/m);
    for (const bad of FORBIDDEN_GROUP_NAMES) {
      const re = new RegExp(`^\\s*${bad.replace(/[-_]/g, '[-_]')}\\s*:`, 'im');
      assert.doesNotMatch(text, re, `forbidden group ${bad} present`);
    }
  });

  test('checker rejects directories: (plural) multi-dir entry', () => {
    const bad = `
version: 2
updates:
  - package-ecosystem: npm
    directories:
      - "/"
      - "/products/affiliate-hub"
    groups:
      everything:
        patterns: ["*"]
`;
    const result = checkDependabotSplitDeps(bad, 'fixture.yml');
    assert.equal(result.ok, false);
    assert.ok(
      result.findings.some((f) => f.rule === 'no-directories-plural'),
      JSON.stringify(result.findings),
    );
  });

  test('checker rejects shared group name across directories (path B)', () => {
    const bad = `
version: 2
updates:
  - package-ecosystem: npm
    directory: "/"
    groups:
      npm_and_yarn:
        patterns: ["*"]
  - package-ecosystem: npm
    directory: "/products/affiliate-hub"
    groups:
      npm_and_yarn:
        patterns: ["*"]
`;
    const result = checkDependabotSplitDeps(bad, 'fixture.yml');
    assert.equal(result.ok, false);
    const rules = new Set(result.findings.map((f) => f.rule));
    assert.ok(rules.has('forbidden-group-name'), JSON.stringify(result.findings));
    assert.ok(
      rules.has('unique-group-per-directory'),
      JSON.stringify(result.findings),
    );
  });

  test('checker accepts directory-scoped unique groups (path A)', () => {
    const good = `
version: 2
updates:
  - package-ecosystem: npm
    directory: "/"
    groups:
      root-tooling-patch-minor:
        update-types: ["minor", "patch"]
  - package-ecosystem: npm
    directory: "/products/affiliate-hub"
    groups:
      affiliate-hub-patch-minor:
        update-types: ["minor", "patch"]
`;
    const result = checkDependabotSplitDeps(good, 'fixture.yml');
    assert.equal(result.ok, true, JSON.stringify(result.findings));
  });

  test('checker flags shared groups across directories:-only entries', () => {
    const bad = `
version: 2
updates:
  - package-ecosystem: npm
    directories: ["/", "/a"]
    groups:
      shared-group:
        patterns: ["*"]
  - package-ecosystem: npm
    directories: ["/b", "/c"]
    groups:
      shared-group:
        patterns: ["*"]
`;
    const result = checkDependabotSplitDeps(bad, 'fixture.yml');
    assert.equal(result.ok, false);
    assert.ok(
      result.findings.some((f) => f.rule === 'unique-group-per-directory'),
      JSON.stringify(result.findings),
    );
    assert.ok(
      result.findings.some((f) => f.rule === 'no-directories-plural'),
      JSON.stringify(result.findings),
    );
  });
});

describe('formal re-run + scorecard event for #16950', () => {
  test('formal-report-16791-rerun.json records pass on path A', () => {
    assert.ok(fs.existsSync(FORMAL_RERUN), `missing ${FORMAL_RERUN}`);
    const report = JSON.parse(fs.readFileSync(FORMAL_RERUN, 'utf8'));
    assert.equal(report.method, 'boolean_xor_dual_path');
    assert.equal(report.repo, 'midnghtsapphire/revvel-standards');
    const audit = (report.audits || []).find(
      (a) => Number(a.pr_number) === 16791 || a.issue_number === 16950,
    );
    assert.ok(audit, 'expected audit for PR 16791 / issue 16950');
    assert.equal(audit.verdict, 'pass');
    assert.equal(audit.winner, 'a');
    assert.equal(audit.chosen_path, 'split-deps-per-directory');
    assert.ok(
      Number(audit.agreement_bps) >= 9000,
      `agreement_bps too low: ${audit.agreement_bps}`,
    );
    assert.match(String(audit.rationale || ''), /split-deps-per-directory/);
  });

  test('scorecard event logged for formal resolution', () => {
    assert.ok(fs.existsSync(SCORECARD_EVENT), `missing ${SCORECARD_EVENT}`);
    const lines = fs
      .readFileSync(SCORECARD_EVENT, 'utf8')
      .split('\n')
      .filter((l) => l.trim());
    assert.ok(lines.length >= 1, 'expected at least one jsonl event');
    const events = lines.map((l) => JSON.parse(l));
    const hit = events.find(
      (e) =>
        e.type === 'formal_resolution' &&
        (e.pr === 16791 || e.issue === 16950),
    );
    assert.ok(hit, `no formal_resolution event: ${JSON.stringify(events)}`);
    assert.equal(hit.verdict, 'pass');
    assert.equal(hit.winner_path, 'split-deps-per-directory');
    assert.ok(hit.agent, 'event must name the agent for scorecard');
  });
});
