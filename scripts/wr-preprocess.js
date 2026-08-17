#!/usr/bin/env node
"use strict";

/**
 * Pre-Jules WR preprocessor — image-to-text + LLM enrichment.
 *
 * WHY THIS EXISTS (WR #15041, "Priority 1 Blocker"):
 * ---------------------------------------------------
 * Jules (and the other coding agents) get a WR as `title + body` text only. Two
 * things regularly go missing before that hand-off:
 *   1. **Screenshots / pasted images.** Users drop the real requirements into an
 *      image (a mock-up, an error screenshot, a spec photo). Jules never "sees"
 *      it — it only receives the markdown, so the requirement is silently lost.
 *   2. **Sparse WR fields.** A `[WR] <one-line title>` with every form field left
 *      as `_No response_` / `None` gives Jules nothing to normalize against the
 *      canonical schema, so it either under-scopes or stalls.
 *
 * This module is the step that runs **before** Jules is invoked. It:
 *   - extracts every image URL from the WR body,
 *   - runs `scripts/ocr-service.py` (PaddleOCR) to turn each image into text,
 *   - asks an LLM (via the OpenRouter routing layer) to rewrite the WR so every
 *     canonical field Jules needs is populated (incorporating the OCR'd text),
 *   - returns the enriched WR body so the caller can hand a complete, image-aware
 *     WR to Jules for the final rewrite.
 *
 * DESIGN: the pure functions (URL extraction, prompt building, appendix
 * assembly) are separated from I/O (child_process OCR, network LLM call) so they
 * are unit-testable without a network or Python. The I/O helpers accept injected
 * runners for the same reason.
 *
 * WHAT TO CHECK IF IT "isn't processing":
 *   - OCR needs `python3` + PaddleOCR (`pip install paddlepaddle paddleocr`).
 *     Missing deps degrade gracefully: the image is skipped with a note, the WR
 *     still gets enriched from its text.
 *   - Enrichment needs `OPENROUTER_API_KEY` on a FUNDED OpenRouter account (even
 *     `:free` models need credits — see AGENTS.md). A missing/unfunded key does
 *     NOT throw: we fall back to the original body plus the OCR appendix so the
 *     pipeline never dead-ends.
 *
 * Environment (CLI mode):
 *   ISSUE_TITLE          WR title (e.g. "[WR] ...")
 *   ISSUE_BODY           WR body markdown
 *   OPENROUTER_API_KEY   OpenRouter key (optional; enrichment skipped if absent)
 *   WR_PREPROCESS_PROFILE Routing profile name (default: "deep_search")
 *   OCR_SCRIPT           Path to OCR script (default: scripts/ocr-service.py)
 *   OUTPUT_FILE          Where to write the enriched body (default: stdout)
 */

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

let routedChat;
try {
  // Optional at require-time so the pure functions remain usable even if the
  // routing module or its config is unavailable in a given context.
  ({ routedChat } = require("./openrouter-routing"));
} catch {
  routedChat = null;
}

// Image extensions we treat as OCR-able when a URL carries an explicit suffix.
const IMAGE_EXTENSIONS = ["png", "jpg", "jpeg", "gif", "webp", "bmp", "tiff", "tif"];

// The canonical WR fields Jules needs to rewrite the WR and PR. Kept in sync
// with the Work Request issue template (.github/ISSUE_TEMPLATE/00-work-request.yml).
const CANONICAL_WR_FIELDS = [
  "Output Type",
  "Objective",
  "Summary",
  "Required Bundle",
  "Definition of Done",
  "Do Not Under-Scope",
  "Explicit Exclusions",
  "Delivery Shape",
  "Sellable Artifact Bundle",
  "Purchase Validation",
  "Expected Scope",
  "Validation Expectations",
  "Blocker Rule",
];

