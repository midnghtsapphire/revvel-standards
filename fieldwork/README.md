# 🏗️ FieldWork

## Live Deployment

▶️ **[Open the live app & test it](https://revvel-standards.vercel.app/docs/fieldwork/)**

## What Is This

**FieldWork** is a high-utility documentation tool for architects and contractors.
It turns messy site photos, voice notes, and scribbled sketches into perfectly
aligned, PDF-style progress reports — in minutes, not hours.

This directory holds the **concept landing page** (a single static `index.html`
built with Tailwind CSS) and the early blueprint / roadmap docs.

FieldWork ships as a **tab on the [oAudrey hub](../oaudrey/README.md)** and
deploys to the **`fieldwork.oaudrey.com`** subdomain per
[`docs/Master_Inventory/TEST_ENVIRONMENTS_STANDARD.md`](../docs/Master_Inventory/TEST_ENVIRONMENTS_STANDARD.md).
A percentage of proceeds is donated — via Freedom Angel Fighters — to
trafficking survivors for reskilling, recovery, and restoration.

---

## Plausibility — Yes

See [`docs/BLUEPRINT.md`](docs/BLUEPRINT.md) for the full analysis. Short
version: the niche is real (AEC-tech documentation workflows are painful and
under-served relative to general PM tools), the aesthetic is differentiated,
and a static marketing page is a cheap, low-risk first milestone.

---

## Project Layout

```text
fieldwork/
├── README.md            ← You are here
├── LICENSE
├── CHANGELOG.md
├── .gitignore
├── index.html           ← Landing page (static, Tailwind CDN)
├── assets/              ← Static assets (icons, images) — reserved
└── docs/
    ├── BLUEPRINT.md     ← Plausibility analysis + design system
    └── ROADMAP.md       ← Milestones
```

---

## Running the Landing Page Locally

No build step. Just serve the directory:

```bash
cd fieldwork
python3 -m http.server 8080
# → open http://localhost:8080
```

Or open `index.html` directly in a browser.

---

## Design System (Summary)

| Token        | Value                                          |
|--------------|------------------------------------------------|
| Background   | `#FFFFFF` (stark white)                        |
| Text         | `#111418` ("Blueprint" charcoal)               |
| Muted        | `#E5E5E5` (light concrete grey)                |
| Accent       | `#FF5733` (Vivid Safety Orange — CTAs only)    |
| Type         | Inter (sans), JetBrains Mono (metadata/WIP)    |
| Grid         | Swiss 12-col, visible 1px `#111418` borders    |
| Radius       | `0px` everywhere                               |
| Section gap  | `80px` minimum vertical whitespace             |
| Transitions  | Subtle, linear, non-bouncy                     |

---

## Status

- [x] Landing page v0.1 (static, single file)
- [ ] Asset pipeline (replace inline SVG icons with high-fidelity set)
- [ ] Next.js migration (once the product spec is locked)
- [ ] Product dashboard (Site Photo → Note → Report)
