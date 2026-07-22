# UI Creation Engine — Usage Guide

**Version:** 1.0.0  
**Date:** May 15, 2026

---

## Overview

The UI Creation Engine is a comprehensive system for creating cutting-edge website and mobile app interfaces that compete with top vendors in the USA. It combines competitive research, image optimization, SEO metadata generation, and OpenRouter swarm orchestration.

**Core Principle**: *"Every digital product should compete with the top vendors in the USA."*

---

## Quick Start

### Method 1: Command Line (Direct)

```bash
# Basic usage
npm run ui-engine -- \
  --business="Business Name" \
  --industry="industry type" \
  --location="City, State"

# Full example: Catering business
npm run ui-engine -- \
  --business="Soul2Bowl" \
  --industry="catering, meal prep" \
  --location="St. Louis, MO" \
  --services="catering, Sunday dinner, meal prep, individual meals" \
  --output="./soul2bowl-ui"

# Mobile app example
npm run ui-engine -- \
  --business="FitTracker Pro" \
  --industry="fitness tracking" \
  --platform="mobile-app" \
  --location="USA nationwide" \
  --output="./fittracker-ui"
```

### Method 2: GitHub Actions (Automated)

#### Option A: Label-Based Trigger

1. Create a new issue with this structure:

```markdown
## UI Creation Request

Business: Soul2Bowl
Industry: catering, meal prep
Location: St. Louis, MO
Services: catering, Sunday dinner, meal prep
Platform: website
```

1. Add the `ui-creation` label to the issue
2. The workflow will automatically run and post results as a comment

#### Option B: Comment-Based Trigger

In any issue, comment:

```text
@copilot ui-engine
```

The engine will parse the issue body and run automatically.

#### Option C: Manual Workflow Dispatch

1. Go to **Actions** → **UI Creation Engine**
2. Click **Run workflow**
3. Fill in the form:
   - Business name
   - Industry type
   - Geographic location
   - Services (optional)
   - Platform (website, mobile-app, web-app)
   - Issue number (optional, to post results)
4. Click **Run workflow**

---

## What It Does

### Phase 1: Research Swarm (15-20 minutes)

Spawns 5 parallel Scout agents:

1. **Scout-1**: Find and score top 10-15 competitors
2. **Scout-2**: Analyze UI/UX patterns and design trends
3. **Scout-3**: Analyze SEO strategies, keywords, Lighthouse scores
4. **Scout-4**: Identify baseline, competitive, and breakthrough features
5. **Scout-5**: Recommend technology stack and tools

### Phase 2: Synthesis (10 minutes)

**Sage** agent aggregates findings into:
- Comprehensive competitive analysis
- Industry patterns and trends
- SEO keyword recommendations (top 20)
- Gaps and opportunities
- Differentiation strategy (3-5 unique angles)
- Technology recommendations

### Phase 3: Image Optimization (5 minutes)

**Pixel** agent creates:
- Image list with required sizes
- SEO-friendly filenames (`business-subject-context-size.webp`)
- Descriptive alt text (5-15 words per image)
- Optimization guidelines (WebP format, target file sizes)

### Phase 4: SEO Metadata (10 minutes)

**Sage** agent generates:
- Complete metadata for all pages (title, description, keywords)
- OpenGraph tags for social sharing
- Twitter Card tags
- JSON-LD schemas (Organization, LocalBusiness, BreadcrumbList, etc.)

### Phase 5: UI Design Recommendations (15 minutes)

**Pixel** agent creates:
- Design system (colors, typography, spacing)
- Component library specifications
- Page layout wireframes
- Conversion optimization strategies
- 3-5 differentiation elements

---

## Output Structure

```text
output-directory/
├── README.md                        # Summary and next steps
├── research/
│   ├── competitive-analysis.md      # Comprehensive analysis with scores
│   ├── scout-1-top-competitors.md   # Individual scout findings
│   ├── scout-2-ui-ux-patterns.md
│   ├── scout-3-seo-analysis.md
│   ├── scout-4-feature-analysis.md
│   └── scout-5-technology-stack.md
├── design/
│   └── ui-recommendations.md        # Design system, components, layouts
├── seo/
│   └── metadata.md                  # All page metadata and schemas
└── images/
    └── optimization-plan.md         # Image list with filenames and alt text
```

---

## Output Details

### Competitive Analysis Report

