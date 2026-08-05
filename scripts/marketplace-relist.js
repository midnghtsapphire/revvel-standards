#!/usr/bin/env node
"use strict";

/**
 * Marketplace relisting pipeline — orders CSV / product links → listing packs.
 *
 * WR: midnghtsapphire/revvel-standards#15520
 *
 * Owner downloads her Amazon order history CSV (Account → Request Your
 * Information — the HUMAN download step keeps this inside Amazon ToS; this
 * script NEVER scrapes the owner's Amazon account) or supplies product links.
 * Each item becomes a ready-to-post marketplace listing pack:
 *
 *   1. Parse   (deterministic)        CSV/links → items[]
 *   2. Enrich  (vision lane)          product page → images, specs, category
 *   3. Images  (image_gen lane)       2–5 casual "normal person's photo" shots,
 *                                     image-to-image conditioned on the REAL
 *                                     product photos (new/sealed items only)
 *   4. Copy    (cheap_summary lane)   title, description, condition,
 *                                     suggested price = paid × margin
 *                                     (deterministic multiply — NO price research)
 *   5. Pack                           one folder per item (images + listing.json)
 *                                     + HTML review dashboard (approve/reject/retry)
 *   6. Post = HUMAN                   Facebook Marketplace has no personal-account
 *                                     listing API; the pack makes manual posting a
 *                                     30-second copy-paste. Nothing is auto-posted.
 *
 * Model routing: profiles live in .github/agent-models.yml (image_gen lane:
 * primary google/gemini-2.5-flash-image, fallback openai/gpt-image-1, via
 * OpenRouter). Image model catalog: docs/OPENROUTER_IMAGE_MODELS.md.
 *
 * GUARDRAILS (non-negotiable, encoded below in prompts AND behavior):
 *   - Images must accurately represent the item sold. AI-staged shots ONLY for
 *     new/sealed items, generated image-to-image from that product's real
 *     photos. Used items = real photographs only (the pack emits a photo
 *     checklist instead of AI images).
 *   - Human-review gate on every listing (the dashboard) — nothing ships
 *     without an explicit approve.
 *   - No scraping of the owner's Amazon account; the CSV download is the
 *     human intake step.
 *   - Per-batch spend cap on the image_gen lane
 *     (IMAGE_GEN_BATCH_SPEND_CAP_USD, default $1.00 — matches
 *     profiles.image_gen.batch_spend_cap_usd in agent-models.yml).
 *
 * Fallbacks / "what to check if it fails":
 *   - No OPENROUTER_API_KEY → dry-run: packs are still built with all prompts
 *     recorded in listing.json so a human (or a later funded run) can execute
 *     them. A 401/402/403/429 usually means the key is missing or the account
 *     is unfunded — check https://openrouter.ai/credits before assuming a bug.
 *   - Spend cap reached → remaining items get packs with prompts but no
 *     generated images; listing.json.images.status = "skipped:spend-cap".
 *
 * Usage:
 *   node scripts/marketplace-relist.js parse   <orders.csv|link> [--out DIR]
 *   node scripts/marketplace-relist.js run     <orders.csv|link> [--out DIR]
 *        [--photos 3|5] [--video] [--condition new|used] [--margin 0.6] [--limit N]
 *   node scripts/marketplace-relist.js retry   <batchDir> <itemId> [--note "..."]
 *   node scripts/marketplace-relist.js apply-decisions <batchDir> [decisions.json]
 */

const fs = require("fs");
const path = require("path");
const https = require("https");

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || "";

// Lane models — keep in sync with .github/agent-models.yml (source of truth).
const LANES = {
  vision: { primary: "google/gemini-2.5-pro", fallback: "google/gemini-2.5-flash" },
  image_gen: { primary: "google/gemini-2.5-flash-image", fallback: "openai/gpt-image-1" },
  cheap_summary: { primary: "deepseek/deepseek-chat", fallback: "openai/gpt-4o-mini" },
};

// Per-batch image spend cap (USD). Matches agent-models.yml
// profiles.image_gen.batch_spend_cap_usd; env override for bigger batches.
const DEFAULT_BATCH_SPEND_CAP_USD = 1.0;
// Rough per-image cost for the primary model (gemini-2.5-flash-image ≈ $0.039).
const DEFAULT_COST_PER_IMAGE_USD = 0.04;

