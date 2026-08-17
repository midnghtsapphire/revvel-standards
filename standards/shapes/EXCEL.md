# Excel / Spreadsheet Product Shape Standard

**Parent pipeline:** [`AUTOMATED_PRODUCT_PIPELINE.md`](../AUTOMATED_PRODUCT_PIPELINE.md) → Step 5 shape = `excel`
**Template:** `templates/agent-generated-product/build/excel/`

---

## When to Use This Shape

- Target audience is business users, not developers
- Problem involves data tracking, calculation, or analysis
- Users expect a familiar spreadsheet interface (Excel, Google Sheets)
- Template-driven: fill in your data, get results
- Low build cost, high perceived value for business users
- Common for: budgets, calculators, trackers, dashboards, audit tools

---

## 1. Research Phase

| Task | Tool | Output |
|------|------|--------|
| Validate business demand | Etsy "spreadsheet template", Google Trends, Reddit r/excel | Confirmed demand ≥ 30 searches/month |
| Audit existing templates | Etsy, Gumroad, Template.net, Vertex42 | `research/competitors.md` — pricing, reviews, features |
| Identify feature gaps | Competitor review analysis (1-3 star reviews) | `research/gap.md` — what competitors lack |
| Define template scope | Target user workflow | `research/scope.md` — what's included, what's out |
| Determine pricing | Market analysis | `decision/pricing.json` — typically $5-49 |

**Gate:** `research/brief.md` must exist before proceeding.

---

## 2. Create Phase

### Project Structure

```text
build/excel/
  templates/
    <product-slug>.xlsx       # Main Excel template
    <product-slug>-gsheets/   # Google Sheets version (exported)
    sample-data.xlsx          # Pre-filled example
  docs/
    user-guide.md             # How to use the template
    formulas.md               # Formula documentation
  assets/
    preview.png               # Store listing screenshots
    demo.gif                  # Animated walkthrough
  scripts/
    build-template.py         # Automated template generation (openpyxl)
    validate.py               # Validate formulas and structure
```

### Tooling

| Tool | Purpose | Install |
|------|---------|---------|
| **openpyxl** | Programmatic Excel creation (Python) | `pip install openpyxl` |
| **xlsxwriter** | Alternative Excel writer (Python) | `pip install xlsxwriter` |
| **SheetJS** | JavaScript Excel read/write | `npm install xlsx` |
| **Google Sheets API** | Create/publish Google Sheets version | Google Cloud project |

### Template Design Rules

1. **Instructions tab first** — "START HERE" tab with clear instructions
2. **Input cells highlighted** — Yellow or light blue background for user-editable cells
3. **Protected formulas** — Lock cells with formulas, password-protect the sheet
4. **Data validation** — Dropdowns for categorical inputs, date pickers for dates
5. **Conditional formatting** — Color-code results (green = good, red = bad)
6. **Dashboard tab** — Summary/charts on a dedicated tab
7. **Print-friendly** — Page breaks set, headers/footers configured
8. **Named ranges** — Use named ranges for all key calculations

### Automated Template Generation

```python
# scripts/build-template.py
import openpyxl
from openpyxl.styles import PatternFill, Font, Alignment, Border
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.datavalidation import DataValidation

wb = openpyxl.Workbook()

# Instructions tab
ws_intro = wb.active
ws_intro.title = "START HERE"
ws_intro["A1"] = "<Product Name>"
ws_intro["A1"].font = Font(size=18, bold=True)
ws_intro["A3"] = "Instructions:"
# ... build out template programmatically

wb.save("templates/<product-slug>.xlsx")
```

### Quality Gates

- [ ] All formulas calculate correctly with sample data
- [ ] Instructions tab is clear and complete
- [ ] Input cells are visually distinct from formula cells
- [ ] Template works in Excel 2019+, LibreOffice Calc, and Google Sheets
- [ ] File size < 5 MB (most stores reject larger)
- [ ] No macros (VBA) unless absolutely necessary (security concern for buyers)
- [ ] Google Sheets version linked and tested
- [ ] `validate.py` passes (checks formula integrity, named ranges, protection)

---

## 3. Design Phase

| Asset | Purpose | Tool |
|-------|---------|------|
| Template styling | Professional look inside the spreadsheet | openpyxl styles |
| Store screenshots | Etsy/Gumroad listing (5-7 images) | Screenshots + annotations |
| Mockup | Laptop/tablet showing the spreadsheet | Figma |
| Landing page | SEO + purchase link | Figma → HTML |
| OG image | Social sharing (1200×630) | Figma |
| Demo GIF | Animated walkthrough of key features | Screen recording → GIF |

---

## 4. Publish Phase

### Primary Stores

| Store | How | Commission | Best for |
|-------|-----|------------|----------|
| **Etsy** | Upload as digital download | 6.5% + $0.20/listing | Highest volume for spreadsheet templates |
| **Gumroad** | API or dashboard upload | 10% | Direct audience, email collection |
| **Own site (Stripe)** | Payment Link → email delivery | 2.9% + $0.30 | Highest margin |

### Secondary Stores

| Store | Notes |
|-------|-------|
| **Creative Market** | Design-focused audience |
| **Template.net** | High traffic for business templates |
| **AppSumo** | Lifetime deals, high volume |
| **Google Workspace Marketplace** | If Google Sheets add-on |

### Etsy Listing Optimization

```text
Title: <Keyword-Rich Product Name> | Excel Template | Google Sheets | <Use Case>
Tags: excel template, spreadsheet, <niche>, <use case>, google sheets, business, tracker, calculator
Description:
  - Problem statement (first 160 chars = SEO description)
  - What's included (file formats, tabs, features)
  - How to use (3 steps)
  - Compatibility (Excel 2019+, Google Sheets, LibreOffice)
  - Refund policy
Photos: 7 images (mockup, each tab screenshot, feature highlights)
```

---

## 5. Connections Required

| Connection | Purpose | Where stored |
|------------|---------|--------------|
| **Etsy API key** | Automated listing | Doppler `revvel-standards/prd/ETSY_API_KEY` |
| **Gumroad API key** | Automated listing | Doppler `revvel-standards/prd/GUMROAD_ACCESS_TOKEN` |
| **Stripe API key** | Own-site sales | Doppler `revvel-standards/prd/STRIPE_SECRET_KEY` |
| **Google Sheets API** | Google Sheets version | Doppler `revvel-standards/prd/GOOGLE_SHEETS_CREDENTIALS` |

---

## Monetization Models

| Model | Price range | Example |
|-------|------------|---------|
| **One-time purchase** | $5-49 | Most common for templates |
| **Bundle** | $29-99 | 5-10 related templates |
| **Subscription** | $9-29/mo | Monthly updated templates (e.g., market data) |
| **Freemium** | Free basic + $19 pro | Limited tabs free, full version paid |

---

## Acceptance Criteria

- [ ] Excel template works in Excel 2019+ and Google Sheets
- [ ] Instructions tab is clear and user-friendly
- [ ] All formulas validate with sample data
- [ ] Listed on at least one store (Etsy, Gumroad, or own site)
- [ ] 5+ listing photos/screenshots
- [ ] Landing page deployed (if own-site sales)
- [ ] Stripe Product created
- [ ] `state.json` step = `deployed`, `certified = true`
