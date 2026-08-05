#!/usr/bin/env node
/**
 * Patch agent — deterministic dependency-vulnerability patcher.
 *
 * Answers WR #14579 ("n8n or gumloop applies patches or agent called Patch"):
 * given a security advisory, scan every package.json in the repo, resolve the
 * installed version from the matching lockfile, decide whether it is actually
 * vulnerable, and (optionally) raise the declared range to a patched floor.
 *
 * Why a repo-native agent and not n8n/gumloop: patching source lives next to the
 * code, needs the git/PR primitives, and must be reproducible in CI. A SaaS flow
 * adds credential storage + an external dependency for a task GitHub Actions
 * already does deterministically and for free. See skills/patch-agent/SKILL.md.
 *
 * Pure + injectable so it is unit-testable; no network calls. The CLI scans the
 * real tree, but the core verdict function takes plain data.
 *
 *   node scripts/patch-agent.js --check            # report only (exit 0)
 *   node scripts/patch-agent.js --check --strict   # exit 1 if anything vulnerable
 *   node scripts/patch-agent.js --fix              # raise vulnerable declared ranges
 */
'use strict';

const fs = require('fs');
const path = require('path');
const semver = require('semver');

const REPO_ROOT = path.resolve(__dirname, '..');
const ADVISORY_FILE = path.join(REPO_ROOT, 'data', 'security-advisories.json');
const SKIP_DIRS = new Set(['node_modules', '.git', '.github']);

function loadAdvisories(file = ADVISORY_FILE) {
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  return data.advisories || [];
}

// Verdict for a single resolved version against an advisory. Pure.
// Returns 'vulnerable' | 'safe' | 'unknown'.
function classify(resolvedVersion, advisory) {
  if (resolvedVersion == null) return 'unknown';
  const v = semver.coerce(resolvedVersion);
  if (!v) return 'unknown';
  return semver.satisfies(v, advisory.vulnerableRange, { includePrerelease: true })
    ? 'vulnerable'
    : 'safe';
}

// Lowest patched version that is >= the resolved version's major line, so the
// recommended bump is the minimal safe move (no surprise major upgrades).
function recommendedFloor(resolvedVersion, advisory) {
  const v = semver.coerce(resolvedVersion);
  const sorted = [...advisory.patchedVersions].sort(semver.compare);
  if (v) {
    const sameMajor = sorted.find((p) => semver.major(p) === semver.major(v));
    if (sameMajor) return sameMajor;
  }
  return sorted[sorted.length - 1];
}

function findPackageJsons(root = REPO_ROOT) {
  const out = [];
  (function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (!SKIP_DIRS.has(entry.name)) walk(path.join(dir, entry.name));
      } else if (entry.name === 'package.json') {
        out.push(path.join(dir, entry.name));
      }
    }
  })(root);
  return out;
}

// Resolved version of a package from the nearest lockfile next to a package.json.
function resolvedFromLock(pkgJsonPath, pkgName) {
  const lock = path.join(path.dirname(pkgJsonPath), 'package-lock.json');
  if (!fs.existsSync(lock)) return null;
  const data = JSON.parse(fs.readFileSync(lock, 'utf8'));
  const packages = data.packages || {};
  const node = packages[`node_modules/${pkgName}`];
  return node && node.version ? node.version : null;
}

function declaredRange(pkgJson, pkgName) {
  for (const field of ['dependencies', 'devDependencies', 'optionalDependencies']) {
    if (pkgJson[field] && pkgJson[field][pkgName]) return { field, range: pkgJson[field][pkgName] };
  }
  return null;
}

// Scan the whole tree for one advisory. Returns a list of findings.
function scan(advisory, root = REPO_ROOT) {
  const findings = [];
  for (const pkgPath of findPackageJsons(root)) {
    const pkgJson = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    const declared = declaredRange(pkgJson, advisory.package);
    if (!declared) continue;
    const resolved = resolvedFromLock(pkgPath, advisory.package);
    findings.push({
      file: path.relative(root, pkgPath),
      field: declared.field,
      declared: declared.range,
      resolved,
      verdict: classify(resolved, advisory),
      recommended: recommendedFloor(resolved, advisory),
    });
  }
  return findings;
}

function applyFix(pkgPath, advisory, finding) {
  const pkgJson = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  const floor = finding.recommended;
  pkgJson[finding.field][advisory.package] = `^${floor}`;
  fs.writeFileSync(pkgPath, JSON.stringify(pkgJson, null, 2) + '\n');
  return floor;
}

function main(argv) {
  const args = new Set(argv.slice(2));
  const fix = args.has('--fix');
  const strict = args.has('--strict');
  const advisories = loadAdvisories();

  let vulnerableCount = 0;
  console.log(`🩹 Patch agent — ${advisories.length} advisory(ies) loaded\n`);

  for (const adv of advisories) {
    const findings = scan(adv);
    const header = `${adv.package} — ${adv.cve} (${adv.severity})`;
    if (findings.length === 0) {
      console.log(`• ${header}: not a declared dependency anywhere. ✅`);
      continue;
    }
    for (const f of findings) {
      const tag = f.verdict === 'vulnerable' ? '❌ VULNERABLE' : f.verdict === 'safe' ? '✅ safe' : '⚠️ unknown';
      console.log(`• ${header}\n    ${f.file} (${f.field}): declared ${f.declared}, resolved ${f.resolved || '?'} → ${tag}`);
      if (f.verdict === 'vulnerable') {
        vulnerableCount++;
        if (fix) {
          const floor = applyFix(path.join(REPO_ROOT, f.file), adv, f);
          console.log(`    ↳ raised ${advisory_label(adv)} floor to ^${floor}`);
        } else {
          console.log(`    ↳ fix: raise to ^${f.recommended} (run with --fix)`);
        }
      }
    }
  }

  console.log(`\n${vulnerableCount === 0 ? '✅ No vulnerable declared dependencies found.' : `❌ ${vulnerableCount} vulnerable dependency declaration(s).`}`);
  if (strict && vulnerableCount > 0) process.exit(1);
}

function advisory_label(adv) {
  return `${adv.package}`;
}

if (require.main === module) {
  main(process.argv);
}

module.exports = { loadAdvisories, classify, recommendedFloor, scan, declaredRange };
