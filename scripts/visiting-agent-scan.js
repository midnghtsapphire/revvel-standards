#!/usr/bin/env node
'use strict';

// visiting-agent-scan.js — flag tracker, marketing, and agent-branding strings
// in app code. Rule: VISITING_AGENTS.md.
// Data: config/visiting-agent-patterns.json (patterns, allowlist, baseline).
//
// Usage (also runnable by hand, no bots needed):
//   node scripts/visiting-agent-scan.js             # scan all tracked app files
//   node scripts/visiting-agent-scan.js --report    # also list allowlisted / baselined hits
//   node scripts/visiting-agent-scan.js --write-baseline   # record current hits as baseline
//   node scripts/visiting-agent-scan.js path/a.html path/b.js
//
// Exit 0 = nothing new. Exit 1 = at least one hit that is not allowlisted or
// baselined. The script never edits or deletes app files.

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const CONFIG = path.join(ROOT, 'config', 'visiting-agent-patterns.json');

function globToRegex(glob) {
  let re = '';
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === '*') {
      if (glob[i + 1] === '*') {
        i++;
        if (glob[i + 1] === '/') { i++; re += '(?:.*/)?'; } else { re += '.*'; }
      } else {
        re += '[^/]*';
      }
    } else if ('\\^$+?.()|{}[]'.includes(c)) {
      re += '\\' + c;
    } else {
      re += c;
    }
  }
  return new RegExp('^' + re + '$');
}

function loadConfig(file = CONFIG) {
  const cfg = JSON.parse(fs.readFileSync(file, 'utf8'));
  cfg.compiled = cfg.patterns.map((p) => ({ ...p, re: new RegExp(p.regex, 'i') }));
  cfg.excludes = cfg.scope.exclude_globs.map(globToRegex);
  cfg.allow = cfg.allowlist.map((a) => ({ ...a, res: a.paths.map(globToRegex) }));
  cfg.baseMap = new Map();
  for (const group of cfg.baseline) {
    for (const e of group.entries) cfg.baseMap.set(e.path, new Set(e.patterns));
  }
  return cfg;
}

function inScope(cfg, file) {
  const top = file.split('/')[0];
  if (!cfg.scope.include_dirs.includes(top)) return false;
  if (!cfg.scope.extensions.includes(path.extname(file).toLowerCase())) return false;
  return !cfg.excludes.some((r) => r.test(file));
}

function trackedFiles() {
  return execFileSync('git', ['ls-files', '-z'], { cwd: ROOT, maxBuffer: 1 << 28 })
    .toString('utf8').split('\0').filter(Boolean);
}

function scanFile(cfg, file, text) {
  const hits = [];
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    for (const p of cfg.compiled) {
      if (p.re.test(lines[i])) hits.push({ file, line: i + 1, id: p.id, kind: p.kind, why: p.why, text: lines[i].trim().slice(0, 140) });
    }
  }
  return hits;
}

function classify(cfg, hit) {
  if (cfg.allow.some((a) => a.patterns.includes(hit.id) && a.res.some((r) => r.test(hit.file)))) return 'allowlisted';
  const base = cfg.baseMap.get(hit.file);
  if (base && base.has(hit.id)) return 'baselined';
  return 'new';
}

function scan(cfg, files) {
  const out = { new: [], allowlisted: [], baselined: [] };
  for (const f of files) {
    if (!inScope(cfg, f)) continue;
    let text;
    try { text = fs.readFileSync(path.join(ROOT, f), 'utf8'); } catch (_) { continue; }
    for (const h of scanFile(cfg, f, text)) out[classify(cfg, h)].push(h);
  }
  return out;
}

function main(argv) {
  const cfg = loadConfig();
  const args = argv.slice(2);
  const report = args.includes('--report');
  const writeBaseline = args.includes('--write-baseline');
  const files = args.filter((a) => !a.startsWith('--'));
  const result = scan(cfg, files.length ? files : trackedFiles());

  if (writeBaseline) {
    const raw = JSON.parse(fs.readFileSync(CONFIG, 'utf8'));
    const byFile = new Map();
    for (const h of [...result.new, ...result.baselined]) {
      if (!byFile.has(h.file)) byFile.set(h.file, new Set());
      byFile.get(h.file).add(h.id);
    }
    raw.baseline[0].entries = [...byFile.entries()].sort(([a], [b]) => a.localeCompare(b))
      .map(([p, ids]) => ({ path: p, patterns: [...ids].sort() }));
    fs.writeFileSync(CONFIG, JSON.stringify(raw, null, 2) + '\n');
    console.log(`baseline written: ${raw.baseline[0].entries.length} files`);
    return 0;
  }

  console.log(`visiting-agent-scan: ${result.new.length} new, ${result.baselined.length} baselined, ${result.allowlisted.length} allowlisted`);
  if (report) {
    for (const h of [...result.allowlisted, ...result.baselined]) console.log(`  [ok] ${h.file}:${h.line} ${h.id}`);
  }
  if (result.new.length) {
    for (const h of result.new) console.error(`  ${h.file}:${h.line} [${h.kind}/${h.id}] ${h.why}: ${h.text}`);
    console.error('\nBlocked by VISITING_AGENTS.md. Remove it, or ask Audrey to approve it for this repo.');
    console.error('If she approved it, add a path + pattern + reason to "allowlist" in config/visiting-agent-patterns.json.');
    return 1;
  }
  return 0;
}

if (require.main === module) process.exit(main(process.argv));
module.exports = { loadConfig, scan, scanFile, classify, inScope, globToRegex };