// Suggested price = paid × margin. Deterministic — deliberately NOT researched
// (owner decision in WR #15520 comments: "stop researching the price").
const DEFAULT_MARGIN = 0.6;

const GUARDRAILS = Object.freeze({
  accuracy:
    "The generated image MUST depict the exact item in the provided real product photos — " +
    "same model, same color, same accessories. Do NOT add items, upgrades, bundles, or " +
    "features that are not in the source photos. If you cannot preserve the exact item, " +
    "refuse and return nothing.",
  stagingScope:
    "AI-staged photos are ONLY permitted because this item is NEW/SEALED and the shot is " +
    "conditioned on the product's real photos. Never fabricate condition: no wear, no " +
    "damage-hiding, no 'better than reality' retouching.",
  humanReview:
    "This listing is a DRAFT. A human must review and approve it before posting. " +
    "Do not present it as final or post-ready.",
  noAutoPost:
    "Never post, submit, or automate publishing of this listing anywhere. Facebook " +
    "Marketplace has no personal-account listing API and bot-posting violates its ToS; " +
    "posting is a manual human step.",
  noAccountScraping:
    "Never log into, scrape, or automate the owner's Amazon account. Order data comes " +
    "only from the human-downloaded CSV or explicitly supplied links.",
});

// ---------------------------------------------------------------------------
// 1. Parse — deterministic CSV / link intake
// ---------------------------------------------------------------------------

/** Parse one CSV line honoring RFC-4180 style quoted fields. */
function parseCsvLine(line) {
  const out = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') inQuotes = false;
      else cur += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ",") { out.push(cur); cur = ""; }
    else cur += ch;
  }
  out.push(cur);
  return out;
}

// Amazon exports vary by report vintage — map every known header spelling.
const HEADER_CANDIDATES = {
  title: ["product name", "title", "item name", "name", "description"],
  asin: ["asin", "asin/isbn", "asin_isbn"],
  link: ["link", "url", "product url", "website link"],
  pricePaid: [
    "unit price", "purchase price per unit", "item total", "price",
    "item subtotal", "total owed", "purchase price",
  ],
  date: ["order date", "date", "purchase date", "date added"],
  orderId: ["order id", "order number", "order #"],
  quantity: ["quantity", "qty"],
};

function mapHeaders(headerRow) {
  const lower = headerRow.map((h) => h.trim().toLowerCase().replace(/^\ufeff/, ""));
  const idx = {};
  for (const [field, candidates] of Object.entries(HEADER_CANDIDATES)) {
    idx[field] = -1;
    for (const cand of candidates) {
      const at = lower.indexOf(cand);
      if (at !== -1) { idx[field] = at; break; }
    }
  }
  return idx;
}

function parseMoney(value) {
  if (value == null) return null;
  const n = Number(String(value).replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n) && String(value).trim() !== "" ? n : null;
}

function slugify(text) {
  return String(text || "item")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "item";
}

/**
 * Parse an Amazon order-history style CSV into items[].
 * Returns { items, warnings }. Rows without a recognizable title are skipped
 * (with a warning) instead of crashing the batch.
 */
function parseOrdersCsv(csvText) {
  const warnings = [];
  const lines = String(csvText).split(/\r?\n/).filter((l) => l.trim() !== "");
  if (lines.length < 2) return { items: [], warnings: ["CSV has no data rows"] };

  const headers = parseCsvLine(lines[0]);
  const idx = mapHeaders(headers);
  if (idx.title === -1) {
    return { items: [], warnings: [`No title-like column found in headers: ${headers.join(", ")}`] };
  }

  const items = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    const title = (cols[idx.title] || "").trim();
    if (!title || title.toLowerCase() === "not available") {
      warnings.push(`Row ${i + 1}: skipped (no product title)`);
      continue;
    }
    const asin = idx.asin !== -1 ? (cols[idx.asin] || "").trim() : "";
    const link = idx.link !== -1 && (cols[idx.link] || "").trim()
      ? cols[idx.link].trim()
      : asin ? `https://www.amazon.com/dp/${asin}` : "";
    items.push({
      id: `${String(items.length + 1).padStart(3, "0")}-${slugify(title)}`,
      title,
      asin: asin || null,
      link: link || null,
      pricePaid: idx.pricePaid !== -1 ? parseMoney(cols[idx.pricePaid]) : null,
      orderDate: idx.date !== -1 ? (cols[idx.date] || "").trim() || null : null,
      orderId: idx.orderId !== -1 ? (cols[idx.orderId] || "").trim() || null : null,
      quantity: idx.quantity !== -1 ? Number(cols[idx.quantity]) || 1 : 1,
      source: "csv",
    });
  }
  return { items, warnings };
}

