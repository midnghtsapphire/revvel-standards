#!/usr/bin/env node
'use strict';

/**
 * Markdown Image Alt-text Checker
 *
 * Mirrors the marketplace action ruthtxh/markdown-image-alt-text-checker@v1
 * (WR #16270): flag markdown images with empty alt text, i.e. `![](url)`.
 *
 * Why a local script exists in addition to the marketplace action:
 *   - The marketplace action walks the full git tree via the GitHub API and
 *     fetches every .md file. This monorepo has thousands of markdown files
 *     (including generated WR packets and agent transcripts), so the API walk
 *     is slow, rate-limit heavy, and can thrash other automation.
 *   - The action is single-author and last released 2023-04 (node16 runtime).
 *     Per docs/THIRD_PARTY_ACTION_AUDIT.md we still pin and wire it, but the
 *     authoritative PR gate is this checkout-local scan.
 *
 * Proper syntax:  ![descriptive alt text](url)
 * Missing alt:    ![](url)
 *
 * Env:
 *   ROOT              Scan root (default: cwd)
 *   EXTRA_EXCLUDE     Comma-separated path substrings to skip
 *   GITHUB_STEP_SUMMARY  When set, append a short report (Actions runners)
 *
 * Exit codes:
 *   0 — no empty-alt images found
 *   1 — one or more empty-alt images found (or I/O error)
 */

const fs = require('fs');
const path = require('path');

// Default excludes match lint-md.yml / markdownlint-cli2 so generated noise
// never blocks a product PR. Keep this list in sync when adding new dump dirs.
const DEFAULT_EXCLUDES = [
  `${path.sep}node_modules${path.sep}`,
  `${path.sep}.git${path.sep}`,
  `${path.sep}dist${path.sep}`,
  `${path.sep}vendor${path.sep}`,
  `${path.sep}wr${path.sep}issues${path.sep}`,
  `${path.sep}wr${path.sep}pending${path.sep}`,
  `${path.sep}docs${path.sep}agents${path.sep}claude${path.sep}transcripts${path.sep}`,
  `${path.sep}research${path.sep}raw${path.sep}`,
];

// Same pattern the marketplace action looks for: empty alt brackets.
// Also catch optional title form `![](url "title")`. Built fresh per scan so
// callers never share a stateful `/g` lastIndex across invocations.
function emptyAltRegex() {
  return /!\[\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
}

/**
 * @param {string} root
 * @param {string[]} excludes
 * @returns {string[]} absolute paths to .md files under root
 */
function listMarkdownFiles(root, excludes = DEFAULT_EXCLUDES) {
  const out = [];
  /** @param {string} dir */
  function walk(dir) {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const ent of entries) {
      const full = path.join(dir, ent.name);
      // Normalize to posix-ish check against exclude substrings that use sep.
      const norm = full;
      if (excludes.some((ex) => norm.includes(ex))) continue;
      if (ent.isDirectory()) {
        // Also skip well-known dirs by name even if exclude path form differs.
        if (ent.name === 'node_modules' || ent.name === '.git' || ent.name === 'dist') continue;
        walk(full);
      } else if (ent.isFile() && ent.name.toLowerCase().endsWith('.md')) {
        out.push(full);
      }
    }
  }
  walk(root);
  return out;
}

/**
 * @param {string} filePath
 * @param {string} content
 * @returns {{file:string,line:number,url:string,snippet:string}[]}
 */