Includes:
- **Executive Summary**: 2-3 paragraph landscape overview
- **Top 10 Competitors**: Scored (0-100) with strengths/weaknesses
- **Industry Patterns**: Common features, design trends, tech choices
- **SEO & Keywords**: Top 20 keywords with search volumes
- **Gaps & Opportunities**: What competitors miss
- **Differentiation Strategy**: 3-5 unique angles to stand out
- **Recommendations**:
  - Baseline features (must have)
  - Competitive features (match leaders)
  - Breakthrough features (exceed leaders)

### UI Recommendations

Includes:
- **Design System**: Colors, typography, spacing, shadows, borders
- **Component Library**: All components with props and usage
- **Page Layouts**: Wireframes for homepage, services, order, about, contact
- **Conversion Optimization**: CTA placement, trust signals, friction reduction
- **Differentiation Elements**: 3-5 UI features that stand out

### SEO Metadata

Includes:
- **Page Metadata**: Complete TypeScript exports for all pages
- **JSON-LD Schemas**: Organization, LocalBusiness, BreadcrumbList, etc.
- **Keyword List**: Top 20 keywords with search volumes
- **robots.txt**: Recommended configuration
- **sitemap.xml**: Template structure

### Image Optimization Plan

Includes:
- **Image List**: All required images with details
- **SEO Filenames**: Format: `business-subject-context-size.webp`
- **Alt Text**: 5-15 word descriptions with keywords
- **Sizes & Formats**:
  - Hero: 1920×1080px, <300KB, WebP
  - OG: 1200×630px, <200KB, WebP
  - Product: 1080×1080px, <150KB, WebP
  - Thumbnail: 400×300px, <50KB, WebP

---

## Quality Gates

Before considering UI creation complete, verify:

- [ ] **Competitive Research**: At least 10 competitors analyzed with sources
- [ ] **Industry Patterns**: Common features and trends documented
- [ ] **SEO Keywords**: Top 20 keywords identified with search volumes
- [ ] **Differentiation**: At least 3 unique angles vs competitors
- [ ] **All Images**: WebP format, SEO filenames, descriptive alt text
- [ ] **All Metadata**: Complete for all pages (title, description, OG, Twitter, JSON-LD)
- [ ] **Design System**: Colors, typography, spacing defined
- [ ] **Component Library**: All needed components specified
- [ ] **Lighthouse Targets**: SEO ≥95, Performance ≥90, Accessibility ≥90

---

## Cost & Budget

Estimated cost per run:

| Phase | Agents | Tokens | Cost |
|---|---|---|---|
| Research Swarm | 5 Scouts | ~10,000 | $2-3 |
| Synthesis | 1 Sage | ~4,000 | $1-2 |
| Image Optimization | 1 Pixel | ~5,000 | $1-2 |
| SEO Metadata | 1 Sage | ~5,000 | $1-2 |
| UI Design | 1 Pixel | ~8,000 | $2-4 |
| **Total** | 9 agents | ~32,000 | **$7-13** |

**Budget Control**: Set `OPENROUTER_BUDGET_MAX=15.00` in environment to cap spending.

---

## Requirements

- **Node.js**: 18+
- **OpenRouter API Key**: Set `OPENROUTER_API_KEY` environment variable
- **Permissions**: Read/write access to output directory

### Get OpenRouter API Key

