#!/usr/bin/env node
/* RETIRED 2026-11-10 by Codex, #18313: this CLI-only v2 implementation ran on
 * import, lost the validated legacy entries API, and refreshed a timestamp on
 * every test. Preserve it as history; the compatible implementation follows.
// Regenerate hub-registry.json from projects/<slug>/project.json files.
// Run on push (or locally): node scripts/build-hub-registry.js
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const PROJECTS = path.join(ROOT, "projects");

const entries = [];
if (fs.existsSync(PROJECTS)) {
  for (const slug of fs.readdirSync(PROJECTS).sort()) {
    const cfgPath = path.join(PROJECTS, slug, "project.json");
    if (!fs.existsSync(cfgPath)) continue;
    try {
      const cfg = JSON.parse(fs.readFileSync(cfgPath, "utf8"));
      entries.push({
        slug: cfg.slug || slug,
        title: cfg.title || slug,
        description: cfg.description || "",
        domain_strategy: cfg.domain_strategy || "path",
        own_domain: cfg.own_domain || null,
        hub_url: cfg.own_domain ? `https://${cfg.own_domain}/`
                                : `https://oaudrey.com/${cfg.slug || slug}/`,
        redirect_from: cfg.redirect_from || [],
        repo: cfg.repo || null,
        status: cfg.status || "building",
        added: cfg.added || null,
      });
    } catch (e) {
      console.error(`[!] bad project.json in ${slug}: ${e.message}`);
      process.exitCode = 1;
    }
  }
}

const registry = {
  schema_version: "2.0",
  repo: "midnghtsapphire/revvel-standards",
  generated_by: "scripts/build-hub-registry.js",
  hub_domain: "oaudrey.com",
  generated_at: new Date().toISOString(),
  entries,
};

fs.writeFileSync(path.join(ROOT, "hub-registry.json"),
                 JSON.stringify(registry, null, 2) + "\n");
console.log(`[+] hub-registry.json: ${entries.length} projects`);
*/

"use strict";
const fs = require("node:fs");
const path = require("node:path");
const ROOT = path.join(__dirname, "..");
const PAGES_BASE_URL = "https://midnghtsapphire.github.io/revvel-standards/";
const ENTRIES = path.join(ROOT, "data", "hub", "entries");
const PROJECTS = path.join(ROOT, "projects");

