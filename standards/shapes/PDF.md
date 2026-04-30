# PDF Product Shape Standard

**Parent pipeline:** [`AUTOMATED_PRODUCT_PIPELINE.md`](../AUTOMATED_PRODUCT_PIPELINE.md) → Step 5 shape = `pdf`
**Template:** `templates/agent-generated-product/build/pdf/`

---

## When to Use This Shape

- One-shot reference content (guides, checklists, templates, reports)
- No application state required — the deliverable IS the product
- SEO-driven discovery (users search for a solution, find a landing page, buy a PDF)
- Low build cost, fast time-to-market (hours, not days)
- Ideal for trending problems that need an information-based solution

---

## 1. Research Phase

Before creating any content, the agent must:

| Task | Tool | Output |
|------|------|--------|
| Validate demand | Social listening output from pipeline step 1 | Confirmed complaint volume ≥ 50 mentions / 30 days |
| Analyze top 10 competing PDFs | Google, Gumroad, Etsy, Amazon KDP search | `research/competitors.md` — pricing, reviews, gaps |
| Identify SEO keywords | Brave Search / Google Trends / Ahrefs (if available) | `research/keywords.md` — top 20 keywords, volume, difficulty |
| Define target audience | LLM analysis of complaint clusters | `research/audience.md` — persona, pain points, willingness to pay |
| Determine price point | Competitor pricing + audience analysis | `decision/pricing.json` — price, comparison rationale |

**Gate:** `research/brief.md` must exist and include all five outputs before proceeding.

---

## 2. Create Phase

### Content Structure

Every PDF product follows this structure:

```
build/pdf/
  content/
    outline.md          # Table of contents + section summaries
    sections/           # One .md file per section
      01-intro.md
      02-problem.md
      03-solution.md
      ...
    appendix/           # Optional reference material
  assets/
    cover.png           # Cover image (Figma-generated)
    diagrams/           # Charts, infographics, screenshots
  output/
    <product-slug>.pdf  # Final compiled PDF
  metadata.json         # Title, author, ISBN (if applicable), version
```

### Tooling

| Tool | Purpose | Install |
|------|---------|---------|
| **Pandoc** | Markdown → PDF compilation | `apt install pandoc texlive-xetex` |
| **WeasyPrint** (alternative) | HTML/CSS → PDF with better styling | `pip install weasyprint` |
| **Puppeteer/Playwright** (alternative) | HTML → PDF via headless Chrome | `npm install puppeteer` |
| **Figma** (via MCP or API) | Cover design, diagrams, infographics | Figma MCP server |

### Build Commands

```bash
# Pandoc approach (simplest)
pandoc content/sections/*.md \
  --from=markdown \
  --to=pdf \
  --pdf-engine=xelatex \
  --template=templates/pdf/revvel-template.tex \
  --metadata-file=metadata.json \
  -o output/<product-slug>.pdf

# WeasyPrint approach (better styling)
python3 scripts/compile-pdf.py \
  --content content/sections/ \
  --template templates/pdf/revvel-style.css \
  --output output/<product-slug>.pdf
```

### Quality Gates

- [ ] All sections written (no `TODO` or placeholder text)
- [ ] Spell check passes (`aspell` or `cspell`)
- [ ] PDF renders correctly (no broken images, no overflow text)
- [ ] Cover page has professional design (Figma-generated)
- [ ] Page count ≥ 10 (buyers expect substance for paid PDFs)
- [ ] File size < 20 MB (most stores reject larger files)
- [ ] No PII, no copyrighted content, no AI-attribution disclaimers unless legally required

---

## 3. Design Phase — Figma Handoff

Every PDF product needs these design assets:

| Asset | Figma frame | Used for |
|-------|-------------|----------|
| Cover page | `<product-slug>/cover` | PDF first page + store thumbnail |
| Landing page hero | `<product-slug>/hero` | Website above-the-fold |
| Social preview | `<product-slug>/og-image` | Open Graph + Twitter Card (1200×630) |
| Store thumbnail | `<product-slug>/thumbnail` | Gumroad/Etsy listing (1280×720) |
| Mockup | `<product-slug>/mockup` | 3D book/tablet mockup for landing page |

**Figma workflow:**
1. Agent requests design via Figma MCP or creates from brand template
2. Brand colors/fonts from `templates/brand/BRAND_GUIDE.md`
3. Export as PNG (300 DPI for print, 72 DPI for web)
4. Store in `build/pdf/assets/`

---

## 4. Publish Phase — Where to Sell

### Primary Stores

| Store | How to upload | Pricing | Commission |
|-------|--------------|---------|------------|
| **Gumroad** | API (`POST /products`) or dashboard | Any price, $0 minimum | 10% flat |
| **Etsy (digital)** | Etsy API or dashboard → digital download listing | $0.99+ | 6.5% transaction + $0.20 listing |
| **Own site (Stripe)** | Stripe Payment Link → deliver via email/download page | Any price | 2.9% + $0.30 |

### Secondary Stores

| Store | Notes |
|-------|-------|
| **Payhip** | 0% commission on paid plan, 5% on free |
| **LemonSqueezy** | Good international tax handling |
| **Amazon KDP** | If the PDF is book-length (≥ 24 pages); needs ISBN |
| **Creative Market** | If the PDF is a design template |

### Upload Automation

```bash
# Gumroad (via API)
curl -X POST https://api.gumroad.com/v2/products \
  -d "access_token=$GUMROAD_ACCESS_TOKEN" \
  -d "name=<Product Name>" \
  -d "price=<price_in_cents>" \
  -d "description=<description>" \
  -F "preview=@build/pdf/assets/cover.png" \
  -F "file=@build/pdf/output/<product-slug>.pdf"

# Stripe Payment Link
stripe products create --name="<Product Name>" --metadata[product_slug]=<product-slug>
stripe prices create --product=<product_id> --unit-amount=<price_in_cents> --currency=usd
stripe payment_links create --line-items[0][price]=<price_id> --line-items[0][quantity]=1
```

### Landing Page

Every PDF product gets a landing page deployed to the product's subdomain or path:

```
<product-slug>.revvel.io   OR   revvel.io/products/<product-slug>
```

Landing page must include:
- Hero section with mockup image
- Problem statement (from research)
- Table of contents preview
- Social proof (if available — reviews, download count)
- CTA button → Stripe Payment Link or Gumroad
- SEO metadata (title, description, OG tags, JSON-LD Product schema)

---

## 5. Connections Required

These must be provisioned (via BOM gatekeeper) before the build starts:

| Connection | Purpose | Where stored |
|------------|---------|--------------|
| **Gumroad API key** | Upload products | Doppler `revvel-standards/prd/GUMROAD_ACCESS_TOKEN` |
| **Stripe API key** | Payment links, products | Doppler `revvel-standards/prd/STRIPE_SECRET_KEY` |
| **Figma access token** | Design generation | Doppler `revvel-standards/prd/FIGMA_ACCESS_TOKEN` |
| **Google Search Console** | SEO submission | OAuth via Doppler |
| **Etsy API key** | Etsy listings (optional) | Doppler `revvel-standards/prd/ETSY_API_KEY` |

---

## Acceptance Criteria

A PDF product is "shipped" when:

- [ ] PDF file exists in `build/pdf/output/` and renders correctly
- [ ] Listed on at least one primary store (Gumroad, Etsy, or own site)
- [ ] Landing page deployed with SEO metadata
- [ ] Stripe Product + Price created with `product_slug` metadata
- [ ] Social preview image (OG) uploaded
- [ ] `state.json` step = `deployed`, `certified = true`
