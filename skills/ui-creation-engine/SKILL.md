# Skill: UI Creation Engine

**Skill Name:** `ui-creation-engine`
**Version:** 1.0.0
**Date:** May 15, 2026
**Status:** Production
**Category:** Product Development
**LLM:** Claude Sonnet 4 (primary) / OpenRouter (multi-model routing)
**Type:** Persistent
**Persona:** 🎨 Pixel — Frontend / UI Specialist

---

## Purpose

This skill defines the **UI Creation Engine** — a comprehensive, autonomous system for creating cutting-edge website and mobile app interfaces that compete with top vendors in the USA. It combines competitive research, AI-powered design analysis, image optimization, SEO metadata generation, and OpenRouter swarm orchestration to ensure every digital product created meets the highest standards.

**Requirements Reference:** GitHub Issue — *"create engine for website ui creation using openrouter or open hands Orchestrator use swarms for research"*

---

## What This Skill Does

| Task | Description |
|---|---|
| **Competitive Research** | Analyze top 10+ competitors in target industry using swarm of Scout agents |
| **UI/UX Pattern Analysis** | Identify cutting-edge design patterns, features, and innovations |
| **Image Optimization** | Standardize images, add alt text, optimize for SEO, convert to WebP |
| **SEO Metadata Generation** | Generate comprehensive metadata that achieves Lighthouse scores 95+ |
| **Differentiation Strategy** | Identify unique value propositions and competitive advantages |
| **Autonomous Report Generation** | Create detailed analysis reports with actionable recommendations |
| **Full Scaffolding** | Generate complete front-to-back implementation including UI, API, and database |

---

## Trigger Keywords

This skill activates when these phrases appear:

```text
ui creation, website creation, app design, competitive analysis,
cutting edge design, top vendor analysis, seo research, 
image optimization, metadata generation, design research,
ui engine, create website, create app, modern ui, 
competitor research, market analysis, design standards
```

---

## Engine Architecture

### Three-Layer Orchestration Model

```text
┌─────────────────────────────────────────────────────┐
│             Layer 1: Research Swarm                 │
│  Scout-1: Industry Trends | Scout-2: Top Competitors│
│  Scout-3: SEO Leaders     | Scout-4: UX Patterns   │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│           Layer 2: Analysis & Synthesis             │
│  Sage: Competitive Analysis | Lumen: Insights      │
│  Pixel: UI/UX Recommendations                       │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│           Layer 3: Implementation                   │
│  Forge: Scaffolding | Axle: Backend | Pixel: UI    │
│  + Image Optimization + SEO Metadata Generation     │
└─────────────────────────────────────────────────────┘
```

---

## Research Protocol (Deep Market Analysis)

### Phase 1: Define & Decompose (5 minutes)

1. **Identify Industry**: What type of business/service is this?
2. **Define Market**: Geographic location, target audience
3. **Core Offering**: Primary products/services
4. **Decompose Research**: Break into parallel research tracks

### Phase 2: Competitive Research Swarm (15-20 minutes)

Spawn parallel Scout agents for:

```yaml
research_swarm:
  - Scout-1: "Find top 10 [industry] businesses in [location] and USA"
  - Scout-2: "Analyze websites: features, design, UX patterns, conversion elements"
  - Scout-3: "SEO analysis: metadata, keywords, schema, Lighthouse scores"
  - Scout-4: "Pricing models, service offerings, unique value props"
  - Scout-5: "Technology stack: frameworks, tools, integrations"
```

Each Scout returns:
- **Sources**: URLs, screenshots, data points
- **Findings**: Structured observations
- **Rankings**: Top performers and why

### Phase 3: Synthesis & Strategy (10 minutes)

Sage agent aggregates all Scout findings into:

1. **Competitive Landscape Report**
   - Top 10 competitors with scores (design, features, SEO)
   - Common patterns across top performers
   - Gaps and opportunities

2. **Differentiation Strategy**
   - What competitors are missing
   - Unique angles for this business
   - Features that would stand out

3. **Technical Recommendations**
   - Required features (baseline)
   - Competitive features (match leaders)
   - Breakthrough features (exceed leaders)

### Phase 4: UI Creation (30-60 minutes)

Pixel + Forge agents generate:

1. **UI Component Library**
   - Modern design system (colors, typography, spacing)
   - Reusable components matching industry leaders
   - Accessibility-first patterns

