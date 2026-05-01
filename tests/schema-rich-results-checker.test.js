#!/usr/bin/env node
'use strict';

// ============================================================
// SCHEMA RICH RESULTS CHECKER — End-to-End Test Harness
// ============================================================
// Tests parseJsonLd, validateSchema, checkRichResults, runChecks,
// generateReport, and renderSchemaCheckboxLine against a wide
// range of valid, invalid, and edge-case structured data inputs.
// ============================================================

const assert = require('assert');
const {
  parseJsonLd,
  validateSchema,
  checkRichResults,
  runChecks,
  generateReport,
  renderSchemaCheckboxLine,
  _constants: { SCHEMA_RULES, GOOGLE_RICH_RESULT_TYPES, TOOL_LINKS },
} = require('../scripts/schema-rich-results-checker.js');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`PASS: ${name}`);
    passed++;
  } catch (e) {
    console.log(`FAIL: ${name}\n    ${e.message}`);
    failed++;
  }
}

// ── Fixtures ──────────────────────────────────────────────────

const VALID_ORGANIZATION = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Freedom Angel Corp',
  url: 'https://freedomangelcorps.com',
};

const VALID_ARTICLE = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'How to Build a Schema Checker',
  author: { '@type': 'Person', name: 'Audrey Evans' },
  datePublished: '2026-04-30',
  image: 'https://example.com/img.jpg',
};

const VALID_FAQPAGE = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'What is Schema.org?',
      acceptedAnswer: { '@type': 'Answer', text: 'A shared vocabulary for structured data.' },
    },
  ],
};

const VALID_BREADCRUMB = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://example.com/' },
    { '@type': 'ListItem', position: 2, name: 'Blog', item: 'https://example.com/blog' },
  ],
};

const VALID_PRODUCT = {
  '@context': 'https://schema.org',
  '@type': 'Product',
  name: 'Revvel Pro',
  image: 'https://example.com/product.jpg',
  description: 'The best standards tool',
  offers: { '@type': 'Offer', price: '9.99', priceCurrency: 'USD' },
};

// ── parseJsonLd ───────────────────────────────────────────────

test('parseJsonLd returns empty array for null/undefined/empty', () => {
  assert.deepStrictEqual(parseJsonLd(null), []);
  assert.deepStrictEqual(parseJsonLd(undefined), []);
  assert.deepStrictEqual(parseJsonLd(''), []);
});

test('parseJsonLd extracts a single JSON-LD block', () => {
  const html = `<html><head>
    <script type="application/ld+json">
      {"@context":"https://schema.org","@type":"Organization","name":"Acme","url":"https://acme.com"}
    </script>
  </head></html>`;
  const result = parseJsonLd(html);
  assert.strictEqual(result.length, 1);
  assert.strictEqual(result[0]['@type'], 'Organization');
});

test('parseJsonLd extracts multiple JSON-LD blocks', () => {
  const html = `
    <script type="application/ld+json">{"@context":"https://schema.org","@type":"Organization","name":"A","url":"https://a.com"}</script>
    <script type="application/ld+json">{"@context":"https://schema.org","@type":"Person","name":"B"}</script>
  `;
  const result = parseJsonLd(html);
  assert.strictEqual(result.length, 2);
  assert.strictEqual(result[0]['@type'], 'Organization');
  assert.strictEqual(result[1]['@type'], 'Person');
});

test('parseJsonLd handles @graph arrays', () => {
  const graph = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'Organization', name: 'A', url: 'https://a.com' },
      { '@type': 'Person', name: 'B' },
    ],
  };
  const html = `<script type="application/ld+json">${JSON.stringify(graph)}</script>`;
  const result = parseJsonLd(html);
  assert.strictEqual(result.length, 2);
  assert.strictEqual(result[0]['@context'], 'https://schema.org');
  assert.strictEqual(result[1]['@context'], 'https://schema.org');
});

test('parseJsonLd does not overwrite existing @context on @graph children', () => {
  const graph = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@context': 'https://custom.org', '@type': 'Organization', name: 'A', url: 'https://a.com' },
    ],
  };
  const html = `<script type="application/ld+json">${JSON.stringify(graph)}</script>`;
  const result = parseJsonLd(html);
  assert.strictEqual(result[0]['@context'], 'https://custom.org');
});