/**
 * Extract every image URL referenced in a WR body.
 *
 * Handles the three shapes GitHub actually produces:
 *   1. Markdown images:      ![alt](https://…)         — always an image, even
 *      when the URL has no extension (GitHub user-attachments are extension-less).
 *   2. HTML images:          <img src="https://…">
 *   3. Bare / linked URLs ending in a known image extension (…png, …jpg?…).
 *
 * @param {string} body WR markdown body.
 * @returns {string[]} De-duplicated list of image URLs, in first-seen order.
 */
function extractImageUrls(body) {
  if (!body || typeof body !== "string") return [];
  const urls = [];
  const seen = new Set();
  const add = (u) => {
    if (!u) return;
    const url = u.trim().replace(/[)>\]]+$/, "");
    if (!/^https?:\/\//i.test(url)) return;
    if (seen.has(url)) return;
    seen.add(url);
    urls.push(url);
  };

  // 1. Markdown image syntax: ![alt](url "optional title")
  const mdImg = /!\[[^\]]*\]\(\s*(<[^>]+>|[^)\s]+)/g;
  let m;
  while ((m = mdImg.exec(body)) !== null) {
    add(m[1].replace(/^<|>$/g, ""));
  }

  // 2. HTML <img src="...">
  const htmlImg = /<img[^>]*\bsrc\s*=\s*["']([^"']+)["']/gi;
  while ((m = htmlImg.exec(body)) !== null) {
    add(m[1]);
  }

  // 3. Bare or linked URLs that end in a known image extension.
  const extAlt = IMAGE_EXTENSIONS.join("|");
  const bareImg = new RegExp(`https?:\\/\\/[^\\s)"'<>]+\\.(?:${extAlt})(?:\\?[^\\s)"'<>]*)?`, "gi");
  while ((m = bareImg.exec(body)) !== null) {
    add(m[0]);
  }

  return urls;
}

/**
 * Run the OCR service on a single image URL.
 *
 * Shells out to `scripts/ocr-service.py` (PaddleOCR). Failures — missing Python,
 * missing PaddleOCR, unreachable URL — are caught and returned as an empty-text
 * result with an `error`, never thrown, so one bad image can't abort the WR.
 *
 * @param {string} url Image URL.
 * @param {object} [opts]
 * @param {string} [opts.ocrScript] Path to the OCR script.
 * @param {(cmd:string,args:string[])=>string} [opts.runner] Injected executor
 *   returning stdout (for tests). Defaults to a real `python3` execFileSync.
 * @returns {{ url:string, text:string, error?:string }}
 */
function runOcr(url, opts = {}) {
  const ocrScript = opts.ocrScript || path.join(__dirname, "ocr-service.py");
  const runner =
    opts.runner ||
    ((cmd, args) =>
      execFileSync(cmd, args, {
        encoding: "utf8",
        timeout: 120000,
        maxBuffer: 10 * 1024 * 1024,
      }));
  try {
    const out = runner("python3", [ocrScript, "--input", url]);
    return { url, text: (out || "").trim() };
  } catch (err) {
    return { url, text: "", error: err && err.message ? err.message : String(err) };
  }
}

/**
 * OCR a list of image URLs.
 *
 * @param {string[]} urls
 * @param {object} [opts] Passed through to {@link runOcr}.
 * @returns {Array<{url:string,text:string,error?:string}>}
 */
function ocrImages(urls, opts = {}) {
  return (urls || []).map((url) => runOcr(url, opts));
}

/**
 * Build a human-readable markdown appendix from OCR results.
 *
 * Only images that yielded text are included; empty/errored ones are noted so a
 * human can see the parser tried and why it came up empty.
 *
 * @param {Array<{url:string,text:string,error?:string}>} ocrResults
 * @returns {string} Markdown block (empty string when there is nothing to add).
 */
function assembleOcrAppendix(ocrResults) {
  const results = ocrResults || [];
  if (results.length === 0) return "";
  const lines = ["## Extracted Image Text (OCR)", ""];
  let anyText = false;
  results.forEach((r, i) => {
    if (r.text) {
      anyText = true;
      lines.push(`### Image ${i + 1}`, "", `Source: ${r.url}`, "", "```text", r.text, "```", "");
    } else {
      lines.push(`### Image ${i + 1}`, "", `Source: ${r.url}`, "", `_No text extracted${r.error ? ` — ${r.error}` : ""}._`, "");
    }
  });
  // If nothing was extractable, the appendix is noise — drop it.
  return anyText ? lines.join("\n").trim() : "";
}