function findEmptyAltInContent(filePath, content) {
  const findings = [];
  const lines = String(content || '').split(/\r?\n/);
  // Docs need to show the bad `![](url)` form inside fenced examples. Skip
  // fenced code blocks (``` / ~~~) so educational samples are not violations.
  let inFence = false;
  let fenceMarker = '';
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const fenceOpen = line.match(/^\s*(`{3,}|~{3,})/);
    if (fenceOpen) {
      const marker = fenceOpen[1][0];
      if (!inFence) {
        inFence = true;
        fenceMarker = marker;
        continue;
      }
      if (marker === fenceMarker) {
        inFence = false;
        fenceMarker = '';
        continue;
      }
    }
    if (inFence) continue;

    const re = emptyAltRegex();
    let m;
    while ((m = re.exec(line)) !== null) {
      findings.push({
        file: filePath,
        line: i + 1,
        url: m[1],
        snippet: line.trim().slice(0, 160),
      });
    }
  }
  return findings;
}

/**
 * @param {{root?:string, excludes?:string[], files?:{path:string,content:string}[]}} opts
 * @returns {{ok:boolean, findings:Array<{file:string,line:number,url:string,snippet:string}>, scanned:number}}
 */
function checkMarkdownImageAlt(opts = {}) {
  const root = opts.root || process.cwd();
  const excludes = opts.excludes || DEFAULT_EXCLUDES;

  /** @type {{path:string,content:string}[]} */
  let files = opts.files;
  if (!files) {
    files = listMarkdownFiles(root, excludes).map((p) => ({
      path: p,
      content: fs.readFileSync(p, 'utf8'),
    }));
  }

  const findings = [];
  for (const f of files) {
    const rel = path.isAbsolute(f.path) ? path.relative(root, f.path) || f.path : f.path;
    const hits = findEmptyAltInContent(rel, f.content);
    findings.push(...hits);
  }
  return { ok: findings.length === 0, findings, scanned: files.length };
}

function buildExcludesFromEnv() {
  const extra = (process.env.EXTRA_EXCLUDE || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => (s.includes(path.sep) ? s : `${path.sep}${s}${path.sep}`));
  return DEFAULT_EXCLUDES.concat(extra);
}

function main() {
  const root = process.env.ROOT ? path.resolve(process.env.ROOT) : process.cwd();
  const excludes = buildExcludesFromEnv();
  const result = checkMarkdownImageAlt({ root, excludes });

  if (result.ok) {
    const msg = `Markdown Image Alt-text Checker: OK (${result.scanned} markdown file(s) scanned, 0 empty-alt images).`;
    console.log(msg);
    if (process.env.GITHUB_STEP_SUMMARY) {
      fs.appendFileSync(
        process.env.GITHUB_STEP_SUMMARY,
        `### Markdown Image Alt-text Checker\n\n${msg}\n`
      );
    }
    return 0;
  }

  console.log(
    `Markdown Image Alt-text Checker: ${result.findings.length} image(s) missing alt-text in ${result.scanned} file(s).\n`
  );
  for (const f of result.findings) {
    // GitHub Actions annotation format so the PR Files view highlights the line.
    console.log(
      `::warning file=${f.file},line=${f.line}::Missing alt-text for image ${f.url} on line ${f.line}. Use ![descriptive alt](${f.url})`
    );
    console.log(`  ${f.file}:${f.line}  ${f.snippet}`);
  }
  console.log(
    '\nFix: replace `![](url)` with `![short description of the image](url)`.\n' +
      'Alt-text improves accessibility and SEO. See WR #16270 / marketplace action ' +
      'ruthtxh/markdown-image-alt-text-checker.'
  );

  if (process.env.GITHUB_STEP_SUMMARY) {
    const lines = [
      '### Markdown Image Alt-text Checker',
      '',
      `**${result.findings.length}** image(s) missing alt-text.`,
      '',
      '| File | Line | URL |',
      '| --- | ---: | --- |',
      ...result.findings.map((f) => `| \`${f.file}\` | ${f.line} | \`${f.url}\` |`),
      '',
    ];
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, lines.join('\n'));
  }
  return 1;
}

if (require.main === module) {
  try {
    process.exit(main());
  } catch (err) {
    console.error('markdown-image-alt-text-checker error:', err && err.message ? err.message : err);
    process.exit(1);
  }
}

module.exports = {
  checkMarkdownImageAlt,
  findEmptyAltInContent,
  listMarkdownFiles,
  emptyAltRegex,
  DEFAULT_EXCLUDES,
};