test('@graph nodes pass validation end-to-end via runChecks', () => {
  const graph = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'Organization', name: 'Acme', url: 'https://acme.com' },
      { '@type': 'Person', name: 'Jane' },
    ],
  };
  const html = `<script type="application/ld+json">${JSON.stringify(graph)}</script>`;
  const result = runChecks(html);
  assert.strictEqual(result.summary.total, 2);
  assert.strictEqual(result.summary.passed, 2);
  assert.strictEqual(result.summary.errors, 0);
});

test('parseJsonLd records _parseError for malformed JSON', () => {
  const html = `<script type="application/ld+json">{bad json</script>`;
  const result = parseJsonLd(html);
  assert.strictEqual(result.length, 1);
  assert.strictEqual(result[0]._parseError, true);
});

test('parseJsonLd is case-insensitive for type attribute', () => {
  const html = `<script TYPE="application/ld+json">{"@context":"https://schema.org","@type":"Organization","name":"X","url":"https://x.com"}</script>`;
  const result = parseJsonLd(html);
  assert.strictEqual(result.length, 1);
});

test('parseJsonLd handles JSON array at top level', () => {
  const html = `<script type="application/ld+json">
    [{"@context":"https://schema.org","@type":"Organization","name":"A","url":"https://a.com"},
     {"@context":"https://schema.org","@type":"Person","name":"B"}]
  </script>`;
  const result = parseJsonLd(html);
  assert.strictEqual(result.length, 2);
});

// ── validateSchema ────────────────────────────────────────────

test('validateSchema passes a valid Organization', () => {
  const result = validateSchema(VALID_ORGANIZATION);
  assert.strictEqual(result.pass, true);
  assert.strictEqual(result.errors.length, 0);
});

test('validateSchema passes a valid Article', () => {
  const result = validateSchema(VALID_ARTICLE);
  assert.strictEqual(result.pass, true);
  assert.strictEqual(result.type, 'Article');
});

test('validateSchema handles prototype property name as @type without crashing', () => {
  const obj = { '@context': 'https://schema.org', '@type': 'toString' };
  const result = validateSchema(obj);
  assert.strictEqual(result.type, 'toString');
  assert.ok(result.warnings.some(w => w.message.includes('not in the Revvel known-types list')));
});

test('validateSchema handles null elements in author array without crashing', () => {
  const obj = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: 'Test',
    author: [null, { '@type': 'Person', name: 'A' }],
    datePublished: '2026-01-01',
    image: 'https://example.com/img.jpg',
  };
  const result = validateSchema(obj);
  assert.strictEqual(result.pass, true);
});

test('validateSchema fails when @context is missing', () => {
  const obj = { '@type': 'Organization', name: 'X', url: 'https://x.com' };
  const result = validateSchema(obj);
  assert.strictEqual(result.pass, false);
  assert.ok(result.errors.some(e => e.property === '@context'));
});

test('validateSchema fails when @type is missing', () => {
  const obj = { '@context': 'https://schema.org', name: 'X' };
  const result = validateSchema(obj);
  assert.strictEqual(result.pass, false);
  assert.ok(result.errors.some(e => e.property === '@type'));
});

test('validateSchema reports error for missing required Organization.url', () => {
  const obj = { '@context': 'https://schema.org', '@type': 'Organization', name: 'Acme' };
  const result = validateSchema(obj);
  assert.strictEqual(result.pass, false);
  assert.ok(result.errors.some(e => e.property === 'url'));
});

test('validateSchema reports error for missing Article.headline', () => {
  const obj = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    author: { '@type': 'Person', name: 'A' },
    datePublished: '2026-01-01',
    image: 'https://img.com/img.jpg',
  };
  const result = validateSchema(obj);
  assert.strictEqual(result.pass, false);
  assert.ok(result.errors.some(e => e.property === 'headline'));
});