/** Build items[] from raw product links (one per line or array). */
function itemsFromLinks(links) {
  const list = Array.isArray(links)
    ? links
    : String(links).split(/\s+/).filter(Boolean);
  return list
    .filter((l) => /^https?:\/\//i.test(l))
    .map((link, i) => {
      const asinMatch = link.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})/i);
      return {
        id: `${String(i + 1).padStart(3, "0")}-${slugify(asinMatch ? asinMatch[1] : link.replace(/^https?:\/\//, ""))}`,
        title: null, // filled in by the enrichment lane
        asin: asinMatch ? asinMatch[1].toUpperCase() : null,
        link,
        pricePaid: null,
        orderDate: null,
        orderId: null,
        quantity: 1,
        source: "link",
      };
    });
}

// ---------------------------------------------------------------------------
// 2–4. Prompt builders — guardrails live IN the prompts, not just docs
// ---------------------------------------------------------------------------

function buildEnrichmentPrompt(item) {
  return [
    "You are the enrichment lane of a marketplace relisting pipeline.",
    `Product: ${item.title || "(unknown — identify from the link)"}`,
    item.asin ? `ASIN: ${item.asin}` : null,
    item.link ? `Product link: ${item.link}` : null,
    "",
    "From the PUBLIC product page only, return strict JSON with keys:",
    '{ "title": string, "category": string, "specs": string[], "officialImageUrls": string[], "currentListPrice": number|null }',
    "",
    "GUARDRAILS:",
    `- ${GUARDRAILS.noAccountScraping}`,
    "- Only use the public product page; never any logged-in or account data.",
    "- If you cannot verify a fact, use null — do not invent specs or images.",
  ].filter((l) => l !== null).join("\n");
}

/**
 * Casual "normal person's photo" image prompt — image-to-image, conditioned on
 * the item's real product photos. Only valid for new/sealed items.
 */
function buildImagePrompt(item, shotIndex, totalShots) {
  const scenes = [
    "on a kitchen table with soft natural window light",
    "on a living-room coffee table under warm home lighting",
    "on a plain bedspread, photographed slightly from above, phone-camera style",
    "on a wooden desk next to everyday objects, casual framing",
    "held in a hand at home, slightly imperfect casual framing",
  ];
  const scene = scenes[(shotIndex - 1) % scenes.length];
  return [
    `Casual marketplace photo ${shotIndex} of ${totalShots}.`,
    `Item: ${item.title}${item.asin ? ` (ASIN ${item.asin})` : ""} — new/sealed.`,
    `Scene: ${scene}. Deliberately NOT a pro studio shot: a normal person's`,
    "phone photo — believable shadows, ordinary home background, no watermark,",
    "no text overlays, no brand-new-in-catalog gloss.",
    "",
    "You are given the product's REAL official photos as source images.",
    "Perform image-to-image so the depicted item IS the actual item.",
    "",
    "GUARDRAILS (hard requirements):",
    `- ${GUARDRAILS.accuracy}`,
    `- ${GUARDRAILS.stagingScope}`,
  ].join("\n");
}

/** 30–40 second product video storyboard prompt (owner-requested option). */
function buildVideoStoryboardPrompt(item) {
  return [
    `Write a 30–40 second marketplace product video storyboard for: ${item.title}.`,
    "Format: 5–7 numbered shots, each with duration (seconds), camera direction,",
    "and one line of on-screen text. Style: casual phone video at home, not an ad.",
    "",
    "GUARDRAILS:",
    `- ${GUARDRAILS.accuracy}`,
    `- ${GUARDRAILS.humanReview}`,
  ].join("\n");
}

function suggestPrice(pricePaid, margin = DEFAULT_MARGIN) {
  if (pricePaid == null || !Number.isFinite(pricePaid)) return null;
  return Math.max(1, Math.round(pricePaid * margin));
}

