#!/usr/bin/env node
// ============================================================
// SCHEMA RICH RESULTS CHECKER
// ============================================================
// Validates JSON-LD structured data markup against schema.org
// rules and Google Rich Results eligibility requirements.
//
// Supports multiple validation contexts:
//   - Google Rich Results Test (rich snippet eligibility)
//   - Schema.org Markup Validator (general spec compliance)
//   - Bing Structured Data (BingBot requirements)
//   - Merkle Schema Tester (technical SEO patterns)
//
// Exports pure functions so the module can be unit-tested and
// called from GitHub Actions via actions/github-script.
//
//   const { parseJsonLd, validateSchema, checkRichResults,
//           runChecks, generateReport } = require('./scripts/schema-rich-results-checker.js');
//
// Input  (runChecks): HTML string or array of parsed JSON-LD objects
// Output (runChecks): {
//   summary: { total, passed, warnings, errors },
//   results: [{ type, tool, pass, level, findings: [{property, message}] }],
// }
// ============================================================

'use strict';

// ─── Required properties per @type ───────────────────────────
// Source: https://schema.org/ and Google Search Central docs.
// "required" = error if missing; "recommended" = warning if missing.
const SCHEMA_RULES = {
  Organization: {
    required:    ['name', 'url'],
    recommended: ['logo', 'contactPoint', 'sameAs', 'foundingDate'],
  },
  Person: {
    required:    ['name'],
    recommended: ['url', 'sameAs', 'jobTitle', 'worksFor', 'image'],
  },
  Article: {
    required:    ['headline', 'author', 'datePublished', 'image'],
    recommended: ['dateModified', 'publisher', 'description', 'url'],
  },
  NewsArticle: {
    required:    ['headline', 'author', 'datePublished', 'image'],
    recommended: ['dateModified', 'publisher', 'description'],
  },
  BlogPosting: {
    required:    ['headline', 'author', 'datePublished', 'image'],
    recommended: ['dateModified', 'publisher', 'description'],
  },
  Product: {
    required:    ['name', 'image', 'description'],
    recommended: ['offers', 'aggregateRating', 'brand', 'sku'],
  },
  FAQPage: {
    required:    ['mainEntity'],
    recommended: [],
  },
  HowTo: {
    required:    ['name', 'step'],
    recommended: ['description', 'image', 'totalTime', 'estimatedCost'],
  },
  Recipe: {
    required:    ['name', 'image', 'author', 'datePublished', 'description',
                  'prepTime', 'cookTime', 'totalTime', 'recipeYield',
                  'recipeIngredient', 'recipeInstructions'],
    recommended: ['aggregateRating', 'video', 'nutrition'],
  },
  Event: {
    required:    ['name', 'startDate', 'location'],
    recommended: ['endDate', 'description', 'url', 'organizer', 'offers'],
  },
  JobPosting: {
    required:    ['title', 'description', 'datePosted', 'hiringOrganization',
                  'jobLocation'],
    recommended: ['validThrough', 'employmentType', 'baseSalary'],
  },
  Course: {
    required:    ['name', 'description', 'provider'],
    recommended: ['hasCourseInstance', 'url', 'image'],
  },
  BreadcrumbList: {
    required:    ['itemListElement'],
    recommended: [],
  },
  WebApplication: {
    required:    ['name', 'url', 'applicationCategory'],
    recommended: ['description', 'operatingSystem', 'offers', 'provider'],
  },
  WebPage: {
    required:    ['name', 'url'],
    recommended: ['description', 'breadcrumb'],
  },
  AboutPage: {
    required:    ['name'],
    recommended: ['url', 'description', 'author'],
  },
  LocalBusiness: {
    required:    ['name', 'address'],
    recommended: ['telephone', 'url', 'openingHours', 'geo', 'image'],
  },
  VideoObject: {
    required:    ['name', 'description', 'thumbnailUrl', 'uploadDate'],
    recommended: ['duration', 'contentUrl', 'embedUrl', 'publisher'],
  },
  Review: {
    required:    ['itemReviewed', 'reviewRating', 'author'],
    recommended: ['datePublished', 'publisher'],
  },
  AggregateRating: {
    required:    ['itemReviewed', 'ratingValue', 'reviewCount'],
    recommended: ['bestRating', 'worstRating'],
  },
  SiteLinksSearchBox: {
    required:    ['url', 'potentialAction'],
    recommended: [],
  },
  // ── Additional Google Rich Results types ─────────────────────
  // Minimal rules for types that are eligible for Google Rich Results
  // but have no detailed Revvel validation rules yet.
  CourseList: {
    required:    ['name', 'hasPart'],
    recommended: ['description', 'url'],
  },
  Dataset: {
    required:    ['name', 'description'],
    recommended: ['url', 'sameAs', 'keywords', 'license', 'creator'],
  },
  EmployerAggregateRating: {
    required:    ['itemReviewed', 'ratingValue', 'ratingCount'],
    recommended: ['bestRating', 'worstRating'],
  },
  EstimatedSalary: {
    required:    ['name', 'estimatedSalary'],
    recommended: ['sameAs'],
  },
  ImageObject: {
    required:    ['contentUrl'],
    recommended: ['name', 'description', 'author', 'license'],
  },
  LearningResource: {
    required:    ['name', 'description'],
    recommended: ['url', 'provider', 'teaches', 'educationalLevel'],
  },
  Movie: {
    required:    ['name'],
    recommended: ['image', 'description', 'dateCreated', 'director'],
  },
  ProductGroup: {
    required:    ['name', 'hasVariant'],
    recommended: ['description', 'url', 'image'],
  },
  ProfilePage: {
    required:    ['name'],
    recommended: ['url', 'description', 'image', 'mainEntity'],
  },
  QAPage: {
    required:    ['mainEntity'],
    recommended: [],
  },
  SoftwareApplication: {
    required:    ['name', 'operatingSystem', 'applicationCategory'],
    recommended: ['url', 'description', 'offers', 'aggregateRating'],
  },
  SpecialAnnouncement: {
    required:    ['name', 'text', 'datePosted', 'category'],
    recommended: ['expires', 'url', 'announcementLocation'],
  },
};

