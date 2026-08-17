#!/usr/bin/env node
"use strict";

/**
 * Markdown Lint Auto-Heal
 *
 * WHY this exists (read before touching):
 *   Agent-generated Markdown (wr/issues/*.md research packets, issue bodies
 *   pasted verbatim) trips the changed-Markdown CI gate (CircleCI
 *   lint-changed-markdown.sh + wr-lint) on nearly every PR. A survey of the
 *   259-file wr/issues backlog shows the failure distribution:
 *     - ~85% of findings are mechanical and auto-fixable by
 *       `markdownlint-cli2 --fix` (MD049, MD053, MD012, MD034, MD004, MD030,
 *       MD026, MD055, MD007, MD029, MD027, MD018, ...)
 *     - the two biggest NON-auto-fixable rules are structural:
 *         MD025 (multiple top-level headings — the WR generator prepends its
 *                own `# WR: <title>` header above bodies that already carry H1s)
 *         MD003 (setext `===`/`---` underline headings pasted from issue bodies)
 *   This script heals BOTH classes: a conservative, code-fence-aware custom
 *   pass converts setext headings to ATX and demotes extra H1s to H2, then
 *   `markdownlint-cli2 --fix` (the FOSS tool we already depend on) cleans up
 *   the mechanical findings. A final plain lint reports whatever genuinely
 *   needs a human (e.g. MD056 table column mismatches).
 *
 *   Callers:
 *     - .github/workflows/markdown-lint-auto-heal.yml  (PR-time healing)
 *     - .github/workflows/wr-pr-creation.yml           (heal at generation)
 *     - npm run markdown:heal -- <files...>            (manual/local)
 *
 * Usage:
 *   node scripts/heal-markdown.js [--strict] [--quiet] <file.md> [more.md ...]
 *
 *   --strict   Exit 1 if non-auto-fixable findings remain after healing
 *              (default: exit 0 — healing is best-effort; the real CI gates
 *              still enforce. No always-green shim here: the gate stays real,
 *              this just fixes what a machine can fix before the gate runs).
 *   --quiet    Suppress the remaining-findings dump; print the summary only.
 *
 * The transforms are pure functions (exported for unit tests) and idempotent:
 * running the healer twice produces no further changes, which is what makes
 * the auto-heal workflow loop-safe (second run → no diff → no push).
 */

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const REPO_ROOT = path.resolve(__dirname, "..");
// Pinned fallback for slim CI jobs that skip `npm ci`; keep in sync with the
// devDependency in package.json so the gate stays reproducible.
const MARKDOWNLINT_PINNED = "markdownlint-cli2@0.22.1";

/** Matches an opening/closing code fence (``` or ~~~, up to 3 leading spaces). */
const FENCE_RE = /^ {0,3}(`{3,}|~{3,})(.*)$/;

/**
 * Split text into lines with an "inside fenced code block" flag per line.
 * Tracks the opening marker character and length: per CommonMark, a block
 * only closes on a fence of the SAME character, at least as long, with no
 * info string — so a ``` line inside a ~~~~ block stays content. Fence lines
 * themselves are marked as inside so no transform ever touches them.
 *
 * @param {string} text
 * @returns {{lines: string[], inFence: boolean[]}}
 */
function mapFences(text) {
  const lines = text.split("\n");
  const inFence = new Array(lines.length).fill(false);
  let open = null; // {char, len} of the currently open fence
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(FENCE_RE);
    if (m) {
      inFence[i] = true;
      const char = m[1][0];
      const len = m[1].length;
      if (!open) {
        open = { char, len };
      } else if (char === open.char && len >= open.len && m[2].trim() === "") {
        open = null; // valid closing fence
      }
      // otherwise: a fence-looking line INSIDE the open block — stays content
    } else {
      inFence[i] = open != null;
    }
  }
  return { lines, inFence };
}

/**
 * True when a line can be the text of a setext heading we are willing to
 * convert: plain paragraph text — not blank, not already a heading, not a
 * list item, blockquote, table row, or reference definition.
 *
 * @param {string} line
 * @returns {boolean}
 */
function isSetextCandidateText(line) {
  if (!line || !line.trim()) return false;
  const t = line.trimStart();
  if (t.startsWith("#")) return false; // already ATX
  if (/^([-*+]\s|\d{1,9}[.)]\s)/.test(t)) return false; // list item
  if (t.startsWith(">")) return false; // blockquote
  if (line.includes("|")) return false; // table row
  if (/^\[[^\]]+\]:/.test(t)) return false; // link reference definition
  return true;
}

