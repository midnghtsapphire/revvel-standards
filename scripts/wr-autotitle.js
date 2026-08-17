'use strict';

/**
 * wr-autotitle.js
 *
 * Autocreate / clean / suggest generic WR titles so humans do not retype long
 * messy titles like:
 *   "[WR]  huge implementation research and filter and organize the chat..."
 *
 * Why this exists (WR #16923):
 *   - GitHub issue forms only prefill a bare `[WR] ` prefix.
 *   - Saved replies help for comment bodies but are easy to miss for titles.
 *   - Slash commands (`/wr-title`) are discoverable in the comment box.
 *   - Historical WR titles are noisy (double spaces, embedded /dragnet, URLs,
 *     recursive self-reference). A deterministic cleaner + template matcher
 *     gives consistent titles without an LLM.
 *
 * CLI:
 *   node scripts/wr-autotitle.js --clean "[WR]  fix ci asap"
 *   node scripts/wr-autotitle.js --suggest --title "..." --body "..."
 *   node scripts/wr-autotitle.js --mine wr/issues [--top 20]
 *   node scripts/wr-autotitle.js --check
 *   node scripts/wr-autotitle.js --list-templates
 *   node scripts/wr-autotitle.js --apply --title "..." --body "..." [--force]
 *
 * Exit codes reflect postconditions (valid registry / produced title), not
 * merely "the process finished."
 */

const fs = require('node:fs');
const path = require('node:path');
const YAML = require('yaml');

const REPO_ROOT = path.resolve(__dirname, '..');
const REGISTRY_PATH = path.join(REPO_ROOT, 'config', 'wr-title-templates.yml');

const KEY_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const URL_RE = /https?:\/\/[^\s)]+/gi;
const MARKDOWN_LINK_RE = /\[([^\]]*)\]\(([^)]+)\)/g;
const MULTI_SPACE_RE = /\s+/g;
const TRAILING_PUNCT_RE = /[\s.,;:!?/_-]+$/g;
const LEADING_PUNCT_RE = /^[\s.,;:!?/_-]+/g;
const WR_PREFIX_RE = /^\[WR\]\s*/i;

/**
 * @param {string} [registryPath]
 * @returns {object}
 */
function loadRegistry(registryPath = REGISTRY_PATH) {
  const raw = fs.readFileSync(registryPath, 'utf8');
  const parsed = YAML.parse(raw);
  if (!parsed || typeof parsed !== 'object') {
    throw new Error(`Registry at ${registryPath} did not parse to an object`);
  }
  return parsed;
}

/**
 * Validate registry shape. Empty array = valid.
 * @param {object} registry
 * @returns {string[]}
 */
function validateRegistry(registry) {
  const problems = [];
  if (!registry || typeof registry !== 'object') {
    return ['registry must be a mapping'];
  }
  if (!registry.defaults || typeof registry.defaults !== 'object') {
    problems.push('`defaults` must be a mapping');
  } else {
    if (typeof registry.defaults.prefix !== 'string' || !registry.defaults.prefix.trim()) {
      problems.push('`defaults.prefix` must be a non-empty string');
    }
    if (
      typeof registry.defaults.max_length !== 'number' ||
      registry.defaults.max_length < 20
    ) {
      problems.push('`defaults.max_length` must be a number >= 20');
    }
  }
  if (!Array.isArray(registry.templates) || registry.templates.length === 0) {
    problems.push('`templates` must be a non-empty list');
  } else {
    const seen = new Set();
    registry.templates.forEach((entry, i) => {
      const where = `templates[${i}]`;
      if (!entry || typeof entry !== 'object') {
        problems.push(`${where} must be a mapping`);
        return;
      }
      for (const field of ['key', 'title', 'usage']) {
        if (typeof entry[field] !== 'string' || !entry[field].trim()) {
          problems.push(`${where}.${field} must be a non-empty string`);
        }
      }
      if (typeof entry.key === 'string') {
        if (!KEY_RE.test(entry.key)) {
          problems.push(`${where}.key "${entry.key}" must be kebab-case`);
        }
        if (seen.has(entry.key)) {
          problems.push(`${where}.key "${entry.key}" is duplicated`);
        }
        seen.add(entry.key);
      }
      if (entry.keywords != null && !Array.isArray(entry.keywords)) {
        problems.push(`${where}.keywords must be a list when present`);
      }
    });
  }
  if (registry.starters != null) {
    if (!Array.isArray(registry.starters)) {
      problems.push('`starters` must be a list when present');
    } else {
      registry.starters.forEach((entry, i) => {
        const where = `starters[${i}]`;
        if (!entry || typeof entry !== 'object') {
          problems.push(`${where} must be a mapping`);
          return;
        }
        for (const field of ['key', 'title', 'body']) {
          if (typeof entry[field] !== 'string' || !entry[field].trim()) {
            problems.push(`${where}.${field} must be a non-empty string`);
          }
        }
      });
    }
  }
  return problems;
}

