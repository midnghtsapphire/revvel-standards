#!/usr/bin/env node
"use strict";

/**
 * Package integrity gate (CircleCI job 11069 / issue #16904 vaccine).
 *
 * Catches two failure modes that both break `npm ci` on CircleCI:
 *
 *   1. Duplicate keys inside package.json (and other hand-edited JSON).
 *      JSON.parse silently keeps the *last* occurrence, so a same-day
 *      version bump that inserts a new line without removing the old one
 *      is a complete no-op — and can desync package.json from the lockfile
 *      (see wr/pending/audit-2026-08-05/WR-04-package-json-duplicate-c8-key.md
 *      and CircleCI job 11069: lock c8@12.0.0 vs package.json c8@10.1.3).
 *
 *   2. package-lock.json out of sync with package.json. `npm ci` refuses
 *      to install when the two disagree (EUSAGE). We surface that with a
 *      clear message *before* the CircleCI node orb's install step.
 *
 * Zero runtime dependencies (node built-ins only) so this can run in
 * CircleCI *before* `npm ci` / `node/install-packages`.
 *
 * Usage:
 *   node scripts/check-package-integrity.js
 *   node scripts/check-package-integrity.js --json path/to/package.json
 *   node scripts/check-package-integrity.js --skip-lock
 *
 * Exit codes:
 *   0 — clean
 *   1 — duplicate keys and/or lockfile drift (or invalid JSON / missing files)
 *
 * Exports (for unit tests):
 *   findDuplicateKeys(jsonText) → [{ key, firstSeenLine, duplicateAtLine }]
 *   checkPackageJsonText(text, fileLabel?) → { ok, errors, duplicates }
 *   checkLockfileSync({ cwd, npmBin? }) → { ok, errors, output }
 *   runChecks(options) → { ok, errors, details }
 */

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

/**
 * Tokenizing scan for duplicate object keys at every object depth.
 * Tracks brace depth so the same key name in sibling nested objects is fine,
 * but two `"c8":` lines inside the same object (e.g. devDependencies) are not.
 *
 * JSON.parse cannot catch this — RFC 8259 leaves duplicate-key behavior
 * undefined and V8 keeps the last value silently.
 *
 * @param {string} jsonText
 * @returns {{ key: string, firstSeenLine: number, duplicateAtLine: number }[]}
 */
/**
 * Scan JSON text for duplicate object keys at every object depth.
 *
 * Single left-to-right pass so inline forms like `"scripts": { "test": "x" }`
 * attribute nested keys to the child scope (open brace pushes before the
 * nested key is recorded) and braces inside string values are ignored.
 *
 * JSON.parse cannot catch duplicates — RFC 8259 leaves the behavior
 * undefined and V8 keeps the last value silently.
 *
 * @param {string} jsonText
 * @returns {{ key: string, firstSeenLine: number, duplicateAtLine: number }[]}
 */
