"use strict";

// One parser for the agent-as-FTE sales deck (WR #18334).
// sales/deck.md is the source. sales/slides.json is the copy the Next page
// imports, and the PDF builder reads that JSON. A test fails if the two differ.
// The previous approach scraped ["..."] lines out of the TSX page, which
// breaks as soon as a slide is commented or the array moves.

const fs = require("fs");

function parseSalesDeck(markdown) {
  if (typeof markdown !== "string" || markdown.trim() === "") {
    throw new Error("sales deck markdown is empty");
  }
  const slides = [];
  for (const part of markdown.split(/\n(?=## )/)) {
    if (!part.startsWith("## ")) continue;
    const lines = part.split(/\r?\n/);
    const title = lines[0].replace(/^##\s+/, "").trim();
    let subtitle = "";
    const body = [];
    for (const line of lines.slice(1)) {
      const trimmed = line.trim();
      if (!subtitle && trimmed.startsWith("**") && trimmed.endsWith("**") && trimmed.length > 4) {
        subtitle = trimmed.slice(2, -2).trim();
        continue;
      }
      if (trimmed === "") continue;
      body.push(trimmed);
    }
    const text = body.join(" ").replace(/\s+/g, " ").trim();
    if (!title || !subtitle || !text) {
      throw new Error(`slide is missing title, subtitle, or body: ${title || "(no title)"}`);
    }
    slides.push([title, subtitle, text]);
  }
  if (slides.length < 10 || slides.length > 15) {
    throw new Error(`sales deck must contain 10 to 15 slides, found ${slides.length}`);
  }
  return slides;
}

function loadSalesDeck(path) {
  return parseSalesDeck(fs.readFileSync(path, "utf8"));
}

module.exports = { parseSalesDeck, loadSalesDeck };