/**
 * Build the LLM messages that turn a sparse/image-bearing WR into a complete one.
 *
 * The prompt is deliberately resilient (mirrors openrouter-triage.js): user text
 * is a starting point, not gospel; the model must infer missing fields rather
 * than fail. It is told to preserve the author's intent and NOT invent scope the
 * author excluded.
 *
 * @param {object} args
 * @param {string} args.title WR title.
 * @param {string} args.body  Original WR body.
 * @param {string} [args.ocrText] Concatenated text extracted from images.
 * @returns {Array<{role:string,content:string}>}
 */
function buildEnrichmentMessages({ title, body, ocrText }) {
  const fieldList = CANONICAL_WR_FIELDS.map((f) => `- ${f}`).join("\n");
  const system = [
    "You are the pre-Jules WR normalizer for the Revvel Standards repository.",
    "Your job: take a Work Request (WR) — which may be sparse or have its real",
    "requirements trapped in an attached image — and rewrite it into a COMPLETE",
    "WR that a downstream coding agent (Jules) can act on without guessing.",
    "",
    "RULES:",
    "- Preserve the author's original intent. Do NOT invent scope they excluded.",
    "- Fold any text extracted from images into the relevant fields.",
    "- Fill EVERY canonical field below. If a field is genuinely not applicable,",
    "  write \"N/A — <reason>\" rather than leaving a placeholder.",
    "- Be concrete and specific: a Definition of Done must be verifiable.",
    "- Output GitHub-flavoured markdown only. No preamble, no code fences around",
    "  the whole document, no scaffolding comments.",
    "",
    "Canonical fields (use each as a `### <Field>` heading, in this order):",
    fieldList,
  ].join("\n");

  const userParts = [
    `WR TITLE:\n${title || "(untitled)"}`,
    "",
    `WR BODY (original):\n${body || "(empty)"}`,
  ];
  if (ocrText && ocrText.trim()) {
    userParts.push("", `TEXT EXTRACTED FROM ATTACHED IMAGES (OCR):\n${ocrText.trim()}`);
  }
  userParts.push("", "Rewrite the WR now as a complete markdown document.");

  return [
    { role: "system", content: system },
    { role: "user", content: userParts.join("\n") },
  ];
}

// Small helper so the fallback path can wrap raw OCR text in the same appendix
// heading the structured assembler uses, without needing the results array.
// Defined here (above enrichWorkRequest, its only caller) to read top-down.
function assembleOcrAppendixText(ocrText) {
  return ["## Extracted Image Text (OCR)", "", "```text", ocrText.trim(), "```"].join("\n");
}

/**
 * Enrich a WR body via the OpenRouter routing layer.
 *
 * Never throws on an LLM/key failure: if enrichment can't run (no key, module
 * missing, all models down) it falls back to the original body with the OCR
 * appendix attached, so the caller always gets a usable, image-aware WR.
 *
 * @param {object} args
 * @param {string} args.title
 * @param {string} args.body
 * @param {string} [args.ocrText]
 * @param {string} [args.apiKey] OpenRouter key (defaults to OPENROUTER_API_KEY).
 * @param {string} [args.profile] Routing profile (default "deep_search").
 * @param {Function} [args.routed] Injected routedChat (for tests).
 * @returns {Promise<{ body:string, enriched:boolean, modelUsed:string|null, error?:string }>}
 */