function findDuplicateKeys(jsonText) {
  const text = String(jsonText);
  const stack = [new Map()];
  const duplicates = [];
  let inString = false;
  let escaped = false;
  let lineNo = 1;
  let i = 0;

  function currentScope() {
    return stack[stack.length - 1];
  }

  function recordKey(key) {
    if (stack.length === 0) return;
    const scope = currentScope();
    if (scope.has(key)) {
      duplicates.push({
        key,
        firstSeenLine: scope.get(key),
        duplicateAtLine: lineNo,
      });
    } else {
      scope.set(key, lineNo);
    }
  }

  while (i < text.length) {
    const ch = text[i];

    if (ch === "\n") {
      lineNo++;
      i++;
      continue;
    }

    if (escaped) {
      escaped = false;
      i++;
      continue;
    }

    if (inString) {
      if (ch === "\\") {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      i++;
      continue;
    }

    // Outside strings: structural braces adjust scope immediately.
    if (ch === "{") {
      stack.push(new Map());
      i++;
      continue;
    }
    if (ch === "}") {
      if (stack.length > 1) stack.pop();
      i++;
      continue;
    }

    // Potential object key: "name" followed by optional space and `:`.
    if (ch === '"') {
      let j = i + 1;
      let keyEscaped = false;
      let key = "";
      while (j < text.length) {
        const kc = text[j];
        if (keyEscaped) {
          key += `\\${kc}`;
          keyEscaped = false;
          j++;
          continue;
        }
        if (kc === "\\") {
          keyEscaped = true;
          j++;
          continue;
        }
        if (kc === '"') break;
        if (kc === "\n") break;
        key += kc;
        j++;
      }
      if (j < text.length && text[j] === '"') {
        let k = j + 1;
        while (k < text.length && /[ \t\r\n]/.test(text[k])) k++;
        if (k < text.length && text[k] === ":") {
          // This is a key (not a bare string value). Record against the
          // current object scope, then resume after the closing quote so
          // whitespace is scanned normally and line numbers stay accurate.
          recordKey(JSON.parse(`"${key}"`));
          i = j + 1;
          continue;
        }
      }
      // Not a key — treat as ordinary string value.
      inString = true;
      i++;
      continue;
    }

    i++;
  }

  return duplicates;
}

/**
 * Validate a package.json (or similar) text blob for parseability + duplicate keys.
 * @param {string} text
 * @param {string} [fileLabel='package.json']
 */
function checkPackageJsonText(text, fileLabel = "package.json") {
  const errors = [];
  let duplicates = [];

  try {
    JSON.parse(text);
  } catch (e) {
    errors.push(`${fileLabel}: not valid JSON: ${e.message}`);
    return { ok: false, errors, duplicates };
  }

  duplicates = findDuplicateKeys(text);
  for (const d of duplicates) {
    errors.push(
      `${fileLabel}: duplicate key "${d.key}" at line ${d.duplicateAtLine} ` +
        `(first seen at line ${d.firstSeenLine}). JSON keeps the last value only — ` +
        `this silently reverts version bumps and desyncs package-lock.json ` +
        `(CircleCI job 11069 / npm ci EUSAGE).`
    );
  }

  return { ok: errors.length === 0, errors, duplicates };
}

/**
 * Run `npm ci --dry-run` to confirm package.json and package-lock.json agree.
 * Uses the same check CircleCI's node orb runs for real installs.
 *
 * @param {{ cwd?: string, npmBin?: string }} [opts]
 */
function checkLockfileSync(opts = {}) {
  const cwd = opts.cwd || process.cwd();
  const npmBin = opts.npmBin || "npm";
  const lockPath = path.join(cwd, "package-lock.json");
  const pkgPath = path.join(cwd, "package.json");
  const errors = [];

  if (!fs.existsSync(pkgPath)) {
    errors.push(`package.json not found at ${pkgPath}`);
    return { ok: false, errors, output: "" };
  }
  if (!fs.existsSync(lockPath)) {
    errors.push(
      `package-lock.json not found at ${lockPath} — npm ci requires a lockfile`
    );
    return { ok: false, errors, output: "" };
  }

  try {
    const output = execFileSync(
      npmBin,
      ["ci", "--dry-run", "--ignore-scripts", "--no-audit", "--no-fund"],
      {
        cwd,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
        env: process.env,
      }
    );
    return { ok: true, errors, output: String(output || "") };
  } catch (e) {
    const stderr = (e && e.stderr && String(e.stderr)) || "";
    const stdout = (e && e.stdout && String(e.stdout)) || "";
    const combined = `${stdout}\n${stderr}`.trim();
    // Surface the npm EUSAGE snippet; fall back to the full message.
    const snippet =
      combined
        .split("\n")
        .filter((line) => /npm\s+error|Invalid:|Missing:|EUSAGE|can only install/i.test(line))
        .slice(0, 12)
        .join("\n") || combined.slice(0, 1500) || (e && e.message) || "npm ci --dry-run failed";

    if (/EUSAGE|can only install|Invalid:|Missing:/i.test(combined)) {
      errors.push(
        `package-lock.json is out of sync with package.json (npm ci --dry-run failed).\n` +
          `Run \`npm install\` at the repo root and commit the updated lockfile.\n` +
          `npm said:\n${snippet}`
      );
    } else {
      errors.push(
        `Unable to verify package-lock.json sync because npm ci --dry-run failed.\n` +
          `npm said:\n${snippet}`
      );
    }
    return { ok: false, errors, output: combined };
  }
}

/**
 * @param {{
 *   cwd?: string,
 *   packageJsonPath?: string,
 *   skipLock?: boolean,
 *   npmBin?: string,
 * }} [options]
 */
function runChecks(options = {}) {
  const cwd = options.cwd || process.cwd();
  const packageJsonPath =
    options.packageJsonPath || path.join(cwd, "package.json");
  const errors = [];
  const details = { duplicates: [], lock: null };

  if (!fs.existsSync(packageJsonPath)) {
    errors.push(`package.json not found: ${packageJsonPath}`);
    return { ok: false, errors, details };
  }

  const text = fs.readFileSync(packageJsonPath, "utf8");
  const label = path.relative(cwd, packageJsonPath) || "package.json";
  const jsonCheck = checkPackageJsonText(text, label);
  details.duplicates = jsonCheck.duplicates;
  errors.push(...jsonCheck.errors);

  if (!options.skipLock) {
    const lock = checkLockfileSync({ cwd, npmBin: options.npmBin });
    details.lock = lock;
    errors.push(...lock.errors);
  }

  return { ok: errors.length === 0, errors, details };
}

function parseArgs(argv) {
  const options = {
    cwd: process.cwd(),
    packageJsonPath: null,
    skipLock: false,
    npmBin: "npm",
    errors: [],
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--skip-lock") {
      options.skipLock = true;
    } else if (a === "--json" || a === "--package-json") {
      const val = argv[i + 1];
      if (!val || val.startsWith("--")) {
        options.errors.push(`${a} requires a path argument`);
      } else {
        options.packageJsonPath = val;
        i++;
      }
    } else if (a === "--cwd") {
      const val = argv[i + 1];
      if (!val || val.startsWith("--")) {
        options.errors.push(`${a} requires a path argument`);
      } else {
        options.cwd = path.resolve(val);
        i++;
      }
    } else if (a === "--help" || a === "-h") {
      options.help = true;
    } else if (a.startsWith("-")) {
      options.errors.push(`unknown option: ${a}`);
    }
  }
  if (options.packageJsonPath && !path.isAbsolute(options.packageJsonPath)) {
    options.packageJsonPath = path.resolve(options.cwd, options.packageJsonPath);
  }
  return options;
}

function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  if (options.help) {
    console.log(`Usage: node scripts/check-package-integrity.js [options]

Options:
  --json <path>   package.json to scan (default: <cwd>/package.json)
  --cwd <path>    working directory for lockfile check (default: cwd)
  --skip-lock     only scan for duplicate JSON keys
  --help          show this help

Exit 0 when clean; exit 1 on duplicate keys or lockfile drift.
`);
    return 0;
  }
  if (options.errors && options.errors.length > 0) {
    console.error("package integrity: FAILED");
    for (const err of options.errors) console.error(`  - ${err}`);
    return 1;
  }

  const result = runChecks(options);
  if (result.ok) {
    console.log("package integrity: ok");
    const dupCount = (result.details.duplicates || []).length;
    console.log(`  duplicate keys: ${dupCount}`);
    if (!options.skipLock) {
      console.log(`  lockfile sync: ok (npm ci --dry-run)`);
    }
    return 0;
  }

  console.error("package integrity: FAILED");
  for (const err of result.errors) {
    console.error(`  - ${err}`);
  }
  return 1;
}

if (require.main === module) {
  process.exit(main());
}

module.exports = {
  findDuplicateKeys,
  checkPackageJsonText,
  checkLockfileSync,
  runChecks,
  main,
};