// ─── Google Rich Results eligible @types ─────────────────────
// Source: https://developers.google.com/search/docs/appearance/structured-data/search-gallery
const GOOGLE_RICH_RESULT_TYPES = new Set([
  'Article', 'NewsArticle', 'BlogPosting',
  'BreadcrumbList', 'Course', 'CourseList',
  'Dataset', 'EmployerAggregateRating',
  'EstimatedSalary', 'Event', 'FAQPage',
  'HowTo', 'ImageObject', 'JobPosting',
  'LearningResource', 'LocalBusiness',
  'Movie', 'Organization', 'Person',
  'Product', 'ProductGroup', 'ProfilePage',
  'QAPage', 'Recipe', 'Review',
  'SiteLinksSearchBox', 'SoftwareApplication',
  'SpecialAnnouncement', 'VideoObject',
  'WebApplication',
]);

// ─── JSON-LD parser ───────────────────────────────────────────
/**
 * Extract all JSON-LD blocks from an HTML string.
 * Returns an array of parsed JSON-LD nodes. For blocks with invalid
 * JSON, a synthetic sentinel object with `_parseError: true` and a
 * truncated `_raw` snippet is included in the array instead of
 * silently skipping the block, so callers can surface parse errors.
 * @param {string} html
 * @returns {Array<object|{_parseError:true,_raw:string}>}
 */
