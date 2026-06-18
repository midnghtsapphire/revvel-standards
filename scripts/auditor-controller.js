#!/usr/bin/env node
'use strict';

// auditor-controller.js — meta-audit that catches recurring failures
// (Doppler regressions, WRs-without-PR / "groundhog day", and a registry
// of past-fix assertions). Outputs ONE markdown report; the workflow
// upserts a single tracking issue so the repo never accumulates dupes.
//
// Run:
//   node scripts/auditor-controller.js                    # print report
//   node scripts/auditor-controller.js --check            # exit 1 if findings
//
// All checks are pure functions over the working tree + (optional) the
// GitHub API. The script is intentionally one file — adding a new
// assertion is one function in CHECKS below.

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const REPO_ROOT = path.resolve(__dirname, '..');

// ── Helpers ─────────────────────────────────────────────────────────────────

function read(rel) {
  try { return fs.readFileSync(path.join(REPO_ROOT, rel), 'utf8'); }
  catch { return ''; }
}

function glob(rel) {
  try {
    return execSync(`find ${rel} -type f`, { cwd: REPO_ROOT })
      .toString().split('\n').filter(Boolean);
  } catch { return []; }
}

// ── Assertions ──────────────────────────────────────────────────────────────
//
// Each check returns { id, name, pass, detail } where detail is a short
// human-readable message used in the report when pass=false.

const CHECKS = [
  // ─── Doppler regression check ─────────────────────────────────────────
  {
    id: 'doppler-disabled',
    name: 'Doppler auto-recover is disabled in secret workflows',
    run() {
      const guard = read('.github/workflows/secret-persistence-guard.yml');
      const sentinel = read('.github/workflows/secrets-sentinel.yml');
      // The kill switches we put in PR #14672:
      const guardOff = /if false; then\s*#\s*was: if \[ -n "\$DOPPLER_TOKEN" \]/i.test(guard);
      const sentinelOff = /DOPPLER DISABLED|Auto-heal disabled/i.test(sentinel);
      const pass = guardOff && sentinelOff;
      const detail = pass ? '' : [
        guardOff ? '' : '- secret-persistence-guard.yml: Doppler block missing the `if false` kill switch',
        sentinelOff ? '' : '- secrets-sentinel.yml: heal step missing the DOPPLER DISABLED notice',
      ].filter(Boolean).join('\n');
      return { pass, detail };
    },
  },

  // ─── WR-without-PR groundhog day ──────────────────────────────────────
  {
    id: 'wr-pr-link',
    name: 'Every wr/issues/issue-*.md has a linked PR or is closed',
    run() {
      const wrs = glob('wr/issues').filter(p => /issue-\d+/.test(p));
      const missing = [];
      for (const wr of wrs) {
        const body = read(wr.replace(REPO_ROOT + '/', ''));
        // Heuristic: a WR is "active and unlinked" if it has neither
        // a PR ref (^Implementation PR:, `PR #`, `pull/<n>`) nor a
        // ✅/closed marker.
        const hasPR = /Implementation PR:|PR #\d+|\/pull\/\d+/i.test(body);
        const closed = /WR Status:\s*(✅|closed|complete|merged)/i.test(body);
        if (!hasPR && !closed) {
          const num = (path.basename(wr).match(/issue-(\d+)/) || [])[1];
          if (num) missing.push(`#${num}`);
        }
      }
      const pass = missing.length === 0;
      return {
        pass,
        detail: pass ? '' : `${missing.length} WR file(s) without a linked PR and not marked closed:\n` +
          missing.slice(0, 25).map(x => `  - ${x}`).join('\n') +
          (missing.length > 25 ? `\n  - ... +${missing.length - 25} more` : ''),
      };
    },
  },

  // ─── No throwaway dev files at repo root ──────────────────────────────
  {
    id: 'no-root-junk',
    name: 'No throwaway dev files at repo root',
    run() {
      const junkPatterns = /^(plan|finish_clean|fix_boilerplate|update_wr|tmp[_-].*|scratch.*|temp[_-].*|throwaway.*|notes)\.(js|mjs|ts|md|sh|py|txt)$/;
      let root;
      try {
        root = fs.readdirSync(REPO_ROOT);
      } catch { return { pass: true, detail: '' }; }
      const junk = root.filter(f => junkPatterns.test(f));
      return {
        pass: junk.length === 0,
        detail: junk.length === 0 ? '' : `Throwaway files at root:\n` + junk.map(f => `  - ${f}`).join('\n'),
      };
    },
  },

  // ─── Subscription tracker inventory completeness ──────────────────────
  {
    id: 'subscription-dates',
    name: 'Subscription tracker entries have renewal/trial dates',
    run() {
      const yml = read('data/subscriptions.yml');
      if (!yml) return { pass: true, detail: 'no data/subscriptions.yml' };
      const entries = yml.split(/^  - name:/m).slice(1);
      const missing = [];
      for (const e of entries) {
        const name = (e.match(/^\s*(.+?)\s*$/m) || [])[1];
        const hasTrial = /trial_end:\s*\d{4}-\d{2}-\d{2}/.test(e);
        const hasRenewal = /renewal_date:\s*\d{4}-\d{2}-\d{2}/.test(e);
        const usagePriced = /billing_cycle:\s*(usage|free)/i.test(e);
        if (!hasTrial && !hasRenewal && !usagePriced) missing.push(name);
      }
      return {
        pass: missing.length === 0,
        detail: missing.length === 0 ? '' : `Entries missing a date (fill from each provider's dashboard):\n` +
          missing.map(n => `  - ${n}`).join('\n'),
      };
    },
  },

  // ─── Doppler still wired anywhere it shouldn't be ─────────────────────
  {
    id: 'doppler-spread',
    name: 'No new Doppler call sites added outside the gated blocks',
    run() {
      let hits;
      try {
        hits = execSync(
          `grep -rln "DOPPLER_TOKEN\\|doppler.com/v3" .github/workflows/ scripts/ 2>/dev/null`,
          { cwd: REPO_ROOT }
        ).toString().split('\n').filter(Boolean);
      } catch { hits = []; }
      // Expected (gated) call sites — only these may reference Doppler:
      const allowed = new Set([
        '.github/workflows/secret-persistence-guard.yml', // gated via `if false`
        '.github/workflows/secrets-sentinel.yml',         // early-exits before doppler
        '.github/workflows/doppler-secrets-sync.yml',     // a deliberate sync workflow
        '.github/workflows/secret-rotation-schedule.yml',
        '.github/workflows/credential-gatekeeper.yml',
        '.github/workflows/gatekeeper-rotate.yml',
        '.github/workflows/secrets-guardian.yml',
        '.github/workflows/secrets-health-check.yml',
        '.github/workflows/gatekeeper-registry-drift.yml',
        '.github/workflows/sync-secrets-to-repos.yml',
        '.github/workflows/credential-autonomy-agent.yml',
        '.github/workflows/secret-lifecycle.yml',
        '.github/workflows/credential-label-router.yml',
        'scripts/credential-backup-harness.js',
        'scripts/credential-autonomy-agent.js',
        'scripts/auto-credential-fetcher.js',
        'scripts/auto-sync-credentials.js',
        'scripts/auto-fetch-credentials.sh',
        'scripts/auto-fetch-credentials.ps1',
        'scripts/gatekeeper-sync.sh',
        'scripts/gatekeeper-cli.sh',
        'scripts/gatekeeper-rotate.sh',
        'scripts/sync-bom.sh',
        'scripts/sync-secrets.js',
        'scripts/secrets-guardian.sh',
        'scripts/secret-set.sh',
        'scripts/provision-repo-secrets.sh',
        'scripts/auditor-controller.js',
        '.github/workflows/bito-ai.yml',
        '.github/workflows/eeat-trust-cron.yml',
        'scripts/gatekeeper-cli.md',
      ]);
      const unexpected = hits.filter(p => !allowed.has(p));
      return {
        pass: unexpected.length === 0,
        detail: unexpected.length === 0 ? '' :
          `New unexpected Doppler reference(s):\n` + unexpected.map(p => `  - ${p}`).join('\n') +
          `\nIf intentional: add to the \`allowed\` list in scripts/auditor-controller.js.`,
      };
    },
  },
];

