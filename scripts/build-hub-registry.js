#!/usr/bin/env node
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
