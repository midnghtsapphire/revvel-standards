#!/usr/bin/env node
// ============================================================
// REVVEL COMPLIANCE CHECKER
// ============================================================
// Audits any Revvel/MIDNGHTSAPPHIRE repository against the
// standards defined in COMPLIANCE_RUBRIC.md.
//
// Usage:
//   node scripts/check-compliance.js [path-to-repo]
//
//   # Audit the current directory:
//   node scripts/check-compliance.js .
//
//   # Audit a specific repo:
//   node scripts/check-compliance.js /path/to/your-app
//
//   # Via curl (always latest version):
//   curl -sL https://raw.githubusercontent.com/midnghtsapphire/revvel-standards/main/scripts/check-compliance.js | node - .
// ============================================================

'use strict';

const fs = require('fs');
const path = require('path');
const { execSync, spawnSync } = require('child_process');

// ─── Configuration ────────────────────────────────────────
const TARGET_DIR = process.argv[2] || '.';
const repoRoot = path.resolve(TARGET_DIR);

// ─── Scoring ──────────────────────────────────────────────
let totalPoints = 0;
let earnedPoints = 0;
const failures = { P0: [], P1: [], P2: [] };
const results = [];

// ─── Helpers ──────────────────────────────────────────────
function fileExists(filePath) {
  return fs.existsSync(path.join(repoRoot, filePath));
}

function dirExists(dirPath) {
  const full = path.join(repoRoot, dirPath);
  return fs.existsSync(full) && fs.statSync(full).isDirectory();
}

function fileContains(filePath, patterns) {
  const full = path.join(repoRoot, filePath);
  if (!fs.existsSync(full)) return false;
  const content = fs.readFileSync(full, 'utf8');
  return patterns.every((p) => content.includes(p));
}

function fileExistsAny(candidates) {
  return candidates.some((f) => fileExists(f));
}

function dirHasFiles(dirPath, extension) {
  const full = path.join(repoRoot, dirPath);
  if (!fs.existsSync(full)) return false;
  const files = fs.readdirSync(full, { recursive: true });
  return files.some((f) => String(f).endsWith(extension));
}

function codeContains(pattern) {
  try {
    const dirs = ['src', 'server', 'api', 'app'].map(d => path.join(repoRoot, d)).filter(d => fs.existsSync(d));
    if (dirs.length === 0) return false;
    const result = spawnSync('grep', ['-rl', pattern, ...dirs], { encoding: 'utf8', timeout: 5000 });
    return !!(result.stdout && result.stdout.trim().length > 0);
  } catch {
    return false;
  }
}

// Simple secret pattern detection — not a replacement for gitleaks
const SECRET_PATTERNS = [
  /sk_live_[a-zA-Z0-9]{24,}/,          // Stripe live secret
  /ghp_[a-zA-Z0-9]{36}/,               // GitHub personal access token
  /xox[baprs]-[0-9a-zA-Z\-]{10,}/,     // Slack token
  /AIza[0-9A-Za-z\-_]{35}/,            // Google API key
  /["\']password["\']\s*[:=]\s*["\']\w{8,}/i, // Literal password assignment
];

function noSecrets() {
  const extensions = ['.ts', '.tsx', '.js', '.jsx', '.json', '.yml', '.yaml', '.env'];
  const ignore = ['node_modules', '.git', 'dist', '.next', 'build', 'coverage'];

  function walkDir(dir) {
    let found = false;
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return false;
    }
    for (const entry of entries) {
      if (ignore.includes(entry.name)) continue;
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (walkDir(fullPath)) return true;
      } else if (extensions.includes(path.extname(entry.name))) {
        // Skip .env.example (expected to have placeholder key names)
        if (entry.name === '.env.example') continue;
        // Skip actual .env files (those should be gitignored)
        if (entry.name === '.env') continue;
        try {
          const content = fs.readFileSync(fullPath, 'utf8');
          for (const pattern of SECRET_PATTERNS) {
            if (pattern.test(content)) {
              console.error(`  ⚠️  Possible secret found in: ${fullPath}`);
              found = true;
            }
          }
        } catch {
          // skip unreadable files
        }
      }
    }
    return found;
  }

  return !walkDir(repoRoot);
}

function npmAuditPasses() {
  try {
    execSync('npm audit --audit-level=high --json 2>&1', {
      cwd: repoRoot,
      encoding: 'utf8',
      timeout: 30000,
    });
    return true;
  } catch (e) {
    const output = e.stdout || '';
    try {
      const json = JSON.parse(output);
      // If vulnerabilities object exists, check for high/critical
      const vulns = json.metadata?.vulnerabilities;
      if (vulns && (vulns.high > 0 || vulns.critical > 0)) return false;
      return true;
    } catch {
      return false;
    }
  }
}