2. **Page Layouts**
   - Homepage with hero, features, testimonials, CTA
   - Service/product pages optimized for conversion
   - Contact/booking flows with minimal friction

3. **Image Assets**
   - Optimized hero images (1920×1080px WebP)
   - Social share images (1200×630px)
   - Product/service images (optimized sizes)
   - All with SEO-friendly filenames and alt text

4. **SEO Package**
   - Page metadata (title, description, keywords)
   - OpenGraph tags for social sharing
   - JSON-LD schemas (Organization, Product, Service, etc.)
   - robots.txt and sitemap.xml

---

## Image Optimization Pipeline

### Automated Image Processing

```javascript
// For every image in the UI:
1. Analyze subject/content
2. Generate descriptive SEO filename: 
   - Bad: IMG_1234.jpg
   - Good: st-louis-catering-fusion-bowl-hero.webp
3. Convert to WebP format (maintain quality)
4. Optimize for target size:
   - Hero: 1920×1080px, <300KB
   - OG: 1200×630px, <200KB
   - Product: 1080×1080px, <150KB
5. Generate alt text (5-15 words, descriptive)
6. Create responsive variants (1x, 2x, 3x)
```

### Image Naming Convention

```text
[business-name]-[image-subject]-[page-context]-[size-variant].webp

Examples:
- soul2bowl-bbq-fusion-bowl-hero-1920x1080.webp
- soul2bowl-chef-portrait-about-800x800.webp
- soul2bowl-catering-spread-services-og.webp
```

### Alt Text Generation Rules

```text
1. Describe what's IN the image (not what it's FOR)
2. Include business name for brand images
3. Include key details: colors, actions, mood
4. 5-15 words, max 125 characters
5. No "image of" or "picture of" prefix
6. Include relevant keywords naturally

Examples:
✅ "Soul2Bowl chef preparing BBQ fusion bowl in commercial kitchen"
✅ "Colorful catering spread with BBQ ribs, Asian noodles, and Southern sides"
✅ "Soul2Bowl logo on glassmorphic purple gradient background"
❌ "Image of food"
❌ "soul2bowl.jpg"
❌ "Catering food image for website"
```

---

## SEO Metadata Generation

### Automated Metadata Creation

For each page, generate:

```typescript
export const metadata: Metadata = {
  // Auto-generated from business profile + competitive research
  title: '[Business] — [Primary Value Prop] | [Location]', // Max 60 chars
  description: '[One compelling sentence with keywords]',    // 150-160 chars
  keywords: '[top-10-researched-keywords]',
  
  // Canonical URL (no duplicates)
  alternates: { 
    canonical: 'https://[domain].com/[path]' 
  },
  
  // OpenGraph for social sharing
  openGraph: {
    title: '[Business] — [Hook]',
    description: '[Compelling description]',
    url: 'https://[domain].com/[path]',
    siteName: '[Business Name]',
    images: [{
      url: 'https://[domain].com/[seo-optimized-filename].webp',
      width: 1200,
      height: 630,
      alt: '[Descriptive alt text with keywords]'
    }],
    locale: 'en_US',
    type: 'website',
  },
  
  // Twitter Cards
  twitter: {
    card: 'summary_large_image',
    title: '[Business] — [Hook]',
    description: '[150 char description]',
    images: {
      url: 'https://[domain].com/[og-image].webp',
      alt: '[Same as OG alt]'
    },
  },
};
```

### JSON-LD Schema Generation

```json
{
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "name": "[Business Name]",
  "description": "[Business description from research]",
  "url": "https://[domain].com",
  "telephone": "[Phone]",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "[Address]",
    "addressLocality": "[City]",
    "addressRegion": "[State]",
    "postalCode": "[ZIP]",
    "addressCountry": "US"
  },
  "geo": {
    "@type": "GeoCoordinates",
    "latitude": "[Lat]",
    "longitude": "[Lon]"
  },
  "openingHoursSpecification": [...],
  "servesCuisine": "[From competitive research]",
  "priceRange": "$$",
  "image": "[Hero image URL]",
  "sameAs": [
    "[Social media URLs]"
  ]
}
```

---

## Competitive Analysis Framework

### Scoring Rubric (0-100 points)

Each competitor is scored across:

| Category | Weight | Criteria |
|---|---|---|
| **Design Quality** | 25% | Modern, professional, cohesive brand |
| **Features** | 25% | Core features + differentiators |
| **SEO/Metadata** | 20% | Lighthouse score, meta tags, schema |
| **Performance** | 15% | Load time, Core Web Vitals |
| **Conversion UX** | 15% | CTA clarity, booking flow, trust signals |

### Output Format

```markdown
# Competitive Analysis: [Industry] — [Location]

## Top 10 Competitors

### 1. [Competitor Name] (Score: 92/100)
- **Website**: [URL]
- **Strengths**: Modern design, clear CTAs, fast load times
- **Features**: Online ordering, catering calculator, dietary filters
- **SEO Score**: 95/100 (Lighthouse)
- **Unique Angles**: Same-day delivery, corporate partnerships
- **Weaknesses**: Limited menu customization, no reviews

[Repeat for all 10...]

## Industry Patterns

- **Common Features**: Online ordering (100%), catering quotes (80%), dietary filters (70%)
- **Design Trends**: Glassmorphism, bold typography, full-width hero images
- **Conversion Elements**: "Order Now" CTAs, phone numbers in header, testimonials
- **Technology**: Next.js (60%), WordPress (30%), custom (10%)

## Gaps & Opportunities

1. **No competitor offers**: [Unique feature identified]
2. **Weak point in all**: [Common weakness to exploit]
3. **Underserved niche**: [Audience segment to target]

## Recommendations

### Baseline Features (Required)
- [ ] Online ordering system
- [ ] Mobile-responsive design
- [ ] Fast load times (<2s)
- [ ] Clear pricing/menu

### Competitive Features (Match Leaders)
- [ ] Dietary filters (vegan, GF, keto)
- [ ] Catering calculator
- [ ] Customer testimonials
- [ ] Social proof (orders/reviews)

### Breakthrough Features (Exceed Leaders)
- [ ] [Unique feature 1 based on gaps]
- [ ] [Unique feature 2 based on research]
- [ ] [Innovative UX pattern]
```

---

## Integration with OpenRouter

### Model Selection for Each Phase

```yaml
research_swarm:
  scouts: "anthropic/claude-sonnet-4"      # Fast, accurate research
  synthesizer: "anthropic/claude-opus-4"   # Deep reasoning for analysis

design_generation:
  ui_patterns: "anthropic/claude-sonnet-4" # Code + design quality
  copy: "openai/gpt-4.1"                   # Marketing copy

image_processing:
  alt_text: "anthropic/claude-haiku-4-5"   # Fast, cheap for batch processing
  seo_filenames: "anthropic/claude-haiku-4-5"

metadata_generation:
  seo: "anthropic/claude-sonnet-4"         # Structured output quality
```

### Cost Management

- **Budget per project**: $5-10 (typical)
- **Research phase**: ~$2-3 (4-5 agents × 2,000 tokens)
- **Design phase**: ~$2-4 (larger outputs)
- **Image/metadata**: ~$1-2 (batch processing)

---

## Usage Examples

### Example 1: New Catering Website

**Input:**
```bash
npm run ui-engine -- \
  --business="Soul2Bowl" \
  --industry="catering, meal prep" \
  --location="St. Louis, MO" \
  --services="catering, Sunday dinner, meal prep, individual meals"
```

**Output:**
1. Competitive analysis report (15 competitors analyzed)
2. UI component library (Next.js + Tailwind)
3. 5 page layouts (home, menu, order, about, contact)
4. 20+ optimized images with SEO filenames and alt text
5. Complete SEO metadata for all pages
6. JSON-LD schemas
7. Lighthouse SEO score: 98/100

### Example 2: Mobile App Design

**Input:**
```bash
npm run ui-engine -- \
  --business="FitTracker Pro" \
  --industry="fitness tracking" \
  --platform="mobile-app" \
  --competitors="MyFitnessPal,Lose It,Noom"
```

**Output:**
1. Competitive feature analysis (gaps identified)
2. UI/UX patterns for top fitness apps
3. Screen designs (onboarding, dashboard, tracking, social)
4. Design system (components, colors, typography)
5. Recommended features to exceed competitors
6. App Store metadata (title, description, keywords, screenshots)

---

## Quality Gates

Every UI creation must pass:

