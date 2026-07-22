# Schema Rich Results Skill

Validate JSON-LD structured data markup against schema.org rules and Google Rich Results eligibility requirements. Supports multiple validation tool contexts: Google Rich Results Test, Schema Markup Validator, Bing Structured Data, and Merkle Schema Tester.

## When to Load This Skill

Load this skill when:
- Adding or updating JSON-LD structured data to any page
- Auditing schema markup on existing sites
- Debugging why a page is not showing rich snippets in Google Search
- Building automated schema validation into CI/CD pipelines
- Implementing schema.org types: Article, Product, FAQPage, BreadcrumbList, Organization, etc.

---

## Prime Directive

**Validate structured data before it ships.** Schema errors prevent Google from generating rich results and degrade search visibility. Every page with JSON-LD must pass `runChecks()` with zero errors before merge.

---

## The Five Validation Tools

| Tool | Best For | URL |
|------|----------|-----|
| **Google Rich Results Test** | Verify rich snippet eligibility (FAQ, Product, Article, Recipe, etc.) | <https://search.google.com/test/rich-results> |
| **Schema Markup Validator** | Official schema.org spec compliance for JSON-LD, Microdata, RDFa | <https://validator.schema.org/> |
| **Bing Webmaster — Structured Data** | Bing-specific structured data analysis | <https://www.bing.com/webmasters/markup-validator> |
| **Merkle Schema Markup Tester** | Technical SEO validation of code snippets | <https://technicalseo.com/tools/schema-markup-generator/> |
| **SEO Site Checkup** | Audit and competitor comparison | <https://seositecheckup.com/tools/structured-data-test> |

---

## Using the Checker (CI / Scripts)

```js
const {
  parseJsonLd,       // Extract JSON-LD blocks from HTML
  validateSchema,    // Validate a single parsed node
  checkRichResults,  // Check Google Rich Results eligibility
  runChecks,         // Full pipeline — HTML or pre-parsed array
  generateReport,    // Markdown report from runChecks() output
  renderSchemaCheckboxLine,  // PR checklist line
} = require('./scripts/schema-rich-results-checker.js');

// From raw HTML:
const result = runChecks(htmlString);
console.log(generateReport(result));

// From pre-parsed array:
const nodes = parseJsonLd(htmlString);
const result = runChecks(nodes);
```

---

## Required Properties Per @type

### Organization (every page)
```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "[Company Name]",
  "url": "https://[domain]",
  "logo": "https://[domain]/logo.png",
  "sameAs": ["https://linkedin.com/...", "https://github.com/..."]
}
```
- **Required:** `name`, `url`
- **Recommended:** `logo`, `contactPoint`, `sameAs`, `foundingDate`

### Article / BlogPosting
```json
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "[Max 110 chars]",
  "author": { "@type": "Person", "name": "[Author]" },
  "datePublished": "YYYY-MM-DD",
  "image": "https://[domain]/image.jpg"
}
```
- **Required:** `headline` (≤110 chars), `author`, `datePublished`, `image`
- **Recommended:** `dateModified`, `publisher`, `description`, `url`

### Product
```json
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "[Product Name]",
  "image": "https://[domain]/product.jpg",
  "description": "[Description]",
  "offers": {
    "@type": "Offer",
    "price": "9.99",
    "priceCurrency": "USD"
  }
}
```
- **Required:** `name`, `image`, `description`
- **Recommended:** `offers` (with `price` + `priceCurrency`), `aggregateRating`, `brand`

### FAQPage
```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "What is ...?",
      "acceptedAnswer": { "@type": "Answer", "text": "..." }
    }
  ]
}
```
- **Required:** `mainEntity` (array of `Question` nodes with `acceptedAnswer.text`)

### BreadcrumbList
```json
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://[domain]/" },
    { "@type": "ListItem", "position": 2, "name": "Blog", "item": "https://[domain]/blog" }
  ]
}
```
- **Required:** `itemListElement` (array of `ListItem` with `position` + `name`/`item`)

### WebApplication
```json
{
  "@context": "https://schema.org",
  "@type": "WebApplication",
  "name": "[App Name]",
  "url": "https://[domain]",
  "applicationCategory": "FinanceApplication",
  "provider": { "@type": "Organization", "name": "Freedom Angel Corp" }
}
```
- **Required:** `name`, `url`, `applicationCategory`
- **Recommended:** `description`, `operatingSystem`, `offers`, `provider`

---

## Google Rich Results Eligible Types

The following `@type` values qualify for Google rich snippet treatment (when required properties are present):

`Article` · `BlogPosting` · `BreadcrumbList` · `Course` · `Dataset` · `Event` · `FAQPage` · `HowTo` · `JobPosting` · `LocalBusiness` · `NewsArticle` · `Organization` · `Person` · `Product` · `Recipe` · `Review` · `SiteLinksSearchBox` · `SoftwareApplication` · `VideoObject` · `WebApplication`

---

## Common Errors and Fixes

| Error | Fix |
|-------|-----|
| `@context is missing` | Add `"@context": "https://schema.org"` |
| `@type is missing` | Add the appropriate `"@type"` |
| `Required property "url" is missing for Organization` | Add `"url": "https://yourdomain.com"` |
| `headline exceeds 110 characters` | Shorten the `headline` value |
| `mainEntity items must have @type "Question"` | Wrap FAQ entries in `{ "@type": "Question", ... }` |
| `"position" is required on each ListItem` | Add `"position": 1` (integer) to each BreadcrumbList item |
| `Offer should have "price" or "priceRange"` | Add `"price": "X.XX"` to the `Offer` node |

---

## Integration with PR Review

In `.github/workflows/ready-for-review.yml`, call `runChecks()` from `actions/github-script` against any HTML files changed in the PR. Surface failures as checkbox lines using `renderSchemaCheckboxLine()`.

---

## Revvel Page Type → Required Schema Map

| Page Type | Required JSON-LD |
|-----------|-----------------|
| Home | `Organization` + `WebApplication` |
| Blog post | `Article` + `BreadcrumbList` |
| Product page | `Product` + `BreadcrumbList` |
| About | `AboutPage` + `Person`/`Organization` |
| FAQ page | `FAQPage` |
| Landing page | `WebPage` |

Every page must also carry the global `Organization` schema (see `seo-metadata` skill).
