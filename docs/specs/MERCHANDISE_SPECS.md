# Merchandise Design System

Logo specifications, merchandise templates, and print-on-demand requirements.

## Logo Specifications

### Primary Logo
- **File formats**: SVG (primary), PNG, PSD, AI
- **Minimum size**: 100px height
- **Color modes**: Full color, white, black
- **Clear space**: 0.25" all sides

### Logo Variations
| Variation | Use Case | File |
|-----------|----------|------|
| **Full logo** | Main branding | logo-full.svg |
| **Icon only** | Small applications | logo-icon.svg |
| **Horizontal** | Apparel, headers | logo-horizontal.svg |
| **Vertical** | Special placements | logo-vertical.svg |
| **White** | Dark backgrounds | logo-white.png |
| **Black** | Light backgrounds | logo-black.png |

### Logo Storage
```text
logos/
├── primary/              # Main logo files
│   ├── logo.svg         # Vector source
│   ├── logo.ai          # Adobe Illustrator
│   └── logo.psd         # Photoshop with layers
├── variations/           # Logo variations
│   ├── horizontal/
│   ├── vertical/
│   └── icon/
├── color-versions/        # Color variants
│   ├── full-color/
│   ├── white/
│   └── black/
└── mockups/              # Logo in context
    ├── tshirt-mockup.png
    ├── mug-mockup.png
    └── web-mockup.png
```

---

## Print-on-Demand Specifications

### T-Shirts

#### Garment Specs
| Size | Chest Width | Length | Sleeve |
|------|------------|--------|--------|
| **XS** | 18" | 28" | 7.5" |
| **S** | 19" | 29" | 8" |
| **M** | 20" | 30" | 8.5" |
| **L** | 21" | 31" | 9" |
| **XL** | 22.5" | 32" | 9.5" |
| **2XL** | 24" | 33" | 10" |
| **3XL** | 25.5" | 34" | 10.5" |

#### Print Areas
| Area | Dimensions | Max DPI | Position |
|------|------------|---------|----------|
| **Front Center** | 12" × 14" | 300 | Center chest |
| **Front Left Chest** | 4" × 4" | 300 | Over heart |
| **Back Full** | 12" × 16" | 300 | Center back |
| **Back Top** | 11" × 11" | 300 | Below collar |
| **Sleeve Left** | 4" × 4" | 300 | Left sleeve |
| **Sleeve Right** | 4" × 4" | 300 | Right sleeve |

#### Design Guidelines
- **File format**: PNG with transparent background (preferred) or PSD
- **Color mode**: RGB (screen) or CMYK (print)
- **Resolution**: 300 DPI minimum
- **Color profile**: sRGB for print-on-demand
- **File size**: Under 25MB per design

### Mugs

#### Types
| Type | Capacity | Print Area | Dimensions |
|------|----------|------------|------------|
| **Classic 11oz** | 11 oz | 8.5" × 3.5" | 4.5" diameter |
| **Classic 15oz** | 15 oz | 9.5" × 3.75" | 4.5" diameter |
| **All-over** | 11oz/15oz | Full wrap | 9.5" × 4" |

#### Design Guidelines
- **File format**: PNG (transparent background) or PSD
- **Resolution**: 300 DPI
- **Color mode**: RGB
- **Print area**: Include bleed for all-over prints

### Other Merchandise

| Item | Print Area | Dimensions | File Format |
|------|-----------|------------|-------------|
| **Tote Bag** | 14" × 16" | Full front | PNG/PSD 300 DPI |
| **Hoodie Front** | 12" × 12" | Center chest | PNG/PSD 300 DPI |
| **Hoodie Back** | 12" × 14" | Full back | PNG/PSD 300 DPI |
| **Pillow Case** | 16" × 16" | Full cover | PNG/PSD 300 DPI |
| **Phone Case** | 3.5" × 6.5" | Curved area | PNG 300 DPI |
| **Tapestry** | 34" × 44" | Full | PNG/PSD 300 DPI |
| **Canvas Print** | Various | Full | PNG 300 DPI |

---

## Print-on-Demand Platforms

### Redbubble
| Product | File Requirements | Notes |
|---------|------------------|-------|
| **T-Shirts** | 300 DPI, RGB | Auto-sizing |
| **Stickers** | 300 DPI, transparent PNG | Die-cut |
| **Mugs** | 300 DPI | Dishwasher safe |
| **Hoodies** | 300 DPI | Unisex sizing |
| **Canvas** | 300 DPI | Gallery wrap |

### Printful
| Product | File Requirements | Notes |
|---------|------------------|-------|
| **All Products** | 300 DPI, RGB | Size guide per item |
| **DTG Shirts** | 300 DPI, PNG | No background |
| **Embroidery** | 150 DPI, PNG | Limited colors |

### Teespring (Spring)
| Product | File Requirements | Notes |
|---------|------------------|-------|
| **T-Shirts** | 300 DPI, RGB | No background |
| **Hoodies** | 300 DPI | Unisex |
| **Accessories** | 300 DPI | Various |

---

## Merchandise Workflow

```text
1. DESIGN
   ├── Create logo variations
   ├── Design merchandise graphics
   └── Prepare print-ready files

2. UPLOAD TO POD
   ├── Redbubble (global reach)
   ├── Printful (integration options)
   └── Teespring (community)
   
3. PRODUCT CREATION
   ├── Select base products
   ├── Position designs
   └── Set pricing

4. LISTING
   ├── Write product descriptions
   ├── Add tags for SEO
   └── Set categories

5. PROMOTION
   ├── Link from website
   ├── Social media posts
   └── Email marketing
```

---

## Branding Guidelines for Merchandise

### Color Usage
- Primary colors for main branding
- White logo on dark garments
- Black logo on light garments
- Full color for premium products

### Typography
- Clear, readable at small sizes
- Sans-serif for modern look
- Serif for classic feel

### Imagery
- High contrast for visibility
- Test on actual garment colors
- Consider fabric texture effects