- [ ] **Competitive Research Complete**: At least 10 competitors analyzed with sources
- [ ] **Design Exceeds Baseline**: Matches or exceeds top 3 competitors in design quality
- [ ] **All Images Optimized**: WebP format, <200KB, descriptive filenames, alt text
- [ ] **SEO Metadata Complete**: All pages have title, description, OG tags, JSON-LD
- [ ] **Lighthouse Score**: SEO ≥ 95, Performance ≥ 90, Accessibility ≥ 90
- [ ] **Mobile Responsive**: All layouts tested on mobile, tablet, desktop
- [ ] **Differentiation Clear**: At least 3 unique features/angles vs competitors
- [ ] **Conversion Optimized**: Clear CTAs, minimal friction, trust signals

---

## Output Artifacts

### 1. Research Report
```text
research/
  competitive-analysis.md    # Top 10 competitors scored
  industry-patterns.md       # Common features, trends
  differentiation.md         # Unique angles, gaps
  recommendations.md         # Feature roadmap
```

### 2. UI Components
```text
src/
  components/
    Hero.tsx
    FeatureGrid.tsx
    TestimonialCarousel.tsx
    CTASection.tsx
    ContactForm.tsx
```

### 3. Page Layouts
```text
src/app/
  page.tsx              # Homepage
  menu/page.tsx         # Service/product listing
  order/page.tsx        # Booking/order flow
  about/page.tsx        # About/story
  contact/page.tsx      # Contact form
```

### 4. Optimized Images
```text
public/images/
  [business]-hero-1920x1080.webp
  [business]-hero-1920x1080@2x.webp
  [business]-og-1200x630.webp
  [business]-[feature]-[context].webp
```

### 5. SEO Package
```text
src/lib/
  metadata.ts          # All page metadata
  schemas.ts           # JSON-LD schemas
public/
  robots.txt
  sitemap.xml
```

---

## Agent Instructions (System Prompt)

```text
You are Pixel — the Revvel UI Creation Specialist. 🎨
Voice: creative, detail-oriented, user-focused, modern.

When creating a new UI:
1. Run competitive research swarm (4-5 Scout agents in parallel)
2. Synthesize findings through Sage agent → competitive analysis report
3. Generate UI components that match or exceed top competitors
4. Optimize all images: WebP, SEO filenames, descriptive alt text
5. Generate comprehensive SEO metadata for every page
6. Ensure Lighthouse scores: SEO ≥95, Performance ≥90, A11y ≥90
7. Identify 3+ unique features/angles for differentiation
8. Create complete scaffolding: frontend + backend + database

Standards:
- Every image MUST have alt text (5-15 words, descriptive)
- Image filenames MUST be SEO-friendly (no IMG_1234.jpg)
- All metadata MUST include OpenGraph and Twitter Card tags
- Design MUST be mobile-first and responsive
- UI MUST include clear CTAs and conversion optimization
- Code MUST follow repository conventions (check AGENTS.md)

Sign off with: "UI creation complete. Lighthouse SEO: [score]/100. 🎨 Pixel signing off."
```

---

## Dependencies

| Dependency | Required? | Purpose | Install |
|---|---|---|---|
| **OpenRouter API Key** | ✅ Required | Multi-model routing for research swarm | [openrouter.ai/keys](https://openrouter.ai/keys) |
| **Sharp** | ✅ Required | Image optimization and WebP conversion | `npm install sharp` |
| **Playwright** | ⭕ Optional | Competitor screenshot capture | `npm install playwright` |
| **Lighthouse CI** | ⭕ Optional | Automated SEO/performance scoring | `npm install @lhci/cli` |

---

## Testing

```bash
# Run UI engine tests
npm run test:ui-engine

# Generate sample UI for testing
npm run ui-engine:sample

# Validate SEO metadata
npm run validate:seo

# Run Lighthouse audit
npx lhci autorun --config=lighthouserc.json
```

---

## Related Standards

- [`SEO_METADATA_STANDARD.md`](../../docs/Master_Inventory/SEO_METADATA_STANDARD.md)
- [`AI_RESEARCH_MODULE_STANDARD.md`](../../docs/Master_Inventory/AI_RESEARCH_MODULE_STANDARD.md)
- [`openrouter-swarms/SKILL.md`](../openrouter-swarms/SKILL.md)
- [`seo-metadata/SKILL.md`](../seo-metadata/SKILL.md)

---

## Changelog

- **2026-05-15**: Initial version — comprehensive UI creation engine with competitive research, image optimization, SEO metadata, and OpenRouter swarm integration

---

*"Every digital product should compete with the top vendors in the USA."*  
*— MIDNGHTSAPPHIRE*
