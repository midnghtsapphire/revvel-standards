#!/usr/bin/env node
"use strict";

/**
 * Prompt Knowledge Repository CLI
 *
 * Manages prompts/catalog.json — internal system prompts, external indexes
 * (system_prompts_leaks), concepts, LLM combos, metadata, folders, and
 * NotebookLM export packs.
 *
 * Why this exists:
 *   Issue #16419 needs a single extensible store + process so agents do not
 *   invent parallel prompt trees. Inventory is intentionally unfiltered;
 *   third-party bodies stay URL-referenced (optional gitignored cache).
 *
 * Failures to expect:
 *   - Missing SYSTEM_PROMPT.md for a registered internal entry → validate ≠ 0
 *   - GitHub API rate limit on refresh-external → retry later; local INDEX kept
 *   - Path escape attempts on fetch-external → rejected
 */

const fs = require("fs");
const path = require("path");
const https = require("https");

const ROOT = path.resolve(__dirname, "..");
const CATALOG_PATH = path.join(ROOT, "prompts", "catalog.json");
const SCHEMA_PATH = path.join(
  ROOT,
  "schemas",
  "prompt-knowledge-catalog.schema.json"
);
const META_PATH = path.join(ROOT, "prompts", "metadata", "catalog-meta.json");
const EXTERNAL_SPL = path.join(
  ROOT,
  "prompts",
  "external",
  "system_prompts_leaks"
);
const NOTEBOOKLM_DIR = path.join(ROOT, "docs", "notebooklm");
const SOURCES_PATH = path.join(NOTEBOOKLM_DIR, "sources", "SOURCES.json");

