#!/usr/bin/env node
"use strict";

/**
 * Unit tests for scripts/wr-preprocess.js (the pre-Jules WR preprocessor).
 *
 * These cover the pure logic — image URL extraction, OCR appendix assembly,
 * enrichment-prompt construction, and the enrich/preprocess orchestration with
 * injected runners — so they run with no network and no Python/PaddleOCR.
 */

const { test } = require("node:test");
const assert = require("node:assert");

const {
  CANONICAL_WR_FIELDS,
  extractImageUrls,
  ocrImages,
  assembleOcrAppendix,
  buildEnrichmentMessages,
  enrichWorkRequest,
  preprocessWorkRequest,
} = require("../scripts/wr-preprocess.js");

test("extractImageUrls: markdown image (extension-less GitHub attachment)", () => {
  const body = "See ![screenshot](https://github.com/user-attachments/assets/abc-123) here.";
  assert.deepStrictEqual(extractImageUrls(body), [
    "https://github.com/user-attachments/assets/abc-123",
  ]);
});

test("extractImageUrls: HTML img, bare url, and dedupe", () => {
  const body = [
    '<img src="https://ex.com/a.png" width="20">',
    "Also https://ex.com/b.jpg?raw=true and again ![x](https://ex.com/a.png)",
  ].join("\n");
  assert.deepStrictEqual(extractImageUrls(body), [
    "https://ex.com/a.png",
    "https://ex.com/b.jpg?raw=true",
  ]);
});

test("extractImageUrls: ignores non-image links and empty/invalid input", () => {
  const body = "[docs](https://example.com/page) and plain text.";
  assert.deepStrictEqual(extractImageUrls(body), []);
  assert.deepStrictEqual(extractImageUrls(""), []);
  assert.deepStrictEqual(extractImageUrls(null), []);
});

test("ocrImages: uses injected runner and never throws on failure", () => {
  const runner = (cmd, args) => {
    const url = args[args.length - 1];
    if (url.includes("bad")) throw new Error("python missing");
    return "OCR line one\nOCR line two\n";
  };
  const results = ocrImages(
    ["https://ex.com/good.png", "https://ex.com/bad.png"],
    { runner }
  );
  assert.strictEqual(results[0].text, "OCR line one\nOCR line two");
  assert.strictEqual(results[1].text, "");
  assert.match(results[1].error, /python missing/);
});

test("assembleOcrAppendix: includes extracted text, empty when nothing usable", () => {
  const withText = assembleOcrAppendix([
    { url: "https://ex.com/a.png", text: "Hello spec" },
  ]);
  assert.match(withText, /Extracted Image Text \(OCR\)/);
  assert.match(withText, /Hello spec/);

  const empty = assembleOcrAppendix([
    { url: "https://ex.com/a.png", text: "", error: "no text" },
  ]);
  assert.strictEqual(empty, "");
  assert.strictEqual(assembleOcrAppendix([]), "");
});

test("buildEnrichmentMessages: system lists every canonical field, user carries OCR", () => {
  const msgs = buildEnrichmentMessages({
    title: "[WR] do the thing",
    body: "sparse body",
    ocrText: "requirements from screenshot",
  });
  assert.strictEqual(msgs.length, 2);
  assert.strictEqual(msgs[0].role, "system");
  for (const field of CANONICAL_WR_FIELDS) {
    assert.ok(msgs[0].content.includes(field), `system prompt should mention ${field}`);
  }
  assert.match(msgs[1].content, /requirements from screenshot/);
  assert.match(msgs[1].content, /sparse body/);
});

test("enrichWorkRequest: falls back (no throw) when no API key", async () => {
  const out = await enrichWorkRequest({
    title: "t",
    body: "original body",
    ocrText: "img text",
    apiKey: "",
  });
  assert.strictEqual(out.enriched, false);
  assert.strictEqual(out.modelUsed, null);
  assert.match(out.body, /original body/);
  assert.match(out.body, /img text/); // OCR appendix preserved in fallback
  assert.match(out.error, /OPENROUTER_API_KEY/);
});

test("enrichWorkRequest: uses injected routedChat when key present", async () => {
  const routed = async ({ messages, apiKey }) => {
    assert.strictEqual(apiKey, "key-123");
    assert.ok(Array.isArray(messages));
    return { content: "### Objective\nDo X\n", modelUsed: "test/model" };
  };
  const out = await enrichWorkRequest({
    title: "t",
    body: "b",
    apiKey: "key-123",
    routed,
  });
  assert.strictEqual(out.enriched, true);
  assert.strictEqual(out.modelUsed, "test/model");
  assert.match(out.body, /Do X/);
});

test("enrichWorkRequest: LLM failure falls back to original body", async () => {
  const routed = async () => {
    throw new Error("all models down");
  };
  const out = await enrichWorkRequest({
    title: "t",
    body: "keepme",
    apiKey: "key",
    routed,
  });
  assert.strictEqual(out.enriched, false);
  assert.match(out.body, /keepme/);
  assert.match(out.error, /all models down/);
});

test("preprocessWorkRequest: end-to-end with injected OCR + LLM", async () => {
  const runner = (cmd, args) => {
    // Verify the OCR service is invoked correctly: python3 <script> --input <url>.
    assert.strictEqual(cmd, "python3");
    assert.ok(args.includes("--input"), "OCR runner should pass --input");
    assert.strictEqual(args[args.length - 1], "https://github.com/user-attachments/assets/z");
    return "text inside the image";
  };
  const routed = async ({ messages }) => {
    // The OCR text must have reached the model.
    assert.match(messages[1].content, /text inside the image/);
    return { content: "### Objective\nComplete WR\n", modelUsed: "m/1" };
  };
  const out = await preprocessWorkRequest({
    title: "[WR] x",
    body: "Do this ![shot](https://github.com/user-attachments/assets/z)",
    apiKey: "key",
    ocrOpts: { runner },
    routed,
  });
  assert.deepStrictEqual(out.imageUrls, [
    "https://github.com/user-attachments/assets/z",
  ]);
  assert.strictEqual(out.ocrResults[0].text, "text inside the image");
  assert.strictEqual(out.enriched, true);
  assert.match(out.enrichedBody, /Complete WR/);
});
