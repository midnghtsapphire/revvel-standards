"use strict";

const fs = require("fs");
const path = require("path");
const test = require("node:test");
const assert = require("node:assert/strict");
const { parseSalesDeck } = require("../lib/sales-deck");

const root = path.join(__dirname, "..");

test("deck markdown is the committed slide list and stays inside 10 to 15 slides", () => {
  const slides = parseSalesDeck(fs.readFileSync(path.join(root, "sales/deck.md"), "utf8"));
  const committed = JSON.parse(fs.readFileSync(path.join(root, "sales/slides.json"), "utf8"));
  assert.deepEqual(slides, committed);
  assert.ok(slides.length >= 10 && slides.length <= 15);
  const text = slides.flat().join("\n");
  assert.match(text, /\$2,000/);
  assert.match(text, /\$5,000/);
  assert.match(text, /Proof pending/);
  assert.match(text, /18330/);
  assert.match(text, /\$1,900/);
  assert.equal(slides.some((slide) => slide[0] === "Proof pending"), true);
});

test("parser rejects a deck that is outside the slide count", () => {
  const one = "## Only\n\n**Sub**\n\nBody text for the single slide.\n";
  assert.throws(() => parseSalesDeck(one), /10 to 15/);
});