// ── Runner ──────────────────────────────────────────────────────────────────

function runAll() {
  return CHECKS.map(c => {
    let r;
    try { r = c.run(); } catch (e) { r = { pass: false, detail: `Check errored: ${e.message}` }; }
    return { id: c.id, name: c.name, ...r };
  });
}

function renderReport(results) {
  const failed = results.filter(r => !r.pass);
  const passed = results.filter(r => r.pass);
  const date = new Date().toISOString().slice(0, 10);
  const lines = [
    '<!-- auditor-controller -->',
    '## 🛡️ Auditor Controller — Recurring Failure Audit',
    '',
    `Generated ${date} · checks: ${results.length} · failing: ${failed.length}`,
    '',
  ];
  if (failed.length === 0) {
    lines.push('✅ All recurring-failure checks passed.');
  } else {
    lines.push('### ❌ Failing checks');
    lines.push('');
    for (const f of failed) {
      lines.push(`#### ${f.name}`);
      lines.push('');
      lines.push('```');
      lines.push(f.detail);
      lines.push('```');
      lines.push('');
    }
  }
  lines.push('### Passing checks');
  for (const p of passed) lines.push(`- ✅ ${p.name}`);
  lines.push('');
  lines.push('---');
  lines.push('_Maintained by `.github/workflows/auditor-controller.yml`. Add new assertions in `scripts/auditor-controller.js` → `CHECKS`._');
  return lines.join('\n');
}

const args = process.argv.slice(2);
const results = runAll();
console.log(renderReport(results));
if (args.includes('--check') && results.some(r => !r.pass)) process.exit(1);