/**
 * Strip noise that should never live in a WR title.
 * @param {string} text
 * @param {object} [registry]
 * @returns {string}
 */
function stripNoise(text, registry = loadRegistry()) {
  let out = String(text || '');
  out = out.replace(MARKDOWN_LINK_RE, (_, label, url) => {
    const labelText = String(label || '').trim();
    if (labelText && !/^https?:/i.test(labelText)) return labelText;
    // Prefer final path segment of the URL as a short subject hint.
    try {
      const u = new URL(url);
      const seg = u.pathname.split('/').filter(Boolean).pop();
      return seg || u.hostname;
    } catch {
      return '';
    }
  });
  out = out.replace(URL_RE, (url) => {
    try {
      const u = new URL(url);
      const seg = u.pathname.split('/').filter(Boolean).pop();
      return seg || u.hostname;
    } catch {
      return '';
    }
  });
  const noise = Array.isArray(registry.noise_tokens) ? registry.noise_tokens : [];
  for (const token of noise) {
    if (!token) continue;
    const re = new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    out = out.replace(re, ' ');
  }
  // Drop self-referential nested [WR] blobs (title that quotes another title).
  out = out.replace(/\[WR\]/gi, ' ');
  return out;
}

/**
 * Normalize free text into a concise subject fragment.
 * @param {string} text
 * @param {object} [registry]
 * @returns {string}
 */
function normalizeSubject(text, registry = loadRegistry()) {
  let out = stripNoise(text, registry);
  out = out.replace(WR_PREFIX_RE, '');
  out = out.replace(MULTI_SPACE_RE, ' ').trim();
  if (registry.defaults && registry.defaults.strip_trailing_punctuation !== false) {
    out = out.replace(TRAILING_PUNCT_RE, '').replace(LEADING_PUNCT_RE, '').trim();
  }
  // Drop leading filler phrases that show up in brain-dump titles.
  out = out
    .replace(/^(?:need ability to|need to|i need to|i need|we need to|we need|please|pls)\s+/i, '')
    .replace(/^(?:to\s+)/i, '')
    .trim();
  // Collapse "autocreate generic WR titles so i do not have to retype..." style
  // run-ons: keep up to first sentence break if very long.
  if (out.length > 140) {
    const cut = out.search(/[.;](?:\s|$)/);
    if (cut > 20 && cut < 120) out = out.slice(0, cut).trim();
  }
  return out;
}

/**
 * Title-case lightly without destroying known acronyms / paths.
 * @param {string} subject
 * @returns {string}
 */
