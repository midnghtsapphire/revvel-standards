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

const REPO_ROOT = path.resolve(__dirname, '..');

// ── Helpers (pure Node — no shell, no injection surface) ────────────────────

function read(rel) {
  try { return fs.readFileSync(path.join(REPO_ROOT, rel), 'utf8'); }
  catch { return ''; }
}

function walk(dir, out = []) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); }
  catch { return out; }
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.isFile()) out.push(p);
  }
  return out;
}

function glob(rel) {
  return walk(path.join(REPO_ROOT, rel))
    .map(p => path.relative(REPO_ROOT, p));
}

function grepIn(dirs, regex) {
  const hits = new Set();
  for (const d of dirs) {
    for (const file of walk(path.join(REPO_ROOT, d))) {
      const rel = path.relative(REPO_ROOT, file);
      let text;
      try { text = fs.readFileSync(file, 'utf8'); } catch { continue; }
      if (regex.test(text)) hits.add(rel);
    }
  }
  return [...hits];
}

// ── Assertions ──────────────────────────────────────────────────────────────
//
// Each check returns { id, name, pass, detail } where detail is a short
// human-readable message used in the report when pass=false.

// `gating: true` = this check CAN fail CI on PRs (regression guards).
// `gating: false` = the check still runs and shows in the report, but
// it never fails CI — it's documenting a pre-existing backlog that has
// to be drained by other PRs, not by this one.
const CHECKS = [
  // ─── Doppler is enabled (not disabled) ───────────────────────────────
  // Note: Previous version checked that Doppler was disabled. Since we're
  // re-adding Doppler, this now verifies Doppler IS enabled.
  {
    id: 'doppler-enabled',
    gating: false,  // Non-gating: just a warning/inventory check
    name: 'Doppler is enabled in secret recovery workflows',
    run() {
      const guard = read('.github/workflows/secret-persistence-guard.yml');
      const sentinel = read('.github/workflows/secrets-sentinel.yml');
      // Verify Doppler is NOT disabled via `if false` kill switch
      const guardHasKillSwitch = /if false; then\s*#\s*was: if \[ -n "\$DOPPLER_TOKEN" \]/i.test(guard);
      const sentinelHasKillSwitch = /DOPPLER DISABLED|Auto-heal disabled/i.test(sentinel);
      // Doppler is "enabled" if neither kill switch is present
      const pass = !guardHasKillSwitch && !sentinelHasKillSwitch;
      const detail = pass ? '' : [
        guardHasKillSwitch ? '- secret-persistence-guard.yml: Doppler has `if false` kill switch (disabled)' : '',
        sentinelHasKillSwitch ? '- secrets-sentinel.yml: Heal step has DOPPLER DISABLED notice' : '',
      ].filter(Boolean).join('\n');
      return { pass, detail };
    },
  },

  // ─── WR-without-PR groundhog day ──────────────────────────────────────
  {
    id: 'wr-pr-link',
    gating: false,
    name: 'Every wr/issues/issue-*.md has a linked PR or is closed',
    run() {
      const wrs = glob('wr/issues').filter(p => /issue-\d+/.test(p));
      const missing = [];
      for (const wr of wrs) {
        // glob() already returns paths relative to REPO_ROOT.
        const body = read(wr);
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
    gating: true,
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
    gating: false,
    name: 'Subscription tracker entries have renewal/trial dates',
    run() {
      const yml = read('data/subscriptions.yml');
      // Parse robustly per Octopus review: split AFTER `- name: `, take the
      // name from line 1 explicitly, and scope each entry's body to its own
      // block (everything up to the next `- name:`). The prior version's
      // multiline `^...$` non-greedy regex captured unpredictable text and
      // its date regexes scanned across the next entry, causing false
      // negatives plus `- undefined` rows.
      const entries = yml.split(/^  - name:\s*/m).slice(1);
      const missing = [];
      for (const e of entries) {
        const firstLine = e.split('\n', 1)[0].trim();
        const name = firstLine || '(unnamed)';
        const block = e.split(/^  - name:/m)[0];
        const hasTrial = /^\s{4,}trial_end:\s*\d{4}-\d{2}-\d{2}/m.test(block);
        const hasRenewal = /^\s{4,}renewal_date:\s*\d{4}-\d{2}-\d{2}/m.test(block);
        const usagePriced = /^\s{4,}billing_cycle:\s*(usage|free)/im.test(block);
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
    gating: true,
    name: 'No new Doppler call sites added outside the gated blocks',
    run() {
      const hits = grepIn(
        ['.github/workflows', 'scripts'],
        /DOPPLER_TOKEN|doppler\.com\/v3/
      );
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
        '.github/workflows/secrets-backup-daily.yml',
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
        'scripts/secrets-map.js',           // mentions DOPPLER_TOKEN in JSDoc comment only (decommission docs)
        '.github/workflows/bito-ai.yml',
        '.github/workflows/eeat-trust-cron.yml',
        'scripts/gatekeeper-cli.md',
        '.github/workflows/secrets-backup-daily.yml', // intentional daily backup workflow
        '.github/workflows/secrets-backup-daily.yml',
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
    // `gating` lives on the CHECK definition, not on the run() result —
    // forward it explicitly so the gating filter in --check actually
    // sees it. (Identified by cubic.)
    return { id: c.id, name: c.name, gating: c.gating === true, ...r };
  });
}

function renderReport(results) {
  const gatingFailed = results.filter(r => !r.pass && r.gating);
  const informational = results.filter(r => !r.pass && !r.gating);
  const passed = results.filter(r => r.pass);
  const failed = [...gatingFailed, ...informational];
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
    if (gatingFailed.length) {
      lines.push(`### ❌ Gating failures (block CI) — ${gatingFailed.length}`);
      lines.push('');
      for (const f of gatingFailed) {
        lines.push(`#### ${f.name}`);
        lines.push('');
        lines.push('```');
        lines.push(f.detail);
        lines.push('```');
        lines.push('');
      }
    }
    if (informational.length) {
      lines.push(`### 🟡 Informational (pre-existing backlog, doesn't block CI) — ${informational.length}`);
      lines.push('');
    }
    for (const f of informational) {
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
if (args.includes('--check') && results.some(r => !r.pass && r.gating)) process.exit(1);
