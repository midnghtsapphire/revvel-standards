#!/usr/bin/env node
// Package the static agent-as-fte landing page.
// CALENDLY_URL is read at build time and written into the page only when it
// is an https://calendly.com/<path> URL. Any other value fails the build so a
// bad link cannot be iframed. An empty value leaves the "not set" message.
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { calendlyEmbedUrl } = require("../lib/calendly-url.js");
const { loadSalesDeck } = require("../lib/sales-deck.js");

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "landing-dist");

function escapeAttribute(value) {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

function deckHtml(slides) {
  const sections = slides.map((slide, index) => {
    const [title, subtitle, body] = slide.map((part) =>
      part.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"));
    const number = String(index + 1).padStart(2, "0");
    return `<section class="slide"><p>REVVEL · ${number} / ${String(slides.length).padStart(2, "0")}</p><h1>${title}</h1><h2>${subtitle}</h2><p>${body}</p></section>`;
  }).join("\n");
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>GOAP agent sales deck — REVVEL</title>
  <link rel="stylesheet" href="styles.css">
  <style>
    .slide { min-height: 70vh; display: flex; flex-direction: column; justify-content: center; gap: 12px; }
    @media print {
      @page { size: landscape; margin: 12mm; }
      nav, .actions { display: none; }
      .slide { break-after: page; min-height: 160mm; background: white; color: #0f172a; }
      .slide h2, .slide p:first-child { color: #0e7490; }
    }
  </style>
</head>
<body>
  <main class="wrap">
    <nav class="nav"><a href="index.html">Landing page</a><a href="goap-agent-sales-deck.pdf">Download PDF</a></nav>
    ${sections}
  </main>
</body>
</html>
`;
}

const raw = process.env.CALENDLY_URL || "";
const embed = calendlyEmbedUrl(raw);
if (raw.trim() && !embed) {
  console.error("CALENDLY_URL is set but is not an https://calendly.com/<path> URL. Refusing to embed it.");
  process.exit(1);
}

const slides = loadSalesDeck(join(root, "sales/deck.md"));
const index = await readFile(join(root, "landing/index.html"), "utf8");
if (!index.includes("__REVVEL_CALENDLY_URL__")) {
  console.error("landing/index.html is missing the CALENDLY_URL token");
  process.exit(1);
}
const html = index.replaceAll("__REVVEL_CALENDLY_URL__", escapeAttribute(embed || ""));
await mkdir(dist, { recursive: true });
await writeFile(join(dist, "index.html"), html);
await writeFile(join(dist, "deck.html"), deckHtml(slides));
await writeFile(join(dist, "health"), "ok\n");
await writeFile(join(dist, "health.json"), JSON.stringify({ status: "ok", service: "agent-as-fte" }) + "\n");
for (const name of ["styles.css", "app.js", "roi.js", "calendly.js"]) {
  await copyFile(join(root, "landing", name), join(dist, name));
}
try {
  await copyFile(join(root, "public/goap-agent-sales-deck.pdf"), join(dist, "goap-agent-sales-deck.pdf"));
} catch (error) {
  console.error("Missing public/goap-agent-sales-deck.pdf. Run scripts/build_sales_deck.py first.");
  process.exit(1);
}
console.log(JSON.stringify({ files: dist, slides: slides.length, calendly: Boolean(embed) }));
