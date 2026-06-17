#!/usr/bin/env node
// products/pdf-pipeline/concepts/generate.mjs
//
// Concept Generator — produces a batch of PDF product concepts for one niche.
//
// CLI:
//   node generate.mjs --niche "<niche>" [--count 20] [--out <path>] [--dry-run]
//
// If --niche is omitted, reads products/pdf-pipeline/state/top-niches.json and
// picks the top-ranked entry.
//
// Output (success): products/pdf-pipeline/state/concepts-{YYYY-MM-DD}.json
// Output (failure): products/pdf-pipeline/state/concepts-failed-{YYYY-MM-DD}.json
//
// Env:
//   OPENROUTER_API_KEY    required (unless --dry-run)
//   OPENROUTER_HTTP_REFERER, OPENROUTER_APP_TITLE  optional headers
//
// Exit codes:
//   0  success — valid JSON written
//   1  generation/validation failed — failure file written
//   2  usage / env error

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { routedChat } = require("../../../scripts/openrouter-routing.js");

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = resolve(__dirname, "../../..");
const STATE_DIR = join(REPO_ROOT, "products", "pdf-pipeline", "state");
const SYSTEM_PROMPT_PATH = join(__dirname, "prompts", "system.md");
const SCHEMA_PATH = join(__dirname, "schema.json");
const TOP_NICHES_PATH = join(STATE_DIR, "top-niches.json");

const ALLOWED_FORMATS = new Set([
  "planner",
  "workbook",
  "guide",
  "checklist",
  "ebook",
  "template-pack",
  "journal",
  "course",
]);

function parseArgs(argv) {
  const args = { count: 20, dryRun: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--niche") args.niche = argv[++i];
    else if (a === "--count") args.count = Number(argv[++i]);
    else if (a === "--out") args.out = argv[++i];
    else if (a === "--dry-run") args.dryRun = true;
    else if (a === "-h" || a === "--help") args.help = true;
    else if (a.startsWith("--niche=")) args.niche = a.slice("--niche=".length);
    else if (a.startsWith("--count=")) args.count = Number(a.slice("--count=".length));
    else if (a.startsWith("--out=")) args.out = a.slice("--out=".length);
  }
  return args;
}

function usage() {
  return `Usage: node generate.mjs --niche "<niche>" [--count 20] [--out <path>] [--dry-run]

Generates a batch of PDF product concepts for the given niche and writes them to
products/pdf-pipeline/state/concepts-YYYY-MM-DD.json.

If --niche is omitted, reads products/pdf-pipeline/state/top-niches.json and
picks the top-ranked entry.

Requires OPENROUTER_API_KEY in the environment (unless --dry-run).
`;
}

function todayStamp() {
  return new Date().toISOString().slice(0, 10);
}

async function readTopNiche() {
  if (!existsSync(TOP_NICHES_PATH)) {
    throw new Error(
      `No --niche provided and ${TOP_NICHES_PATH} does not exist`
    );
  }
  const raw = await readFile(TOP_NICHES_PATH, "utf8");
  const data = JSON.parse(raw);
  // Accept either {niches: [{name, score}, ...]} or a bare array.
  const list = Array.isArray(data) ? data : data.niches;
  if (!Array.isArray(list) || list.length === 0) {
    throw new Error(`top-niches.json is empty or malformed`);
  }
  const sorted = [...list].sort(
    (a, b) => (b.score ?? b.rank_score ?? 0) - (a.score ?? a.rank_score ?? 0)
  );
  const top = sorted[0];
  const niche =
    typeof top === "string" ? top : top.niche || top.name || top.title;
  if (!niche) throw new Error(`Top niche entry has no niche/name/title field`);
  return niche;
}

function buildUserPrompt(niche, count) {
  return [
    `Niche: ${niche}`,
    `Generate exactly ${count} PDF product concepts for this niche.`,
    `Return a single JSON object with the shape:`,
    `{"concepts": [ ...${count} concept objects... ]}`,
    `Vary the format field across the batch. No duplicates or near-duplicates.`,
    `JSON only. No prose. No Markdown fences.`,
  ].join("\n");
}

// Strip Markdown fences and grab the outer JSON object if the model wraps it.
function extractJson(text) {
  if (typeof text !== "string") return text;
  let t = text.trim();
  // Strip ```json ... ``` or ``` ... ``` fences.
  const fenced = t.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fenced) t = fenced[1].trim();
  // Fallback: slice between first '{' and last '}'.
  const first = t.indexOf("{");
  const last = t.lastIndexOf("}");
  if (first !== -1 && last !== -1 && last > first) {
    t = t.slice(first, last + 1);
  }
  return JSON.parse(t);
}

