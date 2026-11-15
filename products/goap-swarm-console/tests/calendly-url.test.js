"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const test = require("node:test");
const assert = require("node:assert/strict");
const { calendlyEmbedUrl } = require("../lib/calendly-url");

function browserCalendly() {
  const context = { window: {}, URL };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, "../landing/calendly.js"), "utf8"), context);
  return context.window.revvelCalendlyEmbedUrl;
}

test("accepts an https calendly.com path and ignores the hash", () => {
  const browser = browserCalendly();
  const input = "https://calendly.com/revvel/goap-pilot#intro";
  const expected = "https://calendly.com/revvel/goap-pilot";
  assert.equal(calendlyEmbedUrl(input), expected);
  assert.equal(browser(input), expected);
});

test("rejects empty, non-https, other hosts, and a bare calendly origin", () => {
  const browser = browserCalendly();
  const rejected = ["", "   ", "http://calendly.com/revvel/goap", "https://example.com/revvel/goap", "https://calendly.com/", "https://calendly.com", "not a url", "https://user:pass@calendly.com/revvel/goap"];
  for (const value of rejected) {
    assert.equal(calendlyEmbedUrl(value), null, value);
    assert.equal(browser(value), null, value);
  }
});

test("landing source has no baked calendly path", () => {
  const html = fs.readFileSync(path.join(__dirname, "../landing/index.html"), "utf8");
  assert.match(html, /__REVVEL_CALENDLY_URL__/);
  assert.match(html, /Proof pending/);
  assert.doesNotMatch(html, /https:\/\/calendly\.com\/[A-Za-z0-9]/);
});