function buildListingCopyPrompt(item, condition, suggestedPrice) {
  return [
    "Write casual, friendly Facebook-Marketplace listing copy. Return strict JSON:",
    '{ "listingTitle": string, "description": string, "condition": string }',
    "",
    `Item: ${item.title}${item.asin ? ` (ASIN ${item.asin})` : ""}`,
    `Condition: ${condition}`,
    item.pricePaid != null ? `Originally paid: $${item.pricePaid}` : null,
    suggestedPrice != null
      ? `Asking price (already decided — do NOT research or change it): $${suggestedPrice}`
      : "Asking price: leave for the owner to fill in — do NOT research prices.",
    "",
    "GUARDRAILS:",
    "- Describe only what is true of this exact item; never oversell condition.",
    `- ${GUARDRAILS.humanReview}`,
    `- ${GUARDRAILS.noAutoPost}`,
  ].filter((l) => l !== null).join("\n");
}

// ---------------------------------------------------------------------------
// Spend cap tracker for the image_gen lane
// ---------------------------------------------------------------------------

class SpendTracker {
  constructor({ capUsd, costPerImageUsd } = {}) {
    this.capUsd = capUsd != null ? capUsd
      : parseMoney(process.env.IMAGE_GEN_BATCH_SPEND_CAP_USD) != null
        ? parseMoney(process.env.IMAGE_GEN_BATCH_SPEND_CAP_USD)
        : DEFAULT_BATCH_SPEND_CAP_USD;
    this.costPerImageUsd = costPerImageUsd != null ? costPerImageUsd
      : parseMoney(process.env.IMAGE_GEN_COST_PER_IMAGE_USD) != null
        ? parseMoney(process.env.IMAGE_GEN_COST_PER_IMAGE_USD)
        : DEFAULT_COST_PER_IMAGE_USD;
    this.spentUsd = 0;
  }

  /** True if one more image fits under the cap. */
  canSpend() {
    return this.spentUsd + this.costPerImageUsd <= this.capUsd + 1e-9;
  }

  record() {
    this.spentUsd += this.costPerImageUsd;
  }
}

// ---------------------------------------------------------------------------
// OpenRouter callers (text + image). Injectable seams for tests.
// ---------------------------------------------------------------------------

function openrouterRequest(body) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const req = https.request(
      {
        hostname: "openrouter.ai",
        path: "/api/v1/chat/completions",
        method: "POST",
        headers: {
          Authorization: "Bearer " + OPENROUTER_API_KEY,
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(payload),
          "HTTP-Referer": "https://github.com/midnghtsapphire/revvel-standards",
          "X-Title": "marketplace-relist",
        },
        timeout: 120000,
      },
      (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => {
          if (res.statusCode >= 400) {
            // 401/402/403/429 → check OPENROUTER_API_KEY + balance at
            // https://openrouter.ai/credits before assuming a code bug.
            return reject(new Error(`OpenRouter HTTP ${res.statusCode}: ${data.slice(0, 300)}`));
          }
          try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
        });
      },
    );
    req.on("error", reject);
    req.on("timeout", () => { req.destroy(new Error("OpenRouter request timed out")); });
    req.write(payload);
    req.end();
  });
}

/** Text lane call with primary→fallback model chain. */
async function callTextLane(lane, prompt, request = openrouterRequest) {
  const models = [LANES[lane].primary, LANES[lane].fallback];
  let lastError;
  for (const model of models) {
    try {
      const res = await request({
        model,
        messages: [{ role: "user", content: prompt }],
        max_tokens: 4000,
      });
      const content = res && res.choices && res.choices[0] && res.choices[0].message
        ? res.choices[0].message.content : "";
      if (content && content.trim()) return { model, content };
      lastError = new Error(`Empty response from ${model}`);
    } catch (e) { lastError = e; }
  }
  throw lastError || new Error(`All ${lane} models failed`);
}

/**
 * image_gen lane call — image-to-image conditioned on real product photos.
 * Returns { model, images: [dataUrl, ...] }.
 */
