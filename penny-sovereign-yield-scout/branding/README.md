# Branding — Penny Sovereign Yield Scout

**Style:** Glassmorphic dark — Freedom Angel Corps identity  
**Author:** Audrey Evans (MIDNGHTSAPPHIRE) / Freedom Angel Corp

---

## Visual Identity

| Element | Specification |
|---|---|
| Background | `#0A0A1A` (deep navy black) |
| Primary colour | Iridescent gold `#C8A95A` → `#FFD700` gradient |
| Accent | Electric violet `#7B2FBE` |
| Glass panel | `rgba(255,255,255,0.05)` with `backdrop-filter: blur(16px)` |
| Border | `rgba(200,169,90,0.3)` |
| Typography | Inter (UI), JetBrains Mono (code/data) |

---

## Files in This Folder

| File | Description | Status |
|---|---|---|
| `logo.png` | Glassmorphic Freedom Angel Corps insignia | Design spec below |
| `carousel_template.psd` | LinkedIn/X 10-slide carousel template | Design spec below |

---

## Logo Design Specification

**File:** `logo.png`  
**Dimensions:** 1024×1024px (square), also export 512×512 and 256×256  
**Format:** PNG with transparency  

**Design:**
- Deep navy background (`#0A0A1A`)
- Central angel wings icon with circuit-board feather detail
- Wings are iridescent gold gradient (`#C8A95A` → `#FFD700`)
- Small coin symbol (`🪙`) or "₿-style" penny emblem at wing centre
- Frosted glass panel behind the emblem (`rgba(255,255,255,0.08)`)
- "PSYS" monogram (Penny Sovereign Yield Scout) beneath wings
- No watermarks, no AI metadata

**Tools to create:**
- Figma (glassmorphism plugins available)
- Adobe Illustrator → export PNG
- Midjourney: `glassmorphic angel wings dark navy gold circuit board DeFi logo --ar 1:1 --no text watermark`

---

## Carousel Template Design Specification

**File:** `carousel_template.psd`  
**Dimensions:** 1080×1080px (Instagram/LinkedIn square)  
**Slides:** 10

**Slide structure:**

| Slide | Title | Content |
|---|---|---|
| 1 | Hook | "50 protocols. 1 scanner. $0 to start." |
| 2 | Blue Ocean | The penny × sovereign yield thesis |
| 3 | Top 5 This Week | Generated from demo_scan_output.json (top 5 rows) |
| 4 | IL Shield | What impermanent loss costs you (IL table) |
| 5 | Auto-Compound Formula | optimal_interval formula explained simply |
| 6 | Audit Trail | Screenshot of audit_log.jsonl (anonymised wallet) |
| 7 | Portfolio Allocation | Pie chart: Tier 1/2/3 allocation example |
| 8 | 5 Rules | The 6 decision rules from persona.yaml |
| 9 | How to Run | `python tools/yield_scraper_cli.py --top 10` + QR code |
| 10 | CTA | "Follow for weekly yield alpha" + repo link |

**Slide design:**
- Background: `#0A0A1A`
- Glass card: `rgba(255,255,255,0.05)` with `8px border-radius` and gold border
- Headline: Inter Bold 48pt `#FFD700`
- Body: Inter Regular 24pt `#DDDDDD`
- Code blocks: JetBrains Mono 18pt on `rgba(0,0,0,0.4)` background
- Footer: "Freedom Angel Corp | @MIDNGHTSAPPHIRE" in dim white

---

## Content Calendar Integration

Generated carousel data (from `yield_scraper_cli.py`) feeds directly into:
- Slide 3: Top 5 opportunities (auto-update weekly)
- Slide 6: Real audit log hash (verify chain integrity)

**Weekly workflow:**
```bash
# 1. Run sweep and save results
python tools/yield_scraper_cli.py --top 5 --output branding/weekly_results.json

# 2. Generate PDF summary
python tools/blue_ocean_generator.py --type pdf --title "Weekly Yield Report" --data branding/weekly_results.json

# 3. Use branding/weekly_results.json to populate carousel slides 3 & 6
```

---

*All Rights Reserved. Copyright 2026 Freedom Angel Corp / Audrey Evans.*
