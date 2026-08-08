#!/usr/bin/env node
"use strict";

/**
 * File Registry Validator — Agent Factory loop guardrail.
 *
 * WHY: multi-persona orchestration drops files into docs/, products/, and
 * wr/ without a durable inventory. This module loads a registry manifest
 * (JSON or YAML) and asserts every declared path exists, matches its role,
 * and satisfies simple style rules (extension allowlist, required headings
 * for Markdown, no path traversal).
 *
 * Usage:
 *   node scripts/orchestration/file-registry.js \
 *     --registry config/orchestration/file-registry.yml
 *   node scripts/orchestration/file-registry.js --registry reg.json --json
 *
 * Exit codes:
 *   0 — registry valid (postcondition holds)
 *   1 — validation failures or bad input
 *
 * Public API (exported for tests + the orchestration console):
 *   loadRegistry(rawOrPath) -> registry object
 *   validateRegistry(registry, { root }) -> { ok, errors, checked }
 *   main(argv) -> exit code
 */

const fs = require("fs");
const path = require("path");
const yaml = require("yaml");

const REPO_ROOT = path.resolve(__dirname, "..", "..");

const DEFAULT_ROLES = {
  doc: { extensions: [".md"], requireHeading: true },
  script: { extensions: [".js", ".mjs", ".cjs", ".ts", ".sh", ".py"] },
  workflow: { extensions: [".yml", ".yaml"] },
  config: { extensions: [".json", ".yml", ".yaml", ".jsonc", ".toml"] },
  app: { extensions: [".tsx", ".ts", ".jsx", ".js", ".html"] },
  asset: { extensions: [".png", ".svg", ".jpg", ".jpeg", ".webp", ".gif", ".ico"] },
  any: { extensions: null, requireHeading: false },
};

/**
 * @param {string} input path or raw JSON/YAML string
 * @returns {object}
 */
function loadRegistry(input) {
  let raw = input;
  if (typeof input === "string" && !input.trim().startsWith("{") && !input.trim().startsWith("files:")) {
    if (fs.existsSync(input)) {
      raw = fs.readFileSync(input, "utf8");
    }
  }
  if (typeof raw !== "string") {
    throw new Error("registry input must be a path or string");
  }
  const trimmed = raw.trim();
  let data;
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    data = JSON.parse(trimmed);
  } else {
    data = yaml.parse(trimmed);
  }
  if (!data || typeof data !== "object") {
    throw new Error("registry must parse to an object");
  }
  return data;
}

/**
 * Normalize registry into { version, files: [{path, role, required?}] }.
 * @param {object} registry
 */
function normalize(registry) {
  const files = Array.isArray(registry.files) ? registry.files : [];
  return {
    version: registry.version || registry.schema_version || "1.0",
    description: registry.description || "",
    files: files.map((f, i) => {
      if (typeof f === "string") {
        return { path: f, role: "any", required: true, index: i };
      }
      return {
        path: f.path,
        role: f.role || "any",
        required: f.required !== false,
        description: f.description || "",
        index: i,
      };
    }),
  };
}