function parseJsonLd(html) {
  if (!html || typeof html !== 'string') return [];

  const blocks = [];
  // The first [^>]* allows `type` to appear anywhere in the opening tag
  // (e.g., <script async type="...">). The second [^>]* tolerates any
  // remaining attributes after the type declaration (e.g., id="schema1").
  const re = /<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const raw = m[1].trim();
    try {
      const parsed = JSON.parse(raw);
      // Handle both single objects and @graph arrays
      if (Array.isArray(parsed)) {
        blocks.push(...parsed);
      } else if (parsed['@graph'] && Array.isArray(parsed['@graph'])) {
        const parentContext = parsed['@context'];
        for (const node of parsed['@graph']) {
          if (node && typeof node === 'object' && !Array.isArray(node)) {
            if (parentContext && !node['@context']) {
              node['@context'] = parentContext;
            }
            blocks.push(node);
          }
        }
      } else {
        blocks.push(parsed);
      }
    } catch (_) {
      // Invalid JSON — record a synthetic error object
      blocks.push({ _parseError: true, _raw: raw.slice(0, 200) });
    }
  }
  return blocks;
}

// ─── Schema validator ─────────────────────────────────────────
/**
 * Validate a single parsed JSON-LD object against schema.org rules.
 * @param {object} obj  — parsed JSON-LD node
 * @returns {{
 *   type: string,
 *   pass: boolean,
 *   errors:   Array<{property:string, message:string}>,
 *   warnings: Array<{property:string, message:string}>,
 * }}
 */
