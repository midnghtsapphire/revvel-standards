# D.A.R.E. Log — Soul2Bowl

**D**ecisions · **A**ctions · **R**esults · **E**vidence  
**Project:** Soul2Bowl  
**Last Updated:** April 2026

---

## How to Use This Log

Every significant technical or product decision must be logged here. Each entry answers:
- **Decision:** What was decided
- **Action:** What was done as a result
- **Result:** What the outcome was
- **Evidence:** Link to PR, doc, commit, or screenshot confirming the result

---

## Log Entries

---

### DARE-001: Technology Stack Selection

**Date:** April 2026  
**Author:** Audrey Evans (MIDNGHTSAPPHIRE)

| Field | Value |
|---|---|
| **Decision** | Use Next.js 14 (App Router), Tailwind CSS, Drizzle ORM + PostgreSQL, Clerk, Stripe, Resend — per Revvel Master App Template |
| **Action** | Blueprint created with this stack; scaffold will follow template |
| **Result** | Stack aligns with all existing Revvel projects — maximum code reuse, shared standards, known deployment path |
| **Evidence** | `BLUEPRINT.md` Section 6 · `MASTER_APP_TEMPLATE.md` |

---

### DARE-002: Authentication Provider

**Date:** April 2026  
**Author:** Audrey Evans (MIDNGHTSAPPHIRE)

| Field | Value |
|---|---|
| **Decision** | Use Clerk for authentication (Google OAuth + Apple Sign-In + Email/Password) |
| **Action** | Clerk selected over custom JWT and Auth.js due to built-in Google + Apple support and no-code admin dashboard |
| **Result** | Faster time to launch; Apple Sign-In handled by Clerk without custom Apple cert management |
| **Evidence** | `BLUEPRINT.md` Section 7 · `MASTER_APP_TEMPLATE.md` Auth section |

---

### DARE-003: Calendar Solution

**Date:** April 2026  
**Author:** Audrey Evans (MIDNGHTSAPPHIRE)

| Field | Value |
|---|---|
| **Decision** | Use FullCalendar.js (open source) for the booking calendar UI |
| **Action** | FullCalendar.js selected over paid solutions (Calendly, Acuity) for full customization and glassmorphic styling control |
| **Result** | Full control over appearance; no per-booking fees; admin controls availability via DB (calendar_slots table) |
| **Evidence** | `BLUEPRINT.md` Section 9 · `DATA_MODEL.md` calendar_slots table |

---

### DARE-004: Eco Packaging Brand Choice

**Date:** April 2026  
**Author:** Audrey Evans (MIDNGHTSAPPHIRE)

| Field | Value |
|---|---|
| **Decision** | Feature LIFEMADE 160 Count 16 oz Bowls as the official eco packaging brand on the website |
| **Action** | Eco section added to homepage + order confirmation + footer with certification badges (TUV OK + BPI®) |
| **Result** | Brand differentiator — positions Soul2Bowl as eco-conscious premium food service aligned with 2026 consumer values |
| **Evidence** | `BLUEPRINT.md` Section 11 · `BRAND.md` (teal/green eco section) |

---

### DARE-005: Deployment Platform

**Date:** April 2026  
**Author:** Audrey Evans (MIDNGHTSAPPHIRE)

| Field | Value |
|---|---|
| **Decision** | Deploy to DigitalOcean App Platform (preferred) over raw Droplet for Soul2Bowl |
| **Action** | App Platform selected for easier managed deploys, auto-scaling, and no manual Nginx/PM2 config |
| **Result** | Reduces ops burden at launch; can migrate to Droplet later if cost optimization needed |
| **Evidence** | `BOM.md` · `MASTER_APP_TEMPLATE.md` Deployment section |

---

### DARE-006: Glassmorphism Color Palette

**Date:** April 2026  
**Author:** Audrey Evans (MIDNGHTSAPPHIRE)

| Field | Value |
|---|---|
| **Decision** | Primary color: Warm Gold `#C8933A`, Secondary: Deep Teal `#2A7A6F`, Accent: Flame Orange `#E25B3A`, Background: Deep Obsidian `#09090F` |
| **Action** | Color system documented in `BRAND.md`; CSS custom properties defined; glassmorphic card patterns written |
| **Result** | Unique visual identity that stands out in the St. Louis food market; warm tones evoke comfort food while dark background creates premium feel |
| **Evidence** | `BRAND.md` Color Palette section |

---

### DARE-007: Sunday Dinner Ordering Window

**Date:** April 2026  
**Author:** Audrey Evans (MIDNGHTSAPPHIRE)

| Field | Value |
|---|---|
| **Decision** | Sunday Dinner orders close on Friday at 5 PM CST to allow prep time |
| **Action** | Admin configures cutoff time in admin panel; calendar_slots service_type=sunday_dinner auto-closes on cutoff |
| **Result** | Chef has Saturday for prep; no last-minute order scrambles; communicated clearly on Order page |
| **Evidence** | `BLUEPRINT.md` Section 3.3 · `DATA_MODEL.md` calendar_slots |

---

### DARE-008: Analytics Selection

**Date:** April 2026  
**Author:** Audrey Evans (MIDNGHTSAPPHIRE)

| Field | Value |
|---|---|
| **Decision** | Use Plausible Analytics (privacy-respecting, GDPR-compliant) over Google Analytics |
| **Action** | Plausible selected per Revvel standards; no cookie banner required; data stays in EU |
| **Result** | No GDPR cookie consent popup needed; cleaner UX; still gives order traffic, page views, referral sources |
| **Evidence** | `BOM.md` · `MASTER_APP_TEMPLATE.md` Analytics section |