function hasTopLevelHeading(markdown) {
  const lines = String(markdown).split("\n");
  let inFence = false;
  let fenceChar = null;
  let fenceLen = 0;
  for (const line of lines) {
    const m = line.match(/^ {0,3}(`{3,}|~{3,})/);
    if (m) {
      const char = m[1][0];
      const len = m[1].length;
      if (!inFence) {
        inFence = true;
        fenceChar = char;
        fenceLen = len;
      } else if (char === fenceChar && len >= fenceLen) {
        inFence = false;
        fenceChar = null;
      }
      continue;
    }
    if (!inFence && /^ {0,3}#\s+\S/.test(line)) return true;
  }
  return false;
}

/**
 * Validate a normalized registry against the filesystem.
 *
 * @param {object} registry
 * @param {{ root?: string, roles?: object }} [opts]
 * @returns {{ ok: boolean, errors: string[], warnings: string[], checked: number, results: object[] }}
 */
function validateRegistry(registry, opts = {}) {
  const root = opts.root || REPO_ROOT;
  const roles = { ...DEFAULT_ROLES, ...(opts.roles || {}) };
  const norm = normalize(registry);
  const errors = [];
  const warnings = [];
  const results = [];

  if (!norm.files.length) {
    errors.push("registry.files must contain at least one entry");
  }

  const seen = new Set();
  for (const entry of norm.files) {
    const rel = entry.path;
    const result = {
      path: rel,
      role: entry.role,
      required: entry.required,
      status: "ok",
      messages: [],
    };

    if (!rel || typeof rel !== "string") {
      result.status = "error";
      result.messages.push("missing path");
      errors.push(`files[${entry.index}]: missing path`);
      results.push(result);
      continue;
    }
    if (path.isAbsolute(rel) || rel.includes("..") || rel.startsWith("~")) {
      result.status = "error";
      result.messages.push("path must be repo-relative without traversal");
      errors.push(`${rel}: path must be repo-relative without traversal`);
      results.push(result);
      continue;
    }
    if (seen.has(rel)) {
      result.status = "error";
      result.messages.push("duplicate path");
      errors.push(`${rel}: duplicate path in registry`);
      results.push(result);
      continue;
    }
    seen.add(rel);

    const abs = path.join(root, rel);
    const role = roles[entry.role] || roles.any;
    if (!roles[entry.role] && entry.role !== "any") {
      warnings.push(`${rel}: unknown role "${entry.role}" (treated as any)`);
    }

    if (!fs.existsSync(abs)) {
      if (entry.required) {
        result.status = "error";
        result.messages.push("file missing");
        errors.push(`${rel}: file missing`);
      } else {
        result.status = "missing-optional";
        result.messages.push("optional file missing");
        warnings.push(`${rel}: optional file missing`);
      }
      results.push(result);
      continue;
    }

    const stat = fs.statSync(abs);
    if (!stat.isFile()) {
      result.status = "error";
      result.messages.push("path is not a file");
      errors.push(`${rel}: path is not a file`);
      results.push(result);
      continue;
    }

    if (role.extensions && role.extensions.length) {
      const ext = path.extname(rel).toLowerCase();
      if (!role.extensions.includes(ext)) {
        result.status = "error";
        result.messages.push(`extension ${ext || "(none)"} not allowed for role ${entry.role}`);
        errors.push(
          `${rel}: extension ${ext || "(none)"} not allowed for role ${entry.role} (want ${role.extensions.join(", ")})`
        );
        results.push(result);
        continue;
      }
    }

    if (role.requireHeading && path.extname(rel).toLowerCase() === ".md") {
      const body = fs.readFileSync(abs, "utf8");
      if (!hasTopLevelHeading(body)) {
        result.status = "error";
        result.messages.push("Markdown doc missing a top-level heading");
        errors.push(`${rel}: Markdown doc missing a top-level heading (# ...)`);
        results.push(result);
        continue;
      }
    }

    results.push(result);
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    checked: results.length,
    results,
    version: norm.version,
    description: norm.description,
  };
}

function parseArgs(argv) {
  const opts = { registry: null, json: false, root: REPO_ROOT };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = argv[i + 1];
    if ((a === "--registry" || a === "-r") && next) {
      opts.registry = next;
      i += 1;
    } else if (a === "--json") {
      opts.json = true;
    } else if (a === "--root" && next) {
      opts.root = path.resolve(next);
      i += 1;
    } else if (a === "--help" || a === "-h") {
      opts.help = true;
    } else if (!a.startsWith("-") && !opts.registry) {
      opts.registry = a;
    }
  }
  return opts;
}

function main(argv = process.argv.slice(2)) {
  const opts = parseArgs(argv);
  if (opts.help || !opts.registry) {
    const msg =
      "Usage: node scripts/orchestration/file-registry.js --registry <path> [--json] [--root <dir>]\n";
    process.stdout.write(msg);
    return opts.help ? 0 : 1;
  }
  let registry;
  try {
    registry = loadRegistry(opts.registry);
  } catch (err) {
    process.stderr.write(`Failed to load registry: ${err.message}\n`);
    return 1;
  }
  const report = validateRegistry(registry, { root: opts.root });
  if (opts.json) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } else {
    process.stdout.write(
      `File registry v${report.version}: checked ${report.checked} entr${report.checked === 1 ? "y" : "ies"}\n`
    );
    for (const w of report.warnings) process.stdout.write(`warn: ${w}\n`);
    for (const e of report.errors) process.stdout.write(`error: ${e}\n`);
    process.stdout.write(report.ok ? "registry valid\n" : "registry invalid\n");
  }
  return report.ok ? 0 : 1;
}

if (require.main === module) {
  process.exit(main());
}

module.exports = {
  DEFAULT_ROLES,
  REPO_ROOT,
  loadRegistry,
  normalize,
  validateRegistry,
  hasTopLevelHeading,
  parseArgs,
  main,
};