test('validateSchema warns on missing recommended Organization.logo', () => {
  const result = validateSchema(VALID_ORGANIZATION);
  assert.ok(result.warnings.some(w => w.property === 'logo'));
});

test('validateSchema errors on Article headline > 110 chars', () => {
  const obj = {
    ...VALID_ARTICLE,
    headline: 'A'.repeat(111),
  };
  const result = validateSchema(obj);
  assert.strictEqual(result.pass, false);
  assert.ok(result.errors.some(e => e.property === 'headline'));
});

test('validateSchema errors on FAQPage with non-Question mainEntity', () => {
  const obj = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [{ '@type': 'Article', name: 'wrong type' }],
  };
  const result = validateSchema(obj);
  assert.strictEqual(result.pass, false);
  assert.ok(result.errors.some(e => e.property.startsWith('mainEntity')));
});

test('validateSchema passes valid FAQPage', () => {
  const result = validateSchema(VALID_FAQPAGE);
  assert.strictEqual(result.pass, true);
});

test('validateSchema errors on BreadcrumbList ListItem missing position', () => {
  const obj = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [{ '@type': 'ListItem', name: 'Home' }], // position missing
  };
  const result = validateSchema(obj);
  assert.strictEqual(result.pass, false);
  assert.ok(result.errors.some(e => e.property.includes('position')));
});

test('validateSchema passes valid BreadcrumbList', () => {
  const result = validateSchema(VALID_BREADCRUMB);
  assert.strictEqual(result.pass, true);
});

test('validateSchema warns on Product Offer missing priceCurrency', () => {
  const obj = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: 'Thing',
    image: 'https://img.com/img.jpg',
    description: 'A thing',
    offers: { '@type': 'Offer', price: '5.00' },
  };
  const result = validateSchema(obj);
  assert.ok(result.warnings.some(w => w.property.includes('priceCurrency')));
});

test('validateSchema returns _parseError for malformed JSON-LD object', () => {
  const result = validateSchema({ _parseError: true, _raw: '{bad' });
  assert.strictEqual(result.pass, false);
  assert.ok(result.errors.some(e => e.property === 'json'));
});

test('validateSchema warns on unknown @type', () => {
  const obj = { '@context': 'https://schema.org', '@type': 'QuantumWidget', name: 'X' };
  const result = validateSchema(obj);
  assert.ok(result.warnings.some(w => w.property === '@type'));
});

test('validateSchema accepts @context as object with vocab', () => {
  const obj = {
    '@context': { '@vocab': 'https://schema.org/' },
    '@type': 'Organization',
    name: 'X',
    url: 'https://x.com',
  };
  const result = validateSchema(obj);
  assert.strictEqual(result.type, 'Organization');
});

// ── checkRichResults ──────────────────────────────────────────

test('checkRichResults marks valid Organization as eligible', () => {
  const result = checkRichResults(VALID_ORGANIZATION);
  assert.strictEqual(result.eligible, true);
  assert.strictEqual(result.type, 'Organization');
});

test('checkRichResults marks valid Article as eligible', () => {
  const result = checkRichResults(VALID_ARTICLE);
  assert.strictEqual(result.eligible, true);
});

test('checkRichResults marks invalid Article (missing headline) as not eligible', () => {
  const obj = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    author: { '@type': 'Person', name: 'A' },
    datePublished: '2026-01-01',
    image: 'https://img.com/img.jpg',
  };
  const result = checkRichResults(obj);
  assert.strictEqual(result.eligible, false);
});

test('checkRichResults marks unknown type as not eligible', () => {
  const obj = { '@context': 'https://schema.org', '@type': 'QuantumWidget', name: 'X' };
  const result = checkRichResults(obj);
  assert.strictEqual(result.eligible, false);
  assert.ok(result.reason.includes('not in the Google Rich Results'));
});

test('checkRichResults marks _parseError as not eligible', () => {
  const result = checkRichResults({ _parseError: true });
  assert.strictEqual(result.eligible, false);
});

test('checkRichResults marks missing @type as not eligible', () => {
  const obj = { '@context': 'https://schema.org', name: 'No type' };
  const result = checkRichResults(obj);
  assert.strictEqual(result.eligible, false);
  assert.ok(result.reason.includes('@type'));
});