function validateSchema(obj) {
  if (!obj || typeof obj !== 'object') {
    return { type: 'unknown', pass: false,
      errors: [{ property: '@type', message: 'Not a valid JSON-LD object' }],
      warnings: [] };
  }

  if (obj._parseError) {
    const safeRaw = String(obj._raw || '').replace(/[`\n\r|[\]]/g, ' ').trim();
    return { type: 'unknown', pass: false,
      errors: [{ property: 'json', message: `JSON parse error near: ${safeRaw}` }],
      warnings: [] };
  }

  const errors   = [];
  const warnings = [];

  // Must have @context
  if (!obj['@context']) {
    errors.push({ property: '@context', message: '@context is missing (should be "https://schema.org")' });
  } else {
    const ctx = obj['@context'];
    const ctxStr = typeof ctx === 'string' ? ctx : JSON.stringify(ctx);
    // Match schema.org as a proper domain (not a subdomain of schema.org.evil.com etc.)
    if (!/(?:^|[./])schema\.org(?:[/"#]|$)/.test(ctxStr)) {
      warnings.push({ property: '@context', message: `@context "${ctxStr}" does not reference schema.org` });
    }
  }

  // Must have @type
  const types = obj['@type']
    ? (Array.isArray(obj['@type']) ? obj['@type'] : [obj['@type']])
    : [];

  if (types.length === 0) {
    errors.push({ property: '@type', message: '@type is missing' });
    return { type: 'unknown', pass: false, errors, warnings };
  }

  const primaryType = types[0];

  // Check required and recommended properties for the primary type
  const rules = Object.hasOwn(SCHEMA_RULES, primaryType) ? SCHEMA_RULES[primaryType] : undefined;
  if (rules) {
    for (const prop of rules.required) {
      if (obj[prop] === undefined || obj[prop] === null || obj[prop] === '') {
        errors.push({ property: prop, message: `Required property "${prop}" is missing for @type "${primaryType}"` });
      }
    }
    for (const prop of rules.recommended) {
      if (obj[prop] === undefined || obj[prop] === null || obj[prop] === '') {
        warnings.push({ property: prop, message: `Recommended property "${prop}" is missing for @type "${primaryType}" — add to improve rich result eligibility` });
      }
    }
  } else {
    warnings.push({ property: '@type', message: `@type "${primaryType}" is not in the Revvel known-types list — manual review recommended` });
  }

  // Validate specific property shapes
  const shapeErrors = _validatePropertyShapes(primaryType, obj);
  errors.push(...shapeErrors.errors);
  warnings.push(...shapeErrors.warnings);

  return {
    type: primaryType,
    pass: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Deep-validate well-known property shapes for common types.
 * @private
 */
function _validatePropertyShapes(type, obj) {
  const errors   = [];
  const warnings = [];

  // Article / NewsArticle / BlogPosting: author must be Person or Organization node
  if (['Article', 'NewsArticle', 'BlogPosting'].includes(type) && obj.author) {
    const authors = Array.isArray(obj.author) ? obj.author : [obj.author];
    for (const a of authors) {
      if (a && typeof a === 'object' && a['@type'] && !['Person', 'Organization'].includes(a['@type'])) {
        warnings.push({ property: 'author', message: `author @type should be "Person" or "Organization", got "${a['@type']}"` });
      }
    }
  }

  // Article / BlogPosting: headline max 110 chars (Google limit)
  if (['Article', 'NewsArticle', 'BlogPosting'].includes(type) && obj.headline && typeof obj.headline === 'string' && obj.headline.length > 110) {
    errors.push({ property: 'headline', message: `headline exceeds 110 characters (${obj.headline.length}) — Google will truncate or reject` });
  }

  // FAQPage: mainEntity items must be Question with acceptedAnswer
  if (type === 'FAQPage' && obj.mainEntity) {
    const items = Array.isArray(obj.mainEntity) ? obj.mainEntity : [obj.mainEntity];
    for (let i = 0; i < items.length; i++) {
      const q = items[i];
      if (!q || q['@type'] !== 'Question') {
        errors.push({ property: `mainEntity[${i}]`, message: `mainEntity items must have @type "Question"` });
      } else if (!q.acceptedAnswer || !q.acceptedAnswer.text) {
        errors.push({ property: `mainEntity[${i}].acceptedAnswer`, message: 'Question must have acceptedAnswer with text property' });
      }
    }
  }

  // BreadcrumbList: each ListItem needs position and name/item
  if (type === 'BreadcrumbList' && obj.itemListElement) {
    const items = Array.isArray(obj.itemListElement) ? obj.itemListElement : [obj.itemListElement];
    for (let i = 0; i < items.length; i++) {
      const li = items[i];
      if (!li || li['@type'] !== 'ListItem') {
        errors.push({ property: `itemListElement[${i}]`, message: 'BreadcrumbList items must have @type "ListItem"' });
      } else {
        if (!Number.isInteger(li.position) || li.position < 1) errors.push({ property: `itemListElement[${i}].position`, message: '"position" must be a positive integer (≥ 1) on each ListItem' });
        if (!li.name && !li.item) errors.push({ property: `itemListElement[${i}].name`, message: '"name" or "item" is required on each ListItem' });
      }
    }
  }

  // Product: offers must have price or priceRange
  if (type === 'Product' && obj.offers) {
    const offers = Array.isArray(obj.offers) ? obj.offers : [obj.offers];
    for (let i = 0; i < offers.length; i++) {
      const offer = offers[i];
      if (offer && offer['@type'] === 'Offer') {
        if (offer.price === undefined && offer.priceRange === undefined) {
          warnings.push({ property: `offers[${i}].price`, message: 'Offer should have "price" or "priceRange" for rich results' });
        }
        if (!offer.priceCurrency) {
          warnings.push({ property: `offers[${i}].priceCurrency`, message: 'Offer should have "priceCurrency" (e.g., "USD")' });
        }
      }
    }
  }

  return { errors, warnings };
}

// ─── Google Rich Results eligibility ─────────────────────────
/**
 * Check whether a JSON-LD object qualifies for Google Rich Results.
 * @param {object} obj  — parsed and validated JSON-LD node
 * @param {ReturnType<validateSchema>} [precomputedValidation] — optional pre-computed result from validateSchema
 * @returns {{ eligible: boolean, type: string, reason: string }}
 */
function checkRichResults(obj, precomputedValidation) {
  if (!obj || obj._parseError) {
    return { eligible: false, type: 'unknown', reason: 'Invalid JSON-LD — cannot determine eligibility' };
  }

  const types = obj['@type']
    ? (Array.isArray(obj['@type']) ? obj['@type'] : [obj['@type']])
    : [];

  if (types.length === 0) {
    return { eligible: false, type: 'unknown', reason: 'Missing @type — required for rich result eligibility' };
  }

  const primaryType = types[0];

  if (GOOGLE_RICH_RESULT_TYPES.has(primaryType)) {
    const validation = precomputedValidation || validateSchema(obj);
    if (validation.errors.length > 0) {
      return {
        eligible: false,
        type: primaryType,
        reason: `Has required-property errors — fix ${validation.errors.map(e => `"${e.property}"`).join(', ')} first`,
      };
    }
    // Guard: if no SCHEMA_RULES entry exists for this type, we cannot
    // reliably confirm eligibility — report as unknown rather than
    // a potentially misleading true.
    if (!Object.hasOwn(SCHEMA_RULES, primaryType)) {
      return {
        eligible: false,
        type: primaryType,
        reason: `@type "${primaryType}" is in the Google Rich Results list but has no Revvel validation rules — validate manually at https://search.google.com/test/rich-results`,
      };
    }
    return {
      eligible: true,
      type: primaryType,
      reason: `@type "${primaryType}" is eligible for Google Rich Results`,
    };
  }

  return {
    eligible: false,
    type: primaryType,
    reason: `@type "${primaryType}" is not in the Google Rich Results supported types list`,
  };
}

