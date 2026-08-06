#!/usr/bin/env node
/**
 * Headless image_creation/v1 pack builder — no UI.
 *   node scripts/image-seo-build-pack.mjs --brief path.json --out path.json
 */
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

function parseArgs(argv) {
  const out = { brief: null, out: "artifacts/image-automation/package.json" };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--brief") out.brief = argv[++i];
    else if (argv[i] === "--out") out.out = argv[++i];
  }
  return out;
}

function slugify(s) {
  return String(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

function unique(arr, limit = 24) {
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

function buildPack(brief) {
  const primary = (brief.primaryKeyword || brief.topic || "asset").toLowerCase();
  const kind = brief.kind || "og";
  const dims = kind === "hero" ? [1920, 1080] : [1200, 630];
  const secondary = String(brief.secondaryKeywords || "")
    .split(/[,|]/)
    .map((s) => s.trim())
    .filter(Boolean);
  const pinned = brief.pinnedLsi || [];
  const custom = brief.customLsi || [];
  const excluded = new Set((brief.excludedLsi || []).map((t) => String(t).toLowerCase()));

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
  ]).filter((t) => !excluded.has(t));

  const filename = `${slugify(primary)}-${kind}.webp`;
  const alt = `${primary} ${kind.replace(/_/g, " ")} showing ${brief.topic || primary}`.slice(0, 140);
  const pageUrl = String(brief.pageUrl || "").replace(/\/$/, "");
  const imagePath = pageUrl ? `${pageUrl}/images/${filename}` : `/images/${filename}`;

  return {
    schema: "midnghtsapphire.image_creation/v1",
    brand: "MIDNGHTSAPPHIRE",
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
        excluded: [...excluded],
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

const args = parseArgs(process.argv);
let brief;
if (args.brief) {
  brief = JSON.parse(fs.readFileSync(args.brief, "utf8"));
} else if (!process.stdin.isTTY) {
  brief = JSON.parse(fs.readFileSync(0, "utf8"));
} else {
  brief = {
    topic: "GitHub release announcement banner",
    primaryKeyword: "github release banner",
    kind: "release_banner",
    secondaryKeywords: "changelog, discord, open graph",
    pinnedLsi: ["release notes", "changelog announcement"],
  };
}

const pack = buildPack(brief);
const outPath = path.resolve(process.cwd(), args.out);
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(pack, null, 2) + "\n");
console.log(JSON.stringify({ ok: true, out: args.out, filename: pack.seo.filename }));