test('checkRichResults marks valid Product as eligible', () => {
  const result = checkRichResults(VALID_PRODUCT);
  assert.strictEqual(result.eligible, true);
});

test('checkRichResults marks valid FAQPage as eligible', () => {
  const result = checkRichResults(VALID_FAQPAGE);
  assert.strictEqual(result.eligible, true);
});

test('checkRichResults marks valid BreadcrumbList as eligible', () => {
  const result = checkRichResults(VALID_BREADCRUMB);
  assert.strictEqual(result.eligible, true);
});

// ── runChecks ─────────────────────────────────────────────────

test('runChecks returns zero results for empty HTML', () => {
  const result = runChecks('<html></html>');
  assert.strictEqual(result.summary.total, 0);
  assert.strictEqual(result.summary.passed, 0);
  assert.strictEqual(result.summary.errors, 0);
});

test('runChecks accepts pre-parsed array', () => {
  const result = runChecks([VALID_ORGANIZATION]);
  assert.strictEqual(result.summary.total, 1);
  assert.strictEqual(result.summary.passed, 1);
});

test('runChecks processes multiple schemas from HTML', () => {
  const html = `
    <script type="application/ld+json">${JSON.stringify(VALID_ORGANIZATION)}</script>
    <script type="application/ld+json">${JSON.stringify(VALID_ARTICLE)}</script>
  `;
  const result = runChecks(html);
  assert.strictEqual(result.summary.total, 2);
  assert.strictEqual(result.summary.passed, 2);
});

test('runChecks counts errors from invalid schemas', () => {
  const badOrg = { '@context': 'https://schema.org', '@type': 'Organization', name: 'X' };
  const result = runChecks([badOrg]);
  assert.strictEqual(result.summary.total, 1);
  assert.strictEqual(result.summary.passed, 0);
  assert.ok(result.summary.errors > 0);
});

test('runChecks includes toolLinks in output', () => {
  const result = runChecks([]);
  assert.strictEqual(result.toolLinks.googleRichResults.url, 'https://search.google.com/test/rich-results');
  assert.strictEqual(result.toolLinks.schemaOrgValidator.url, 'https://validator.schema.org/');
});

test('runChecks handles null input gracefully', () => {
  const result = runChecks(null);
  assert.strictEqual(result.summary.total, 0);
});

test('runChecks end-to-end: Organization + FAQPage from HTML', () => {
  const html = `
    <html>
      <head>
        <script type="application/ld+json">${JSON.stringify(VALID_ORGANIZATION)}</script>
        <script type="application/ld+json">${JSON.stringify(VALID_FAQPAGE)}</script>
      </head>
    </html>
  `;
  const result = runChecks(html);
  assert.strictEqual(result.summary.total, 2);
  assert.strictEqual(result.summary.passed, 2);
  assert.ok(result.results[0].googleRichResults.eligible);
  assert.ok(result.results[1].googleRichResults.eligible);
});

// ── generateReport ────────────────────────────────────────────

test('generateReport includes summary table', () => {
  const checkResult = runChecks([VALID_ORGANIZATION]);
  const report = generateReport(checkResult);
  assert.ok(report.includes('# Schema Rich Results Check Report'));
  assert.ok(report.includes('## Summary'));
  assert.ok(report.includes('Total schemas found'));
});

test('generateReport includes tool links', () => {
  const checkResult = runChecks([]);
  const report = generateReport(checkResult);
  assert.ok(report.includes('Google Rich Results Test'));
  assert.ok(report.includes('Schema Markup Validator'));
  assert.ok(report.includes('Bing Webmaster'));
  assert.ok(report.includes('Merkle'));
});

test('generateReport shows PASS for valid schema', () => {
  const checkResult = runChecks([VALID_ORGANIZATION]);
  const report = generateReport(checkResult);
  assert.ok(report.includes('✅ PASS'));
  assert.ok(report.includes('✅ ELIGIBLE'));
});

