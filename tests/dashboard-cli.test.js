#!/usr/bin/env node
"use strict";

/**
 * Unit tests for scripts/dashboard-cli.js
 * Tests core functions: search, filtering, and export verification
 */

const assert = require("assert");
const { search } = require("../scripts/dashboard-cli.js");

// Test data - mock dashboard data structure
const mockData = {
  projects: [
    { name: "oaudrey", status: "✅ Live", description: "Main website", link: "https://oaudrey.com" },
    { name: "music-video-creator", status: "🔵 In Progress", description: "AI video tool" },
    { name: "affiliate-hub", status: "✅ Deployed", description: "Affiliate tracking" },
  ],
  urls: [
    { url: "https://work-1-pmfpbcfktzqkmepq.prod-runtime.all-hands.dev", project: "oaudrey", type: "app" },
    { url: "https://vercel.com/oaudrey", project: "oaudrey", type: "deploy" },
  ],
  domains: [
    { name: "oaudrey.com", status: "Active", purpose: "Main domain" },
    { name: "fieldwork.oaudrey.com", status: "Dev", purpose: "Field work app" },
  ],
};

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`PASS: ${name}`);
    passed++;
  } catch (e) {
    console.log(`FAIL: ${name}\n    ${e.stack || e.message}`);
    failed++;
  }
}

// Test: search finds projects by name
test("search finds projects by name", () => {
  const results = search(mockData, "oaudrey");
  assert.strictEqual(results.projects.length >= 1, true, "Should find at least one project");
  assert.strictEqual(results.projects[0].name, "oaudrey");
});

// Test: search finds projects by status
test("search finds projects by status", () => {
  const results = search(mockData, "Live");
  assert.strictEqual(results.projects.length >= 1, true, "Should find projects with Live status");
});

// Test: search finds URLs by project name
test("search finds URLs by project name", () => {
  const results = search(mockData, "oaudrey");
  assert.strictEqual(results.urls.length >= 1, true, "Should find at least one URL");
  assert.strictEqual(results.urls[0].project, "oaudrey");
});

// Test: search finds URLs by URL text
test("search finds URLs by URL text", () => {
  const results = search(mockData, "vercel");
  assert.strictEqual(results.urls.length >= 1, true, "Should find URL containing vercel");
});

// Test: search finds domains by name
test("search finds domains by name", () => {
  const results = search(mockData, "oaudrey.com");
  assert.strictEqual(results.domains.length >= 1, true, "Should find at least one domain");
  assert.strictEqual(results.domains[0].name, "oaudrey.com");
});

// Test: search finds domains by purpose
test("search finds domains by purpose", () => {
  const results = search(mockData, "field work");
  assert.strictEqual(results.domains.length >= 1, true, "Should find domains by purpose");
});

// Test: search returns empty results for non-matching query
test("search returns empty results for non-matching query", () => {
  const results = search(mockData, "nonexistent-xyz-123");
  assert.strictEqual(results.projects.length, 0, "Should have no matching projects");
  assert.strictEqual(results.urls.length, 0, "Should have no matching URLs");
  assert.strictEqual(results.domains.length, 0, "Should have no matching domains");
});

// Test: search is case insensitive
test("search is case insensitive", () => {
  const upper = search(mockData, "OAUDREY");
  const lower = search(mockData, "oaudrey");
  assert.strictEqual(upper.projects.length, lower.projects.length, "Case insensitive search should return same results");
});

// Test: showSummary function is exported
test("showSummary function is exported", () => {
  const dashboard = require("../scripts/dashboard-cli.js");
  assert.strictEqual(typeof dashboard.showSummary, "function", "showSummary should be exported");
});

// Test: showProjects function is exported
test("showProjects function is exported", () => {
  const dashboard = require("../scripts/dashboard-cli.js");
  assert.strictEqual(typeof dashboard.showProjects, "function", "showProjects should be exported");
});

// Test: showURLs function is exported
test("showURLs function is exported", () => {
  const dashboard = require("../scripts/dashboard-cli.js");
  assert.strictEqual(typeof dashboard.showURLs, "function", "showURLs should be exported");
});

// Test: showDomains function is exported
test("showDomains function is exported", () => {
  const dashboard = require("../scripts/dashboard-cli.js");
  assert.strictEqual(typeof dashboard.showDomains, "function", "showDomains should be exported");
});

// Test: showSearch function is exported
test("showSearch function is exported", () => {
  const dashboard = require("../scripts/dashboard-cli.js");
  assert.strictEqual(typeof dashboard.showSearch, "function", "showSearch should be exported");
});

// Test: loadData function is exported
test("loadData function is exported", () => {
  const dashboard = require("../scripts/dashboard-cli.js");
  assert.strictEqual(typeof dashboard.loadData, "function", "loadData should be exported");
});

// Test: search returns correct structure
test("search returns correct structure with projects, urls, domains", () => {
  const results = search(mockData, "test");
  assert.ok(Array.isArray(results.projects), "results.projects should be an array");
  assert.ok(Array.isArray(results.urls), "results.urls should be an array");
  assert.ok(Array.isArray(results.domains), "results.domains should be an array");
});

// Test: search handles empty query gracefully
test("search handles empty query gracefully", () => {
  const results = search(mockData, "");
  // Empty query should search for empty string
  assert.ok(results);
  assert.ok(Array.isArray(results.projects));
  assert.ok(Array.isArray(results.urls));
  assert.ok(Array.isArray(results.domains));
});

console.log(`\nTest Summary: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);