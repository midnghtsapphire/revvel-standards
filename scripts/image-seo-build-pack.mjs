#!/usr/bin/env node
/**
 * Headless image_creation/v1 pack builder — no UI.
 * Production control plane: Actions + blueprints (see standards/IMAGE_CREATION_SEO_AUTOMATION.md).
 *
 *   node scripts/image-seo-build-pack.mjs --brief path.json --out path.json
 *   cat brief.json | node scripts/image-seo-build-pack.mjs --out path.json
 *
 * If the CLI fails mid-pipeline, open a WR (formal:auto-wr intent) — never auto-merge.
 */
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

export function parseArgs(argv) {
  const out = { brief: null, out: "artifacts/image-automation/package.json" };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--brief") out.brief = argv[++i];
    else if (argv[i] === "--out") out.out = argv[++i];
  }
  return out;
}

export function slugify(s) {
  return String(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

export function unique(arr, limit = 24) {
  const seen = new Set();
  const out = [];
  for (const t of arr) {
    const n = String(t).toLowerCase().trim();
    if (!n || seen.has(n)) continue;
    seen.add(n);
    out.push(n);
    if (out.length >= limit) break;
  }
  return out;
}

/**
 * Blocker basename patterns for image SEO QA.
 * Matches camera dumps (IMG_*, DSC_*), screenshots, and bare image.* names.
 * SEO slugs like automation-asset-generator-og.webp pass.
 */
export const NON_SEO_FILENAME_RE =
  /^(?:IMG_.*|DSC_.*|Screenshot.*|image(?:[_.-]\d.*)?)$/i;

export function isNonSeoFilename(basename) {
  const b = String(basename || "").trim();
  if (!b) return false;
  // Strip extension so image.png and IMG_1.JPG both hit. SEO slugs that
  // merely start with "image-" (image-seo-guide-og) must PASS.
  const stem = b.replace(/\.(webp|png|jpe?g)$/i, "");
  return NON_SEO_FILENAME_RE.test(stem);
}

/**
 * Expand LSI from seed primary + secondary + pinned/custom, minus exclusions.
 * source stays "seed+cooccurrence" so packs are reproducible without a live API.
 */
export function expandLsi(brief) {
  const primary = String(brief.primaryKeyword || brief.topic || "asset").toLowerCase();
  const secondary = String(brief.secondaryKeywords || "")
    .split(/[,|]/)
    .map((s) => s.trim())
    .filter(Boolean);
  const pinned = Array.isArray(brief.pinnedLsi) ? brief.pinnedLsi : [];
  const custom = Array.isArray(brief.customLsi) ? brief.customLsi : [];
  const excluded = new Set(
    (Array.isArray(brief.excludedLsi) ? brief.excludedLsi : []).map((t) =>
      String(t).toLowerCase(),
    ),
  );

  const related = unique([
    ...pinned,
    ...custom,
    `${primary} best practices`,
    `how to ${primary}`,
    `${primary} examples`,
    ...secondary,
    "image seo",
    "open graph",
    "schema markup",
  ]).filter((t) => !excluded.has(t) && t !== primary);

  return { primary, secondary, pinned, custom, excluded: [...excluded], related };
}

export function buildPack(brief = {}) {
  const kind = brief.kind || "og";
  const dims =
    kind === "hero"
      ? [1920, 1080]
      : kind === "release_banner"
        ? [1200, 630]
        : [1200, 630];

  const { primary, secondary, pinned, custom, excluded, related } = expandLsi(brief);
  const filename = `${slugify(primary)}-${slugify(kind)}.webp`;
  if (isNonSeoFilename(filename)) {
    throw new Error(`builder produced non-SEO filename: ${filename}`);
  }

  const alt = `${primary} ${String(kind).replace(/_/g, " ")} showing ${brief.topic || primary}`.slice(
    0,
    140,
  );
  const pageUrl = String(brief.pageUrl || "").replace(/\/$/, "");
  const imagePath = pageUrl ? `${pageUrl}/images/${filename}` : `/images/${filename}`;

  return {
    schema: "midnghtsapphire.image_creation/v1",
    brand: brief.brand || "MIDNGHTSAPPHIRE",
    generated_at: new Date().toISOString(),
    source: "scripts/image-seo-build-pack.mjs",
    automation: true,
    input: brief,
    discovery: {
      keywordStrategy: {
        primary,
        secondary,
        lsi: related,
        pinned,
        custom,
        excluded,
        source: "seed+cooccurrence",
      },
    },
    seo: {
      filename,
      altText: alt,
      openGraph: {
        "og:image": imagePath,
        "og:image:width": String(dims[0]),
        "og:image:height": String(dims[1]),
        "og:image:alt": alt.slice(0, 125),
      },
      jsonLd: {
        "@type": "ImageObject",
        contentUrl: imagePath,
        width: dims[0],
        height: dims[1],
        keywords: [primary, ...secondary, ...related.slice(0, 8)].join(", "),
      },
    },
    prompts: {
      master: `Release-grade ${kind} ${dims[0]}x${dims[1]}: ${brief.topic || primary}. MIDNGHTSAPPHIRE dark UI, sapphire accent. LSI vocabulary: ${related.slice(0, 6).join(", ")}. No watermark, no illegible micro-text.`,
      negative: "blurry, watermark, purple neon, emoji, cluttered UI",
    },
    human_gate: { auto_merge: false },
  };
}

export function loadBrief(args, stdinIsTty = process.stdin.isTTY) {
  if (args.brief) {
    return JSON.parse(fs.readFileSync(args.brief, "utf8"));
  }
  if (!stdinIsTty) {
    return JSON.parse(fs.readFileSync(0, "utf8"));
  }
  return {
    topic: "GitHub release announcement banner",
    primaryKeyword: "github release banner",
    kind: "release_banner",
    secondaryKeywords: "changelog, discord, open graph",
    pinnedLsi: ["release notes", "changelog announcement"],
  };
}

export function writePack(pack, outRel) {
  const outPath = path.resolve(process.cwd(), outRel);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(pack, null, 2) + "\n");
  return outPath;
}

function main(argv = process.argv) {
  const args = parseArgs(argv);
  const brief = loadBrief(args);
  const pack = buildPack(brief);
  writePack(pack, args.out);
  console.log(JSON.stringify({ ok: true, out: args.out, filename: pack.seo.filename }));
}

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  try {
    main();
  } catch (err) {
    console.error(JSON.stringify({ ok: false, error: String(err && err.message ? err.message : err) }));
    process.exit(1);
  }
}