const REQUIRED_INTERNAL_PROMPTS = [
  "prompts/internal/thought-process/SYSTEM_PROMPT.md",
  "prompts/internal/memory/SYSTEM_PROMPT.md",
  "prompts/internal/learning/SYSTEM_PROMPT.md",
  "prompts/internal/api/SYSTEM_PROMPT.md",
  "prompts/internal/cli/SYSTEM_PROMPT.md",
  "prompts/internal/mcp/SYSTEM_PROMPT.md",
  "prompts/internal/skills/SYSTEM_PROMPT.md",
  "prompts/internal/tools/SYSTEM_PROMPT.md",
  "prompts/internal/sub-agents/SYSTEM_PROMPT.md",
  "prompts/internal/github-requests/SYSTEM_PROMPT.md",
];

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function nowIso() {
  return new Date().toISOString();
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/^concept\./, "")
    .replace(/^combo\./, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function loadCatalog() {
  if (!fs.existsSync(CATALOG_PATH)) {
    throw new Error(`catalog missing: ${path.relative(ROOT, CATALOG_PATH)}`);
  }
  return readJson(CATALOG_PATH);
}

function saveCatalog(catalog) {
  catalog.updated_at = nowIso();
  writeJson(CATALOG_PATH, catalog);
}

function assertInsideRoot(targetPath) {
  const resolved = path.resolve(targetPath);
  if (resolved !== ROOT && !resolved.startsWith(`${ROOT}${path.sep}`)) {
    throw new Error(`path escapes repository root: ${targetPath}`);
  }
  return resolved;
}

function rel(p) {
  return path.relative(ROOT, p).split(path.sep).join("/");
}

/**
 * Lightweight structural validation (mirrors schema required fields without
 * requiring ajv at runtime in every environment).
 */
function validateCatalog(catalog, options = {}) {
  const errors = [];
  const required = [
    "schema_version",
    "id",
    "title",
    "updated_at",
    "roots",
    "entries",
    "concepts",
    "llm_combos",
    "notebooklm",
  ];
  for (const key of required) {
    if (catalog[key] === undefined || catalog[key] === null) {
      errors.push(`missing required field: ${key}`);
    }
  }
  if (catalog.policy && catalog.policy.censor === true) {
    errors.push("policy.censor must be false (uncensored inventory)");
  }
  if (!Array.isArray(catalog.entries)) {
    errors.push("entries must be an array");
  } else {
    const ids = new Set();
    for (const entry of catalog.entries) {
      if (!entry.id || !entry.kind || !entry.path || !entry.title) {
        errors.push(`entry missing id/kind/path/title: ${JSON.stringify(entry)}`);
        continue;
      }
      if (ids.has(entry.id)) errors.push(`duplicate entry id: ${entry.id}`);
      ids.add(entry.id);
      const abs = path.join(ROOT, entry.path);
      if (!fs.existsSync(abs)) {
        errors.push(`entry path missing on disk: ${entry.path}`);
      }
    }
  }
  if (!Array.isArray(catalog.concepts)) {
    errors.push("concepts must be an array");
  } else {
    for (const c of catalog.concepts) {
      if (!c.id || !c.name || !c.summary || !c.path) {
        errors.push(`concept incomplete: ${JSON.stringify(c)}`);
        continue;
      }
      if (!fs.existsSync(path.join(ROOT, c.path))) {
        errors.push(`concept path missing: ${c.path}`);
      }
    }
  }
  if (!Array.isArray(catalog.llm_combos)) {
    errors.push("llm_combos must be an array");
  } else {
    for (const combo of catalog.llm_combos) {
      if (!combo.id || !combo.name || !Array.isArray(combo.models) || !combo.path) {
        errors.push(`llm_combo incomplete: ${JSON.stringify(combo)}`);
        continue;
      }
      if (combo.models.length < 1) {
        errors.push(`llm_combo ${combo.id} needs ≥1 model`);
      }
      if (!fs.existsSync(path.join(ROOT, combo.path))) {
        errors.push(`llm_combo path missing: ${combo.path}`);
      }
    }
  }
  for (const req of REQUIRED_INTERNAL_PROMPTS) {
    if (!fs.existsSync(path.join(ROOT, req))) {
      errors.push(`required internal system prompt missing: ${req}`);
    }
  }
  if (!fs.existsSync(SCHEMA_PATH)) {
    errors.push(`schema missing: ${rel(SCHEMA_PATH)}`);
  }
  const splIndex = path.join(EXTERNAL_SPL, "INDEX.json");
  if (!fs.existsSync(splIndex)) {
    errors.push("external system_prompts_leaks INDEX.json missing");
  } else if (options.checkExternalIndex !== false) {
    try {
      const idx = readJson(splIndex);
      if (!Array.isArray(idx.files) || idx.files.length < 1) {
        errors.push("external INDEX.json has empty files[] (inventory incomplete)");
      }
      if (idx.source && idx.source.policy && /censor|filter-out/i.test(idx.source.policy) && !/no-censor|unfilter/i.test(idx.source.policy)) {
        errors.push("external index policy appears to censor inventory");
      }
    } catch (err) {
      errors.push(`external INDEX.json unreadable: ${err.message}`);
    }
  }
  return errors;
}

function cmdValidate() {
  const catalog = loadCatalog();
  const errors = validateCatalog(catalog);
  if (errors.length) {
    console.error("validate FAILED:");
    for (const e of errors) console.error(`  - ${e}`);
    return 1;
  }
  console.log(
    `validate OK: ${catalog.entries.length} entries, ${catalog.concepts.length} concepts, ${catalog.llm_combos.length} llm_combos`
  );
  return 0;
}

function cmdList() {
  const catalog = loadCatalog();
  console.log(`# ${catalog.title}`);
  console.log(`updated_at: ${catalog.updated_at}`);
  console.log("\n## entries");
  for (const e of catalog.entries) {
    console.log(`- [${e.kind}] ${e.id} → ${e.path}`);
  }
  console.log("\n## concepts");
  for (const c of catalog.concepts) {
    console.log(`- ${c.id}: ${c.name}`);
  }
  console.log("\n## llm_combos");
  for (const c of catalog.llm_combos) {
    console.log(`- ${c.id}: ${c.models.join(" → ")}`);
  }
  return 0;
}

function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (!next || next.startsWith("--")) {
        out[key] = true;
      } else {
        out[key] = next;
        i += 1;
      }
    } else {
      out._.push(a);
    }
  }
  return out;
}