function validateEntry(entry, source = "entry") {
  if (!entry || typeof entry !== "object" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(entry.slug || "")) {
    throw new Error(`${source}: invalid slug`);
  }
  for (const field of ["title", "description"]) {
    if (typeof entry[field] !== "string" || !entry[field].trim()) throw new Error(`${source}: missing ${field}`);
  }
  // Legacy paths are local site references, never an external URL or traversal.
  // Reject encoded separators/dot segments too: browsers decode them before
  // requesting a page, so checking only literal ../ leaves the same hole open.
  let decoded;
  try { decoded = decodeURIComponent(entry.path); } catch { throw new Error(`${source}: invalid path`); }
  if (typeof entry.path !== "string" || !decoded.startsWith("./") || decoded.startsWith(".//") ||
      /[\\\u0000-\u001f?#]/.test(decoded) || decoded.slice(2).split("/").some(segment => segment === ".." || segment === ".")) {
    throw new Error(`${source}: invalid path`);
  }
  if (entry.issue != null && (!Number.isSafeInteger(entry.issue) || entry.issue <= 0)) throw new Error(`${source}: invalid issue`);
  return entry;
}

function liveUrl(relativePath) {
  return PAGES_BASE_URL + relativePath.slice(2);
}

function readJson(file) {
  try { return JSON.parse(fs.readFileSync(file, "utf8")); }
  catch (error) { throw new Error(`${file}: invalid JSON (${error.message})`); }
}

function legacyEntries(directory) {
  if (!fs.existsSync(directory)) return [];
  const seen = new Set();
  return fs.readdirSync(directory).filter(name => name.endsWith(".json")).sort().map(name => {
    const entry = validateEntry(readJson(path.join(directory, name)), name);
    if (seen.has(entry.slug)) throw new Error(`${name}: duplicate slug ${entry.slug}`);
    seen.add(entry.slug);
    return { ...entry, tag: entry.tag || "Website", issue: entry.issue ?? null, live_url: liveUrl(entry.path) };
  });
}

function projectEntries() {
  if (!fs.existsSync(PROJECTS)) return [];
  const seen = new Set();
  return fs.readdirSync(PROJECTS).sort().flatMap(directory => {
    const file = path.join(PROJECTS, directory, "project.json");
    if (!fs.existsSync(file)) return [];
    const cfg = readJson(file);
    const slug = cfg.slug || directory;
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new Error(`${file}: invalid slug`);
    if (seen.has(slug)) throw new Error(`${file}: duplicate slug ${slug}`);
    seen.add(slug);
    if (cfg.own_domain && !/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/i.test(cfg.own_domain)) {
      throw new Error(`${file}: invalid own_domain`);
    }
    const hubUrl = cfg.own_domain ? `https://${cfg.own_domain}/` : `https://oaudrey.com/${slug}/`;
    return [{ slug, title: cfg.title || slug, description: cfg.description || "",
      domain_strategy: cfg.domain_strategy || "path", own_domain: cfg.own_domain || null,
      hub_url: hubUrl, redirect_from: cfg.redirect_from || [], repo: cfg.repo || null,
      status: cfg.status || "building", added: cfg.added || null,
      // The original index.html consumes live_url and tag. Retain v2 fields
      // for build-site-index.js while making both browser consumers compatible.
      path: hubUrl, live_url: hubUrl, tag: cfg.status || "Website", issue: cfg.issue ?? null }];
  });
}

function buildRegistry(entriesDirectory) {
  const pages = legacyEntries(entriesDirectory || ENTRIES);
  const common = { repo: "midnghtsapphire/revvel-standards", generated_by: "scripts/build-hub-registry.js" };
  if (entriesDirectory) return { schema_version: "1.0", ...common, pages_base_url: PAGES_BASE_URL, entries: pages };
  const projects = projectEntries();
  const seen = new Set(projects.map(entry => entry.slug));
  for (const page of pages) {
    if (seen.has(page.slug)) throw new Error(`duplicate slug ${page.slug} across project and page registries`);
    seen.add(page.slug);
  }
  // Keep the v2 generation receipt as historical compatibility metadata. A
  // rebuild/import must not invent a new generation time and dirty the tree.
  // Actual build invocation time belongs in the caller's execution receipt.
  const previous = path.join(ROOT, "hub-registry.json");
  const generatedAt = fs.existsSync(previous) ? readJson(previous).generated_at ?? null : null;
  const compatiblePages = pages.map(page => ({ ...page, hub_url: page.live_url,
    domain_strategy: "path", status: "unverified" }));
  return { schema_version: "2.0", ...common, hub_domain: "oaudrey.com", generated_at: generatedAt,
    pages_base_url: PAGES_BASE_URL, entries: [...projects, ...compatiblePages].sort((a, b) => a.slug.localeCompare(b.slug)) };
}

function main(argv = process.argv.slice(2)) {
  let entriesDirectory;
  let outputDirectory = ROOT;
  for (let index = 0; index < argv.length; index += 2) {
    const [flag, value] = argv.slice(index, index + 2);
    if (!value || !["--entries-dir", "--out-dir"].includes(flag)) throw new Error(`Unknown or incomplete option: ${flag}`);
    if (flag === "--entries-dir") entriesDirectory = path.resolve(value);
    if (flag === "--out-dir") outputDirectory = path.resolve(value);
  }
  const registry = buildRegistry(entriesDirectory);
  fs.mkdirSync(outputDirectory, { recursive: true });
  fs.writeFileSync(path.join(outputDirectory, "hub-registry.json"), JSON.stringify(registry, null, 2) + "\n");
  fs.writeFileSync(path.join(outputDirectory, "hub-registry.js"), "// Generated by scripts/build-hub-registry.js - do not edit.\nwindow.HUB_REGISTRY = " + JSON.stringify(registry) + ";\n");
  console.log(`[+] hub-registry.json + hub-registry.js: ${registry.entries.length} entries`);
}

module.exports = { buildRegistry, validateEntry, liveUrl, PAGES_BASE_URL, main };
if (require.main === module) {
  try { main(); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
