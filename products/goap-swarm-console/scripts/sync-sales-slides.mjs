#!/usr/bin/env node
// Rewrite sales/slides.json from sales/deck.md. The Next page imports the JSON
// because a client component cannot read the markdown file.
import { writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { loadSalesDeck } = require("../lib/sales-deck.js");
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const slides = loadSalesDeck(join(root, "sales/deck.md"));
await writeFile(join(root, "sales/slides.json"), JSON.stringify(slides, null, 2) + "\n");
console.log(`wrote ${slides.length} slides`);
