/**
 * agent-interface.rules.mjs
 * revvel-standards — Agent Interface Standard enforcement (AGENT_INTERFACE.md)
 *
 * Drop into wr-rules/. Self-contained: exports a rule set consumable by
 * wr-lint.mjs (default export = { id, rules, run }) and also runnable
 * standalone: `node wr-rules/agent-interface.rules.mjs [repoRoot]`
 *
 * Checks AI-001 … AI-007. BLOCK = exit 1 in standalone mode.
 * Additive only — touches nothing, reads files, reports findings.
 */

import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative, extname } from "node:path";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const CONFIG = {
  // Directories considered "agent code paths" (R2). Add per-repo as needed.
  agentDirGlobs: ["agents", "agent", "src/agents", "fleet", "mcp", "src/mcp", "tools"],
  // File extensions to scan
  exts: new Set([".ts", ".tsx", ".mts", ".js", ".mjs", ".cjs"]),
  // Dirs never scanned
  skipDirs: new Set(["node_modules", ".git", "dist", "build", ".next", "coverage", "drizzle"]),
  registryFile: "tools.registry.json",
  // AI-006 becomes BLOCK on this date (per AGENT_INTERFACE.md)
  ai006BlockDate: "2026-08-01",
};

// ---------------------------------------------------------------------------
// Rule definitions
// ---------------------------------------------------------------------------

const SEV = { BLOCK: "BLOCK", WARN: "WARN" };

const RULES = {
  "AI-001": { desc: "Agent dir imports drizzle/mysql2 directly", sev: SEV.BLOCK },
  "AI-002": { desc: "MCP tool missing input or output schema", sev: SEV.BLOCK },
  "AI-003": { desc: "Tool defined but absent from tools.registry.json", sev: SEV.BLOCK },
  "AI-004": { desc: "Registry entry missing scope or test path", sev: SEV.BLOCK },
  "AI-005": { desc: "Internal fetch from agent path to unregistered endpoint", sev: SEV.BLOCK },
  "AI-006": {
    desc: "Output schema is z.any()/z.unknown()",
    sev: new Date() >= new Date(CONFIG.ai006BlockDate) ? SEV.BLOCK : SEV.WARN,
  },
  "AI-007": { desc: "Tool layer contains business logic (>1 branch beyond auth)", sev: SEV.WARN },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    if (CONFIG.skipDirs.has(entry)) continue;
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) yield* walk(full);
    else if (CONFIG.exts.has(extname(entry))) yield full;
  }
}

function isAgentPath(relPath) {
  const norm = relPath.replace(/\\/g, "/");
  return CONFIG.agentDirGlobs.some(
    (g) => norm === g || norm.startsWith(g + "/") || norm.includes("/" + g + "/")
  );
}

function loadRegistry(repoRoot) {
  const p = join(repoRoot, CONFIG.registryFile);
  if (!existsSync(p)) return null;
  try {
    return JSON.parse(readFileSync(p, "utf8"));
  } catch {
    return { __parseError: true };
  }
}

function finding(rule, file, line, detail) {
  return { rule, severity: RULES[rule].sev, desc: RULES[rule].desc, file, line, detail };
}

function lineOf(src, index) {
  return src.slice(0, index).split("\n").length;
}

// ---------------------------------------------------------------------------
// Patterns
// ---------------------------------------------------------------------------