function cmdAddConcept(args) {
  const id = args.id || args._[0];
  const name = args.name;
  const summary = args.summary;
  if (!id || !name || !summary) {
    throw new Error("add-concept requires --id --name --summary");
  }
  const catalog = loadCatalog();
  if (catalog.concepts.some((c) => c.id === id)) {
    throw new Error(`concept already exists: ${id}`);
  }
  const slug = slugify(id);
  const relPath = `prompts/concepts/${slug}.md`;
  const abs = assertInsideRoot(path.join(ROOT, relPath));
  if (!fs.existsSync(abs)) {
    const related = (args.related || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const body = [
      `# Concept — ${name}`,
      "",
      `**Id:** \`${id}\``,
      "",
      "## Summary",
      "",
      summary,
      "",
      related.length ? `## Related\n\n${related.map((r) => `- \`${r}\``).join("\n")}\n` : "",
    ].join("\n");
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, body, "utf8");
  }
  catalog.concepts.push({
    id,
    name,
    summary,
    path: relPath,
    related_entries: (args.related || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  });
  catalog.entries.push({
    id: `entry.${id}`,
    kind: "concept",
    path: relPath,
    title: name,
    tags: ["concept"],
    scope: "shared",
  });
  saveCatalog(catalog);
  console.log(`added concept ${id} → ${relPath}`);
  return 0;
}

function cmdAddLlmCombo(args) {
  const id = args.id;
  const name = args.name;
  const modelsRaw = args.models;
  if (!id || !name || !modelsRaw) {
    throw new Error("add-llm-combo requires --id --name --models");
  }
  const models = String(modelsRaw)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (!models.length) throw new Error("--models must list at least one model");
  const catalog = loadCatalog();
  if (catalog.llm_combos.some((c) => c.id === id)) {
    throw new Error(`llm_combo already exists: ${id}`);
  }
  const slug = slugify(id);
  const relPath = `prompts/llm-combos/${slug}.md`;
  const abs = assertInsideRoot(path.join(ROOT, relPath));
  const systemPrompts = (args["system-prompts"] || args.system_prompts || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const useWhen = args["use-when"] || args.use_when || "";
  if (!fs.existsSync(abs)) {
    const body = [
      `# LLM combo — ${name}`,
      "",
      `**Id:** \`${id}\``,
      "",
      "## Models (ladder)",
      "",
      ...models.map((m, i) => `${i + 1}. \`${m}\``),
      "",
      systemPrompts.length
        ? `## System prompts\n\n${systemPrompts.map((s) => `- \`${s}\``).join("\n")}\n`
        : "",
      useWhen ? `## Use when\n\n${useWhen}\n` : "",
    ].join("\n");
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, body, "utf8");
  }
  catalog.llm_combos.push({
    id,
    name,
    models,
    path: relPath,
    use_when: useWhen,
    system_prompt_ids: systemPrompts,
  });
  catalog.entries.push({
    id: `entry.${id}`,
    kind: "llm-combo",
    path: relPath,
    title: name,
    tags: ["llm-combo"],
    scope: "shared",
  });
  saveCatalog(catalog);
  console.log(`added llm_combo ${id} → ${relPath}`);
  return 0;
}

function cmdAddFolder(args) {
  const scope = args.scope;
  const name = args.name;
  if (!scope || !name) throw new Error("add-folder requires --scope and --name");
  if (!["internal", "external"].includes(scope)) {
    throw new Error("--scope must be internal or external");
  }
  const slug = slugify(name);
  const relPath = `prompts/${scope}/${slug}`;
  const abs = assertInsideRoot(path.join(ROOT, relPath));
  fs.mkdirSync(abs, { recursive: true });
  if (scope === "internal") {
    const sp = path.join(abs, "SYSTEM_PROMPT.md");
    if (!fs.existsSync(sp)) {
      fs.writeFileSync(
        sp,
        [
          `# System prompt — ${name}`,
          "",
          "Use this lane prompt for owner GitHub requests that match this folder.",
          "",
          "---",
          "",
          `You are the **${name}** lane for midnghtsapphire/revvel-standards.`,
          "",
          "## Mandate",
          "",
          "(Fill in: what this lane owns.)",
          "",
          "## Hard rules",
          "",
          "1. No scaffolding in shipped code.",
          "2. Record provenance.",
          "3. Default repo is midnghtsapphire/revvel-standards unless named otherwise.",
          "",
        ].join("\n"),
        "utf8"
      );
    }
  } else {
    const readme = path.join(abs, "README.md");
    if (!fs.existsSync(readme)) {
      fs.writeFileSync(
        readme,
        [
          `# External source — ${name}`,
          "",
          "Place INDEX.json inventory here. Bodies optional under cache/ (gitignored).",
          "",
        ].join("\n"),
        "utf8"
      );
    }
  }
  const catalog = loadCatalog();
  const entryId = `folder.${scope}.${slug}`;
  if (!catalog.entries.some((e) => e.id === entryId)) {
    catalog.entries.push({
      id: entryId,
      kind: "folder",
      path: relPath,
      title: `${scope}/${slug}`,
      tags: [scope, "folder"],
      scope,
    });
    saveCatalog(catalog);
  }
  console.log(`added folder ${relPath}`);
  return 0;
}

