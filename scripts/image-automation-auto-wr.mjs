#!/usr/bin/env node
/**
 * Re-emit formal WR pack for image SEO automation.
 * Production control plane is Actions + blueprints — not the studio UI.
 * Never merges. Human reviews draft PR only.
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = process.cwd();
const required = [
  "wr/pending/WR-image-seo-lsi-release-2026-08-05.md",
  "standards/IMAGE_CREATION_SEO_AUTOMATION.md",
  "scripts/image-seo-build-pack.mjs",
  ".github/workflows/image-seo-pipeline.yml",
  ".github/workflows/release-banner-social.yml",
  ".github/workflows/image-seo-qa.yml",
  "workflows/blueprints/image-seo-pipeline.gumloop.json",
  "config/connections.image-automation.yml",
];

const missing = required.filter((r) => !fs.existsSync(path.join(ROOT, r)));
const manifest = {
  schema: "midnghtsapphire.formal_wr_pack/v1",
  brand: "MIDNGHTSAPPHIRE",
  generated_at: new Date().toISOString(),
  repo: process.env.REPO || "midnghtsapphire/revvel-standards",
  branch: process.env.BRANCH || "automation/image-seo-lsi-release-banner",
  wr: "wr/pending/WR-image-seo-lsi-release-2026-08-05.md",
  auto_merge: false,
  human_review_required: true,
  files: required,
  missing,
  apply: {
    draft_pr_title: "[WR] Automate image SEO + LSI + release banners",
    labels: ["wr", "human-review-required", "priority:p1", "automation"],
  },
};

fs.mkdirSync(path.join(ROOT, "artifacts/image-automation"), { recursive: true });
fs.writeFileSync(
  path.join(ROOT, "artifacts/image-automation/formal-wr-manifest.json"),
  JSON.stringify(manifest, null, 2) + "\n",
);

// Ensure a sample pack exists
spawnSync(
  process.execPath,
  [
    "scripts/image-seo-build-pack.mjs",
    "--brief",
    "artifacts/image-automation/default-brief.json",
    "--out",
    "artifacts/image-automation/package.json",
  ],
  { cwd: ROOT, stdio: "inherit" },
);

console.log(JSON.stringify({ ok: missing.length === 0, missing, wr: manifest.wr }, null, 2));
if (missing.length) process.exit(2);