async function callImageGen(prompt, sourceImageUrls, request = openrouterRequest) {
  const models = [LANES.image_gen.primary, LANES.image_gen.fallback];
  const content = [
    { type: "text", text: prompt },
    ...(sourceImageUrls || []).slice(0, 4).map((url) => ({ type: "image_url", image_url: { url } })),
  ];
  let lastError;
  for (const model of models) {
    try {
      const res = await request({
        model,
        messages: [{ role: "user", content }],
        modalities: ["image", "text"],
      });
      const msg = res && res.choices && res.choices[0] && res.choices[0].message;
      const images = ((msg && msg.images) || [])
        .map((im) => im && im.image_url && im.image_url.url)
        .filter(Boolean);
      if (images.length) return { model, images };
      lastError = new Error(`No images returned by ${model}`);
    } catch (e) { lastError = e; }
  }
  throw lastError || new Error("All image_gen models failed");
}

function saveDataUrlImage(dataUrl, filePath) {
  const m = /^data:image\/(\w+);base64,(.+)$/.exec(dataUrl);
  if (!m) throw new Error("Unrecognized image data URL");
  const file = `${filePath}.${m[1] === "jpeg" ? "jpg" : m[1]}`;
  fs.writeFileSync(file, Buffer.from(m[2], "base64"));
  return file;
}

function tryParseJson(text) {
  if (!text) return null;
  const fenced = /```(?:json)?\s*([\s\S]*?)```/.exec(text);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1) return null;
  try { return JSON.parse(candidate.slice(start, end + 1)); } catch { return null; }
}

// ---------------------------------------------------------------------------
// 5. Listing packs + review dashboard
// ---------------------------------------------------------------------------

/**
 * Build one listing pack (folder + listing.json) for an item.
 * options: { outDir, photos (3|5), video, condition ("new"|"used"), margin,
 *            spendTracker, live (bool), request (test seam) }
 */
async function buildListingPack(item, options) {
  const {
    outDir, photos = 3, video = false, condition = "used",
    margin = DEFAULT_MARGIN, spendTracker, live = false, request,
  } = options;

  const packDir = path.join(outDir, item.id);
  const imagesDir = path.join(packDir, "images");
  fs.mkdirSync(imagesDir, { recursive: true });

  const suggestedPrice = suggestPrice(item.pricePaid, margin);
  const isNew = condition === "new";
  const listing = {
    item,
    condition: isNew ? "New (sealed)" : "Used",
    suggestedPrice,
    margin,
    status: "pending-review", // human-review gate: nothing ships without approve
    review: { decision: null, note: null, retries: [] },
    guardrails: GUARDRAILS,
    enrichment: { status: "pending", prompt: buildEnrichmentPrompt(item), result: null, model: null },
    images: {
      // GUARDRAIL IN BEHAVIOR: AI staging only for new/sealed items.
      policy: isNew
        ? "ai-staged-from-real-photos"
        : "real-photographs-only (used item — take your own photos; see checklist)",
      requestedShots: photos,
      status: "pending",
      prompts: [],
      files: [],
      checklist: isNew ? null : [
        "Photograph the ACTUAL item — front, back, close-up of any wear",
        `Take ${photos} photos on a kitchen table / home surface with natural light`,
        "Include original packaging/accessories if you still have them",
      ],
    },
    video: video ? { status: "pending", prompt: buildVideoStoryboardPrompt(item), storyboard: null } : null,
    copy: { status: "pending", prompt: null, result: null, model: null },
    posting: {
      method: "manual-human-only",
      note: GUARDRAILS.noAutoPost,
    },
  };

  // Image prompts are always recorded (dry-run parity + retry support).
  if (isNew) {
    for (let s = 1; s <= photos; s++) {
      listing.images.prompts.push(buildImagePrompt(item, s, photos));
    }
  }

  // --- Live lanes (skipped in dry-run; prompts stay in the pack) ---
  if (live) {
    try {
      const enr = await callTextLane("vision", listing.enrichment.prompt, request);
      listing.enrichment.model = enr.model;
      listing.enrichment.result = tryParseJson(enr.content) || { raw: enr.content };
      listing.enrichment.status = "done";
      if (!item.title && listing.enrichment.result.title) item.title = listing.enrichment.result.title;
    } catch (e) {
      listing.enrichment.status = `error: ${e.message}`;
    }

    if (isNew) {
      const sourceUrls = (listing.enrichment.result && listing.enrichment.result.officialImageUrls) || [];
      for (let s = 0; s < listing.images.prompts.length; s++) {
        if (!spendTracker.canSpend()) {
          listing.images.status = "skipped:spend-cap";
          break;
        }
        try {
          const gen = await callImageGen(listing.images.prompts[s], sourceUrls, request);
          spendTracker.record();
          gen.images.forEach((dataUrl, gi) => {
            const file = saveDataUrlImage(dataUrl, path.join(imagesDir, `shot-${s + 1}-${gi + 1}`));
            listing.images.files.push(path.relative(packDir, file));
          });
          listing.images.status = "done";
          listing.images.model = gen.model;
        } catch (e) {
          listing.images.status = `error: ${e.message}`;
        }
      }
    } else {
      listing.images.status = "human-photos-required";
    }

    if (video) {
      try {
        const sb = await callTextLane("cheap_summary", listing.video.prompt, request);
        listing.video.storyboard = sb.content;
        listing.video.status = "done";
      } catch (e) {
        listing.video.status = `error: ${e.message}`;
      }
    }

    try {
      listing.copy.prompt = buildListingCopyPrompt(item, listing.condition, suggestedPrice);
      const copy = await callTextLane("cheap_summary", listing.copy.prompt, request);
      listing.copy.model = copy.model;
      listing.copy.result = tryParseJson(copy.content) || { raw: copy.content };
      listing.copy.status = "done";
    } catch (e) {
      listing.copy.status = `error: ${e.message}`;
    }
  } else {
    listing.copy.prompt = buildListingCopyPrompt(item, listing.condition, suggestedPrice);
    listing.enrichment.status = "dry-run";
    listing.images.status = isNew ? "dry-run" : "human-photos-required";
    listing.copy.status = "dry-run";
    if (listing.video) listing.video.status = "dry-run";
  }

  fs.writeFileSync(path.join(packDir, "listing.json"), JSON.stringify(listing, null, 2));
  return listing;
}

