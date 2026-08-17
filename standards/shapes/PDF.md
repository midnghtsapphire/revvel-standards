# PDF Product Shape Standard

**Parent pipeline:** [`AUTOMATED_PRODUCT_PIPELINE.md`](../AUTOMATED_PRODUCT_PIPELINE.md) → Step 5 shape = `pdf`
**Template:** `templates/agent-generated-product/build/pdf/`

**Work Request routing:** Filing a WR with **Output Type = sellable-pdf** uses the issue form fields (including **PDF pipeline batch**: Not applicable / Autocreate 3 / Autocreate 20) as the routing source of truth — see **[`workflows/PDF_WR_PLAYBOOK.md`](../../workflows/PDF_WR_PLAYBOOK.md)**. Prefer parsing the issue body over inventing new GitHub labels for PDF workflow triggers.

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

```text
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
| **ChatGPT / Claude** | AI writing assistants to brainstorm, outline, and generate PDF content | Web-based (chatgpt.com, claude.ai) |
| **Canva / Canva AI** | Format AI-generated text into polished PDFs; create covers and promotional assets | Web-based (canva.com) or [Canva Connect APIs](https://www.canva.dev/docs/connect/) |
| **Pandoc** | Markdown → PDF compilation | `apt install pandoc texlive-xetex` |
| **WeasyPrint** (alternative) | HTML/CSS → PDF with better styling | `pip install weasyprint` |
| **Puppeteer/Playwright** (alternative) | HTML → PDF via headless Chrome | `npm install puppeteer` |
| **Figma** (via MCP or API) | Cover design, diagrams, infographics | Figma MCP server |

### Content Creation Workflow (AI-Assisted)

1. **Brainstorm & Outline** — Use ChatGPT or Claude to:
   - Generate table of contents based on problem statement
   - Create section outlines with key points
   - Draft content for each section in markdown format
   
2. **Refine & Format** — Import AI-generated content into:
   - Canva for visual layout and PDF export
   - Or keep in markdown and use Pandoc/WeasyPrint for compilation

3. **Design Assets** — Use Canva or Figma to create:
   - Professional cover page
   - Infographics and diagrams
   - Social media preview images

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

### Primary Automated Stack (Recommended)

**Gumroad + Carrd** provides the fastest, zero-maintenance storefront:

1. **Gumroad** — Upload your PDF and get an instant payment link. Handles checkout, delivery, and receipts automatically.
2. **Carrd** — Build a simple landing page (free up to 3 sites) with product info and embedded Gumroad button.

This combination requires no backend infrastructure and scales infinitely with zero operational burden.

### Primary Stores

| Store | How to upload | Pricing | Commission |
|-------|--------------|---------|------------|
| **Gumroad** | API (`POST /products`) or dashboard | Any price, $0 minimum | 10% flat |
| **Carrd** | Web builder (carrd.co) — embed Gumroad link or Stripe Payment Link | Free (up to 3 sites) / $19/year Pro | N/A (landing page only — no per-sale fee) |
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
# Use -F for every field — file uploads require multipart/form-data,
# and curl's -d (urlencoded) and -F (multipart) flags are mutually exclusive.
curl -X POST https://api.gumroad.com/v2/products \
  -F "access_token=$GUMROAD_ACCESS_TOKEN" \
  -F "name=<Product Name>" \
  -F "price=<price_in_cents>" \
  -F "description=<description>" \
  -F "preview=@build/pdf/assets/cover.png" \
  -F "file=@build/pdf/output/<product-slug>.pdf"

# Stripe Payment Link
stripe products create --name="<Product Name>" --metadata[product_slug]=<product-slug>
stripe prices create --product=<product_id> --unit-amount=<price_in_cents> --currency=usd
stripe payment_links create --line-items[0][price]=<price_id> --line-items[0][quantity]=1
```

### Landing Page

Every PDF product gets a landing page deployed to the product's subdomain or path:

