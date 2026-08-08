#!/usr/bin/env node
'use strict';

/**
 * Seeded tests for scripts/evaluate-claude-fleets.js (WR #16945).
 *
 * Covers pure scoring helpers, JUDGE thresholds, frozen evidence pack for
 * junaidtitan/claude-fleets, tree evaluation via temp fixtures, and CLI exit
 * codes under --strict.
 */

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  analyzeText,
  scoreDimensions,
  judgeVerdict,
  buildReport,
  evaluateTree,
  evaluateFrozenPack,
  renderMarkdown,
  main,
  FROZEN_CLAUDE_FLEETS,
} = require('../scripts/evaluate-claude-fleets.js');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`PASS: ${name}`);
    passed += 1;
  } catch (e) {
    console.log(`FAIL: ${name}\n    ${e.stack || e.message}`);
    failed += 1;
  }
}

function withTempDir(fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'claude-fleets-eval-'));
  try {
    return fn(dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

// ── analyzeText ────────────────────────────────────────────────

test('analyzeText detects adversarial verify + schema signals', () => {
  const src = `
    export const meta = { name: 'fleet-review' }
    const FINDINGS_SCHEMA = {}
    const VERDICT_SCHEMA = { is_real: true }
    await pipeline(dims, d => agent('x'), (r,d) => parallel([]))
    Adversarially verify this code-review finding. Default is_real=false if speculative.
  `;
  const { signals, findings } = analyzeText(src, 'wf.js');
  assert.ok(signals.includes('meta_export'));
  assert.ok(signals.includes('pipeline'));
  assert.ok(signals.includes('agent'));
  assert.ok(signals.includes('parallel'));
  assert.ok(signals.includes('adversarial_verify'));
  assert.strictEqual(findings.length, 0);
});

test('analyzeText flags curl|sh and floating main install URL', () => {
  const readme = `
    curl -fsSL https://raw.githubusercontent.com/junaidtitan/claude-fleets/main/workflows/fleet-review.js | sh
  `;
  const { findings } = analyzeText(readme, 'README.md');
  assert.ok(findings.some((f) => f.id === 'curl-pipe-shell'));
  assert.ok(findings.some((f) => f.id === 'unpinned-raw-github'));
});

test('analyzeText flags hardcoded secret literals', () => {
  const { findings } = analyzeText('const api_key = "sk-abcdefghijklmnop1234"', 'bad.js');
  assert.ok(findings.some((f) => f.id === 'hardcoded-secret' && f.severity === 'critical'));
});

// ── scoreDimensions ────────────────────────────────────────────

test('scoreDimensions throws on bad input', () => {
  assert.throws(() => scoreDimensions(null), /inventory must be an object/);
});

test('empty inventory scores low and emits missing-* findings', () => {
  const scored = scoreDimensions({ files: [] });
  assert.ok(scored.total < 50, `expected low total, got ${scored.total}`);
  const ids = scored.findings.map((f) => f.id);
  assert.ok(ids.includes('missing-readme'));
  assert.ok(ids.includes('missing-license'));
  assert.ok(ids.includes('missing-tests'));
});

test('healthy fleet package scores stronger on adversarial + structure', () => {
  const scored = scoreDimensions({
    files: [
      'README.md',
      'LICENSE',
      'install.sh',
      'workflows/fleet-review.js',
      'workflows/plan-audit.js',
      'tests/smoke.test.js',
      'package.json',
      '.github/workflows/ci.yml',
    ],
    readmeText:
      'Adversarial fleet. Install via ~/.claude/workflows install.sh. Workflow({ name: "fleet-review"\n' +
      'x'.repeat(1600),
    installText: '#!/usr/bin/env bash\nset -euo pipefail\ncp workflows/*.js "$DEST"\n',
    workflowTexts: {
      'workflows/fleet-review.js': `
        export const meta = { name: 'fleet-review' }
        const DEFAULT_DIMENSIONS = [{ key: 'security-privacy' }]
        const FINDINGS_SCHEMA = { required: ['findings'] }
        const VERDICT_SCHEMA = { is_real: true }
        await pipeline(DIMENSIONS, d => agent('r'), (review,d) => parallel([]))
        Adversarially verify. Default is_real=false
      `,
      'workflows/plan-audit.js': `
        export const meta = { name: 'plan-audit' }
        phase('Audit')
        await parallel([])
        agent('audit')
        Adversarially verify staleness. Default is_real=false
        const VERIFY_SCHEMA = {}
      `,
    },
    meta: { stargazers_count: 12, archived: false },
  });
  assert.ok(scored.dimensions.adversarial_pattern >= 70);
  assert.ok(scored.dimensions.structure >= 70);
  assert.ok(scored.dimensions.testing >= 80);
  assert.ok(scored.dimensions.documentation >= 70);
  assert.ok(scored.total >= 70, `expected healthy total>=70, got ${scored.total}`);
  assert.ok(!scored.findings.some((f) => f.id === 'missing-license'));
});

// ── judgeVerdict ───────────────────────────────────────────────

test('judgeVerdict GREEN when strong and no criticals', () => {
  const judge = judgeVerdict({
    total: 80,
    dimensions: {
      documentation: 80,
      structure: 80,
      adversarial_pattern: 90,
      security: 80,
      testing: 75,
      maintainability: 70,
      integration_fit: 75,
    },
    findings: [],
  });
  assert.strictEqual(judge.verdict, 'GREEN');
});

test('judgeVerdict YELLOW when weak dimension under 50', () => {
  const judge = judgeVerdict({
    total: 60,
    dimensions: {
      documentation: 70,
      structure: 70,
      adversarial_pattern: 80,
      security: 70,
      testing: 20,
      maintainability: 60,
      integration_fit: 60,
    },
    findings: [{ id: 'missing-tests', severity: 'high', message: 'x' }],
  });
  assert.strictEqual(judge.verdict, 'YELLOW');
  assert.ok(/testing=20/.test(judge.reason));
});

test('judgeVerdict RED on critical finding even if scores high', () => {
  const judge = judgeVerdict({
    total: 90,
    dimensions: {
      documentation: 90,
      structure: 90,
      adversarial_pattern: 90,
      security: 90,
      testing: 90,
      maintainability: 90,
      integration_fit: 90,
    },
    findings: [{ id: 'hardcoded-secret', severity: 'critical', message: 'x' }],
  });
  assert.strictEqual(judge.verdict, 'RED');
  assert.strictEqual(judge.has_critical, true);
});

test('judgeVerdict RED when total below 50', () => {
  const judge = judgeVerdict({
    total: 30,
    dimensions: {
      documentation: 10,
      structure: 10,
      adversarial_pattern: 10,
      security: 40,
      testing: 0,
      maintainability: 20,
      integration_fit: 20,
    },
    findings: [],
  });
  assert.strictEqual(judge.verdict, 'RED');
});

// ── frozen pack (real upstream evidence) ───────────────────────

test('FROZEN_CLAUDE_FLEETS points at junaidtitan/claude-fleets', () => {
  assert.strictEqual(FROZEN_CLAUDE_FLEETS.source, 'https://github.com/junaidtitan/claude-fleets');
  assert.ok(FROZEN_CLAUDE_FLEETS.files['workflows/fleet-review.js']);
  assert.ok(FROZEN_CLAUDE_FLEETS.files['workflows/plan-audit.js']);
  assert.ok(FROZEN_CLAUDE_FLEETS.absences.includes('LICENSE'));
  assert.strictEqual(FROZEN_CLAUDE_FLEETS.meta.license, null);
});

test('evaluateFrozenPack returns YELLOW pilot recommendation for upstream', () => {
  const report = evaluateFrozenPack();
  assert.strictEqual(report.frozen, true);
  assert.ok(report.total >= 50, `expected total>=50, got ${report.total}`);
  assert.ok(report.total < 90, `expected room below perfect, got ${report.total}`);
  // Missing license + tests should prevent GREEN
  assert.notStrictEqual(report.judge.verdict, 'GREEN');
  assert.ok(['YELLOW', 'RED'].includes(report.judge.verdict));
  const ids = report.findings.map((f) => f.id);
  assert.ok(ids.includes('missing-license'));
  assert.ok(ids.includes('missing-tests'));
  assert.ok(ids.includes('runtime-dependency-claude-code'));
  assert.ok(report.dimensions.adversarial_pattern >= 60);
  assert.ok(report.fit_reasons.some((r) => /COUNTER|DARWIN|JUDGE|PLATO|MEDUSA|security-fleet/i.test(r)));
  assert.ok(Array.isArray(report.marketing_seo_keywords) && report.marketing_seo_keywords.length >= 3);
  assert.ok(report.monetization_path && /internal/i.test(report.monetization_path));
  assert.ok(report.citations.some((c) => /junaidtitan\/claude-fleets/.test(c)));
  assert.strictEqual(report.github_stars, 1);
});

test('renderMarkdown includes JUDGE verdict and findings table', () => {
  const report = evaluateFrozenPack();
  const md = renderMarkdown(report);
  assert.ok(md.includes('# Claude Fleets evaluation'));
  assert.ok(md.includes('JUDGE verdict'));
  assert.ok(md.includes('| Severity |'));
  assert.ok(md.includes('Marketing / SEO keywords'));
  assert.ok(md.includes('Monetization path'));
});

test('buildReport wires scored + judge', () => {
  const inventory = { source: 'x', files: ['README.md'], meta: { stargazers_count: 3 } };
  const scored = scoreDimensions(inventory);
  const judge = judgeVerdict(scored);
  const report = buildReport({ inventory, scored, judge, sourceLabel: 'x' });
  assert.strictEqual(report.source, 'x');
  assert.strictEqual(report.total, scored.total);
  assert.strictEqual(report.judge.verdict, judge.verdict);
  assert.strictEqual(report.github_stars, 3);
});

// ── evaluateTree ───────────────────────────────────────────────

test('evaluateTree scores a minimal on-disk fixture', () => {
  withTempDir((dir) => {
    fs.mkdirSync(path.join(dir, 'workflows'));
    fs.writeFileSync(
      path.join(dir, 'README.md'),
      '# demo\nAdversarial fleet Workflow({ name: "fleet-review"\n~/.claude/workflows install.sh\n' +
        'y'.repeat(1600),
    );
    fs.writeFileSync(path.join(dir, 'LICENSE'), 'MIT\n');
    fs.writeFileSync(
      path.join(dir, 'install.sh'),
      '#!/usr/bin/env bash\nset -euo pipefail\ncp workflows/*.js "$1"\n',
    );
    fs.writeFileSync(
      path.join(dir, 'workflows', 'fleet-review.js'),
      `
      export const meta = { name: 'fleet-review' }
      const DEFAULT_DIMENSIONS = []
      const FINDINGS_SCHEMA = { required: ['findings'] }
      const VERDICT_SCHEMA = { is_real: true }
      await pipeline([], d => agent('a'), (r,d) => parallel([]))
      Adversarially verify. Default is_real=false
      `,
    );
    const report = evaluateTree(dir);
    assert.ok(report.total >= 55, `got ${report.total}`);
    assert.ok(report.workflow_files.includes('workflows/fleet-review.js'));
    assert.ok(!report.findings.some((f) => f.id === 'missing-readme'));
  });
});

test('evaluateTree throws on missing directory', () => {
  assert.throws(() => evaluateTree('/tmp/definitely-missing-claude-fleets-eval-xyz'), /not a directory/);
});

// ── CLI ────────────────────────────────────────────────────────

test('main --help exits 0', () => {
  const code = main(['--help']);
  assert.strictEqual(code, 0);
});

test('main frozen --json exits 0 for YELLOW pack', () => {
  // Capture stdout noise
  const origWrite = process.stdout.write;
  let buf = '';
  process.stdout.write = (chunk, ...rest) => {
    buf += String(chunk);
    return true;
  };
  try {
    const code = main(['--json', '--no-markdown']);
    assert.strictEqual(code, 0);
    const parsed = JSON.parse(buf);
    assert.ok(parsed.judge);
    assert.ok(parsed.frozen);
  } finally {
    process.stdout.write = origWrite;
  }
});

test('main --strict returns 1 when forced RED via empty tree fixture', () => {
  withTempDir((dir) => {
    // Empty dir → low scores → RED
    const origWrite = process.stdout.write;
    const origErr = process.stderr.write;
    process.stdout.write = () => true;
    process.stderr.write = () => true;
    try {
      const code = main([dir, '--strict', '--json', '--no-markdown']);
      assert.strictEqual(code, 1);
    } finally {
      process.stdout.write = origWrite;
      process.stderr.write = origErr;
    }
  });
});

// ── Summary ────────────────────────────────────────────────────

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