1. Sign up at [openrouter.ai](https://openrouter.ai)
2. Go to [API Keys](https://openrouter.ai/keys)
3. Create a new API key
4. Set in environment:
   ```bash
   export OPENROUTER_API_KEY="your-key-here"
   ```

---

## Troubleshooting

### Issue: "OPENROUTER_API_KEY environment variable is required

**Solution**: Set your OpenRouter API key:

```bash
export OPENROUTER_API_KEY="sk-or-v1-..."
```

### Issue: Scout agent fails

**Symptoms**: One or more Scout agents return errors in the output.

**Causes**:
- Rate limiting from OpenRouter
- Network connectivity issues
- Invalid API key

**Solutions**:
1. Check API key is valid at [openrouter.ai/keys](https://openrouter.ai/keys)
2. Wait a few minutes and retry (rate limit reset)
3. Check OpenRouter status page for outages

### Issue: Output directory not created

**Symptoms**: No output files generated.

**Solutions**:
1. Check write permissions on output directory
2. Run with explicit output path:
   ```bash
   npm run ui-engine -- --output="$HOME/ui-output" ...
   ```

### Issue: Incomplete research

**Symptoms**: Competitive analysis has fewer than 10 competitors.

**Solutions**:
- This may be expected for very niche industries
- Re-run with broader industry terms
- Manually supplement with known competitors

---

## Next Steps After Running

### 1. Review Research (Priority 1)

Read `research/competitive-analysis.md`:
- Validate competitor list (are these the right ones?)
- Review gaps and opportunities
- Confirm differentiation strategy

### 2. Implement Design System (Priority 2)

Follow `design/ui-recommendations.md`:
- Set up Tailwind config with color palette
- Create design tokens file
- Build component library

### 3. Apply SEO Metadata (Priority 3)

Use `seo/metadata.md`:
- Copy metadata exports to each page
- Add JSON-LD schemas to layout
- Create robots.txt and sitemap.xml

### 4. Optimize Images (Priority 4)

Follow `images/optimization-plan.md`:
- Rename images to SEO-friendly filenames
- Convert to WebP format (use `sharp` npm package)
- Add alt text to all images
- Compress to target file sizes

### 5. Validate with Lighthouse (Priority 5)

```bash
npx lighthouse https://your-site.com \
  --only-categories=seo,performance,accessibility \
  --output=json
```

Ensure:
- SEO score ≥ 95
- Performance ≥ 90
- Accessibility ≥ 90

---

## Examples

### Example 1: Local Service Business

```bash
npm run ui-engine -- \
  --business="Soul2Bowl" \
  --industry="catering, meal prep" \
  --location="St. Louis, MO" \
  --services="catering, Sunday dinner, meal prep, individual meals" \
  --output="./soul2bowl-ui"
```

**Output**:
- 15 competitors analyzed (St. Louis + national)
- Top keywords: "catering St. Louis", "meal prep St. Louis", "Sunday dinner catering"
- Differentiation: Fusion BBQ + Asian-Hawaiian + eco-friendly packaging
- Design: Glassmorphic, bold typography, full-width hero
- Lighthouse SEO: 98/100

### Example 2: SaaS Product

```bash
npm run ui-engine -- \
  --business="TaskFlow Pro" \
  --industry="project management" \
  --platform="web-app" \
  --location="USA nationwide" \
  --output="./taskflow-ui"
```

**Output**:
- 12 competitors (Asana, Monday.com, ClickUp, Trello, etc.)
- Top keywords: "project management software", "team collaboration tools"
- Differentiation: AI-powered task prioritization, Gantt + Kanban hybrid
- Design: Clean, minimal, data-dense dashboards
- Lighthouse SEO: 96/100

### Example 3: Mobile App

```bash
npm run ui-engine -- \
  --business="FitTracker Pro" \
  --industry="fitness tracking" \
  --platform="mobile-app" \
  --location="USA nationwide" \
  --output="./fittracker-ui"
```

**Output**:
- 10 competitors (MyFitnessPal, Lose It, Noom, etc.)
- Top keywords: "calorie counter app", "fitness tracker", "weight loss app"
- Differentiation: Social challenges, macro tracking, AI meal suggestions
- Design: Card-based UI, progress visualizations, gamification
- App Store metadata included

---

## Related Documentation

- **Full Skill Documentation**: [`skills/ui-creation-engine/SKILL.md`](../../skills/ui-creation-engine/SKILL.md)
- **Standard**: [`docs/Master_Inventory/UI_CREATION_ENGINE_STANDARD.md`](../Master_Inventory/UI_CREATION_ENGINE_STANDARD.md)
- **SEO Standard**: [`docs/Master_Inventory/SEO_METADATA_STANDARD.md`](../Master_Inventory/SEO_METADATA_STANDARD.md)
- **Research Module**: [`docs/Master_Inventory/AI_RESEARCH_MODULE_STANDARD.md`](../Master_Inventory/AI_RESEARCH_MODULE_STANDARD.md)
- **OpenRouter Swarms**: [`skills/openrouter-swarms/SKILL.md`](../../skills/openrouter-swarms/SKILL.md)

---

## Support

- **Issues**: Open an issue with label `ui-creation`
- **Docs**: See skill documentation in `skills/ui-creation-engine/`
- **Tests**: Run `npm test` to validate installation

---

*"Every digital product should compete with the top vendors in the USA."*  
*— MIDNGHTSAPPHIRE*