function softCapitalize(subject) {
  const s = String(subject || '').trim();
  if (!s) return s;
  // Keep paths / scoped packages as-is aside from first char.
  if (s.includes('/') || s.startsWith('@')) {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
  // If already has internal caps (API, CI, OPENROUTER), keep as-is with first upper.
  if (/[A-Z]{2,}/.test(s) || /[a-z][A-Z]/.test(s)) {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
  // Sentence case: first letter upper, rest lower — but preserve short tokens like "a".
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Apply prefix + max length.
 * @param {string} bodyWithoutPrefix
 * @param {object} [registry]
 * @returns {string}
 */
function formatTitle(bodyWithoutPrefix, registry = loadRegistry()) {
  const prefix = (registry.defaults && registry.defaults.prefix) || '[WR]';
  const max = (registry.defaults && registry.defaults.max_length) || 100;
  let body = String(bodyWithoutPrefix || '')
    .replace(WR_PREFIX_RE, '')
    .replace(MULTI_SPACE_RE, ' ')
    .trim();
  body = softCapitalize(body);
  let full = `${prefix} ${body}`.replace(MULTI_SPACE_RE, ' ').trim();
  if (full.length > max) {
    const budget = max - prefix.length - 2; // space + ellipsis-ish
    let clipped = body.slice(0, Math.max(8, budget)).trim();
    clipped = clipped.replace(/[,:;.\-_/]+$/g, '').trim();
    full = `${prefix} ${clipped}…`;
    if (full.length > max) {
      full = full.slice(0, max - 1) + '…';
    }
  }
  return full;
}

/**
 * Pick the best matching template for free text.
 * @param {string} text
 * @param {object} [registry]
 * @returns {{template: object, subject: string}|null}
 */
function matchTemplate(text, registry = loadRegistry()) {
  // Keyword match against lightly cleaned text BEFORE filler-phrase stripping
  // so "Need ability to autocreate..." still hits the add-feature template.
  let matchHay = stripNoise(text, registry);
  matchHay = matchHay.replace(WR_PREFIX_RE, '').replace(MULTI_SPACE_RE, ' ').trim();
  const hay = matchHay.toLowerCase();
  const normalized = normalizeSubject(text, registry);
  const templates = Array.isArray(registry.templates) ? registry.templates : [];
  for (const template of templates) {
    if (!template || template.key === 'generic') continue;
    const kws = Array.isArray(template.keywords) ? template.keywords : [];
    const hit = kws.find((k) => k && hay.includes(String(k).toLowerCase()));
    if (!hit) continue;
    let subject = normalized;
    // Peel the matched keyword off the front when present so we don't get
    // "Wire in wire in chrome mcp".
    const hitRe = new RegExp(
      `^${String(hit).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*[-:—]?\\s*`,
      'i'
    );
    subject = subject.replace(hitRe, '').trim();
    // Also strip leading verb leftovers for add/create/implement/update.
    subject = subject
      .replace(/^(?:a|an|the|to|for|of)\s+/i, '')
      .replace(/^(?:feature|ability|capability)\s+(?:to\s+)?/i, '')
      .replace(/^(?:to\s+)/i, '')
      .trim();
    // If the keyword lived only in the pre-normalize haystack ("need ability"),
    // subject is already the useful remainder from normalizeSubject.
    if (!subject) subject = normalized;
    return { template, subject: softCapitalize(subject) };
  }
  const generic = templates.find((t) => t && t.key === 'generic');
  if (generic && normalized) {
    return { template: generic, subject: softCapitalize(normalized) };
  }
  return null;
}

/**
 * Build a title from a template + subject.
 * @param {object} template
 * @param {string} subject
 * @param {object} [registry]
 * @returns {string}
 */
function applyTemplate(template, subject, registry = loadRegistry()) {
  const pattern = String((template && template.title) || '{subject}');
  const filled = pattern.replace(/\{subject\}/g, subject || 'untitled work');
  return formatTitle(filled, registry);
}

/**
 * Clean an existing title without changing its intent more than necessary.
 * @param {string} title
 * @param {object} [registry]
 * @returns {{title: string, changed: boolean, reason: string}}
 */
function cleanTitle(title, registry = loadRegistry()) {
  const original = String(title || '');
  const subject = normalizeSubject(original, registry);
  if (!subject) {
    return {
      title: formatTitle('Untitled work request', registry),
      changed: true,
      reason: 'empty-after-clean',
    };
  }
  const next = formatTitle(subject, registry);
  return {
    title: next,
    changed: next !== original.replace(MULTI_SPACE_RE, ' ').trim(),
    reason: next === original.replace(MULTI_SPACE_RE, ' ').trim() ? 'already-clean' : 'normalized',
  };
}

/**
 * Suggest a templated title from title + optional body/summary.
 * @param {{title?: string, body?: string, summary?: string, force?: boolean}} input
 * @param {object} [registry]
 * @returns {{title: string, changed: boolean, reason: string, templateKey: string|null, skipped: boolean}}
 */
function suggestTitle(input = {}, registry = loadRegistry()) {
  const rawTitle = String(input.title || '');
  const body = String(input.body || '');
  const summary = String(input.summary || extractSummary(body) || '');
  const force = Boolean(input.force);

  const cleaned = cleanTitle(rawTitle, registry);
  const substance = normalizeSubject(rawTitle, registry);
  const minLen =
    (registry.defaults && registry.defaults.min_substance_length) || 12;
  const alreadyClean =
    registry.defaults && registry.defaults.skip_if_already_clean !== false
      ? isAlreadyClean(rawTitle, registry)
      : false;

  // Prefer matching against the richest RAW signal available. Do not pre-run
  // normalizeSubject here — matchTemplate needs filler phrases like
  // "need ability to" intact for keyword hits; it normalizes the subject itself.
  const seed = [rawTitle, summary, body].filter(Boolean).join('\n').slice(0, 2000);
  const matched = matchTemplate(seed || rawTitle, registry);

  if (!force && alreadyClean && substance.length >= minLen) {
    // Still ensure prefix/spacing are correct.
    if (cleaned.changed) {
      return {
        title: cleaned.title,
        changed: true,
        reason: 'light-normalize',
        templateKey: null,
        skipped: false,
      };
    }
    return {
      title: cleaned.title,
      changed: false,
      reason: 'skip-already-clean',
      templateKey: null,
      skipped: true,
    };
  }

  if (matched) {
    const titled = applyTemplate(matched.template, matched.subject, registry);
    return {
      title: titled,
      changed: titled !== rawTitle.replace(MULTI_SPACE_RE, ' ').trim(),
      reason: `template:${matched.template.key}`,
      templateKey: matched.template.key,
      skipped: false,
    };
  }

  return {
    title: cleaned.title,
    changed: cleaned.changed,
    reason: cleaned.reason,
    templateKey: null,
    skipped: false,
  };
}

/**
 * @param {string} title
 * @param {object} registry
 * @returns {boolean}
 */
function isAlreadyClean(title, registry = loadRegistry()) {
  const original = String(title || '').trim();
  if (!original) return false;
  if (/\s{2,}/.test(original)) return false;
  if (!WR_PREFIX_RE.test(original)) return false;
  // Reset lastIndex — URL_RE is global and prior tests may leave it mid-stream.
  URL_RE.lastIndex = 0;
  if (URL_RE.test(original)) {
    URL_RE.lastIndex = 0;
    return false;
  }
  URL_RE.lastIndex = 0;
  const noise = Array.isArray(registry.noise_tokens) ? registry.noise_tokens : [];
  const lower = original.toLowerCase();
  if (noise.some((t) => t && lower.includes(String(t).toLowerCase()))) return false;
  if (/\[WR\].*\[WR\]/i.test(original)) return false;
  const max = (registry.defaults && registry.defaults.max_length) || 100;
  if (original.length > max) return false;
  // Exactly one space after [WR]
  if (!/^\[WR\] [^\s]/i.test(original)) return false;
  return true;
}

/**
 * Pull Summary section from a WR issue body if present.
 * @param {string} body
 * @returns {string}
 */
function extractSummary(body) {
  if (!body) return '';
  const m = String(body).match(
    /###\s*Summary\s*\r?\n+([\s\S]*?)(?=\r?\n###\s|\r?\n##\s|$)/i
  );
  if (!m) return '';
  return m[1].replace(/_No response_/gi, '').trim();
}

/**
 * Mine common unigram/bigram starters from a directory of issue markdown files
 * or a plain text file of titles (one per line).
 * @param {string} targetPath
 * @param {{top?: number}} [opts]
 * @returns {{unigrams: Array<{token: string, count: number}>, bigrams: Array<{token: string, count: number}>, total: number}}
 */
function mineTitlePatterns(targetPath, opts = {}) {
  const top = opts.top || 20;
  const abs = path.isAbsolute(targetPath)
    ? targetPath
    : path.join(REPO_ROOT, targetPath);
  const titles = collectTitles(abs);
  const uni = new Map();
  const bi = new Map();
  for (const title of titles) {
    const subject = normalizeSubject(title)
      .toLowerCase()
      .replace(/[^a-z0-9/\s-]+/g, ' ')
      .replace(MULTI_SPACE_RE, ' ')
      .trim();
    if (!subject) continue;
    const tokens = subject.split(' ').filter((t) => t && t.length > 1);
    if (tokens[0]) uni.set(tokens[0], (uni.get(tokens[0]) || 0) + 1);
    if (tokens[0] && tokens[1]) {
      const bg = `${tokens[0]} ${tokens[1]}`;
      bi.set(bg, (bi.get(bg) || 0) + 1);
    }
  }
  const sortPairs = (map) =>
    [...map.entries()]
      .map(([token, count]) => ({ token, count }))
      .sort((a, b) => b.count - a.count || a.token.localeCompare(b.token))
      .slice(0, top);
  return { unigrams: sortPairs(uni), bigrams: sortPairs(bi), total: titles.length };
}

/**
 * @param {string} abs
 * @returns {string[]}
 */
function collectTitles(abs) {
  const titles = [];
  if (!fs.existsSync(abs)) return titles;
  const stat = fs.statSync(abs);
  if (stat.isFile()) {
    const raw = fs.readFileSync(abs, 'utf8');
    for (const line of raw.split(/\r?\n/)) {
      const t = line.trim();
      if (t) titles.push(t);
    }
    return titles;
  }
  // Directory of issue-N-slug.md files — recover slug as a proxy title.
  for (const name of fs.readdirSync(abs)) {
    if (!name.endsWith('.md')) continue;
    const m = name.match(/^issue-\d+-(.+)\.md$/i);
    if (m) {
      titles.push(m[1].replace(/-/g, ' '));
      continue;
    }
    // Also accept first markdown H1 inside the file.
    const raw = fs.readFileSync(path.join(abs, name), 'utf8');
    const h1 = raw.match(/^#\s+(.+)$/m);
    if (h1) titles.push(h1[1].trim());
  }
  return titles;
}

/**
 * List starter bodies for saved-reply / UI surfaces.
 * @param {object} [registry]
 * @returns {Array<{key: string, title: string, body: string}>}
 */
function listStarters(registry = loadRegistry()) {
  return Array.isArray(registry.starters) ? registry.starters.slice() : [];
}

/**
 * List templates for UI / CLI.
 * @param {object} [registry]
 * @returns {Array<object>}
 */
function listTemplates(registry = loadRegistry()) {
  return Array.isArray(registry.templates) ? registry.templates.slice() : [];
}

function printJson(value) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

function main(argv) {
  const args = argv.slice(2);
  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log(`Usage:
  node scripts/wr-autotitle.js --check
  node scripts/wr-autotitle.js --list-templates
  node scripts/wr-autotitle.js --list-starters
  node scripts/wr-autotitle.js --clean "<title>"
  node scripts/wr-autotitle.js --suggest --title "<title>" [--body "<body>"] [--force]
  node scripts/wr-autotitle.js --apply --title "<title>" [--body "<body>"] [--force]
  node scripts/wr-autotitle.js --mine <path> [--top N]
`);
    return 0;
  }

  let registry;
  try {
    registry = loadRegistry();
  } catch (err) {
    console.error(`wr-autotitle: failed to load registry: ${err.message}`);
    return 1;
  }

  if (args[0] === '--check') {
    const problems = validateRegistry(registry);
    if (problems.length) {
      for (const p of problems) console.error(`wr-autotitle: ${p}`);
      return 1;
    }
    console.log(
      `wr-autotitle: ok — ${registry.templates.length} templates, ${(registry.starters || []).length} starters`
    );
    return 0;
  }

  if (args[0] === '--list-templates') {
    for (const t of listTemplates(registry)) {
      console.log(`${t.key}\t${t.title}\t${t.usage}`);
    }
    return 0;
  }

  if (args[0] === '--list-starters') {
    for (const s of listStarters(registry)) {
      console.log(`${s.key}\t${s.title}\t${s.body}`);
    }
    return 0;
  }

  if (args[0] === '--clean') {
    const title = args[1] || '';
    const result = cleanTitle(title, registry);
    console.log(result.title);
    return result.title ? 0 : 1;
  }

  if (args[0] === '--mine') {
    const target = args[1] || 'wr/issues';
    let top = 20;
    const topIdx = args.indexOf('--top');
    if (topIdx !== -1) top = Number(args[topIdx + 1]) || 20;
    const mined = mineTitlePatterns(target, { top });
    printJson(mined);
    return mined.total > 0 ? 0 : 1;
  }

  if (args[0] === '--suggest' || args[0] === '--apply') {
    const get = (flag) => {
      const i = args.indexOf(flag);
      return i === -1 ? '' : args[i + 1] || '';
    };
    const force = args.includes('--force');
    let title = get('--title');
    const titleEnv = get('--title-env');
    if (titleEnv && process.env[titleEnv] != null) {
      title = process.env[titleEnv];
    }
    let body = get('--body');
    const bodyFile = get('--body-file');
    if (bodyFile) {
      const abs = path.isAbsolute(bodyFile) ? bodyFile : path.join(process.cwd(), bodyFile);
      body = fs.readFileSync(abs, 'utf8');
    }
    const result = suggestTitle(
      {
        title,
        body,
        summary: get('--summary'),
        force,
      },
      registry
    );
    if (args[0] === '--apply') {
      // Machine-readable single line for workflows.
      console.log(result.title);
      return result.title ? 0 : 1;
    }
    printJson(result);
    return result.title ? 0 : 1;
  }

  console.error(`wr-autotitle: unknown command "${args[0]}"`);
  return 1;
}

if (require.main === module) {
  process.exitCode = main(process.argv);
}

module.exports = {
  REGISTRY_PATH,
  loadRegistry,
  validateRegistry,
  stripNoise,
  normalizeSubject,
  formatTitle,
  matchTemplate,
  applyTemplate,
  cleanTitle,
  suggestTitle,
  extractSummary,
  mineTitlePatterns,
  listStarters,
  listTemplates,
  isAlreadyClean,
  main,
};
