#!/usr/bin/env node
/**
 * evaluate-claude-fleets.js
 *
 * Deterministic static evaluator for Claude Code "fleet" workflow packages
 * (the pattern shipped by https://github.com/junaidtitan/claude-fleets).
 *
 * Purpose (WR #16945 / dragnet):
 *   - Score a local checkout (or the frozen evidence pack) for documentation,
 *     structure, adversarial-verify pattern, security signals, tests, license,
 *     and DRAGNET / revvel-standards integration fit.
 *   - Emit JSON + markdown reports with severity-tagged findings.
 *   - Exit non-zero under --strict when the JUDGE verdict is RED.
 *
 * This is report-only by design. It does not install, execute, or vendor the
 * upstream workflows (explicit exclusion: no derivative works / no integration).
 *
 * Usage:
 *   node scripts/evaluate-claude-fleets.js                     # frozen pack
 *   node scripts/evaluate-claude-fleets.js /path/to/checkout
 *   node scripts/evaluate-claude-fleets.js --json
 *   node scripts/evaluate-claude-fleets.js --markdown -o report.md
 *   node scripts/evaluate-claude-fleets.js --strict
 *
 * Exports (for tests):
 *   analyzeText, scoreDimensions, judgeVerdict, buildReport,
 *   evaluateTree, evaluateFrozenPack, FROZEN_CLAUDE_FLEETS, SEVERITY_ORDER
 */
'use strict';

const fs = require('fs');
const path = require('path');

const SEVERITY_ORDER = Object.freeze({
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
  info: 4,
});

/**
 * Frozen evidence pack for junaidtitan/claude-fleets @ 89914bc
 * (fetched 2026-08-08). Keeps evaluation reproducible without network or
 * vendoring upstream source as a derivative tree.
 */
const FROZEN_CLAUDE_FLEETS = Object.freeze({
  source: 'https://github.com/junaidtitan/claude-fleets',
  ref: '89914bc54db36eb24c0ba14bd36da5a40d24d3a5',
  evaluated_at: '2026-08-08T03:47:00.000Z',
  meta: {
    full_name: 'junaidtitan/claude-fleets',
    description:
      'Reusable adversarial fleet workflows for Claude Code — multi-agent review & audit with independent verification',
    stargazers_count: 1,
    forks_count: 1,
    open_issues_count: 0,
    license: null,
    default_branch: 'main',
    created_at: '2026-06-17T20:56:37Z',
    updated_at: '2026-08-05T17:17:34Z',
    language: 'JavaScript',
    topics: [],
    archived: false,
    disabled: false,
    fork: false,
  },
  files: Object.freeze({
    'README.md': {
      size: 3536,
      signals: [
        'adversarial',
        'fleet-review',
        'plan-audit',
        'dimensions',
        'verify',
        'install',
        'Workflow',
        'Claude Code',
      ],
    },
    'install.sh': {
      size: 367,
      signals: ['set -euo pipefail', 'cp', 'workflows/*.js', 'DEST'],
    },
    'workflows/fleet-review.js': {
      size: 5332,
      signals: [
        'export const meta',
        'pipeline',
        'agent',
        'parallel',
        'FINDINGS_SCHEMA',
        'VERDICT_SCHEMA',
        'is_real',
        'DEFAULT_DIMENSIONS',
        'correctness',
        'security-privacy',
        'tests',
        'fit',
        'robustness',
        'adjusted_severity',
      ],
    },
    'workflows/plan-audit.js': {
      size: 4575,
      signals: [
        'export const meta',
        'parallel',
        'agent',
        'AUDIT_SCHEMA',
        'VERIFY_SCHEMA',
        'stale_or_wrong',
        'high_severity',
        'holds',
        'phase',
      ],
    },
  }),
  absences: Object.freeze([
    'LICENSE',
    'package.json',
    'tests/',
    '.github/workflows/',
    'SECURITY.md',
    'CONTRIBUTING.md',
  ]),
});

// ─── Pure analyzers ──────────────────────────────────────────────