/**
 * Convert setext headings (`Title\n===` → `# Title`, `Title\n---` → `## Title`)
 * to ATX, outside code fences only. Fixes MD003 (heading-style), which
 * `markdownlint-cli2 --fix` cannot.
 *
 * Conservative by design:
 *   - the text line must look like plain paragraph text (see
 *     isSetextCandidateText) and the line above IT must be blank/absent, so
 *     multi-line paragraphs are left alone;
 *   - `=` underlines match any length; `-` underlines require 2+ dashes so a
 *     lone `-` (empty list item) is never misread;
 *   - a `---` after a BLANK line is a thematic break and is untouched (the
 *     candidate check requires non-blank text directly above);
 *   - front matter `---` at line 0 has no line above → untouched.
 *
 * @param {string} text
 * @returns {string}
 */
function convertSetextToAtx(text) {
  const { lines, inFence } = mapFences(text);
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const next = lines[i + 1];
    const prev = i > 0 ? lines[i - 1] : "";
    const prevBlank = i === 0 || !prev.trim() || inFence[i - 1];
    if (
      !inFence[i] &&
      next !== undefined &&
      !inFence[i + 1] &&
      prevBlank &&
      isSetextCandidateText(line)
    ) {
      if (/^ {0,3}=+\s*$/.test(next)) {
        out.push(`# ${line.trim()}`);
        i++; // swallow the underline
        continue;
      }
      if (/^ {0,3}-{2,}\s*$/.test(next)) {
        out.push(`## ${line.trim()}`);
        i++; // swallow the underline
        continue;
      }
    }
    out.push(line);
  }
  return out.join("\n");
}

/**
 * Keep the first top-level ATX heading; demote every later `#` heading to
 * `##`. Fixes MD025 (single-title), which `markdownlint-cli2 --fix` cannot.
 * Handles the missing-space variant (`#Title`, MD018) too so a later MD018
 * fix can't resurrect a second H1. Runs outside code fences only.
 *
 * @param {string} text
 * @returns {string}
 */
function demoteExtraH1s(text) {
  const { lines, inFence } = mapFences(text);
  let seenH1 = false;
  const out = lines.map((line, i) => {
    if (inFence[i]) return line;
    // ATX headings allow up to 3 leading spaces — preserve them when demoting.
    if (/^ {0,3}#(?!#)/.test(line)) {
      if (!seenH1) {
        seenH1 = true;
        return line;
      }
      return line.replace(/^( {0,3})#/, "$1##");
    }
    return line;
  });
  return out.join("\n");
}

/**
 * Apply all custom (non-`--fix`-able) transforms. Order matters: setext
 * conversion first so a setext H1 participates in single-title demotion.
 *
 * @param {string} text
 * @returns {{text: string, changed: boolean}}
 */
function heal(text) {
  const healed = demoteExtraH1s(convertSetextToAtx(text));
  return { text: healed, changed: healed !== text };
}

/**
 * Count markdownlint findings (one per " error " line), same parsing as
 * scripts/fix-markdown-backlog.js.
 *
 * @param {string} output
 * @returns {number}
 */
function countLintErrors(output) {
  if (!output) return 0;
  let count = 0;
  for (const line of String(output).split("\n")) {
    if (/ error /.test(line)) count++;
  }
  return count;
}

/**
 * Run markdownlint-cli2 on the given files from the repo root (so
 * .markdownlint.jsonc / .markdownlintignore resolve). Prefers the locally
 * installed binary (honours package-lock); falls back to a pinned one-shot
 * npx fetch for slim jobs without node_modules.
 *
 * @param {string[]} files
 * @param {{fix?: boolean}} [opts]
 * @returns {{output: string, status: number}}
 */
function runMarkdownlint(files, opts = {}) {
  const flagArgs = opts.fix ? ["--fix"] : [];
  const localBin = path.join(REPO_ROOT, "node_modules", ".bin", "markdownlint-cli2");
  let cmd;
  let args;
  if (fs.existsSync(localBin)) {
    cmd = localBin;
    args = [...flagArgs, ...files];
  } else {
    cmd = "npx";
    args = ["--yes", MARKDOWNLINT_PINNED, ...flagArgs, ...files];
  }
  const res = spawnSync(cmd, args, {
    cwd: REPO_ROOT,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    // Generous ceiling: the npx fallback may fetch the package. Prevents a hung
    // lint from wedging the auto-heal workflow (per AI review on the PR).
    timeout: 120000,
  });
  if (res.error) {
    const msg =
      res.error.code === "ETIMEDOUT"
        ? "markdownlint-cli2 timed out after 120s"
        : String(res.error.message || res.error);
    return { output: msg, status: 1 };
  }
  return {
    output: `${res.stdout || ""}${res.stderr || ""}`,
    status: res.status == null ? 1 : res.status,
  };
}

/**
 * Convert one .markdownlintignore pattern (gitignore-lite: `**`, `*`, `?`)
 * to an anchored RegExp over repo-relative POSIX paths. Pure + unit-tested.
 *
 * @param {string} pattern
 * @returns {RegExp}
 */
function globToRegExp(pattern) {
  // Segment-wise build so `**` keeps gitignore semantics: a globstar segment
  // matches ZERO or more whole directories (docs/**/drafts must match
  // docs/drafts/x.md, not require an intermediate directory).
  const segments = pattern.split("/");
  const parts = [];
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const isLast = i === segments.length - 1;
    if (seg === "**") {
      parts.push(isLast ? "(?:.*)?" : "(?:[^/]+/)*");
      continue;
    }
    const esc = seg
      .replace(/[.+^${}()|[\]\\]/g, "\\$&")
      .replace(/\*/g, "[^/]*")
      .replace(/\?/g, "[^/]");
    parts.push(esc + (isLast ? "" : "/"));
  }
  return new RegExp(`^${parts.join("")}(?:$|/)`);
}