function cmdAddMetadata(args) {
  const key = args.key;
  const value = args.value;
  if (!key || value === undefined) {
    throw new Error("add-metadata requires --key and --value");
  }
  let meta = {};
  if (fs.existsSync(META_PATH)) meta = readJson(META_PATH);
  meta[key] = value;
  writeJson(META_PATH, meta);
  const catalog = loadCatalog();
  catalog.metadata = { ...(catalog.metadata || {}), ...meta };
  saveCatalog(catalog);
  console.log(`metadata ${key}=${value}`);
  return 0;
}

function httpsGetJson(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(
      url,
      {
        headers: {
          "User-Agent": "revvel-standards-prompt-knowledge-repo",
          Accept: "application/vnd.github+json",
        },
      },
      (res) => {
        let body = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => {
          body += chunk;
        });
        res.on("end", () => {
          if (res.statusCode && res.statusCode >= 400) {
            reject(new Error(`HTTP ${res.statusCode} for ${url}: ${body.slice(0, 200)}`));
            return;
          }
          try {
            resolve(JSON.parse(body));
          } catch (err) {
            reject(err);
          }
        });
      }
    );
    req.on("error", reject);
  });
}

function httpsGetText(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(
      url,
      { headers: { "User-Agent": "revvel-standards-prompt-knowledge-repo" } },
      (res) => {
        // follow one redirect
        if (
          res.statusCode &&
          res.statusCode >= 300 &&
          res.statusCode < 400 &&
          res.headers.location
        ) {
          httpsGetText(res.headers.location).then(resolve, reject);
          res.resume();
          return;
        }
        let body = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => {
          body += chunk;
        });
        res.on("end", () => {
          if (res.statusCode && res.statusCode >= 400) {
            reject(new Error(`HTTP ${res.statusCode} for ${url}`));
            return;
          }
          resolve(body);
        });
      }
    );
    req.on("error", reject);
  });
}

async function buildSplIndex() {
  const api =
    "https://api.github.com/repos/asgeirtj/system_prompts_leaks/git/trees/main?recursive=1";
  const treePayload = await httpsGetJson(api);
  const tree = treePayload.tree || [];
  const blobs = tree.filter((t) => t.type === "blob");
  const byVendor = {};
  const files = [];
  for (const t of blobs) {
    const parts = t.path.split("/");
    const vendor = parts.length > 1 ? parts[0] : "_root";
    if (!byVendor[vendor]) {
      byVendor[vendor] = { file_count: 0, total_bytes: 0, paths: [] };
    }
    byVendor[vendor].file_count += 1;
    byVendor[vendor].total_bytes += t.size || 0;
    byVendor[vendor].paths.push(t.path);
    files.push({
      path: t.path,
      size: t.size || 0,
      sha: t.sha || "",
      source_url: `https://github.com/asgeirtj/system_prompts_leaks/blob/main/${t.path}`,
      raw_url: `https://raw.githubusercontent.com/asgeirtj/system_prompts_leaks/main/${t.path}`,
    });
  }
  return {
    schema_version: "1.0.0",
    id: "external.system_prompts_leaks",
    title: "system_prompts_leaks external source index",
    description:
      "Unfiltered structural index of https://github.com/asgeirtj/system_prompts_leaks. Bodies referenced by URL; optional local cache via fetch-external.",
    source: {
      repo: "asgeirtj/system_prompts_leaks",
      url: "https://github.com/asgeirtj/system_prompts_leaks",
      head_ref: "main",
      indexed_at: nowIso(),
      tree_sha: treePayload.sha || null,
      blob_count: blobs.length,
      policy:
        "index-all-no-censor; bodies external-by-url; optional local cache under prompts/external/system_prompts_leaks/cache/ (gitignored)",
    },
    vendors: byVendor,
    files,
  };
}

