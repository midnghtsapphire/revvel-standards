#!/usr/bin/env node
"use strict";

/**
 * Drop-folder processor (WR #18379).
 *
 * Takes the .md files that were added or changed in the docs drop folders and
 * runs the handler that config/drop-folders.json names for that folder. The
 * folder -> handler routing is data (the config table); this file only holds
 * the handlers and the glue.
 *
 * Handlers:
 *   inbox-ingest            docs/inbox/*        -> runner-orchestrator dry-run (PR #13637)
 *   research-draft-compile  docs/research-drafts/<topic>/ -> completeness check + digest (PR #14871)
 *   source-bucket-route     docs/{notebook,chatgpt,claudeai,claudecode,claudecoworker,grok}/
 *                           -> which research-drafts topic it belongs to, or that one is missing
 *
 * Report-only. It never writes into the repo tree and never pushes. Output goes
 * to --out (default /tmp/drop-folder-artifacts), which CircleCI stores as
 * artifacts. A secret match in any processed file fails the run; every other
 * problem is a row in the report (use --strict to fail on refused intakes).
 *
 * Runs by hand from a README-style checkout, no CI needed:
 *   node scripts/drop-folder-process.js --all
 *   node scripts/drop-folder-process.js --files docs/inbox/my-idea.md
 *   node scripts/drop-folder-process.js --base auto        # what CircleCI runs
 *   node scripts/drop-folder-process.js --check-trigger dashboard
 *   node scripts/drop-folder-process.js --needs-deps
 */

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const REPO_ROOT = path.resolve(__dirname, "..");
const CONFIG_PATH = path.join(REPO_ROOT, "config", "drop-folders.json");

// ---------- config + glob helpers (pure) ----------

function loadConfig(configPath = CONFIG_PATH) {
  return JSON.parse(fs.readFileSync(configPath, "utf8"));
}

/** Glob -> RegExp. Supports `**` (any depth), `*` (no slash), `?`. */
function globToRegExp(glob) {
  let re = "";
  for (let i = 0; i < glob.length; i += 1) {
    const c = glob[i];
    if (c === "*") {
      if (glob[i + 1] === "*") {
        i += 1;
        if (glob[i + 1] === "/") {
          i += 1;
          re += "(?:.*/)?";
        } else {
          re += ".*";
        }
      } else {
        re += "[^/]*";
      }
    } else if (c === "?") {
      re += "[^/]";
    } else {
      re += c.replace(/[.+^${}()|[\]\\]/g, "\\$&");
    }
  }
  return new RegExp(`^${re}$`);
}

function matchesAny(file, globs = []) {
  return globs.some((g) => globToRegExp(g).test(file));
}

/** The route whose match globs claim this file and whose ignore globs do not. */
function routeFor(file, config) {
  const f = file.replace(/\\/g, "/");
  return (
    config.routes.find((r) => matchesAny(f, r.match) && !matchesAny(f, r.ignore || [])) || null
  );
}

/** Split changed files into per-route buckets; everything else is ignored. */
function planFiles(files, config) {
  const plan = [];
  for (const file of files) {
    const route = routeFor(file, config);
    if (route) plan.push({ file: file.replace(/\\/g, "/"), route });
  }
  return plan;
}

function triggerMatches(files, config, name) {
  const globs = (config.triggers && config.triggers[name]) || [];
  return files.some((f) => matchesAny(f.replace(/\\/g, "/"), globs));
}

function needsDeps(files, config) {
  return planFiles(files, config).some((p) => p.route.needs_deps);
}

// ---------- file helpers (pure-ish) ----------

/** Minimal `---` front matter parser: `key: value`, `[a, b]`, trailing `# comment`. */
function parseFrontMatter(text) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(text);
  if (!m) return { data: {}, body: text, hasFrontMatter: false };
  const data = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(line);
    if (!kv) continue;
    let v = kv[2].replace(/\s+#.*$/, "").trim();
    if (v.startsWith("[") && v.endsWith("]")) {
      v = v
        .slice(1, -1)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    } else if (/^-?\d+(\.\d+)?$/.test(v)) {
      v = Number(v);
    } else if (v === "") {
      v = null;
    }
    data[kv[1]] = v;
  }
  return { data, body: text.slice(m[0].length), hasFrontMatter: true };
}

