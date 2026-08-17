#!/usr/bin/env node
"use strict";

/**
 * SEO + A11y Guard
 *
 * Fails a PR that ships obvious SEO/a11y debt in a product app:
 *   - <img> / <Image> tags missing an alt attribute (or empty alt with no role)
 *   - junk image filenames (IMG_1234.jpg, DSC_0042.png, Screenshot 1.png, etc.)
 *     — descriptive, hyphenated filenames help both SEO and accessibility.
 *   - page/layout files missing a meta description tag.
 *
 * Override with the `allow-seo-debt` label when shipping intentional gaps.
 * SEO standards evolve (Google updates, schema.org); the patterns here are
 * conservative and stable. Review docs/SEO_STANDARDS.md quarterly.
 *
 * Env:
 *   BASE_SHA          PR base sha (e.g. github.event.pull_request.base.sha)
 *   ALLOW_SEO_DEBT    'true' when the PR carries the allow-seo-debt label
 *   PROTECTED         protected path prefixes (default: products/,apps/,sites/,src/)
 */

const fs = require("fs");
const { execFileSync } = require("child_process");

const DEFAULT_PROTECTED = "products/,apps/,sites/,src/";
const APP_FILE_RE = /\.(html|jsx|tsx)$/i;
const PAGE_FILE_RE = /\b(page|layout|index)\.(html|jsx|tsx)$/i;

// Junk filenames that hurt SEO and signal sloppy a11y work.
const JUNK_FILENAME_RE = new RegExp(
  [
    "IMG[_-]?\\d+",
    "DSC[_-]?\\d+",
    "screen[\\s_-]?shot",
    "screenshot[\\s_-]?\\d*",
    "pasted[\\s_-]?image",
    "^image\\.",
    "^photo\\.",
    "^untitled",
    "^\\d+\\.(png|jpe?g|gif|webp|svg)$",
  ].join("|"),
  "i"
);

/**
 * @param {{path:string, content:string}[]} files
 * @param {{protectedPrefixes?:string[], allowDebt?:boolean}} opts
 * @returns {{fail:boolean, violations:Array<{file:string,kind:string,detail:string}>}}
 */
function evaluateSeoA11y(files, opts = {}) {
  const protectedPrefixes = opts.protectedPrefixes || ["products/", "apps/", "sites/", "src/"];
  if (opts.allowDebt) return { fail: false, violations: [] };

  const isProtected = (p) => protectedPrefixes.some((pre) => pre && p.startsWith(pre));
  const violations = [];

  for (const f of files) {
    if (!isProtected(f.path) || !APP_FILE_RE.test(f.path)) continue;
    const content = String(f.content || "");

    const imgRe = /<(img|Image)\b[^>]*>/gi;
    let m;
    while ((m = imgRe.exec(content)) !== null) {
      const tag = m[0];
      const altMatch = tag.match(/\balt\s*=\s*(?:"([^"]*)"|'([^']*)'|\{`([^`]*)`\}|\{["']([^"']*)["']\})/);
      if (!altMatch) {
        violations.push({ file: f.path, kind: "missing-alt", detail: tag.slice(0, 120) });
      } else {
        const alt = (altMatch[1] ?? altMatch[2] ?? altMatch[3] ?? altMatch[4] ?? "").trim();
        if (!alt) violations.push({ file: f.path, kind: "empty-alt", detail: tag.slice(0, 120) });
      }
      const srcMatch = tag.match(/\bsrc\s*=\s*(?:"([^"]*)"|'([^']*)'|\{["']([^"']*)["']\})/);
      if (srcMatch) {
        const src = (srcMatch[1] ?? srcMatch[2] ?? srcMatch[3] ?? "").trim();
        const filename = src.split("/").pop() || "";
        if (filename && JUNK_FILENAME_RE.test(filename)) {
          violations.push({ file: f.path, kind: "junk-filename", detail: filename });
        }
      }
    }

    if (PAGE_FILE_RE.test(f.path)) {
      const hasDesc = /\b(description\s*[:=]|meta\s+name=["']description["'])/i.test(content);
      if (!hasDesc) violations.push({ file: f.path, kind: "missing-meta-description", detail: "" });
    }
  }
  return { fail: violations.length > 0, violations };
}

function readChangedFiles(baseSha) {
  const out = execFileSync("git", ["diff", "--name-only", `${baseSha}...HEAD`], { encoding: "utf8" });
  return out
    .split("\n")
    .map((p) => p.trim())
    .filter(Boolean)
    .filter((p) => APP_FILE_RE.test(p) && fs.existsSync(p))
    .map((p) => ({ path: p, content: fs.readFileSync(p, "utf8") }));
}

function main() {
  const baseSha = process.env.BASE_SHA;
  if (!baseSha) {
    console.log("::warning::BASE_SHA not set — SEO/a11y guard skipped.");
    return 0;
  }
  const allowDebt = (process.env.ALLOW_SEO_DEBT || "").toLowerCase() === "true";
  const protectedPrefixes = (process.env.PROTECTED || DEFAULT_PROTECTED).split(",").map((s) => s.trim()).filter(Boolean);

  const files = readChangedFiles(baseSha);
  const { fail, violations } = evaluateSeoA11y(files, { protectedPrefixes, allowDebt });

  if (allowDebt) {
    console.log("`allow-seo-debt` label present — SEO/a11y guard intentionally skipped.");
    return 0;
  }
  if (fail) {
    console.log(`❌ SEO/A11y Guard: ${violations.length} violation(s).\n`);
    for (const v of violations) {
      console.log(`  - [${v.kind}] ${v.file}${v.detail ? `  → ${v.detail}` : ""}`);
    }
    console.log(
      "\nFix by adding meaningful `alt` text (helps disabled users AND SEO), renaming junk filenames" +
        " to descriptive-hyphenated ones (e.g. `life-insurance-leads-zip-90210.png`), and adding a" +
        " <meta name=\"description\"> to page/layout files.\n" +
        "If intentional, add the `allow-seo-debt` label and re-run."
    );
    return 1;
  }
  console.log(`✅ SEO/A11y Guard passed (${files.length} app file(s) scanned).`);
  return 0;
}

if (require.main === module) {
  try {
    process.exit(main());
  } catch (e) {
    console.error("seo-a11y-guard error:", e.message);
    process.exit(1);
  }
}

module.exports = { evaluateSeoA11y };
