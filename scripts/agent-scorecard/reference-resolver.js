'use strict';

/**
 * Reference Resolver — the cheapest, highest-signal hallucination detector.
 *
 * Most code hallucinations are an agent confidently referencing something that
 * does not exist: an import of a missing module, a relative path to a file that
 * was never created, an env var absent from .env.example. The compiler usually
 * catches these eventually, but by then nobody attributes it to the agent. This
 * scans only the ADDED lines of a diff and flags references that don't resolve.
 *
 * Pure logic + an injectable `exists(relPath)` predicate so it is unit-testable
 * without touching the filesystem.
 */

const path = require('path');

const RELATIVE_IMPORT_RE =
  /(?:import\s+[^'"]*from\s*|require\(\s*|import\(\s*)['"](\.[^'"]+)['"]/g;
const ENV_REF_RE = /process\.env\.([A-Z0-9_]+)/g;
const URL_RE = /https?:\/\/[^\s'"`)<>\]]+/g;

const JS_EXTS = ['', '.js', '.ts', '.jsx', '.tsx', '.mjs', '.cjs', '.json'];

/**
 * Parse a unified diff and return added lines grouped by the file they belong to.
 * Only added lines (`+`, not `+++`) are returned, with their target file path.
 */
function addedLinesByFile(diffText = '') {
  const out = [];
  let currentFile = null;
  for (const line of String(diffText).split('\n')) {
    if (line.startsWith('+++ ')) {
      // "+++ b/path/to/file" -> "path/to/file"
      const p = line.slice(4).replace(/^b\//, '').trim();
      currentFile = p === '/dev/null' ? null : p;
      continue;
    }
    if (line.startsWith('--- ') || line.startsWith('diff ') || line.startsWith('@@')) {
      continue;
    }
    if (line.startsWith('+') && currentFile) {
      out.push({ file: currentFile, text: line.slice(1) });
    }
  }
  return out;
}

function resolvesWithExts(baseRel, exists) {
  for (const ext of JS_EXTS) {
    if (exists(baseRel + ext)) return true;
    // index files inside a referenced directory
    if (exists(path.posix.join(baseRel, 'index' + (ext || '.js')))) return true;
  }
  return false;
}

/**
 * Find hallucinated references in the added lines of a diff.
 *
 * @param {object} opts
 * @param {string} opts.diff           unified diff text
 * @param {(relPath:string)=>boolean} opts.exists  resolves a repo-relative path
 * @param {Set<string>} [opts.envKeys] env var names known from .env.example
 * @param {(url:string)=>boolean} [opts.urlOk]  optional live URL checker
 * @returns {{count:number, findings:Array}}
 */
function findUnresolvedRefs({ diff, exists, envKeys = new Set(), urlOk = null }) {
  const findings = [];
  const lines = addedLinesByFile(diff);

  for (const { file, text } of lines) {
    const dir = path.posix.dirname(file);

    // Relative imports / requires must resolve to a real file.
    for (const m of text.matchAll(RELATIVE_IMPORT_RE)) {
      const spec = m[1];
      const target = path.posix.normalize(path.posix.join(dir, spec));
      if (!resolvesWithExts(target, exists)) {
        findings.push({ file, kind: 'import', ref: spec, detail: `unresolved import "${spec}"` });
      }
    }

    // Env vars referenced in code should be declared in .env.example.
    for (const m of text.matchAll(ENV_REF_RE)) {
      const key = m[1];
      // Ignore the ubiquitous runtime-provided ones.
      if (['NODE_ENV', 'CI', 'HOME', 'PATH', 'PWD'].includes(key)) continue;
      if (envKeys.size > 0 && !envKeys.has(key)) {
        findings.push({ file, kind: 'env', ref: key, detail: `env var ${key} not in .env.example` });
      }
    }

    // Optional live URL validation (only when a checker is supplied).
    if (typeof urlOk === 'function') {
      for (const m of text.matchAll(URL_RE)) {
        const url = m[0].replace(/[.,;)]+$/, '');
        if (!urlOk(url)) {
          findings.push({ file, kind: 'url', ref: url, detail: `unreachable URL ${url}` });
        }
      }
    }
  }

  return { count: findings.length, findings };
}

module.exports = {
  addedLinesByFile,
  findUnresolvedRefs,
  RELATIVE_IMPORT_RE,
  ENV_REF_RE,
};