/**
 * Read .markdownlintignore patterns (comments/blank lines dropped).
 *
 * @param {string} [repoRoot]
 * @returns {RegExp[]}
 */
function loadIgnorePatterns(repoRoot = REPO_ROOT) {
  try {
    return fs
      .readFileSync(path.join(repoRoot, ".markdownlintignore"), "utf8")
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith("#"))
      .map(globToRegExp);
  } catch {
    return [];
  }
}

/**
 * True when a file is excluded by .markdownlintignore — the structural pass
 * must never rewrite content the lint gate would never judge (raw transcripts,
 * research dumps, audit prompts).
 *
 * @param {string} file - path as given on the CLI
 * @param {RegExp[]} patterns
 * @param {string} [repoRoot]
 * @returns {boolean}
 */
function isIgnored(file, patterns, repoRoot = REPO_ROOT) {
  const rel = path.relative(repoRoot, path.resolve(file)).split(path.sep).join("/");
  return patterns.some((re) => re.test(rel));
}

/**
 * Parse CLI args. Pure + unit-tested.
 *
 * @param {string[]} argv - process.argv.slice(2)
 * @returns {{strict: boolean, quiet: boolean, files: string[]}}
 */
function parseArgs(argv) {
  const opts = { strict: false, quiet: false, files: [] };
  for (const arg of argv || []) {
    if (arg === "--strict") opts.strict = true;
    else if (arg === "--quiet") opts.quiet = true;
    else if (!arg.startsWith("--")) opts.files.push(arg);
  }
  return opts;
}

function main() {
  const opts = parseArgs(process.argv.slice(2));

  const ignorePatterns = loadIgnorePatterns();
  const files = opts.files.filter((f) => {
    if (!f.endsWith(".md")) return false;
    if (!fs.existsSync(f)) {
      console.log(`skip (missing): ${f}`);
      return false;
    }
    if (isIgnored(f, ignorePatterns)) {
      console.log(`skip (.markdownlintignore): ${f}`);
      return false;
    }
    return true;
  });

  if (files.length === 0) {
    console.log("No Markdown files to heal.");
    return;
  }

  let structuralFixes = 0;
  for (const file of files) {
    const original = fs.readFileSync(file, "utf8");
    const { text, changed } = heal(original);
    if (changed) {
      fs.writeFileSync(file, text, "utf8");
      structuralFixes++;
      console.log(`healed structure: ${file}`);
    }
  }

  console.log(
    `Structural pass: ${structuralFixes}/${files.length} file(s) rewritten ` +
      "(setext→ATX, extra H1s demoted)."
  );
  console.log("Running markdownlint-cli2 --fix on the same files…");
  runMarkdownlint(files, { fix: true });

  const finalRun = runMarkdownlint(files);
  const remaining = countLintErrors(finalRun.output);
  if (remaining === 0) {
    // Zero findings parsed + non-zero exit = the linter itself failed to run
    // (npx fetch failure, killed process, bad config) — that is NOT "clean".
    if (finalRun.status !== 0) {
      console.error("markdownlint-cli2 invocation failed (no findings parsed):");
      console.error(finalRun.output);
      process.exit(1);
    }
    console.log("✅ All findings healed; files are lint-clean.");
    return;
  }

  console.log(`⚠️  ${remaining} finding(s) remain that need a human edit:`);
  if (!opts.quiet) {
    for (const line of finalRun.output.split("\n")) {
      if (/ error /.test(line)) console.log(`  ${line.trim()}`);
    }
  }
  if (opts.strict) process.exit(1);
}

if (require.main === module) {
  main();
}

module.exports = {
  convertSetextToAtx,
  demoteExtraH1s,
  heal,
  countLintErrors,
  parseArgs,
  mapFences,
  globToRegExp,
  loadIgnorePatterns,
  isIgnored,
};