async function enrichWorkRequest({ title, body, ocrText, apiKey, profile, routed } = {}) {
  const key = apiKey !== undefined ? apiKey : process.env.OPENROUTER_API_KEY || "";
  const chat = routed || routedChat;
  const appendix = ocrText && ocrText.trim() ? `\n\n${assembleOcrAppendixText(ocrText)}` : "";
  const fallback = (error) => ({
    body: `${body || ""}${appendix}`.trim(),
    enriched: false,
    modelUsed: null,
    ...(error ? { error } : {}),
  });

  if (!key) return fallback("OPENROUTER_API_KEY not set — enrichment skipped");
  if (typeof chat !== "function") return fallback("routedChat unavailable — enrichment skipped");

  try {
    const messages = buildEnrichmentMessages({ title, body, ocrText });
    const result = await chat({
      profile: profile || process.env.WR_PREPROCESS_PROFILE || "deep_search",
      messages,
      apiKey: key,
      temperature: 0.3,
      max_tokens: 4000,
      silent: true,
    });
    const content = result && result.content ? String(result.content).trim() : "";
    if (!content) return fallback("LLM returned empty content — using original body");
    return { body: content, enriched: true, modelUsed: result.modelUsed || null };
  } catch (err) {
    return fallback(err && err.message ? err.message : String(err));
  }
}

/**
 * Full pre-Jules preprocessing: extract images → OCR → LLM-enrich.
 *
 * @param {object} args
 * @param {string} args.title WR title.
 * @param {string} args.body  WR body markdown.
 * @param {string} [args.apiKey]
 * @param {string} [args.profile]
 * @param {object} [args.ocrOpts] Options for the OCR runner (e.g. injected runner).
 * @param {Function} [args.routed] Injected routedChat (for tests).
 * @returns {Promise<{
 *   enrichedBody:string, enriched:boolean, modelUsed:string|null,
 *   imageUrls:string[], ocrResults:Array<object>, error?:string
 * }>}
 */
async function preprocessWorkRequest({ title, body, apiKey, profile, ocrOpts, routed } = {}) {
  const imageUrls = extractImageUrls(body);
  const ocrResults = imageUrls.length ? ocrImages(imageUrls, ocrOpts || {}) : [];
  const ocrText = ocrResults
    .map((r) => r.text)
    .filter(Boolean)
    .join("\n\n");

  const enriched = await enrichWorkRequest({ title, body, ocrText, apiKey, profile, routed });
  return {
    enrichedBody: enriched.body,
    enriched: enriched.enriched,
    modelUsed: enriched.modelUsed,
    imageUrls,
    ocrResults,
    ...(enriched.error ? { error: enriched.error } : {}),
  };
}

// ---------------------------------------------------------------------------
// CLI entry point
// ---------------------------------------------------------------------------
async function main() {
  const title = process.env.ISSUE_TITLE || "";
  const body = process.env.ISSUE_BODY || "";
  const ocrScript = process.env.OCR_SCRIPT;
  const outputFile = process.env.OUTPUT_FILE;

  if (!title && !body) {
    console.error("wr-preprocess: nothing to do (ISSUE_TITLE and ISSUE_BODY are both empty)");
    process.exit(2);
  }

  const result = await preprocessWorkRequest({
    title,
    body,
    ocrOpts: ocrScript ? { ocrScript } : {},
  });

  console.error(
    `wr-preprocess: ${result.imageUrls.length} image(s), ` +
      `enriched=${result.enriched}` +
      (result.modelUsed ? ` via ${result.modelUsed}` : "") +
      (result.error ? ` (note: ${result.error})` : "")
  );

  if (outputFile) {
    fs.writeFileSync(outputFile, result.enrichedBody, "utf8");
    console.error(`wr-preprocess: enriched WR written to ${outputFile}`);
  } else {
    process.stdout.write(result.enrichedBody + "\n");
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error("wr-preprocess: fatal error:", err);
    process.exit(1);
  });
}

module.exports = {
  CANONICAL_WR_FIELDS,
  IMAGE_EXTENSIONS,
  extractImageUrls,
  runOcr,
  ocrImages,
  assembleOcrAppendix,
  buildEnrichmentMessages,
  enrichWorkRequest,
  preprocessWorkRequest,
};