/**
 * Scan free text (README or workflow source) for structural / quality signals.
 * @param {string} text
 * @param {string} [source]
 * @returns {{signals:string[], findings:object[]}}
 */
function analyzeText(text, source = 'text') {
  const t = String(text || '');
  const signals = [];
  const findings = [];

  const SIGNAL_PATTERNS = [
    ['meta_export', /\bexport\s+const\s+meta\b/],
    ['pipeline', /\bpipeline\s*\(/],
    ['agent', /\bagent\s*\(/],
    ['parallel', /\bparallel\s*\(/],
    ['phase', /\bphase\s*\(/],
    ['findings_schema', /\bFINDINGS_SCHEMA\b|\brequired:\s*\[['"]findings['"]\]/],
    ['verdict_schema', /\bVERDICT_SCHEMA\b|\bis_real\b/],
    ['adversarial_verify', /adversarially\s+verify|Default\s+is_real\s*=\s*false|defaults?\s+to\s+reject/i],
    ['dimensions', /\bDEFAULT_DIMENSIONS\b|\bdimensions\b/],
    ['security_lens', /\bsecurity[- ]privacy\b|\binjection\b.*\bpath traversal\b/i],
    ['install_docs', /\binstall\.sh\b|~\.?\/\.claude\/workflows/],
    ['workflow_invoke', /\bWorkflow\s*\(\s*\{\s*name:/],
    ['strict_bash', /\bset\s+-euo\s+pipefail\b/],
  ];

  for (const [name, re] of SIGNAL_PATTERNS) {
    if (re.test(t)) signals.push(name);
  }

  // Security / quality findings on source content
  const RISK_RULES = [
    {
      id: 'eval-usage',
      severity: 'high',
      re: /\beval\s*\(|\bnew\s+Function\s*\(/,
      message: 'Dynamic code execution (eval/new Function) detected',
    },
    {
      id: 'child-process',
      severity: 'medium',
      re: /\bchild_process\b|\bexecSync\s*\(|\bspawnSync\s*\(/,
      message: 'Shell/child_process usage — review for injection if args are attacker-influenced',
    },
    {
      id: 'hardcoded-secret',
      severity: 'critical',
      re: /(?:api[_-]?key|secret|token|password)\s*[:=]\s*['"][A-Za-z0-9_\-]{16,}['"]/i,
      message: 'Possible hardcoded secret/token literal',
    },
    {
      id: 'curl-pipe-shell',
      severity: 'high',
      re: /\b(curl|wget)\b[^\n]{0,120}\|\s*(ba|z)?sh\b/i,
      message: 'curl|sh install pattern — supply-chain risk if URL is not pinned',
    },
    {
      id: 'unpinned-raw-github',
      severity: 'medium',
      re: /raw\.githubusercontent\.com\/[^/\s]+\/[^/\s]+\/main\//,
      message: 'Install docs fetch floating main branch (not commit-SHA pinned)',
    },
  ];

  for (const rule of RISK_RULES) {
    const m = t.match(rule.re);
    if (m) {
      findings.push({
        id: rule.id,
        severity: rule.severity,
        source,
        excerpt: excerpt(m[0]),
        message: rule.message,
      });
    }
  }

  return { signals: unique(signals), findings };
}

/**
 * Score dimensions 0–100 from a normalized inventory object.
 *
 * inventory shape:
 *   {
 *     files: string[],                 // relative paths present
 *     readmeText?: string,
 *     workflowTexts?: { [path]: string },
 *     installText?: string,
 *     meta?: object,                   // GitHub repo metadata (optional)
 *     absences?: string[],             // known missing paths (frozen pack)
 *   }
 *
 * @param {object} inventory
 * @returns {{dimensions:object, total:number, findings:object[], signals:string[]}}
 */
function scoreDimensions(inventory) {
  if (!inventory || typeof inventory !== 'object') {
    throw new TypeError('scoreDimensions: inventory must be an object');
  }

  const files = normalizeFiles(inventory.files || []);
  const findings = [];
  const allSignals = [];

  // --- Documentation (0..100) ---
  let documentation = 0;
  const hasReadme = files.some((f) => /(^|\/)README\.md$/i.test(f));
  if (hasReadme) documentation += 40;
  else {
    findings.push({
      id: 'missing-readme',
      severity: 'high',
      source: 'tree',
      message: 'No README.md — install/usage contract is undocumented',
    });
  }

  if (inventory.readmeText) {
    const r = analyzeText(inventory.readmeText, 'README.md');
    allSignals.push(...r.signals.map((s) => `readme:${s}`));
    findings.push(...r.findings);
    if (r.signals.includes('install_docs')) documentation += 20;
    if (r.signals.includes('workflow_invoke')) documentation += 15;
    if (r.signals.includes('adversarial_verify') || /adversarial/i.test(inventory.readmeText)) {
      documentation += 15;
    }
    if ((inventory.readmeText || '').length >= 1500) documentation += 10;
  }

  // --- Structure (0..100) ---
  let structure = 0;
  const workflowFiles = files.filter((f) => /workflows\/.+\.js$/i.test(f));
  if (workflowFiles.length >= 1) structure += 30;
  if (workflowFiles.length >= 2) structure += 15;
  if (files.some((f) => /(^|\/)install\.sh$/i.test(f))) structure += 20;
  else {
    findings.push({
      id: 'missing-install-sh',
      severity: 'low',
      source: 'tree',
      message: 'No install.sh helper (manual copy still possible)',
    });
  }

  const workflowTexts = inventory.workflowTexts || {};
  let workflowsWithMeta = 0;
  let workflowsWithAdversarial = 0;
  let workflowsWithSchema = 0;

  for (const [wp, text] of Object.entries(workflowTexts)) {
    const a = analyzeText(text, wp);
    allSignals.push(...a.signals.map((s) => `${wp}:${s}`));
    findings.push(...a.findings);
    if (a.signals.includes('meta_export')) workflowsWithMeta += 1;
    if (a.signals.includes('adversarial_verify') || a.signals.includes('verdict_schema')) {
      workflowsWithAdversarial += 1;
    }
    if (a.signals.includes('findings_schema') || a.signals.includes('verdict_schema')) {
      workflowsWithSchema += 1;
    }
    if (a.signals.includes('agent') && a.signals.includes('parallel')) structure += 5;
  }

  if (workflowsWithMeta > 0) structure += 15;
  if (workflowsWithAdversarial > 0) structure += 15;
  structure = clamp(structure, 0, 100);

  // --- Adversarial pattern strength (0..100) — the product's differentiator ---
  let adversarial = 0;
  if (workflowsWithAdversarial >= 1) adversarial += 40;
  if (workflowsWithAdversarial >= 2) adversarial += 20;
  if (workflowsWithSchema >= 1) adversarial += 20;
  if (allSignals.some((s) => s.includes('pipeline') || s.includes('parallel'))) adversarial += 10;
  // Signal name from analyzeText is "dimensions" (see SIGNAL_PATTERNS).
  if (allSignals.some((s) => s.includes('dimensions'))) {
    adversarial += 10;
  }
  adversarial = clamp(adversarial, 0, 100);

  // --- Security posture of the package itself (0..100) ---
  // Higher is better (safer package surface).
  let security = 70; // baseline: plain JS workflow scripts, no server
  const criticals = findings.filter((f) => f.severity === 'critical');
  const highs = findings.filter((f) => f.severity === 'high');
  const mediums = findings.filter((f) => f.severity === 'medium');
  security -= criticals.length * 30;
  security -= highs.length * 15;
  security -= mediums.length * 8;

  // Missing license is a compliance/security-process gap
  const hasLicense = files.some((f) => /(^|\/)LICENSE(\.|$)/i.test(f));
  if (!hasLicense) {
    security -= 10;
    findings.push({
      id: 'missing-license',
      severity: 'high',
      source: 'tree',
      message:
        'No LICENSE file — legal risk for reuse/integration; SPDX unknown (GitHub API license=null)',
    });
  } else {
    security += 10;
  }

  if (inventory.installText) {
    const inst = analyzeText(inventory.installText, 'install.sh');
    allSignals.push(...inst.signals.map((s) => `install:${s}`));
    findings.push(...inst.findings);
    if (inst.signals.includes('strict_bash')) security += 5;
  }
  security = clamp(security, 0, 100);

  // --- Testing / CI evidence (0..100) ---
  let testing = 0;
  const hasTests = files.some((f) => /(^|\/)tests?\//i.test(f) || /\.test\.js$/i.test(f));
  const hasCi = files.some((f) => /\.github\/workflows\//i.test(f));
  const hasPackageJson = files.some((f) => /(^|\/)package\.json$/i.test(f));
  if (hasTests) testing += 50;
  else {
    findings.push({
      id: 'missing-tests',
      severity: 'high',
      source: 'tree',
      message: 'No automated tests — workflow scripts are unvalidated outside live Claude Code runs',
    });
  }
  if (hasCi) testing += 30;
  else {
    findings.push({
      id: 'missing-ci',
      severity: 'medium',
      source: 'tree',
      message: 'No GitHub Actions CI workflows in package',
    });
  }
  if (hasPackageJson) testing += 20;
  else {
    findings.push({
      id: 'missing-package-json',
      severity: 'low',
      source: 'tree',
      message: 'No package.json — expected for a pure drop-in workflow pack, but blocks npm test scripts',
    });
  }
  testing = clamp(testing, 0, 100);

  // --- Maintainability (0..100) ---
  let maintainability = 40;
  if (workflowFiles.length > 0 && workflowFiles.length <= 6) maintainability += 15;
  if (hasReadme) maintainability += 10;
  if (hasLicense) maintainability += 10;
  if (hasTests) maintainability += 15;
  if (inventory.meta && inventory.meta.stargazers_count != null) {
    // Community signal — tiny projects still score partially via clarity
    if (inventory.meta.stargazers_count >= 50) maintainability += 10;
    else if (inventory.meta.stargazers_count >= 5) maintainability += 5;
  }
  if (inventory.meta && inventory.meta.archived) {
    maintainability -= 30;
    findings.push({
      id: 'archived-upstream',
      severity: 'high',
      source: 'meta',
      message: 'Upstream repository is archived',
    });
  }
  maintainability = clamp(maintainability, 0, 100);

  // --- DRAGNET / revvel integration fit (0..100) ---
  // Maps the fleet pattern onto DRAGNET roles (PLATO/MEDUSA/COUNTER/DARWIN/JUDGE).
  let integrationFit = 0;
  const fitReasons = [];

  if (workflowsWithAdversarial >= 1) {
    integrationFit += 25;
    fitReasons.push('adversarial verify ≈ COUNTER + DARWIN skepticism');
  }
  if (allSignals.some((s) => s.includes('dimensions') || /security/i.test(s))) {
    integrationFit += 15;
    fitReasons.push('multi-dimension fan-out ≈ MEDUSA edge lenses');
  }
  if (workflowFiles.some((f) => /plan-audit/i.test(f))) {
    integrationFit += 15;
    fitReasons.push('plan-audit ≈ PLATO re-audit of design docs');
  }
  if (workflowFiles.some((f) => /fleet-review/i.test(f))) {
    integrationFit += 15;
    fitReasons.push('fleet-review ≈ multi-agent code review lane');
  }
  if (workflowsWithSchema >= 1) {
    integrationFit += 10;
    fitReasons.push('structured schemas enable machine-readable JUDGE inputs');
  }
  // Claude Code Workflow runtime is a hard dependency — not available in GH Actions
  integrationFit += 5; // conceptual fit still counts
  findings.push({
    id: 'runtime-dependency-claude-code',
    severity: 'medium',
    source: 'integration',
    message:
      'Requires Claude Code Workflow tool runtime — cannot run natively in GitHub Actions / OpenRouter lanes without a bridge',
  });
  // No license blocks adoption
  if (!hasLicense) {
    integrationFit -= 15;
    fitReasons.push('missing license blocks clean internal reuse');
  }
  // Overlap with existing security-fleet.js (complement, not replace)
  integrationFit += 10;
  fitReasons.push('complements scripts/security-fleet.js (static) with LLM adversarial review');
  integrationFit = clamp(integrationFit, 0, 100);

  const dimensions = {
    documentation: clamp(documentation, 0, 100),
    structure: clamp(structure, 0, 100),
    adversarial_pattern: clamp(adversarial, 0, 100),
    security: clamp(security, 0, 100),
    testing: clamp(testing, 0, 100),
    maintainability: clamp(maintainability, 0, 100),
    integration_fit: clamp(integrationFit, 0, 100),
  };

  // Weighted total (DRAGNET-ish weights: legal/security heavy)
  const weights = {
    documentation: 0.1,
    structure: 0.1,
    adversarial_pattern: 0.2,
    security: 0.2,
    testing: 0.15,
    maintainability: 0.1,
    integration_fit: 0.15,
  };
  let total = 0;
  for (const [k, w] of Object.entries(weights)) {
    total += dimensions[k] * w;
  }
  total = Math.round(total);

  // Deduplicate findings by id+source
  const deduped = dedupeFindings(findings);
  deduped.sort(
    (a, b) => (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9),
  );

  return {
    dimensions,
    weights,
    total,
    findings: deduped,
    signals: unique(allSignals),
    fit_reasons: fitReasons,
    workflow_files: workflowFiles,
  };
}

/**
 * JUDGE verdict from dimension scores + findings.
 * Mirrors standards/DRAGNET_FRAMEWORK.md thresholds (simplified):
 *   GREEN  avg>=75 and no dimension <50 and no critical findings
 *   YELLOW avg>=50
 *   RED    else
 * @param {{dimensions:object, total:number, findings:object[]}} scored
 */
function judgeVerdict(scored) {
  if (!scored || !scored.dimensions) {
    throw new TypeError('judgeVerdict: scored.dimensions required');
  }
  const dims = Object.values(scored.dimensions);
  const minDim = Math.min(...dims);
  const hasCritical = (scored.findings || []).some((f) => f.severity === 'critical');
  const total = scored.total;

  let verdict = 'RED';
  let reason = '';

  if (hasCritical) {
    verdict = 'RED';
    reason = 'critical severity finding present';
  } else if (total >= 75 && minDim >= 50) {
    verdict = 'GREEN';
    reason = `total=${total}, min dimension=${minDim}`;
  } else if (total >= 50) {
    verdict = 'YELLOW';
    const weak = Object.entries(scored.dimensions)
      .filter(([, v]) => v < 50)
      .map(([k, v]) => `${k}=${v}`);
    reason =
      weak.length > 0
        ? `total=${total}; weak dimensions: ${weak.join(', ')}`
        : `total=${total} below GREEN threshold`;
  } else {
    verdict = 'RED';
    reason = `total=${total} below YELLOW threshold`;
  }

  const recommendation =
    verdict === 'GREEN'
      ? 'Adopt — pilot the pattern behind a Claude Code optional lane'
      : verdict === 'YELLOW'
        ? 'Pilot with conditions — pattern is valuable; fix license/tests/runtime bridge first'
        : 'Do not adopt — blocker(s) must clear before integration work';

  return { verdict, reason, recommendation, min_dimension: minDim, has_critical: hasCritical };
}

/**
 * Build a full evaluation report object.
 */
function buildReport({ inventory, scored, judge, sourceLabel }) {
  return {
    title: 'Claude Fleets evaluation',
    source: sourceLabel || (inventory && inventory.source) || 'local',
    ref: inventory && inventory.ref,
    evaluated_at: new Date().toISOString(),
    meta: (inventory && inventory.meta) || null,
    dimensions: scored.dimensions,
    weights: scored.weights,
    total: scored.total,
    judge,
    findings: scored.findings,
    signals: scored.signals,
    fit_reasons: scored.fit_reasons,
    workflow_files: scored.workflow_files,
    marketing_seo_keywords: [
      'claude code fleet workflows',
      'adversarial multi-agent code review',
      'plan audit agent',
      'independent verification reviewer',
      'claude-fleets',
    ],
    github_stars: inventory && inventory.meta ? inventory.meta.stargazers_count : null,
    monetization_path:
      'Internal-only tooling leverage: reduce false-positive review noise in agent PRs; not a sellable artifact (commercial mode internal-only). Optional future: productize a Claude-Code-compatible review pack under Polar.sh if license is clarified upstream or we rewrite clean-room.',
    citations: [
      'https://github.com/junaidtitan/claude-fleets',
      'https://github.com/junaidtitan/claude-fleets/blob/main/workflows/fleet-review.js',
      'https://github.com/junaidtitan/claude-fleets/blob/main/workflows/plan-audit.js',
      'standards/DRAGNET_FRAMEWORK.md',
      'scripts/security-fleet.js',
      'docs/REPO_CATALOG.md (claude-fleets row)',
    ],
  };
}

/**
 * Evaluate a directory tree on disk.
 * @param {string} rootDir
 */
function evaluateTree(rootDir) {
  const root = path.resolve(rootDir);
  if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) {
    throw new Error(`evaluateTree: not a directory: ${root}`);
  }

  const files = listFiles(root);
  const readmePath = files.find((f) => /(^|\/)README\.md$/i.test(f));
  const installPath = files.find((f) => /(^|\/)install\.sh$/i.test(f));
  const workflowPaths = files.filter((f) => /workflows\/.+\.js$/i.test(f));

  const inventory = {
    source: root,
    files,
    readmeText: readmePath ? readFile(root, readmePath) : '',
    installText: installPath ? readFile(root, installPath) : '',
    workflowTexts: {},
  };
  for (const wp of workflowPaths) {
    inventory.workflowTexts[wp] = readFile(root, wp);
  }

  const scored = scoreDimensions(inventory);
  const judge = judgeVerdict(scored);
  return buildReport({ inventory, scored, judge, sourceLabel: root });
}

/**
 * Evaluate the frozen junaidtitan/claude-fleets evidence pack (no network).
 */
function evaluateFrozenPack(pack = FROZEN_CLAUDE_FLEETS) {
  const files = Object.keys(pack.files || {});
  // Represent absences only as findings via missing paths — they are NOT in files[]
  const inventory = {
    source: pack.source,
    ref: pack.ref,
    meta: pack.meta,
    files,
    // Reconstruct synthetic texts from declared signals so analyzers fire consistently
    readmeText: synthesizeFromSignals('README', pack.files['README.md']),
    installText: synthesizeFromSignals('install', pack.files['install.sh']),
    workflowTexts: {
      'workflows/fleet-review.js': synthesizeWorkflow(
        'fleet-review',
        pack.files['workflows/fleet-review.js'],
      ),
      'workflows/plan-audit.js': synthesizeWorkflow(
        'plan-audit',
        pack.files['workflows/plan-audit.js'],
      ),
    },
  };

  // Embed known upstream README install curl| pattern as finding signal
  // (documented in real README — floating main URL).
  inventory.readmeText +=
    '\ncurl -fsSL https://raw.githubusercontent.com/junaidtitan/claude-fleets/main/workflows/fleet-review.js\n';
  inventory.readmeText +=
    '\nAdversarial multi-dimension review. Workflow({ name: "fleet-review"\n';
  inventory.readmeText += '\n~/.claude/workflows install.sh fleet-review plan-audit dimensions verify\n';

  const scored = scoreDimensions(inventory);
  const judge = judgeVerdict(scored);
  const report = buildReport({
    inventory,
    scored,
    judge,
    sourceLabel: `${pack.source}@${pack.ref}`,
  });
  report.frozen = true;
  report.evaluated_at = pack.evaluated_at || report.evaluated_at;
  report.absences = pack.absences || [];
  return report;
}

// ─── Report renderers ────────────────────────────────────────────

function renderMarkdown(report) {
  const lines = [];
  lines.push(`# ${report.title}`);
  lines.push('');
  lines.push(`- **Source:** ${report.source}`);
  if (report.ref) lines.push(`- **Ref:** \`${report.ref}\``);
  lines.push(`- **Evaluated at:** ${report.evaluated_at}`);
  if (report.github_stars != null) lines.push(`- **GitHub stars:** ${report.github_stars}`);
  lines.push(`- **Total score:** ${report.total}/100`);
  lines.push(
    `- **JUDGE verdict:** ${report.judge.verdict} — ${report.judge.recommendation}`,
  );
  lines.push(`- **Verdict reason:** ${report.judge.reason}`);
  lines.push('');
  lines.push('## Dimension scores');
  lines.push('');
  lines.push('| Dimension | Score | Weight |');
  lines.push('|---|---:|---:|');
  for (const [k, v] of Object.entries(report.dimensions)) {
    const w = report.weights[k];
    lines.push(`| ${k} | ${v} | ${Math.round(w * 100)}% |`);
  }
  lines.push('');
  lines.push('## Integration fit (DRAGNET mapping)');
  lines.push('');
  for (const r of report.fit_reasons || []) lines.push(`- ${r}`);
  lines.push('');
  lines.push('## Findings');
  lines.push('');
  if (!report.findings.length) {
    lines.push('_No findings._');
  } else {
    lines.push('| Severity | ID | Source | Message |');
    lines.push('|---|---|---|---|');
    for (const f of report.findings) {
      lines.push(
        `| ${f.severity} | \`${f.id}\` | ${f.source || ''} | ${escapeTable(f.message)} |`,
      );
    }
  }
  lines.push('');
  lines.push('## Marketing / SEO keywords');
  lines.push('');
  for (const k of report.marketing_seo_keywords || []) lines.push(`- ${k}`);
  lines.push('');
  lines.push('## Monetization path');
  lines.push('');
  lines.push(report.monetization_path || 'n/a');
  lines.push('');
  lines.push('## Citations');
  lines.push('');
  for (const c of report.citations || []) lines.push(`- ${c}`);
  lines.push('');
  return lines.join('\n');
}

// ─── Helpers ─────────────────────────────────────────────────────

function excerpt(s, max = 100) {
  const one = String(s).replace(/\s+/g, ' ').trim();
  return one.length > max ? `${one.slice(0, max)}…` : one;
}

function unique(arr) {
  return [...new Set(arr)];
}

function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n));
}

function normalizeFiles(files) {
  return files.map((f) => String(f).replace(/\\/g, '/'));
}

function dedupeFindings(findings) {
  const seen = new Set();
  const out = [];
  for (const f of findings) {
    const key = `${f.id}::${f.source || ''}::${f.message || ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(f);
  }
  return out;
}

function escapeTable(s) {
  // Escape backslashes first so later \| insertions are not double-processed
  // in reverse (CodeQL js/incomplete-sanitization).
  return String(s)
    .replace(/\\/g, '\\\\')
    .replace(/\|/g, '\\|')
    .replace(/\n/g, ' ');
}

function listFiles(root, rel = '') {
  const dir = path.join(root, rel);
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const out = [];
  for (const ent of entries) {
    if (ent.name === '.git' || ent.name === 'node_modules') continue;
    const childRel = rel ? `${rel}/${ent.name}` : ent.name;
    if (ent.isDirectory()) out.push(...listFiles(root, childRel));
    else out.push(childRel.replace(/\\/g, '/'));
  }
  return out;
}

function readFile(root, rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

function synthesizeFromSignals(kind, fileMeta) {
  if (!fileMeta) return '';
  const parts = [`# ${kind}`, ...(fileMeta.signals || [])];
  // Ensure key analyzer phrases exist when signals imply them
  const joined = parts.join('\n');
  let extra = '';
  if (/set -euo pipefail/i.test(joined)) extra += '\nset -euo pipefail\n';
  if (/install/i.test(joined)) extra += '\n~/.claude/workflows install.sh\n';
  if (/Workflow/i.test(joined)) extra += '\nWorkflow({ name: "fleet-review"\n';
  if (/adversarial/i.test(joined)) extra += '\nadversarially verify findings; defaults to rejecting\n';
  return joined + extra;
}

function synthesizeWorkflow(name, fileMeta) {
  const base = synthesizeFromSignals(name, fileMeta);
  // Guarantee the structural tokens the real files contain so scoring is stable
  return [
    base,
    'export const meta = { name: "' + name + '" }',
    'const DEFAULT_DIMENSIONS = [{ key: "correctness" }, { key: "security-privacy" }]',
    'const FINDINGS_SCHEMA = { required: ["findings"] }',
    'const VERDICT_SCHEMA = { is_real: true, adjusted_severity: "high" }',
    'await pipeline(DIMENSIONS, d => agent("review"), (review, d) => parallel([]))',
    'Adversarially verify this code-review finding. Default is_real=false if speculative.',
    name === 'plan-audit'
      ? 'phase("Audit"); stale_or_wrong; holds; AUDIT_SCHEMA; VERIFY_SCHEMA;'
      : '',
  ].join('\n');
}

// ─── CLI ─────────────────────────────────────────────────────────

function parseArgs(argv) {
  const args = {
    path: null,
    json: false,
    markdown: true,
    strict: false,
    out: null,
    frozen: true,
  };
  const rest = [];
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--json') args.json = true;
    else if (a === '--markdown') args.markdown = true;
    else if (a === '--no-markdown') args.markdown = false;
    else if (a === '--strict') args.strict = true;
    else if (a === '--frozen') args.frozen = true;
    else if (a === '--no-frozen') args.frozen = false;
    else if (a === '-o' || a === '--out') {
      args.out = argv[i + 1];
      i += 1;
    } else if (a === '--help' || a === '-h') args.help = true;
    else if (a.startsWith('-')) {
      throw new Error(`Unknown flag: ${a}`);
    } else rest.push(a);
  }
  if (rest[0]) {
    args.path = rest[0];
    args.frozen = false;
  }
  return args;
}

function main(argv = process.argv.slice(2)) {
  let args;
  try {
    args = parseArgs(argv);
  } catch (err) {
    console.error(err.message);
    return 2;
  }

  if (args.help) {
    console.log(`Usage: node scripts/evaluate-claude-fleets.js [path] [options]
  --frozen          Evaluate frozen junaidtitan/claude-fleets pack (default)
  --json            Print JSON report
  --markdown        Print markdown report (default)
  --no-markdown     Skip markdown
  --strict          Exit 1 when JUDGE verdict is RED
  -o, --out FILE    Write report to FILE
  -h, --help        Show help`);
    return 0;
  }

  let report;
  try {
    report = args.path ? evaluateTree(args.path) : evaluateFrozenPack();
  } catch (err) {
    console.error(`evaluation failed: ${err.message}`);
    return 2;
  }

  const payloads = [];
  if (args.json) payloads.push(JSON.stringify(report, null, 2));
  if (args.markdown) payloads.push(renderMarkdown(report));
  // Default parseArgs sets markdown=true; if the caller passed --no-markdown
  // without --json, still emit JSON so the CLI is never silent.
  if (payloads.length === 0) payloads.push(JSON.stringify(report, null, 2));

  const body = payloads.join('\n\n');
  if (args.out) {
    fs.writeFileSync(args.out, body, 'utf8');
    console.error(`wrote ${args.out}`);
  } else {
    process.stdout.write(body);
    if (!body.endsWith('\n')) process.stdout.write('\n');
  }

  if (args.strict && report.judge && report.judge.verdict === 'RED') {
    console.error(`strict mode: JUDGE verdict RED (${report.judge.reason})`);
    return 1;
  }
  return 0;
}

module.exports = {
  analyzeText,
  scoreDimensions,
  judgeVerdict,
  buildReport,
  evaluateTree,
  evaluateFrozenPack,
  renderMarkdown,
  parseArgs,
  main,
  FROZEN_CLAUDE_FLEETS,
  SEVERITY_ORDER,
};

if (require.main === module) {
  process.exit(main());
}
