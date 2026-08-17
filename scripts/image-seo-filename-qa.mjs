#!/usr/bin/env node
/**
 * Image SEO filename QA gate (shared by Actions + local tests).
 *
 * Exit 0 when every listed image basename is SEO-safe.
 * Exit 1 when any basename matches blocker patterns (IMG_, DSC_, Screenshot, image.*).
 *
 *   node scripts/image-seo-filename-qa.mjs path/a.png path/b.webp
 *   git diff --name-only origin/main...HEAD | node scripts/image-seo-filename-qa.mjs --stdin
 */
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { isNonSeoFilename } from "./image-seo-build-pack.mjs";

const IMAGE_EXT_RE = /\.(webp|png|jpe?g)$/i;

export function filterImagePaths(paths) {
  return (paths || [])
    .map((p) => String(p || "").trim())
    .filter((p) => p && IMAGE_EXT_RE.test(p));
}

export function findBadFilenames(paths) {
  const bad = [];
  for (const f of filterImagePaths(paths)) {
    const b = path.basename(f);
    if (isNonSeoFilename(b)) {
      bad.push({ path: f, basename: b });
    }
  }
  return bad;
}

export function parseQaArgs(argv) {
  const files = [];
  let stdin = false;
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--stdin") stdin = true;
    else if (argv[i] === "--help" || argv[i] === "-h") {
      return { help: true, files: [], stdin: false };
    } else {
      files.push(argv[i]);
    }
  }
  return { help: false, files, stdin };
}

function readStdinLines() {
  try {
    const raw = fs.readFileSync(0, "utf8");
    return raw.split(/\r?\n/);
  } catch {
    return [];
  }
}

function main(argv = process.argv) {
  const args = parseQaArgs(argv);
  if (args.help) {
    console.log("Usage: image-seo-filename-qa.mjs [--stdin] [files...]");
    process.exit(0);
  }

  const paths = args.stdin ? [...args.files, ...readStdinLines()] : args.files;
  const bad = findBadFilenames(paths);
  if (bad.length === 0) {
    console.log(JSON.stringify({ ok: true, checked: filterImagePaths(paths).length, bad: [] }));
    process.exit(0);
  }

  for (const item of bad) {
    console.error(`::error file=${item.path}::Non-SEO filename: ${item.basename}`);
  }
  console.log(JSON.stringify({ ok: false, checked: filterImagePaths(paths).length, bad }));
  process.exit(1);
}

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  main();
}
