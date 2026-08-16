'use strict';

/**
 * Safe sequential env-var parser for Easy Env Vars (WR #15863).
 *
 * Mirrors briantist/ezenv semantics (ordered NAME=value lines, $VAR /
 * ${VAR:-default} expansion, values with spaces) while adding the
 * safeguards the WR requires:
 *   - reject malformed definitions
 *   - detect circular references before expansion
 *   - block shell metacharacters that enable command injection under eval
 *   - continue after a failed earlier assignment when mode allows it
 *
 * Upstream action (eval-based): briantist/ezenv@v1.0.0
 * SHA: f38d123244576d2065059c68a02ab332fc682199
 */

const NAME_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;

/** Allowlisted command substitutions used in the upstream README examples. */
const ALLOWED_COMMAND_SUBS = new Set(['pwd', 'echo']);

const PINNED_SHA = 'f38d123244576d2065059c68a02ab332fc682199';
const PINNED_TAG = 'v1.0.0';

/**
 * @typedef {'error'|'warning'} Severity
 * @typedef {{ severity: Severity, code: string, message: string, line?: number, name?: string }} Finding
 * @typedef {{ name: string, rawValue: string, line: number }} EnvAssignment
 * @typedef {{
 *   ok: boolean,
 *   assignments: EnvAssignment[],
 *   resolved: Record<string, string>,
 *   findings: Finding[],
 *   githubEnv: string,
 *   workflowSnippet: string,
 * }} ParseResult
 */

/**
 * Strip matching single/double quotes from a value.
 * @param {string} value
 */
function unquote(value) {
  if (value.length >= 2) {
    const first = value[0];
    const last = value[value.length - 1];
    if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
      return value.slice(1, -1);
    }
  }
  return value;
}

/**
 * @param {string} text
 * @returns {EnvAssignment[]}
 */
function splitAssignments(text) {
  const lines = String(text || '').split(/\r?\n/);
  /** @type {EnvAssignment[]} */
  const out = [];
  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) {
      out.push({ name: '', rawValue: trimmed, line: idx + 1 });
      return;
    }
    const name = trimmed.slice(0, eq).trim();
    const rawValue = trimmed.slice(eq + 1);
    out.push({ name, rawValue, line: idx + 1 });
  });
  return out;
}

/**
 * Collect $NAME / ${NAME} / ${NAME:-default} references from a value.
 * @param {string} value
 * @returns {{ names: string[], hasDefault: boolean }}
 */
function collectReferences(value) {
  const names = new Set();
  let hasDefault = false;
  const re =
    /\$\{([A-Za-z_][A-Za-z0-9_]*)(:-([^}]*))?\}|\$([A-Za-z_][A-Za-z0-9_]*)/g;
  let m;
  while ((m = re.exec(value)) !== null) {
    // Skip escaped \$ — if the char before '$' is '\', ignore.
    const dollarAt = m.index;
    if (dollarAt > 0 && value[dollarAt - 1] === '\\') continue;
    if (m[1]) {
      names.add(m[1]);
      if (m[2] !== undefined) hasDefault = true;
    } else if (m[4]) {
      names.add(m[4]);
    }
  }
  return { names: [...names], hasDefault };
}

/**
 * Detect $(cmd) / `cmd` and return command names.
 * @param {string} value
 * @returns {string[]}
 */