// ─── Check Definitions ────────────────────────────────────
const checks = [
  // Category A: Repository Structure
  { id: 'A1', category: 'A', desc: 'README.md exists', points: 2, tier: 'P0', fn: () => fileExists('README.md') },
  { id: 'A2', category: 'A', desc: 'CHANGELOG.md exists', points: 3, tier: 'P0', fn: () => fileExists('CHANGELOG.md') },
  { id: 'A3', category: 'A', desc: '.gitignore excludes node_modules, .env, dist', points: 2, tier: 'P0', fn: () => fileContains('.gitignore', ['node_modules', '.env', 'dist']) },
  { id: 'A4', category: 'A', desc: '.env.example exists', points: 2, tier: 'P0', fn: () => fileExists('.env.example') },
  { id: 'A5', category: 'A', desc: 'docs/ directory exists', points: 1, tier: 'P1', fn: () => dirExists('docs') },
  { id: 'A6', category: 'A', desc: 'docs/adr/ directory exists', points: 2, tier: 'P1', fn: () => dirExists('docs/adr') },
  { id: 'A7', category: 'A', desc: 'docs/runbooks/ directory exists', points: 1, tier: 'P2', fn: () => dirExists('docs/runbooks') },
  { id: 'A8', category: 'A', desc: 'AGENTS.md exists (universal AI agent instructions)', points: 3, tier: 'P0', fn: () => fileExists('AGENTS.md') },
  { id: 'A9', category: 'A', desc: 'LICENSE file exists', points: 2, tier: 'P1', fn: () => fileExistsAny(['LICENSE', 'LICENSE.md', 'LICENSE.txt']) },
  { id: 'A10', category: 'A', desc: 'docs/specs/ directory exists', points: 2, tier: 'P2', fn: () => dirExists('docs/specs') },

  // Category B: CI/CD Pipeline
  { id: 'B1', category: 'B', desc: '.github/workflows/deploy.yml exists', points: 5, tier: 'P0', fn: () => fileExists('.github/workflows/deploy.yml') },
  { id: 'B2', category: 'B', desc: 'deploy.yml contains a test step', points: 3, tier: 'P0', fn: () => fileContains('.github/workflows/deploy.yml', ['vitest']) || fileContains('.github/workflows/deploy.yml', ['test']) },
  { id: 'B3', category: 'B', desc: 'deploy.yml contains a build step', points: 3, tier: 'P0', fn: () => fileContains('.github/workflows/deploy.yml', ['build']) },
  { id: 'B4', category: 'B', desc: '.github/workflows/compliance-check.yml exists', points: 3, tier: 'P1', fn: () => fileExists('.github/workflows/compliance-check.yml') },

  // Category C: Testing
  { id: 'C1', category: 'C', desc: 'vitest.config.ts exists with coverage thresholds', points: 3, tier: 'P0', fn: () => fileContains('vitest.config.ts', ['thresholds', 'coverage']) || fileContains('vitest.config.js', ['thresholds', 'coverage']) },
  { id: 'C2', category: 'C', desc: 'tests/ directory exists', points: 3, tier: 'P0', fn: () => dirExists('tests') || dirExists('test') || dirExists('__tests__') },
  { id: 'C3', category: 'C', desc: 'tests/unit/ directory exists', points: 2, tier: 'P0', fn: () => dirExists('tests/unit') },
  { id: 'C4', category: 'C', desc: 'tests/integration/ directory exists', points: 2, tier: 'P0', fn: () => dirExists('tests/integration') },
  { id: 'C5', category: 'C', desc: 'tests/e2e/ directory with .spec.ts files', points: 3, tier: 'P0', fn: () => dirHasFiles('tests/e2e', '.spec.ts') || dirHasFiles('e2e', '.spec.ts') },
  { id: 'C6', category: 'C', desc: 'playwright.config.ts exists', points: 2, tier: 'P0', fn: () => fileExistsAny(['playwright.config.ts', 'playwright.config.js']) },
  { id: 'C7', category: 'C', desc: 'tests/mocks/ directory exists', points: 2, tier: 'P1', fn: () => dirExists('tests/mocks') },

  // Category D: Security
  { id: 'D1', category: 'D', desc: 'No hardcoded secrets in source code', points: 5, tier: 'P0', fn: () => noSecrets() },
  { id: 'D2', category: 'D', desc: '.env file is in .gitignore', points: 3, tier: 'P0', fn: () => fileContains('.gitignore', ['.env']) },
  { id: 'D3', category: 'D', desc: 'helmet middleware present in backend', points: 2, tier: 'P0', fn: () => codeContains('helmet') },
  { id: 'D5', category: 'D', desc: 'No critical npm vulnerabilities', points: 3, tier: 'P0', fn: () => !fileExists('package.json') || npmAuditPasses() },

  // Category E: Code Quality
  { id: 'E1', category: 'E', desc: 'ESLint config exists', points: 2, tier: 'P0', fn: () => fileExistsAny(['eslint.config.js', 'eslint.config.ts', 'eslint.config.mjs', '.eslintrc.js', '.eslintrc.json', '.eslintrc.yml', '.eslintrc.yaml']) },
  { id: 'E2', category: 'E', desc: 'Prettier config exists', points: 2, tier: 'P1', fn: () => fileExistsAny(['.prettierrc', '.prettierrc.json', '.prettierrc.js', 'prettier.config.js', 'prettier.config.ts']) },
  { id: 'E3', category: 'E', desc: 'tsconfig.json exists with strict mode', points: 3, tier: 'P0', fn: () => fileContains('tsconfig.json', ['"strict"']) || fileContains('tsconfig.json', ['strict: true']) },

  // Category F: Documentation
  { id: 'F3', category: 'F', desc: 'CHANGELOG.md has at least one entry (## heading)', points: 2, tier: 'P0', fn: () => fileContains('CHANGELOG.md', ['##']) },

  // Category G: Pre-commit Hooks & Syntax Checks (G1-G2 bonus; G6-G8 scored)
  { id: 'G1', category: 'G', desc: '.husky/ directory exists', points: 1, tier: 'P2', bonus: true, fn: () => dirExists('.husky') },
  { id: 'G2', category: 'G', desc: 'lint-staged config exists', points: 1, tier: 'P2', bonus: true, fn: () => fileExistsAny(['.lintstagedrc', '.lintstagedrc.json', '.lintstagedrc.js', 'lint-staged.config.js']) || fileContains('package.json', ['lint-staged']) },
  { id: 'G6', category: 'G', desc: '.github/workflows/syntax-check.yml exists', points: 3, tier: 'P1', bonus: false, fn: () => fileExists('.github/workflows/syntax-check.yml') },
  { id: 'G7', category: 'G', desc: '.pre-commit-config.yaml exists', points: 2, tier: 'P2', bonus: false, fn: () => fileExistsAny(['.pre-commit-config.yaml', '.pre-commit-config.yml']) },
  { id: 'G8', category: 'G', desc: 'SYNTAX_ERROR_PREVENTION_STANDARD.md exists or syntax standard referenced', points: 1, tier: 'P1', bonus: false, fn: () => fileExists('SYNTAX_ERROR_PREVENTION_STANDARD.md') || fileContains('AGENTS.md', ['SYNTAX_ERROR_PREVENTION', 'syntax-check', 'pre-commit']) },
];