function escapeHtml(text) {
  return String(text == null ? "" : text).replace(/[&<>"']/g, (m) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[m]));
}

/**
 * Render the batch review dashboard (Agent Creator pattern: one static HTML
 * file, data embedded). Approve / reject / retry decisions persist to
 * localStorage and export as decisions.json for `apply-decisions`.
 */
function renderDashboard(listings, batchDir) {
  const data = listings.map((l) => ({
    id: l.item.id,
    title: l.item.title || "(untitled — enrichment pending)",
    condition: l.condition,
    suggestedPrice: l.suggestedPrice,
    imagesPolicy: l.images.policy,
    imagesStatus: l.images.status,
    imageFiles: l.images.files,
    copy: l.copy.result,
    video: l.video ? l.video.status : null,
    status: l.status,
  }));
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Marketplace Relist — Review Dashboard</title>
<style>
  body { font-family: system-ui, sans-serif; margin: 2rem; background: #0d1117; color: #e6edf3; }
  .card { border: 1px solid #30363d; border-radius: 8px; padding: 1rem; margin-bottom: 1rem; background: #161b22; }
  .imgs img { max-width: 160px; margin: 4px; border-radius: 6px; }
  button { margin-right: .5rem; padding: .4rem .8rem; border-radius: 6px; border: 1px solid #30363d; cursor: pointer; }
  .approve { background: #1a7f37; color: #fff; } .reject { background: #b62324; color: #fff; }
  .retry { background: #9e6a03; color: #fff; }
  textarea { width: 100%; background: #0d1117; color: #e6edf3; border: 1px solid #30363d; border-radius: 6px; }
  .decision { font-weight: 700; } .banner { border: 1px solid #9e6a03; padding: .6rem 1rem; border-radius: 8px; margin-bottom: 1rem; }
</style>
</head>
<body>
<h1>Marketplace Relist — Review Dashboard</h1>
<p class="banner">🔒 Human-review gate: nothing posts automatically. Approve, reject, or retry
each listing, then <button id="export">Export decisions.json</button> and run
<code>node scripts/marketplace-relist.js apply-decisions ${escapeHtml(path.basename(batchDir))}</code>.
Posting to Facebook Marketplace is a manual copy-paste — there is no bot posting.</p>
<div id="packs"></div>
<script>
// "<" is escaped in the embedded JSON so pack titles can never break out of
// this script tag (</script> injection); esc() handles DOM-level escaping.
const PACKS = ${JSON.stringify(data).replace(/</g, "\\u003c")};
const KEY = "relist-decisions:" + location.pathname;
const decisions = JSON.parse(localStorage.getItem(KEY) || "{}");
function save() { localStorage.setItem(KEY, JSON.stringify(decisions)); render(); }
function render() {
  const root = document.getElementById("packs");
  root.innerHTML = "";
  for (const p of PACKS) {
    const d = decisions[p.id] || {};
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML =
      "<h2>" + esc(p.title) + "</h2>" +
      "<p>" + esc(p.condition) + (p.suggestedPrice != null ? " — suggested $" + p.suggestedPrice : "") + "</p>" +
      "<p>Images: " + esc(p.imagesPolicy) + " (" + esc(p.imagesStatus) + ")" + (p.video ? " · Video storyboard: " + esc(p.video) : "") + "</p>" +
      '<div class="imgs">' + p.imageFiles.map(f => '<img src="' + esc(p.id + "/" + f) + '">').join("") + "</div>" +
      (p.copy ? "<pre>" + esc(JSON.stringify(p.copy, null, 2)) + "</pre>" : "") +
      '<p class="decision">Decision: ' + esc(d.decision || "pending") + "</p>" +
      '<textarea rows="2" placeholder="Retry / review note (e.g. \\'photo 2 looks off, brighter lighting\\')" data-id="' + p.id + '">' + esc(d.note || "") + "</textarea><br><br>" +
      '<button class="approve" data-id="' + p.id + '" data-act="approve">Approve</button>' +
      '<button class="reject" data-id="' + p.id + '" data-act="reject">Reject</button>' +
      '<button class="retry" data-id="' + p.id + '" data-act="retry">Retry images/copy</button>';
    root.appendChild(card);
  }
}
function esc(s) { const d = document.createElement("div"); d.textContent = s == null ? "" : String(s); return d.innerHTML; }
document.addEventListener("click", (e) => {
  const act = e.target.dataset && e.target.dataset.act;
  if (!act) return;
  const id = e.target.dataset.id;
  const note = document.querySelector('textarea[data-id="' + id + '"]').value;
  decisions[id] = { decision: act, note, at: new Date().toISOString() };
  save();
});
document.addEventListener("input", (e) => {
  if (e.target.tagName === "TEXTAREA") {
    const id = e.target.dataset.id;
    decisions[id] = Object.assign(decisions[id] || {}, { note: e.target.value });
    localStorage.setItem(KEY, JSON.stringify(decisions));
  }
});
document.getElementById("export").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(decisions, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "decisions.json";
  a.click();
});
render();
</script>
</body>
</html>
`;
}

/** Apply exported dashboard decisions back onto listing.json packs. */
function applyDecisions(batchDir, decisions) {
  const applied = [];
  for (const [id, d] of Object.entries(decisions || {})) {
    const listingPath = path.join(batchDir, id, "listing.json");
    if (!fs.existsSync(listingPath)) continue;
    const listing = JSON.parse(fs.readFileSync(listingPath, "utf8"));
    if (d.decision === "approve") listing.status = "approved";
    else if (d.decision === "reject") listing.status = "rejected";
    else if (d.decision === "retry") {
      listing.status = "retry-requested";
      listing.review.retries.push({ note: d.note || null, at: d.at || new Date().toISOString() });
    }
    listing.review.decision = d.decision || null;
    listing.review.note = d.note || null;
    fs.writeFileSync(listingPath, JSON.stringify(listing, null, 2));
    applied.push({ id, decision: d.decision });
  }
  return applied;
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--video") args.video = true;
    else if (a.startsWith("--")) { args[a.slice(2)] = argv[++i]; }
    else args._.push(a);
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const [cmd, input, extra] = args._;

  if (!cmd || cmd === "help") {
    console.log("Usage: marketplace-relist.js <parse|run|retry|apply-decisions> ... (see file header)");
    return;
  }

  if (cmd === "parse" || cmd === "run") {
    if (!input) throw new Error("Provide an orders CSV path or a product link");
    let items;
    let warnings = [];
    if (/^https?:\/\//i.test(input)) {
      items = itemsFromLinks([input, ...args._.slice(2)]);
    } else {
      const parsed = parseOrdersCsv(fs.readFileSync(input, "utf8"));
      items = parsed.items;
      warnings = parsed.warnings;
    }
    warnings.forEach((w) => console.warn(`⚠️  ${w}`));
    if (args.limit) items = items.slice(0, Number(args.limit));
    console.log(`Parsed ${items.length} item(s).`);
    if (cmd === "parse") {
      console.log(JSON.stringify(items, null, 2));
      return;
    }

    const photos = args.photos ? Number(args.photos) : 3;
    if (![3, 5].includes(photos)) throw new Error("--photos must be 3 or 5");
    const outDir = path.resolve(args.out || path.join("artifacts", "relist", `batch-${Date.now()}`));
    fs.mkdirSync(outDir, { recursive: true });

    const live = Boolean(OPENROUTER_API_KEY);
    if (!live) {
      console.log("ℹ️  No OPENROUTER_API_KEY — dry-run: packs get prompts, no live generation.");
      console.log("   (If a key IS set and calls fail with 401/402/403/429, check https://openrouter.ai/credits.)");
    }
    const spendTracker = new SpendTracker();
    console.log(`image_gen spend cap: $${spendTracker.capUsd.toFixed(2)} (≈$${spendTracker.costPerImageUsd.toFixed(3)}/image)`);

    const listings = [];
    for (const item of items) {
      console.log(`→ ${item.id}`);
      listings.push(await buildListingPack(item, {
        outDir, photos, video: Boolean(args.video),
        condition: args.condition === "new" ? "new" : "used",
        margin: args.margin ? Number(args.margin) : DEFAULT_MARGIN,
        spendTracker, live,
      }));
    }
    fs.writeFileSync(path.join(outDir, "review-dashboard.html"), renderDashboard(listings, outDir));
    console.log(`✅ ${listings.length} pack(s) in ${outDir}`);
    console.log(`   Review: open ${path.join(outDir, "review-dashboard.html")} then export decisions.json`);
    return;
  }

  if (cmd === "retry") {
    const batchDir = path.resolve(input || "");
    const itemId = extra;
    if (!itemId) throw new Error("Usage: retry <batchDir> <itemId> [--note ...]");
    const listingPath = path.join(batchDir, itemId, "listing.json");
    const listing = JSON.parse(fs.readFileSync(listingPath, "utf8"));
    listing.review.retries.push({ note: args.note || null, at: new Date().toISOString() });
    const spendTracker = new SpendTracker();
    const rebuilt = await buildListingPack(listing.item, {
      outDir: batchDir,
      photos: listing.images.requestedShots,
      video: Boolean(listing.video),
      condition: listing.condition.startsWith("New") ? "new" : "used",
      margin: listing.margin,
      spendTracker,
      live: Boolean(OPENROUTER_API_KEY),
    });
    rebuilt.review.retries = listing.review.retries;
    fs.writeFileSync(listingPath, JSON.stringify(rebuilt, null, 2));
    console.log(`✅ Retried ${itemId} (${rebuilt.images.status})`);
    return;
  }

  if (cmd === "apply-decisions") {
    const batchDir = path.resolve(input || "");
    const decisionsPath = extra ? path.resolve(extra) : path.join(batchDir, "decisions.json");
    const decisions = JSON.parse(fs.readFileSync(decisionsPath, "utf8"));
    const applied = applyDecisions(batchDir, decisions);
    applied.forEach((a) => console.log(`${a.decision === "approve" ? "✅" : a.decision === "reject" ? "❌" : "🔁"} ${a.id} → ${a.decision}`));
    const retries = applied.filter((a) => a.decision === "retry");
    if (retries.length) {
      console.log("\nRetry with:");
      retries.forEach((r) => console.log(`  node scripts/marketplace-relist.js retry ${batchDir} ${r.id}`));
    }
    return;
  }

  throw new Error(`Unknown command: ${cmd}`);
}

module.exports = {
  parseCsvLine,
  parseOrdersCsv,
  itemsFromLinks,
  buildEnrichmentPrompt,
  buildImagePrompt,
  buildVideoStoryboardPrompt,
  buildListingCopyPrompt,
  suggestPrice,
  SpendTracker,
  buildListingPack,
  renderDashboard,
  applyDecisions,
  callTextLane,
  callImageGen,
  tryParseJson,
  GUARDRAILS,
  LANES,
};

if (require.main === module) {
  main().catch((e) => {
    console.error(`❌ ${e.message}`);
    process.exit(1);
  });
}
