#!/usr/bin/env node
/**
 * trivy-report.js <secrets.json> [other.json] — turn Trivy JSON into a short
 * text report and an exit code. Part of Proofy security gate 2.
 *
 * secrets.json (from `trivy fs --scanners secret`): ANY HIGH or CRITICAL secret
 *   finding blocks (exit 1). Prints rule id, file and line only. Never prints the
 *   matched text.
 * other.json (vuln + misconfig): counted and listed, never blocks.
 * A missing or unparsable secrets.json blocks (exit 2): a scan that produced no
 * report must not read as clean. A missing other.json is reported, not fatal.
 */
'use strict';

const fs = require('node:fs');

function load(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function secretFindings(report) {
  const out = [];
  for (const r of report.Results || []) {
    for (const s of r.Secrets || []) {
      if (s.Severity === 'HIGH' || s.Severity === 'CRITICAL') {
        out.push({ file: r.Target, line: s.StartLine, rule: s.RuleID, severity: s.Severity, title: s.Title });
      }
    }
  }
  return out;
}

function otherCounts(report) {
  const vulns = [];
  const misconfigs = [];
  for (const r of report.Results || []) {
    for (const v of r.Vulnerabilities || []) {
      vulns.push({ file: r.Target, id: v.VulnerabilityID, pkg: v.PkgName, severity: v.Severity, fixed: v.FixedVersion || '' });
    }
    for (const m of r.Misconfigurations || []) {
      misconfigs.push({ file: r.Target, id: m.ID, severity: m.Severity, title: m.Title });
    }
  }
  return { vulns, misconfigs };
}

function main(argv) {
  const [secretsFile, otherFile] = argv;
  let secrets;
  try {
    secrets = secretFindings(load(secretsFile));
  } catch (err) {
    console.error(`trivy-report: no usable secret-scan report (${err.code || err.name}). Failing closed.`);
    return 2;
  }
  console.log(`Trivy secrets (HIGH/CRITICAL): ${secrets.length}`);
  for (const s of secrets) console.log(`  BLOCKED ${s.file}:${s.line} [${s.severity} ${s.rule}] ${s.title || ''}`.trimEnd());

  if (otherFile) {
    try {
      const { vulns, misconfigs } = otherCounts(load(otherFile));
      console.log(`Trivy vulnerabilities (HIGH/CRITICAL, report only): ${vulns.length}`);
      for (const v of vulns.slice(0, 20)) console.log(`  ${v.file} ${v.id} ${v.pkg} [${v.severity}]${v.fixed ? ` fixed in ${v.fixed}` : ''}`);
      console.log(`Trivy misconfigurations (HIGH/CRITICAL, report only): ${misconfigs.length}`);
      for (const m of misconfigs.slice(0, 20)) console.log(`  ${m.file} ${m.id} [${m.severity}] ${m.title}`);
    } catch {
      console.log('Trivy vulnerability/misconfiguration report: not available this run (the scan could not complete). Secrets result above still stands.');
    }
  } else {
    console.log('Trivy vulnerability/misconfiguration report: not available this run (the scan could not complete). Secrets result above still stands.');
  }
  if (secrets.length) {
    console.log('A secret in a PR must be rotated, not just removed. If this is a false positive, add its rule or path to .trivyignore.yaml with a reason and a human reviewer.');
    return 1;
  }
  return 0;
}

module.exports = { secretFindings, otherCounts };

if (require.main === module) {
  process.exit(main(process.argv.slice(2)));
}