function findCommandSubs(value) {
  /** @type {string[]} */
  const found = [];
  const dollar = /\$\(([^)]*)\)/g;
  let m;
  while ((m = dollar.exec(value)) !== null) {
    const cmd = m[1].trim().split(/\s+/)[0] || '';
    found.push(cmd);
  }
  const ticks = /`([^`]*)`/g;
  while ((m = ticks.exec(value)) !== null) {
    const cmd = m[1].trim().split(/\s+/)[0] || '';
    found.push(cmd);
  }
  return found;
}

/**
 * True when value still contains shell metacharacters unsafe under bash eval.
 * Allowlisted $(pwd) / $(echo ...) are stripped before the check.
 * @param {string} value
 */
function hasUnsafeShellSyntax(value) {
  let scan = value.replace(/\$\(\s*(pwd|echo)(\s[^)]*)?\)/g, '');
  // Remove safe ${VAR} / ${VAR:-x} / $VAR forms so remaining $ is suspicious.
  scan = scan.replace(/\$\{[A-Za-z_][A-Za-z0-9_]*(:-[^}]*)?\}/g, '');
  scan = scan.replace(/\$[A-Za-z_][A-Za-z0-9_]*/g, '');
  scan = scan.replace(/\\\$/g, '');

  if (/[`\n\r\0]/.test(scan)) return true;
  if (/\$\(/.test(scan)) return true; // non-allowlisted command sub left over
  if (/;/.test(scan)) return true;
  if (/\|\|/.test(scan) || /&&/.test(scan) || /\|/.test(scan)) return true;
  if (/</.test(scan) || />/.test(scan)) return true;
  if (/\n|\r/.test(value) && /;|\||&|`|\$\(/.test(value)) return true;
  return false;
}

/**
 * Expand $VAR / ${VAR} / ${VAR:-default} using a known map. Does not eval.
 * @param {string} value
 * @param {Record<string, string>} env
 * @param {Finding[]} findings
 * @param {number} line
 * @param {string} name
 */
function expandValue(value, env, findings, line, name) {
  let out = value.replace(
    /\$\{([A-Za-z_][A-Za-z0-9_]*)(:-([^}]*))?\}/g,
    (full, ref, defMarker, defVal, offset, whole) => {
      if (offset > 0 && whole[offset - 1] === '\\') return full;
      if (Object.prototype.hasOwnProperty.call(env, ref) && env[ref] !== '') {
        return env[ref];
      }
      if (defMarker !== undefined) {
        return defVal === undefined ? '' : defVal;
      }
      findings.push({
        severity: 'warning',
        code: 'undefined-ref',
        message: `Variable '${name}' references undefined '${ref}' (expands to empty)`,
        line,
        name,
      });
      return '';
    }
  );

  out = out.replace(/\$([A-Za-z_][A-Za-z0-9_]*)/g, (full, ref, offset, whole) => {
    if (offset > 0 && whole[offset - 1] === '\\') return full;
    if (Object.prototype.hasOwnProperty.call(env, ref)) {
      return env[ref];
    }
    findings.push({
      severity: 'warning',
      code: 'undefined-ref',
      message: `Variable '${name}' references undefined '${ref}' (expands to empty)`,
      line,
      name,
    });
    return '';
  });

  out = out.replace(/\$\(([^)]*)\)/g, (full, body) => {
    const parts = String(body).trim().split(/\s+/);
    const cmd = parts[0] || '';
    if (cmd === 'pwd') return process.cwd();
    if (cmd === 'echo') return parts.slice(1).join(' ');
    return full;
  });

  out = out.replace(/\\\$/g, '$');
  return out;
}

/**
 * @param {EnvAssignment[]} assignments
 * @returns {Map<string, string[]>}
 */
function buildGraph(assignments) {
  /** @type {Map<string, string[]>} */
  const graph = new Map();
  const declared = new Set(assignments.map((a) => a.name).filter(Boolean));
  for (const a of assignments) {
    if (!a.name) continue;
    const { names } = collectReferences(unquote(a.rawValue));
    graph.set(
      a.name,
      names.filter((n) => declared.has(n))
    );
  }
  return graph;
}

/**
 * @param {Map<string, string[]>} graph
 * @returns {string[] | null}
 */
function findCycle(graph) {
  const WHITE = 0;
  const GRAY = 1;
  const BLACK = 2;
  /** @type {Map<string, number>} */
  const color = new Map();
  for (const k of graph.keys()) color.set(k, WHITE);
  /** @type {string[]} */
  const stack = [];

  /**
   * @param {string} node
   * @returns {string[] | null}
   */
  function dfs(node) {
    color.set(node, GRAY);
    stack.push(node);
    for (const nxt of graph.get(node) || []) {
      const c = color.get(nxt) ?? WHITE;
      if (c === GRAY) {
        const idx = stack.indexOf(nxt);
        return [...stack.slice(idx), nxt];
      }
      if (c === WHITE) {
        const cycle = dfs(nxt);
        if (cycle) return cycle;
      }
    }
    stack.pop();
    color.set(node, BLACK);
    return null;
  }

  for (const node of graph.keys()) {
    if ((color.get(node) ?? WHITE) === WHITE) {
      const cycle = dfs(node);
      if (cycle) return cycle;
    }
  }
  return null;
}

/**
 * @param {string} name
 * @param {string} value
 */
function formatGithubEnvLine(name, value) {
  if (/[\r\n]/.test(value)) {
    const delim = `EEV_${name}_${Date.now().toString(36)}`;
    return `${name}<<${delim}\n${value}\n${delim}`;
  }
  return `${name}=${value}`;
}

/**
 * @param {Record<string, string>} resolved
 * @param {string} pinnedRef
 */
function buildWorkflowSnippet(resolved, pinnedRef) {
  const envBlock = Object.entries(resolved)
    .map(([k, v]) => {
      const needsQuote = /\s|"|'/.test(v) || v === '';
      const rendered = needsQuote ? JSON.stringify(v) : v;
      return `      ${k}=${rendered}`;
    })
    .join('\n');
  return [
    '- name: Easy Env Vars',
    `  uses: briantist/ezenv@${pinnedRef}`,
    '  with:',
    '    env: |',
    envBlock || '      # (no variables)',
  ].join('\n');
}

/**
 * Parse and validate a multi-line env definition block.
 *
 * @param {string} text
 * @param {{
 *   existingEnv?: Record<string, string>,
 *   continueOnError?: boolean,
 * }} [options]
 * @returns {ParseResult}
 */
function parseEnvBlock(text, options = {}) {
  const continueOnError = options.continueOnError !== false;
  /** @type {Finding[]} */
  const findings = [];
  const assignments = splitAssignments(text);
  /** @type {Record<string, string>} */
  const resolved = { ...(options.existingEnv || {}) };
  /** @type {Record<string, string>} */
  const produced = {};

  for (const a of assignments) {
    if (!a.name || !NAME_RE.test(a.name)) {
      findings.push({
        severity: 'error',
        code: 'malformed',
        message: a.name
          ? `Invalid variable name '${a.name}' (must match [A-Za-z_][A-Za-z0-9_]*)`
          : `Malformed definition (expected NAME=value): ${a.rawValue}`,
        line: a.line,
        name: a.name || undefined,
      });
      continue;
    }

    const valueForScan = unquote(a.rawValue);

    if (hasUnsafeShellSyntax(valueForScan)) {
      findings.push({
        severity: 'error',
        code: 'injection',
        message: `Value for '${a.name}' contains shell metacharacters that are unsafe with eval-based expansion`,
        line: a.line,
        name: a.name,
      });
      continue;
    }

    const cmds = findCommandSubs(valueForScan);
    for (const cmd of cmds) {
      if (!ALLOWED_COMMAND_SUBS.has(cmd)) {
        findings.push({
          severity: 'error',
          code: 'command-sub',
          message: `Disallowed command substitution $(${cmd}) in '${a.name}'. Allowed: ${[...ALLOWED_COMMAND_SUBS].join(', ')}`,
          line: a.line,
          name: a.name,
        });
      }
    }
  }

  const validAssignments = assignments.filter(
    (a) => a.name && NAME_RE.test(a.name)
  );
  const cycle = findCycle(buildGraph(validAssignments));
  if (cycle) {
    findings.push({
      severity: 'error',
      code: 'circular',
      message: `Circular variable reference detected: ${cycle.join(' -> ')}`,
    });
  }

  if (findings.some((f) => f.code === 'circular')) {
    return {
      ok: false,
      assignments,
      resolved: produced,
      findings,
      githubEnv: '',
      workflowSnippet: buildWorkflowSnippet({}, PINNED_SHA),
    };
  }

  const failedNames = new Set(
    findings
      .filter((f) => f.severity === 'error' && f.name)
      .map((f) => /** @type {string} */ (f.name))
  );

  for (const a of validAssignments) {
    if (failedNames.has(a.name)) {
      if (!continueOnError) break;
      continue;
    }

    try {
      const expanded = expandValue(
        unquote(a.rawValue),
        resolved,
        findings,
        a.line,
        a.name
      );
      if (hasUnsafeShellSyntax(expanded)) {
        findings.push({
          severity: 'error',
          code: 'injection-expanded',
          message: `Expanded value for '${a.name}' is unsafe`,
          line: a.line,
          name: a.name,
        });
        failedNames.add(a.name);
        if (!continueOnError) break;
        continue;
      }
      resolved[a.name] = expanded;
      produced[a.name] = expanded;
    } catch (err) {
      findings.push({
        severity: 'error',
        code: 'expand-failed',
        message: `Failed to expand '${a.name}': ${err instanceof Error ? err.message : String(err)}`,
        line: a.line,
        name: a.name,
      });
      failedNames.add(a.name);
      if (!continueOnError) break;
    }
  }

  const ok = !findings.some((f) => f.severity === 'error');
  const githubEnv = Object.entries(produced)
    .map(([k, v]) => formatGithubEnvLine(k, v))
    .join('\n');

  return {
    ok,
    assignments,
    resolved: produced,
    findings,
    githubEnv,
    workflowSnippet: buildWorkflowSnippet(produced, PINNED_SHA),
  };
}

/**
 * @param {string} text
 */
function validateEnvBlock(text) {
  const result = parseEnvBlock(text);
  return {
    ok: result.ok,
    errorCount: result.findings.filter((f) => f.severity === 'error').length,
    warningCount: result.findings.filter((f) => f.severity === 'warning').length,
    findings: result.findings,
    names: Object.keys(result.resolved),
  };
}

module.exports = {
  parseEnvBlock,
  validateEnvBlock,
  collectReferences,
  findCycle,
  buildGraph,
  unquote,
  hasUnsafeShellSyntax,
  NAME_RE,
  PINNED_SHA,
  PINNED_TAG,
  ALLOWED_COMMAND_SUBS,
};