function validateBatch(parsed, expectedCount) {
  const errs = [];
  if (!parsed || typeof parsed !== "object") {
    return ["payload is not an object"];
  }
  const concepts = parsed.concepts;
  if (!Array.isArray(concepts)) {
    return ["payload.concepts is not an array"];
  }
  if (concepts.length !== expectedCount) {
    errs.push(
      `expected ${expectedCount} concepts, got ${concepts.length}`
    );
  }

  const titles = new Set();
  concepts.forEach((c, i) => {
    const where = `concepts[${i}]`;
    if (!c || typeof c !== "object") {
      errs.push(`${where}: not an object`);
      return;
    }
    const requireStr = (field, min, max) => {
      const v = c[field];
      if (typeof v !== "string" || v.length < min || v.length > max) {
        errs.push(
          `${where}.${field}: must be string ${min}-${max} chars (got ${
            v === undefined ? "undefined" : typeof v + " len " + (v?.length ?? 0)
          })`
        );
      }
    };
    requireStr("title", 3, 59);
    requireStr("subtitle", 5, 200);
    requireStr("target_buyer", 5, 200);
    requireStr("hook", 30, 600);
    requireStr("cover_prompt", 30, 800);

    if (!ALLOWED_FORMATS.has(c.format)) {
      errs.push(
        `${where}.format: must be one of ${[...ALLOWED_FORMATS].join(",")} (got ${c.format})`
      );
    }

    if (
      !Array.isArray(c.toc) ||
      c.toc.length < 6 ||
      c.toc.length > 15 ||
      !c.toc.every((s) => typeof s === "string" && s.length >= 3)
    ) {
      errs.push(`${where}.toc: must be 6-15 non-empty strings`);
    }

    if (
      typeof c.price_usd !== "number" ||
      !Number.isFinite(c.price_usd) ||
      c.price_usd < 1 ||
      c.price_usd > 199
    ) {
      errs.push(`${where}.price_usd: must be number 1-199`);
    }

    if (
      !Array.isArray(c.tags) ||
      c.tags.length < 5 ||
      c.tags.length > 10 ||
      !c.tags.every((s) => typeof s === "string" && s.length >= 2)
    ) {
      errs.push(`${where}.tags: must be 5-10 non-empty strings`);
    }

    if (typeof c.title === "string") {
      const key = c.title.trim().toLowerCase();
      if (titles.has(key)) errs.push(`${where}.title: duplicate of earlier title`);
      titles.add(key);
    }
  });

  // Format variety: at least 5 distinct formats across the batch.
  const formats = new Set(
    concepts.map((c) => c?.format).filter((f) => ALLOWED_FORMATS.has(f))
  );
  if (concepts.length >= 10 && formats.size < 5) {
    errs.push(
      `format variety: only ${formats.size} distinct formats across ${concepts.length} concepts (need >=5)`
    );
  }

  return errs;
}

async function callModel(systemPrompt, userPrompt) {
  return routedChat({
    profile: "cheap_batch_edits",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.85,
    max_tokens: 12000,
    silent: false,
  });
}

async function writeJson(path, payload) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(payload, null, 2) + "\n", "utf8");
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    process.stdout.write(usage());
    process.exit(0);
  }

  if (!Number.isInteger(args.count) || args.count < 1 || args.count > 100) {
    console.error(`--count must be an integer 1-100 (got ${args.count})`);
    process.exit(2);
  }

  let niche = args.niche;
  if (!niche) {
    try {
      niche = await readTopNiche();
      console.log(`No --niche given; using top niche from state: "${niche}"`);
    } catch (err) {
      console.error(err.message);
      console.error(usage());
      process.exit(2);
    }
  }

  if (!args.dryRun && !process.env.OPENROUTER_API_KEY) {
    console.error("OPENROUTER_API_KEY is required (or use --dry-run)");
    process.exit(2);
  }

  const systemPrompt = await readFile(SYSTEM_PROMPT_PATH, "utf8");
  const userPrompt = buildUserPrompt(niche, args.count);
  const date = todayStamp();
  const outPath =
    args.out || join(STATE_DIR, `concepts-${date}.json`);
  const failPath = join(STATE_DIR, `concepts-failed-${date}.json`);

  if (args.dryRun) {
    console.log("--- DRY RUN: system prompt ---");
    console.log(systemPrompt);
    console.log("--- DRY RUN: user prompt ---");
    console.log(userPrompt);
    console.log(`--- DRY RUN: would write to ${outPath} ---`);
    process.exit(0);
  }

  let lastErr = null;
  let lastRawText = null;
  let lastModel = null;

  for (let attempt = 1; attempt <= 2; attempt++) {
    const reminderPrompt =
      attempt === 1
        ? userPrompt
        : userPrompt +
          "\n\nREMINDER: Return JSON ONLY. No prose, no Markdown fences. Top-level object with key 'concepts'.";

    let result;
    try {
      console.log(`Attempt ${attempt}/2: calling OpenRouter (cheap_batch_edits)...`);
      result = await callModel(systemPrompt, reminderPrompt);
    } catch (err) {
      lastErr = `OpenRouter call failed: ${err.message}`;
      console.error(lastErr);
      continue;
    }

    lastRawText = result.text;
    lastModel = result.modelUsed;

    let parsed;
    try {
      parsed = extractJson(result.text);
    } catch (err) {
      lastErr = `JSON parse failed: ${err.message}`;
      console.error(lastErr);
      continue;
    }

    const errs = validateBatch(parsed, args.count);
    if (errs.length > 0) {
      lastErr = `schema validation failed:\n  - ${errs.slice(0, 10).join("\n  - ")}${errs.length > 10 ? `\n  - ...and ${errs.length - 10} more` : ""}`;
      console.error(lastErr);
      continue;
    }

    const payload = {
      niche,
      generated_at: new Date().toISOString(),
      count: parsed.concepts.length,
      model_used: result.modelUsed || null,
      concepts: parsed.concepts,
    };
    await writeJson(outPath, payload);
    console.log(`Wrote ${parsed.concepts.length} concepts to ${outPath}`);
    process.exit(0);
  }

  // Both attempts failed — write failure file and exit 1.
  const failurePayload = {
    niche,
    generated_at: new Date().toISOString(),
    requested_count: args.count,
    last_error: lastErr,
    model_used: lastModel,
    raw_text: lastRawText,
  };
  await writeJson(failPath, failurePayload);
  console.error(`Both attempts failed. Wrote diagnostics to ${failPath}`);
  process.exit(1);
}

main().catch((err) => {
  console.error(`Fatal: ${err.stack || err.message || err}`);
  process.exit(1);
});