// ─── Multi-tool checker ───────────────────────────────────────
/**
 * Run all checks against HTML content or an array of JSON-LD objects.
 * @param {string|Array<object>} input  — raw HTML string OR pre-parsed array
 * @returns {{
 *   summary: { total: number, passed: number, warnings: number, errors: number },
 *   results: Array<{
 *     index: number, type: string,
 *     schemaOrg: ReturnType<validateSchema>,
 *     googleRichResults: ReturnType<checkRichResults>,
 *   }>,
 *   toolLinks: object,
 * }}
 */
function runChecks(input) {
  const nodes = Array.isArray(input) ? input : parseJsonLd(input);

  let totalErrors   = 0;
  let totalWarnings = 0;
  let totalPassed   = 0;

  const results = nodes.map((node, i) => {
    const schemaOrg       = validateSchema(node);
    const googleRich      = checkRichResults(node, schemaOrg);

    if (schemaOrg.pass) {
      totalPassed++;
    } else {
      totalErrors += schemaOrg.errors.length;
    }
    totalWarnings += schemaOrg.warnings.length;

    return {
      index:            i,
      type:             schemaOrg.type,
      schemaOrg,
      googleRichResults: googleRich,
    };
  });

  return {
    summary: {
      total:    nodes.length,
      passed:   totalPassed,
      warnings: totalWarnings,
      errors:   totalErrors,
    },
    results,
    toolLinks: TOOL_LINKS,
  };
}

// ─── Validation tool reference links ─────────────────────────
const TOOL_LINKS = {
  googleRichResults: {
    name: 'Google Rich Results Test',
    url:  'https://search.google.com/test/rich-results',
    description: 'Verify eligibility for rich snippets in Google Search',
  },
  schemaOrgValidator: {
    name: 'Schema Markup Validator',
    url:  'https://validator.schema.org/',
    description: 'Official schema.org validator for JSON-LD, Microdata, and RDFa',
  },
  bingWebmaster: {
    name: 'Bing Webmaster Tools — Structured Data',
    url:  'https://www.bing.com/webmasters/markup-validator',
    description: 'Structured data analysis for Bing search results',
  },
  merkleTester: {
    name: 'Merkle Schema Markup Tester',
    url:  'https://technicalseo.com/tools/schema-markup-generator/',
    description: 'Popular free tool for validating code snippets (favored by technical SEOs)',
  },
  seoSiteCheckup: {
    name: 'SEO Site Checkup — Structured Data',
    url:  'https://seositecheckup.com/tools/structured-data-test',
    description: 'Audit structured data and compare against competitors',
  },
};