function slugify(s) {
  return String(s)
    .toLowerCase()
    .replace(/\.md$/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function scanSecrets(text, patterns) {
  const hits = [];
  for (const p of patterns) {
    const re = new RegExp(p.regex, "g");
    if (re.test(text)) hits.push(p.id);
  }
  return hits;
}

function countConfidenceTags(text) {
  const count = (tag) => (text.match(new RegExp(`\\[${tag}\\]`, "gi")) || []).length;
  return { verified: count("verified"), plausible: count("plausible"), unverified: count("unverified") };
}

/** Data rows of the first markdown table that has an `ID` header; placeholders do not count. */
function countSourceRows(text) {
  let rows = 0;
  let inTable = false;
  for (const line of text.split(/\r?\n/)) {
    if (/^\|\s*ID\s*\|/i.test(line)) {
      inTable = true;
      continue;
    }
    if (!inTable) continue;
    if (!line.startsWith("|")) break;
    if (/^\|[\s:|-]+\|?$/.test(line)) continue;
    if (/YYYY-MM-DD|https?:\/\/…/.test(line)) continue;
    rows += 1;
  }
  return rows;
}

function headings(text, level) {
  const re = new RegExp(`^${"#".repeat(level)}\\s+(.+)$`, "gm");
  const out = [];
  let m;
  while ((m = re.exec(text))) out.push(m[1].trim());
  return out;
}

// ---------- handlers ----------

/**
 * Each handler: (item, ctx) -> row. `item` = { file, text, route }.
 * ctx = { root, config, orchestrator, exists(relPath) }.
 * row.status is one of: ok | routed | needs-topic | refused | skipped | warning.
 */
const HANDLERS = {
  "inbox-ingest": (item, ctx) => {
    const { data } = parseFrontMatter(item.text);
    const row = { file: item.file, handler: "inbox-ingest", status: "ok", notes: [] };
    if (!data || Object.keys(data).length === 0) {
      row.status = "refused";
      row.notes.push("no front matter; copy docs/inbox/TEMPLATE.md");
      return row;
    }
    const skip = item.route.skip_status || [];
    if (data.status && skip.includes(String(data.status))) {
      row.status = "skipped";
      row.notes.push(`intake status is "${data.status}"; already handled`);
      return row;
    }
    const intake = {
      intake_id: data.intake_id || undefined,
      product_slug: data.product_slug || undefined,
      revenue_target_monthly_usd: data.revenue_target_monthly_usd,
      goal_phase: data.goal_phase,
      output_type: data.output_type || undefined,
      shape: data.shape || undefined,
      owner: data.owner || undefined,
    };
    if (!intake.product_slug) {
      intake.product_slug = slugify(path.basename(item.file));
      row.notes.push(`product_slug not in front matter; derived "${intake.product_slug}" from the file name`);
    }
    const revenue = Number(intake.revenue_target_monthly_usd);
    const min = item.route.min_revenue_usd ?? 1;
    if (!(revenue >= min)) {
      row.status = "refused";
      row.notes.push(
        `no revenue target (revenue_target_monthly_usd=${data.revenue_target_monthly_usd}); engines/CONTRACT.md Rule 4 refuses it`
      );
      return row;
    }
    try {
      const normalized = ctx.orchestrator.normalizeIntake(intake);
      const res = ctx.orchestrator.orchestrate(normalized, { dryRun: true });
      row.status = "routed";
      row.plan = {
        product_slug: normalized.product_slug,
        deliver_channel: res.channel,
        deliver_label: res.deliverLabel,
        runner_target: ctx.orchestrator.runnerTargetFor(res.channel),
        route_to_engine: data.route_to_engine || null,
        state_status: res.status,
      };
      row.notes.push("dry-run only; no state.json written");
    } catch (err) {
      row.status = "refused";
      row.notes.push(err.message);
    }
    return row;
  },

  "research-draft-compile": (item, ctx) => {
    const rel = item.file.slice(item.route.folder.length);
    const parts = rel.split("/");
    const row = { file: item.file, handler: "research-draft-compile", status: "ok", notes: [] };
    if (parts.length < 2) {
      row.status = "warning";
      row.notes.push("file is not inside a topic folder; copy docs/research-drafts/_TEMPLATE/ to docs/research-drafts/<topic>/");
      return row;
    }
    const topic = parts[0];
    row.topic = topic;
    const topicDir = `${item.route.folder}${topic}/`;
    const missing = (item.route.required_files || []).filter((f) => !ctx.exists(`${topicDir}${f}`));
    if (missing.length) {
      row.status = "warning";
      row.notes.push(`topic "${topic}" is missing ${missing.join(", ")}`);
    }
    return row;
  },

  "source-bucket-route": (item, ctx) => {
    const rel = item.file.slice(item.route.folder.length);
    const parts = rel.split("/");
    const row = {
      file: item.file,
      handler: "source-bucket-route",
      source: item.route.source_label,
      status: "ok",
      notes: ["unverified until checked against a primary source"],
    };
    const topic = parts.length > 1 ? parts[0] : null;
    if (!topic) {
      row.status = "needs-topic";
      row.notes.push(
        `file sits at the top of ${item.route.folder}; put it in a topic subfolder, then compile it in ${item.route.target_folder}<topic>/`
      );
      return row;
    }
    const target = `${item.route.target_folder}${topic}/`;
    row.topic = topic;
    row.target = target;
    if (ctx.exists(`${target}sources.md`)) {
      row.status = "routed";
      row.notes.push(`log it as a row in ${target}sources.md and compile it in ${target}NOTEBOOK.md`);
    } else {
      row.status = "needs-topic";
      row.notes.push(`no ${target} yet: cp -r ${item.route.target_folder}_TEMPLATE ${target}`);
    }
    if (!/https?:\/\/|^source:/im.test(item.text)) {
      row.notes.push("no URL or `source:` line found; provenance is TODO");
    }
    return row;
  },
};

// ---------- digest for research drafts ----------

function buildDigest(topic, ctx, config) {
  const dir = `docs/research-drafts/${topic}/`;
  const read = (f) => (ctx.exists(dir + f) ? ctx.read(dir + f) : "");
  const readme = read("README.md");
  const notebook = read("NOTEBOOK.md");
  const sources = read("sources.md");
  const title = (headings(readme, 1)[0] || topic).replace(/\s+/g, " ");
  const tags = countConfidenceTags(notebook);
  const lines = [
    `# Digest: ${topic}`,
    "",
    `Generated by scripts/drop-folder-process.js (WR #${config.wr}). Not a standard. Nothing here is promoted.`,
    "",
    `- Title: ${title}`,
    `- Source rows logged in sources.md: ${countSourceRows(sources)}`,
    `- Findings tagged in NOTEBOOK.md: verified ${tags.verified}, plausible ${tags.plausible}, unverified ${tags.unverified}`,
    `- Files present: ${["README.md", "NOTEBOOK.md", "sources.md"].filter((f) => ctx.exists(dir + f)).join(", ") || "none"}`,
    "",
    "## NOTEBOOK.md sections",
    "",
    ...(headings(notebook, 2).length ? headings(notebook, 2).map((h) => `- ${h}`) : ["- (none yet)"]),
    "",
  ];
  return lines.join("\n");
}

// ---------- run ----------

function run(files, opts = {}) {
  const root = opts.root || REPO_ROOT;
  const config = opts.config || loadConfig();
  const exists = opts.exists || ((rel) => fs.existsSync(path.join(root, rel)));
  const read = opts.read || ((rel) => fs.readFileSync(path.join(root, rel), "utf8"));
  const ctx = { root, config, exists, read, orchestrator: opts.orchestrator || null };
  const plan = planFiles(files, config);
  const rows = [];
  const failures = [];
  const topics = new Set();

  for (const item of plan) {
    if (!exists(item.file)) {
      rows.push({ file: item.file, handler: item.route.handler, status: "skipped", notes: ["file no longer exists"] });
      continue;
    }
    const size = (opts.size || ((rel) => fs.statSync(path.join(root, rel)).size))(item.file);
    if (size > config.limits.max_bytes) {
      rows.push({ file: item.file, handler: item.route.handler, status: "warning", notes: [`larger than ${config.limits.max_bytes} bytes; not read`] });
      continue;
    }
    const text = read(item.file);
    const hits = scanSecrets(text, config.secret_patterns);
    if (hits.length) {
      failures.push({ file: item.file, secret_patterns: hits });
      rows.push({ file: item.file, handler: item.route.handler, status: "refused", notes: [`possible secret (${hits.join(", ")}); contents not echoed`] });
      continue;
    }
    const handler = HANDLERS[item.route.handler];
    if (!handler) throw new Error(`No handler "${item.route.handler}" for ${item.route.folder}`);
    if (item.route.needs_deps && !ctx.orchestrator) {
      ctx.orchestrator = require(path.join(root, "engines", "runner-orchestrator", "orchestrate.js"));
    }
    const row = handler({ file: item.file, text, route: item.route }, ctx);
    if (row.topic && item.route.handler === "research-draft-compile") topics.add(row.topic);
    rows.push(row);
  }

  const digests = {};
  for (const topic of topics) digests[topic] = buildDigest(topic, ctx, config);

  const counts = rows.reduce((acc, r) => ({ ...acc, [r.status]: (acc[r.status] || 0) + 1 }), {});
  return { wr: config.wr, processed: rows.length, counts, rows, digests, failures };
}

function renderReport(result) {
  const lines = [
    `# Drop-folder report (WR #${result.wr})`,
    "",
    `Files processed: ${result.processed}. ${Object.entries(result.counts).map(([k, v]) => `${k}: ${v}`).join(", ") || "none"}.`,
    "",
  ];
  if (result.rows.length) {
    lines.push("| File | Handler | Status | Notes |", "| --- | --- | --- | --- |");
    for (const r of result.rows) {
      lines.push(`| \`${r.file}\` | ${r.handler} | ${r.status} | ${(r.notes || []).join("; ").replace(/\|/g, "/")} |`);
    }
    lines.push("");
  }
  return lines.join("\n");
}

// ---------- git + CLI ----------

function git(args) {
  return execFileSync("git", args, { cwd: REPO_ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
}

/** Changed files for CI. `auto`: main -> last commit; any other branch -> merge-base with origin/main. */
function changedFiles(base) {
  let ref = base;
  if (base === "auto") {
    const branch = process.env.CIRCLE_BRANCH || "";
    if (branch === "main") {
      ref = "HEAD~1";
    } else {
      try {
        ref = git(["merge-base", "origin/main", "HEAD"]).trim();
      } catch (_) {
        ref = "HEAD~1";
      }
    }
  }
  try {
    return git(["diff", "--name-only", "--diff-filter=d", ref, "HEAD"]).split("\n").filter(Boolean);
  } catch (err) {
    process.stderr.write(`warning: could not diff against ${ref}: ${err.message.split("\n")[0]}\n`);
    return [];
  }
}

function allDropFiles(config) {
  const out = [];
  const walk = (dir) => {
    for (const e of fs.readdirSync(path.join(REPO_ROOT, dir), { withFileTypes: true })) {
      const rel = `${dir}${e.name}`;
      if (e.isDirectory()) walk(`${rel}/`);
      else if (e.name.endsWith(".md")) out.push(rel);
    }
  };
  for (const folder of config.required_folders) {
    if (fs.existsSync(path.join(REPO_ROOT, folder))) walk(folder);
  }
  return out;
}

function parseArgs(argv) {
  const flags = { files: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--files") {
      while (argv[i + 1] && !argv[i + 1].startsWith("--")) flags.files.push(argv[(i += 1)]);
    } else if (["--all", "--strict", "--needs-deps", "--help"].includes(a)) {
      flags[a.slice(2)] = true;
    } else if (["--base", "--out", "--check-trigger"].includes(a)) {
      flags[a.slice(2)] = argv[(i += 1)];
    } else {
      throw new Error(`Unknown argument: ${a}`);
    }
  }
  return flags;
}

function main() {
  const flags = parseArgs(process.argv.slice(2));
  if (flags.help) {
    console.log("Usage: node scripts/drop-folder-process.js [--all | --files <f...> | --base <ref|auto>] [--out <dir>] [--strict] [--check-trigger <name>] [--needs-deps]");
    return 0;
  }
  const config = loadConfig();
  let files = flags.files;
  if (flags.all) files = allDropFiles(config);
  else if (flags.base) files = changedFiles(flags.base);
  else if (!files.length && !flags["check-trigger"] && !flags["needs-deps"]) {
    throw new Error("Give --all, --files, or --base");
  }

  if (flags["check-trigger"]) {
    if (!config.triggers || !config.triggers[flags["check-trigger"]]) throw new Error(`Unknown trigger: ${flags["check-trigger"]}`);
    console.log(triggerMatches(files, config, flags["check-trigger"]) ? "true" : "false");
    return 0;
  }
  if (flags["needs-deps"]) {
    console.log(needsDeps(files, config) ? "true" : "false");
    return 0;
  }

  const result = run(files);
  const out = path.resolve(flags.out || "/tmp/drop-folder-artifacts");
  fs.mkdirSync(path.join(out, "compiled"), { recursive: true });
  const { digests, ...report } = result;
  fs.writeFileSync(path.join(out, "report.json"), JSON.stringify(report, null, 2) + "\n");
  fs.writeFileSync(path.join(out, "report.md"), renderReport(result));
  for (const [topic, md] of Object.entries(digests)) fs.writeFileSync(path.join(out, "compiled", `${topic}.md`), md);

  console.log(renderReport(result));
  console.log(`Artifacts written to ${out}`);
  if (result.failures.length) {
    console.error(`FAIL: possible secrets in ${result.failures.map((f) => f.file).join(", ")}`);
    return 1;
  }
  if (flags.strict && (result.counts.refused || 0) > 0) {
    console.error("FAIL (--strict): refused intakes");
    return 1;
  }
  return 0;
}

if (require.main === module) {
  try {
    process.exitCode = main();
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exitCode = 1;
  }
}

module.exports = {
  loadConfig,
  globToRegExp,
  matchesAny,
  routeFor,
  planFiles,
  triggerMatches,
  needsDeps,
  parseFrontMatter,
  slugify,
  scanSecrets,
  countConfidenceTags,
  countSourceRows,
  buildDigest,
  run,
  renderReport,
  HANDLERS,
};