function writeSplInventory(index) {
  const lines = [
    "# system_prompts_leaks — full inventory (unfiltered)",
    "",
    "Source: https://github.com/asgeirtj/system_prompts_leaks",
    "",
    `Indexed: ${index.source.indexed_at}`,
    "",
    `Blob count: ${index.files.length}`,
    "",
    "## Vendors",
    "",
    "| Vendor | Files | Bytes |",
    "| --- | ---: | ---: |",
  ];
  for (const vendor of Object.keys(index.vendors).sort()) {
    const info = index.vendors[vendor];
    lines.push(`| ${vendor} | ${info.file_count} | ${info.total_bytes} |`);
  }
  lines.push("", "## All paths", "");
  for (const fi of index.files) {
    lines.push(`- [${fi.path}](${fi.source_url}) (\`${fi.size}\` bytes)`);
  }
  lines.push("");
  fs.writeFileSync(path.join(EXTERNAL_SPL, "INVENTORY.md"), lines.join("\n"), "utf8");
}

async function cmdRefreshExternal(args) {
  const source = args.source || "system_prompts_leaks";
  if (source !== "system_prompts_leaks") {
    throw new Error(`unsupported external source: ${source}`);
  }
  fs.mkdirSync(EXTERNAL_SPL, { recursive: true });
  const index = await buildSplIndex();
  writeJson(path.join(EXTERNAL_SPL, "INDEX.json"), index);
  writeSplInventory(index);
  console.log(
    `refreshed ${source}: ${index.files.length} files, ${Object.keys(index.vendors).length} vendors`
  );
  return 0;
}

async function cmdFetchExternal(args) {
  const source = args.source || "system_prompts_leaks";
  const filePath = args.path;
  if (!filePath) throw new Error("fetch-external requires --path");
  if (source !== "system_prompts_leaks") {
    throw new Error(`unsupported external source: ${source}`);
  }
  // Prevent path escape / absolute paths
  if (filePath.includes("..") || path.isAbsolute(filePath)) {
    throw new Error("refusing unsafe --path");
  }
  const indexPath = path.join(EXTERNAL_SPL, "INDEX.json");
  if (!fs.existsSync(indexPath)) {
    throw new Error("INDEX.json missing; run refresh-external first");
  }
  const index = readJson(indexPath);
  const hit = (index.files || []).find((f) => f.path === filePath);
  if (!hit) {
    throw new Error(`path not in unfiltered index: ${filePath}`);
  }
  const cacheRoot = assertInsideRoot(path.join(EXTERNAL_SPL, "cache"));
  const dest = assertInsideRoot(path.join(cacheRoot, filePath));
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  const body = await httpsGetText(hit.raw_url);
  fs.writeFileSync(dest, body, "utf8");
  console.log(`cached ${filePath} → ${rel(dest)} (${body.length} bytes)`);
  return 0;
}