// ─── Run Checks ───────────────────────────────────────────
console.log('\n');
console.log('╔══════════════════════════════════════════════════════════╗');
console.log('║          REVVEL COMPLIANCE CHECKER v1.1.0                ║');
console.log('╚══════════════════════════════════════════════════════════╝');
console.log(`\nAuditing: ${repoRoot}\n`);

// Calculate max score (excluding bonus checks)
const coreChecks = checks.filter((c) => !c.bonus);
const maxScore = coreChecks.reduce((sum, c) => sum + c.points, 0);

for (const check of checks) {
  const isBonus = check.bonus === true;
  if (!isBonus) totalPoints += check.points;

  let passed = false;
  try {
    passed = check.fn();
  } catch (e) {
    passed = false;
  }

  const icon = passed ? '✅' : '❌';
  const pointsStr = passed
    ? `${check.points}/${check.points}`
    : `0/${check.points}`;
  const label = `${check.id} [${check.tier}] ${check.desc}`;
  const padding = Math.max(0, 58 - label.length);

  console.log(`  ${icon} ${label}${'.'.repeat(padding)} ${pointsStr}${isBonus ? ' (bonus)' : ''}`);

  results.push({ ...check, passed });
  if (passed && !isBonus) earnedPoints += check.points;
  if (!passed && !isBonus) failures[check.tier].push(check.id);
}

// ─── Score Report ─────────────────────────────────────────
const score = Math.round((earnedPoints / totalPoints) * 100);
let status;
let statusIcon;
if (score >= 90) { status = 'Compliant — ready to ship'; statusIcon = '✅'; }
else if (score >= 70) { status = 'Conditional — resolve P0 failures before next deploy'; statusIcon = '⚠️'; }
else if (score >= 50) { status = 'Non-Compliant — blocked from production'; statusIcon = '🔴'; }
else { status = 'Critical failure — immediate remediation required'; statusIcon = '🚫'; }

console.log('\n──────────────────────────────────────────────────────────');
console.log(`  SCORE: ${earnedPoints}/${totalPoints} (${score}%)  ${statusIcon}  ${status}`);
console.log('──────────────────────────────────────────────────────────\n');

if (failures.P0.length > 0) {
  console.log(`  🔴 P0 FAILURES (blocks deployment): ${failures.P0.join(', ')}`);
}
if (failures.P1.length > 0) {
  console.log(`  🟡 P1 FAILURES (required within 30 days): ${failures.P1.join(', ')}`);
}
if (failures.P2.length > 0) {
  console.log(`  🟢 P2 NOTICES (best practice): ${failures.P2.join(', ')}`);
}

console.log('');

// Export functions for testing if required
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    codeContains,
    fileExists,
    dirExists,
    dirHasFiles,
    fileContains,
    fileExistsAny
  };
}

// Exit with error code if P0 failures exist (used by CI)
if (require.main === module) {
  if (failures.P0.length > 0) {
    console.log('  ❌ P0 failures found. CI will block deployment until resolved.\n');
    process.exit(1);
  }

  if (score < 70) {
    console.log('  ❌ Score below 70. Non-compliant.\n');
    process.exit(1);
  }

  console.log('  ✅ No P0 failures. Compliance check passed.\n');
  process.exit(0);
}
