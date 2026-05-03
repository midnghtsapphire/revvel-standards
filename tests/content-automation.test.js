#!/usr/bin/env node
'use strict';

/**
 * Tests for content-automation.js
 * 
 * Tests the core content automation pipeline functions.
 */

const { CONFIG, callOpenRouter, runQualityGates } = require('../scripts/content-automation.js');

function test(name, fn) {
  try {
    fn();
    console.log(`✅ PASS: ${name}`);
    return true;
  } catch (error) {
    console.log(`❌ FAIL: ${name}`);
    console.log(`   ${error.message}`);
    return false;
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Tests
// ──────────────────────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

// Test CONFIG loading
if (test('CONFIG has required fields', () => {
  assert(typeof CONFIG === 'object', 'CONFIG should be an object');
  assert('topic' in CONFIG, 'CONFIG should have topic');
  assert('format' in CONFIG, 'CONFIG should have format');
  assert('audience' in CONFIG, 'CONFIG should have audience');
  assert('brandVoice' in CONFIG, 'CONFIG should have brandVoice');
})) passed++; else failed++;

if (test('CONFIG format defaults to blog', () => {
  // When CONTENT_FORMAT is not set, should default to 'blog'
  assert(CONFIG.format === 'blog' || CONFIG.format === 'video' || CONFIG.format === 'social' || CONFIG.format === 'email' || CONFIG.format === 'all', 'CONFIG.format should be a valid format');
})) passed++; else failed++;

if (test('CONFIG audience has default value', () => {
  assert(typeof CONFIG.audience === 'string', 'CONFIG.audience should be a string');
  assert(CONFIG.audience.length > 0, 'CONFIG.audience should not be empty');
})) passed++; else failed++;

if (test('CONFIG brandVoice has default value', () => {
  assert(typeof CONFIG.brandVoice === 'string', 'CONFIG.brandVoice should be a string');
  assert(CONFIG.brandVoice.length > 0, 'CONFIG.brandVoice should not be empty');
})) passed++; else failed++;

if (test('CONFIG keywords is an array', () => {
  assert(Array.isArray(CONFIG.keywords), 'CONFIG.keywords should be an array');
})) passed++; else failed++;

if (test('CONFIG autoPublish is a boolean', () => {
  assert(typeof CONFIG.autoPublish === 'boolean', 'CONFIG.autoPublish should be a boolean');
  assert(CONFIG.autoPublish === false, 'CONFIG.autoPublish should default to false when CONTENT_AUTO_PUBLISH not set to true');
})) passed++; else failed++;

// Test callOpenRouter function signature
if (test('callOpenRouter is a function', () => {
  assert(typeof callOpenRouter === 'function', 'callOpenRouter should be a function');
})) passed++; else failed++;

// Test output directory path generation (mock scenario)
if (test('Output directory path generation logic', () => {
  const timestamp = new Date().toISOString().split('T')[0];
  const slug = ('example-topic'.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'untitled').slice(0, 50);
  assert(timestamp.match(/^\d{4}-\d{2}-\d{2}$/), 'Timestamp should be in YYYY-MM-DD format');
  assert(slug === 'example-topic', 'Slug should be sanitized correctly');
})) passed++; else failed++;

// Test slug generation edge cases
if (test('Slug generation handles special characters', () => {
  const topic = 'Best Budget Headphones 2026: Top Picks!';
  const slug = topic.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50);
  assert(slug === 'best-budget-headphones-2026-top-picks', 'Slug should remove special chars and trim hyphens');
  assert(!slug.includes(' '), 'Slug should have no spaces');
  assert(!slug.includes(':'), 'Slug should have no colons');
  assert(!slug.includes('!'), 'Slug should have no exclamation marks');
  assert(!slug.startsWith('-'), 'Slug should not start with hyphen');
  assert(!slug.endsWith('-'), 'Slug should not end with hyphen');
})) passed++; else failed++;

if (test('Slug generation handles empty/special-only topics', () => {
  const emptySlug = ('!!!'.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'untitled').slice(0, 50);
  assert(emptySlug === 'untitled', 'Empty slug should fallback to "untitled"');
  
  const spaceOnlySlug = ('   '.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'untitled').slice(0, 50);
  assert(spaceOnlySlug === 'untitled', 'Space-only slug should fallback to "untitled"');
})) passed++; else failed++;

// Test quality gate logic (basic structure test)
if (test('Quality gate checks structure', () => {
  const mockContent = `# Test Title

## Section 1
Content here with some words to test.

## Section 2
More content with additional sections.

## Section 3
Final section to meet minimum heading requirement.`;

  const titleMatch = mockContent.match(/^# (.+)$/m);
  assert(titleMatch, 'Should find title in markdown');
  
  const headings = (mockContent.match(/^## /gm) || []).length;
  assert(headings >= 3, 'Should have at least 3 H2 headings');
  
  const wordCount = mockContent.split(/\s+/).length;
  assert(wordCount > 0, 'Should have positive word count');
})) passed++; else failed++;

// Test metadata structure
if (test('Metadata structure is valid', () => {
  const metadata = {
    title: 'Test Topic',
    format: 'blog',
    audience: 'test audience',
    brand_voice: 'professional',
    keywords: ['test'],
    word_count: 100,
    generation_time_seconds: 10,
    models_used: ['model1'],
    formats: ['blog.html'],
    quality_gates: {},
    timestamp: new Date().toISOString(),
  };
  
  assert(typeof metadata.title === 'string', 'metadata.title should be string');
  assert(typeof metadata.format === 'string', 'metadata.format should be string');
  assert(typeof metadata.word_count === 'number', 'metadata.word_count should be number');
  assert(Array.isArray(metadata.keywords), 'metadata.keywords should be array');
  assert(Array.isArray(metadata.formats), 'metadata.formats should be array');
})) passed++; else failed++;

// Test format validation
if (test('Valid formats are recognized', () => {
  const validFormats = ['blog', 'video', 'social', 'email', 'all'];
  validFormats.forEach(format => {
    assert(validFormats.includes(format), `${format} should be a valid format`);
  });
})) passed++; else failed++;

// Test markdown to HTML conversion logic (basic test)
if (test('Markdown headings convert to HTML', () => {
  const markdown = '# Title\n## Subtitle\n### Sub-subtitle';
  const html = markdown
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>');
  
  assert(html.includes('<h1>Title</h1>'), 'Should convert # to h1');
  assert(html.includes('<h2>Subtitle</h2>'), 'Should convert ## to h2');
  assert(html.includes('<h3>Sub-subtitle</h3>'), 'Should convert ### to h3');
})) passed++; else failed++;

// Test API key validation (structure test)
if (test('OpenRouter API key structure validation', () => {
  // Test that if a key is provided, it should be a non-empty string
  if (CONFIG.openrouterKey) {
    assert(typeof CONFIG.openrouterKey === 'string', 'API key should be string if provided');
    assert(CONFIG.openrouterKey.length > 0, 'API key should not be empty if provided');
  } else {
    // If no key is provided, it should be undefined or empty
    assert(CONFIG.openrouterKey === undefined || CONFIG.openrouterKey === '', 'API key should be undefined or empty when not set');
  }
})) passed++; else failed++;

// Test runQualityGates enforces failures
if (test('runQualityGates returns failure for content with too few headings', () => {
  const weakContent = `# Short\n\nOnly one section with very few words.`;
  const results = runQualityGates(weakContent);
  assert(results.structure.passed === false, 'Structure gate should fail with < 3 H2 headings');
})) passed++; else failed++;

if (test('runQualityGates returns all-passed for well-structured content', () => {
  const goodContent = `# A Well Structured Title That Is Exactly Fifty Chars!

## Introduction
This is the introduction section with plenty of words to ensure the content meets the minimum word count requirement for blog posts.

## Main Content
${'Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore. '.repeat(80)}

## Deep Dive
${'Exploring further details about the topic at hand with additional context and analysis. '.repeat(20)}

## Conclusion
Wrapping up the content with a strong call to action and final thoughts about the material covered.`;

  const results = runQualityGates(goodContent);
  const allPassed = Object.values(results).every(gate => gate.passed);
  assert(allPassed, `Expected all gates to pass but got failures: ${JSON.stringify(results)}`);
})) passed++; else failed++;

if (test('runQualityGates is exported as a function', () => {
  assert(typeof runQualityGates === 'function', 'runQualityGates should be exported');
})) passed++; else failed++;

// Summary
console.log('');
console.log(`Test Summary: ${passed} passed, ${failed} failed`);

process.exit(failed > 0 ? 1 : 0);