test('generateReport shows FAIL for invalid schema', () => {
  const badOrg = { '@context': 'https://schema.org', '@type': 'Organization', name: 'X' };
  const checkResult = runChecks([badOrg]);
  const report = generateReport(checkResult);
  assert.ok(report.includes('❌ FAIL'));
  assert.ok(report.includes('⚠️  NOT ELIGIBLE'));
});

test('generateReport warns when no schemas found', () => {
  const checkResult = runChecks('<html></html>');
  const report = generateReport(checkResult);
  assert.ok(report.includes('No `<script type="application/ld+json">` blocks found'));
});

// ── renderSchemaCheckboxLine ──────────────────────────────────

test('renderSchemaCheckboxLine renders checked line for passing schema', () => {
  const checkResult = runChecks([VALID_ORGANIZATION]);
  const line = renderSchemaCheckboxLine(checkResult.results[0]);
  assert.ok(line.includes('[x]'));
  assert.ok(line.includes('@type:Organization'));
});

test('renderSchemaCheckboxLine renders unchecked line for failing schema', () => {
  const badOrg = { '@context': 'https://schema.org', '@type': 'Organization', name: 'X' };
  const checkResult = runChecks([badOrg]);
  const line = renderSchemaCheckboxLine(checkResult.results[0]);
  assert.ok(line.includes('[ ]'));
  assert.ok(line.includes('⚠️'));
});

// ── Constants ────────────────────────────────────────────────

test('SCHEMA_RULES covers all major SEO types', () => {
  const requiredTypes = ['Organization', 'Person', 'Article', 'Product', 'FAQPage', 'BreadcrumbList', 'WebApplication'];
  for (const t of requiredTypes) {
    assert.ok(SCHEMA_RULES[t], `SCHEMA_RULES missing @type "${t}"`);
  }
});

test('SCHEMA_RULES covers all Google Rich Result types — no eligibility gap', () => {
  for (const t of GOOGLE_RICH_RESULT_TYPES) {
    assert.ok(
      Object.hasOwn(SCHEMA_RULES, t),
      `SCHEMA_RULES missing @type "${t}" — checkRichResults would report it as ineligible without rules`,
    );
  }
});

test('validateSchema passes valid Dataset (newly added type)', () => {
  const obj = {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: 'Climate Data 2026',
    description: 'Monthly temperature records',
  };
  const result = validateSchema(obj);
  assert.strictEqual(result.pass, true);
  assert.strictEqual(result.type, 'Dataset');
});

test('validateSchema errors on Dataset missing required description', () => {
  const obj = {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: 'Climate Data 2026',
  };
  const result = validateSchema(obj);
  assert.strictEqual(result.pass, false);
  assert.ok(result.errors.some(e => e.property === 'description'));
});

test('checkRichResults marks valid Dataset as eligible', () => {
  const obj = {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: 'Climate Data 2026',
    description: 'Monthly temperature records',
  };
  const result = checkRichResults(obj);
  assert.strictEqual(result.eligible, true);
  assert.strictEqual(result.type, 'Dataset');
});

test('checkRichResults marks valid SoftwareApplication as eligible', () => {
  const obj = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Revvel CLI',
    operatingSystem: 'macOS',
    applicationCategory: 'DeveloperApplication',
  };
  const result = checkRichResults(obj);
  assert.strictEqual(result.eligible, true);
});

test('GOOGLE_RICH_RESULT_TYPES includes core types', () => {
  const coreTypes = ['Article', 'FAQPage', 'Product', 'BreadcrumbList', 'Organization', 'VideoObject', 'Event'];
  for (const t of coreTypes) {
    assert.ok(GOOGLE_RICH_RESULT_TYPES.has(t), `GOOGLE_RICH_RESULT_TYPES missing "${t}"`);
  }
});

test('TOOL_LINKS contains all five reference validators', () => {
  assert.ok(TOOL_LINKS.googleRichResults);
  assert.ok(TOOL_LINKS.schemaOrgValidator);
  assert.ok(TOOL_LINKS.bingWebmaster);
  assert.ok(TOOL_LINKS.merkleTester);
  assert.ok(TOOL_LINKS.seoSiteCheckup);
});

// ── Summary ───────────────────────────────────────────────────
console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