```text
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

## 6. Complete Ship-to-Market Workflow

This section describes the recommended end-to-end workflow for creating and selling PDF products, from initial research to scaled marketing.

### Step 1: Identify a High-Demand Niche and Problem

Before creating anything, identify a specific problem your audience is actively trying to solve. Digital products work best when they provide a direct solution.

**Examples of high-demand niches:**
- "12-week back pain rehab program"
- "Hypertrophy training guide"
- "Productivity workflow template"
- Technical skill guides (programming, design, marketing)
- Industry-specific checklists and templates

**Research activities:**
- Use social listening (Step 1 of AUTOMATED_PRODUCT_PIPELINE) to find high-volume complaints
- Validate demand through Reddit, Twitter/X, YouTube comments, forums
- Analyze competitor PDFs on Gumroad, Etsy, Amazon KDP
- Identify gaps in existing solutions

**Gate:** Must have ≥50 mentions of the problem in the past 30 days before proceeding. Use social listening tools from Step 1 of AUTOMATED_PRODUCT_PIPELINE.md (Reddit search, Twitter/X search, YouTube comment analysis, forum monitoring).

---

### Step 2: Automate Content Creation

Use AI tools to rapidly generate high-quality content:

1. **Brainstorm with AI**
   - Use ChatGPT or Claude to generate outlines, section ideas, and key talking points
   - Example prompt: "Create a detailed outline for a PDF guide that solves [problem] for [audience]"

2. **Generate Content**
   - Have AI write each section based on your outline
   - Iterate and refine: ask for rewrites, expansions, or alternative approaches
   - Maintain consistent voice and formatting throughout

3. **Design in Canva**
   - Import AI-generated text into Canva
   - Use Canva templates for professional layouts
   - Add graphics, infographics, and visual elements
   - Create a compelling cover design
   - Export as high-quality PDF

**Output:** Polished, professional PDF ready for sale.

---

### Step 3: Set Up Your Automated Storefront

Create a frictionless sales pipeline with no manual fulfillment:

1. **Upload to Gumroad**
   - Go to gumroad.com and create a free account
   - Click "New Product" → "Digital Product"
   - Upload your PDF file
   - Set your price (recommended: $7–$27 for guides, $17–$47 for comprehensive courses)
   - Add product description, cover image, and preview
   - Publish to get your Gumroad payment link

2. **Build Landing Page on Carrd**
   - Go to carrd.co and sign up (free for up to 3 sites)
   - Choose a simple landing page template
   - Add sections:
     - Hero with product title and mockup
     - Problem statement (pain points your PDF solves)
     - Solution overview (what's inside)
     - Table of contents preview
     - Testimonials (if available)
     - Call-to-action button
   - Embed your Gumroad link as the CTA button
   - Publish your Carrd site

**Result:** Fully automated sales flow. When someone clicks your CTA, Gumroad handles payment and delivers the PDF instantly via email.

---

### Step 4: Generate Traffic Using YouTube

Create a content channel that drives qualified traffic to your PDF:

1. **Channel Strategy**
   - Create a YouTube channel related to your PDF's topic
   - Faceless channels work well: screen recordings, slideshows, stock footage with voiceover
   - Example: If selling a financial guide, make tutorials about personal finance

2. **Content Creation**
   - Make 2–3 videos per week addressing related problems
   - Each video should provide value while hinting at the deeper solution in your PDF
   - Keep videos 8–15 minutes for optimal engagement

3. **Link Placement**
   - Add your Carrd or Gumroad link in video description (first line)
   - Pin a comment with the link
   - Mention the PDF naturally in your videos (not aggressively)

4. **SEO Optimization**
   - Use keywords from your PDF research in titles and descriptions
   - Create thumbnails that stand out
   - Add timestamps and chapters

**Why YouTube:**
- Long-tail traffic (videos continue generating views for years)
- High buyer intent (people actively searching for solutions)
- Free organic reach (no paid ads required initially)
- Builds authority and trust over time

---

### Step 5: Time Your Launch for Maximum Conversions

**DO NOT** push your PDF aggressively from day one. Follow this timeline:

**Phase 1: Value Building (Weeks 1–8)**
- Focus purely on providing valuable free content
- Build subscriber base and engagement
- Establish authority in your niche
- Do not mention your PDF yet

**Phase 2: Soft Introduction (Weeks 9–12)**
- Casually mention your PDF exists
- Position it as "extra resources for those who want to go deeper"
- Keep links in description, don't be pushy

**Phase 3: Active Promotion (5,000–20,000 subscribers)**
- Once you have consistent engagement and trust, promote more actively
- Create dedicated videos about your PDF (e.g., "How I created this guide")
- Offer limited-time discounts
- Share testimonials and results

**Why this timing works:**
- Viewers already trust your authority
- PDF feels like a helpful extension, not an advertisement
- Near 100% profit margins mean every sale counts
- No inventory or shipping costs, so late promotion doesn't hurt

**Scaling:**
- As your channel grows, your PDF sales scale automatically
- Create additional PDFs to serve the same audience
- Bundle products for higher-value offerings
- Eventually, consider Patreon or membership for recurring revenue

---

## 7. Marketing & Growth Strategy

### YouTube Channel Growth Milestones

| Milestone | Timeline | Focus | Expected PDF Sales |
|-----------|----------|-------|-------------------|
| 0–1K subs | Months 1–3 | Content quality, SEO optimization | 0–10/month |
| 1K–5K subs | Months 4–6 | Consistency, soft PDF mentions | 10–50/month |
| 5K–20K subs | Months 7–12 | Active promotion, product expansion | 50–200/month |
| 20K–100K subs | Year 2+ | Multiple products, affiliate deals, sponsorships | 200–1000+/month |

### Additional Marketing Channels (Post-Launch)

Once YouTube is established, expand to:
- **Twitter/X** — Share tips and link to videos
- **Reddit** — Participate in relevant communities, offer value before promoting
- **Email list** — Capture emails via Gumroad, send updates about new PDFs
- **Pinterest** — Create pins for infographics from your PDFs
- **TikTok/Shorts** — Repurpose YouTube content into short-form clips

### Paid Advertising (Optional, After Validation)

Only invest in paid ads once you've validated organic demand:
- **YouTube Ads** — Promote your best-performing videos
- **Google Ads** — Target high-intent keywords
- **Facebook/Instagram Ads** — Target lookalike audiences
- **Budget rule:** Start with $5–10/day, scale if monthly ROI (revenue / ad spend) > 3:1

---

## Acceptance Criteria

A PDF product is "shipped" when:

- [ ] PDF file exists in `build/pdf/output/` and renders correctly
- [ ] Listed on at least one primary store (Gumroad, Etsy, or own site)
- [ ] Landing page deployed with SEO metadata
- [ ] Stripe Product + Price created with `product_slug` metadata
- [ ] Social preview image (OG) uploaded
- [ ] `state.json` step = `deployed`, `certified = true`