// ─── Markdown report generator ────────────────────────────────
/**
 * Render a human-readable Markdown report from runChecks() output.
 * @param {ReturnType<runChecks>} checkResult
 * @returns {string}
 */
function generateReport(checkResult) {
  const { summary, results, toolLinks } = checkResult;
  const lines = [];

  lines.push('# Schema Rich Results Check Report');
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`| Metric | Value |`);
  lines.push(`|--------|-------|`);
  lines.push(`| Total schemas found | ${summary.total} |`);
  lines.push(`| Passed (no errors)  | ${summary.passed} |`);
  lines.push(`| Total errors        | ${summary.errors} |`);
  lines.push(`| Total warnings      | ${summary.warnings} |`);
  lines.push('');

  if (summary.total === 0) {
    lines.push('> ⚠️ No `<script type="application/ld+json">` blocks found on this page.');
    lines.push('');
  }

  for (const r of results) {
    lines.push(`---`);
    lines.push('');
    lines.push(`## Schema ${r.index + 1}: \`@type: ${r.type}\``);
    lines.push('');

    // Schema.org validation
    const s = r.schemaOrg;
    lines.push(`### Schema.org Validation — ${s.pass ? '✅ PASS' : '❌ FAIL'}`);
    if (s.errors.length > 0) {
      lines.push('');
      lines.push('**Errors (must fix):**');
      for (const e of s.errors) {
        lines.push(`- ❌ \`${e.property}\`: ${e.message}`);
      }
    }
    if (s.warnings.length > 0) {
      lines.push('');
      lines.push('**Warnings (recommended):**');
      for (const w of s.warnings) {
        lines.push(`- ⚠️  \`${w.property}\`: ${w.message}`);
      }
    }
    lines.push('');

    // Google Rich Results
    const g = r.googleRichResults;
    lines.push(`### Google Rich Results — ${g.eligible ? '✅ ELIGIBLE' : '⚠️  NOT ELIGIBLE'}`);
    lines.push('');
    lines.push(`${g.reason}`);
    lines.push('');
  }

  // Tool links
  lines.push('---');
  lines.push('');
  lines.push('## Validation Tools');
  lines.push('');
  for (const tool of Object.values(toolLinks)) {
    lines.push(`- **[${tool.name}](${tool.url})** — ${tool.description}`);
  }
  lines.push('');

  return lines.join('\n');
}

// ─── Checkbox line helper (matches pr-review-scan.js style) ───
/**
 * Render a Markdown checkbox line for a single schema node result.
 * @param {object} result  — one element from runChecks().results
 * @returns {string}
 */
function renderSchemaCheckboxLine(result) {
  const { type, schemaOrg, googleRichResults } = result;
  const label = `@type:${type}`;
  if (schemaOrg.pass && googleRichResults.eligible) {
    return `- [x] ${label} — schema.org ✅ | Google Rich Results ✅`;
  }
  const parts = [`- [ ] ⚠️ ${label}`];
  if (!schemaOrg.pass) {
    const shown = schemaOrg.errors.slice(0, 3)
      .map(e => `  - \`${e.property}\`: ${e.message}`);
    parts.push(...shown);
    if (schemaOrg.errors.length > 3) {
      parts.push(`  - …and ${schemaOrg.errors.length - 3} more errors`);
    }
  }
  if (!googleRichResults.eligible) {
    parts.push(`  - Google Rich Results: ${googleRichResults.reason}`);
  }
  return parts.join('\n');
}

module.exports = {
  parseJsonLd,
  validateSchema,
  checkRichResults,
  runChecks,
  generateReport,
  renderSchemaCheckboxLine,
  // exported for tests
  _constants: {
    SCHEMA_RULES,
    GOOGLE_RICH_RESULT_TYPES,
    TOOL_LINKS,
  },
};