// R2 / AI-001 — raw data access imports
const RAW_IMPORT_RE =
  /(?:import\s[^;]*?from\s+|require\(\s*)["'](drizzle-orm(?:\/[^"']*)?|mysql2(?:\/[^"']*)?)["']/g;

// MCP tool definitions — covers common SDK shapes:
//   server.tool("name", ...) / server.registerTool("name", ...)
//   defineTool({ name: "x", ... }) / { name: "x", inputSchema: ... }
const TOOL_DEF_RE =
  /(?:\.(?:tool|registerTool|addTool)\(\s*["']([\w.-]+)["'])|defineTool\s*\(\s*\{[^}]*?name\s*:\s*["']([\w.-]+)["']/gs;

// Schema presence near a tool definition (input + output)
const INPUT_SCHEMA_RE = /(?:inputSchema|input|paramsSchema|args)\s*[:=]/;
const OUTPUT_SCHEMA_RE = /(?:outputSchema|output|returns|resultSchema)\s*[:=]/;

// AI-006 — lazy output schemas
const LAZY_OUTPUT_RE =
  /(?:outputSchema|output|returns|resultSchema)\s*[:=]\s*(?:z\.(?:any|unknown)\(\))/g;

// AI-005 — internal fetches from agent paths
const INTERNAL_FETCH_RE =
  /fetch\(\s*[`"'](?:https?:\/\/(?:localhost|127\.0\.0\.1|0\.0\.0\.0)[^`"']*|\/(?:api|trpc)\/[^`"']*)[`"']/g;

// AI-007 — branch counting inside tool handler bodies (rough heuristic)
const BRANCH_RE = /\b(?:if|switch|\?\s*[^:]+:)\b/g;
const AUTH_HINT_RE = /\b(?:auth|scope|permission|role|token|session)\b/i;

// ---------------------------------------------------------------------------
// Core scan
// ---------------------------------------------------------------------------

export function run(repoRoot = process.cwd()) {
  const findings = [];
  const registry = loadRegistry(repoRoot);
  const registryTools = new Set(
    registry && Array.isArray(registry.tools) ? registry.tools.map((t) => t.name) : []
  );

  // AI-004 — validate registry entries
  if (registry && !registry.__parseError && Array.isArray(registry.tools)) {
    for (const t of registry.tools) {
      const missing = [];
      if (!t.scope || !["read", "write", "admin"].includes(t.scope)) missing.push("scope");
      if (!t.test) missing.push("test");
      if (!t.schema) missing.push("schema");
      if (!t.endpoint) missing.push("endpoint");
      if (missing.length) {
        findings.push(
          finding("AI-004", CONFIG.registryFile, null, `"${t.name ?? "?"}" missing: ${missing.join(", ")}`)
        );
      }
    }
  } else if (registry?.__parseError) {
    findings.push(finding("AI-004", CONFIG.registryFile, null, "registry is not valid JSON"));
  }

  for (const file of walk(repoRoot)) {
    const rel = relative(repoRoot, file);
    const src = readFileSync(file, "utf8");
    const inAgentPath = isAgentPath(rel);

    // AI-001 — raw imports in agent paths
    if (inAgentPath) {
      for (const m of src.matchAll(RAW_IMPORT_RE)) {
        findings.push(finding("AI-001", rel, lineOf(src, m.index), `imports "${m[1]}"`));
      }
      // AI-005 — unregistered internal fetches
      for (const m of src.matchAll(INTERNAL_FETCH_RE)) {
        findings.push(
          finding("AI-005", rel, lineOf(src, m.index), `direct internal fetch: ${m[0].slice(0, 80)}`)
        );
      }
    }

    // Tool definition checks (any path)
    for (const m of src.matchAll(TOOL_DEF_RE)) {
      const toolName = m[1] ?? m[2];
      const line = lineOf(src, m.index);
      // Window: definition + following ~2000 chars (handler/config block)
      const windowSrc = src.slice(m.index, m.index + 2000);

      // AI-002 — schema completeness
      const hasInput = INPUT_SCHEMA_RE.test(windowSrc);
      const hasOutput = OUTPUT_SCHEMA_RE.test(windowSrc);
      if (!hasInput || !hasOutput) {
        const which = [!hasInput && "input", !hasOutput && "output"].filter(Boolean).join(" + ");
        findings.push(finding("AI-002", rel, line, `tool "${toolName}" missing ${which} schema`));
      }

      // AI-003 — registry membership
      if (registry === null) {
        findings.push(
          finding("AI-003", rel, line, `tool "${toolName}" defined but no ${CONFIG.registryFile} in repo`)
        );
      } else if (!registryTools.has(toolName)) {
        findings.push(finding("AI-003", rel, line, `tool "${toolName}" not in registry`));
      }

      // AI-007 — branch heuristic (branches beyond a single auth check)
      const branches = [...windowSrc.matchAll(BRANCH_RE)];
      const nonAuthBranches = branches.filter((b) => {
        const ctx = windowSrc.slice(Math.max(0, b.index - 60), b.index + 60);
        return !AUTH_HINT_RE.test(ctx);
      });
      if (nonAuthBranches.length > 1) {
        findings.push(
          finding("AI-007", rel, line, `tool "${toolName}" has ${nonAuthBranches.length} non-auth branches — logic belongs in the API procedure`)
        );
      }
    }

    // AI-006 — lazy output schemas (any path)
    for (const m of src.matchAll(LAZY_OUTPUT_RE)) {
      findings.push(finding("AI-006", rel, lineOf(src, m.index), m[0].trim()));
    }
  }

  return findings;
}

// ---------------------------------------------------------------------------
// wr-lint integration surface
// ---------------------------------------------------------------------------

export default {
  id: "agent-interface",
  standard: "AGENT_INTERFACE.md v1.0",
  rules: RULES,
  run,
};

// ---------------------------------------------------------------------------
// Standalone CLI
// ---------------------------------------------------------------------------

const isMain = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/").split("/").pop());
if (isMain) {
  const root = process.argv[2] ?? process.cwd();
  const findings = run(root);

  if (!findings.length) {
    console.log("✅ agent-interface: clean");
    process.exit(0);
  }

  let blocks = 0;
  for (const f of findings) {
    if (f.severity === SEV.BLOCK) blocks++;
    const loc = f.line ? `${f.file}:${f.line}` : f.file;
    console.log(`${f.severity === SEV.BLOCK ? "⛔" : "⚠️ "} [${f.rule}] ${loc} — ${f.detail}`);
  }
  console.log(`\n${findings.length} finding(s), ${blocks} blocking.`);
  process.exit(blocks > 0 ? 1 : 0);
}