function cmdExportNotebooklm() {
  const catalog = loadCatalog();
  fs.mkdirSync(path.join(NOTEBOOKLM_DIR, "sources"), { recursive: true });
  fs.mkdirSync(path.join(NOTEBOOKLM_DIR, "exports"), { recursive: true });
  fs.mkdirSync(path.join(NOTEBOOKLM_DIR, "guides"), { recursive: true });

  const sources = {
    schema_version: "1.0.0",
    id: "notebooklm.revvel-prompt-knowledge",
    title: "NotebookLM pack — Revvel prompt knowledge",
    updated_at: nowIso(),
    policy: { censor: false },
    upload_roots: [
      "prompts/internal",
      "prompts/concepts",
      "prompts/llm-combos",
      "prompts/processes",
      "prompts/external/system_prompts_leaks/INVENTORY.md",
      "prompts/external/system_prompts_leaks/INDEX.json",
      "docs/notebooklm/guides",
      "process/prompt-knowledge-repo.md",
    ],
    sources: [],
  };

  function addSource(entry) {
    sources.sources.push(entry);
  }

  for (const e of catalog.entries) {
    addSource({
      id: e.id,
      title: e.title,
      path: e.path,
      kind: e.kind,
      source_url: e.source_url || null,
      tags: e.tags || [],
    });
  }
  for (const c of catalog.concepts) {
    addSource({
      id: c.id,
      title: c.name,
      path: c.path,
      kind: "concept",
      tags: ["concept"],
    });
  }
  for (const c of catalog.llm_combos) {
    addSource({
      id: c.id,
      title: c.name,
      path: c.path,
      kind: "llm-combo",
      tags: ["llm-combo"],
    });
  }

  // Include every external inventory path as a URL source (uncensored list)
  const splIndexPath = path.join(EXTERNAL_SPL, "INDEX.json");
  if (fs.existsSync(splIndexPath)) {
    const idx = readJson(splIndexPath);
    for (const f of idx.files || []) {
      addSource({
        id: `spl:${f.path}`,
        title: f.path,
        path: null,
        kind: "external-url",
        source_url: f.source_url,
        tags: ["system_prompts_leaks", "external"],
      });
    }
  }

  writeJson(SOURCES_PATH, sources);

  const exportMd = path.join(NOTEBOOKLM_DIR, "exports", "PACK_MANIFEST.md");
  const md = [
    "# NotebookLM pack manifest",
    "",
    `Updated: ${sources.updated_at}`,
    "",
    `Source count: ${sources.sources.length}`,
    "",
    "## Upload roots (repo-relative)",
    "",
    ...sources.upload_roots.map((r) => `- \`${r}\``),
    "",
    "## How to load in NotebookLM",
    "",
    "1. Open [NotebookLM](https://notebooklm.google.com/).",
    "2. Create notebook **Revvel Prompt Knowledge**.",
    "3. Add sources → upload files from the upload roots above (or paste URLs from SOURCES.json external-url entries).",
    "4. Do not strip inventory entries — the pack is intentionally complete.",
    "",
  ];
  fs.writeFileSync(exportMd, md.join("\n"), "utf8");

  // Keep catalog pointer fresh
  catalog.notebooklm = {
    pack_dir: "docs/notebooklm",
    sources_manifest: "docs/notebooklm/sources/SOURCES.json",
    export_dir: "docs/notebooklm/exports",
  };
  saveCatalog(catalog);

  console.log(
    `export-notebooklm OK: ${sources.sources.length} sources → ${rel(SOURCES_PATH)}`
  );
  return 0;
}

function usage() {
  console.log(`Usage: node scripts/prompt-knowledge-repo.js <command> [options]

Commands:
  validate
  list
  add-concept --id <id> --name <name> --summary <text> [--related a,b]
  add-llm-combo --id <id> --name <name> --models a,b [--use-when t] [--system-prompts a,b]
  add-folder --scope internal|external --name <name>
  add-metadata --key <k> --value <v>
  refresh-external --source system_prompts_leaks
  fetch-external --source system_prompts_leaks --path <upstream/path>
  export-notebooklm
`);
}

async function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  const cmd = args._[0];
  if (!cmd || args.help || args.h) {
    usage();
    return cmd ? 0 : 1;
  }
  const rest = { ...args, _: args._.slice(1) };
  switch (cmd) {
    case "validate":
      return cmdValidate();
    case "list":
      return cmdList();
    case "add-concept":
      return cmdAddConcept(rest);
    case "add-llm-combo":
      return cmdAddLlmCombo(rest);
    case "add-folder":
      return cmdAddFolder(rest);
    case "add-metadata":
      return cmdAddMetadata(rest);
    case "refresh-external":
      return cmdRefreshExternal(rest);
    case "fetch-external":
      return cmdFetchExternal(rest);
    case "export-notebooklm":
      return cmdExportNotebooklm();
    default:
      console.error(`unknown command: ${cmd}`);
      usage();
      return 1;
  }
}

module.exports = {
  ROOT,
  CATALOG_PATH,
  REQUIRED_INTERNAL_PROMPTS,
  loadCatalog,
  validateCatalog,
  slugify,
  parseArgs,
  main,
  cmdValidate,
  cmdExportNotebooklm,
  buildSplIndex,
};

if (require.main === module) {
  main()
    .then((code) => process.exit(code ?? 0))
    .catch((err) => {
      console.error(err.message || err);
      process.exit(1);
    });
}
