# 🛰️ oAudrey — Automation Software Hub

**Author:** Audrey Evans (MIDNGHTSAPPHIRE) / Freedom Angel Corp
**Version:** 1.0.0
**Status:** Concept / Landing Page
**License:** All Rights Reserved — Copyright 2010-2026 Freedom Angel Corp / Audrey Evans

---

## What Is This?

**oAudrey** is the public-facing **Automation Software Hub** for
**Freedom Angel Corp** — an autonomous umbrella over a growing family of
software, mobile apps, autonomous systems, marketing and ecommerce products.
Its purpose is to *fill the gaps that need filling* with self-running,
forward-looking automation.

This directory holds the **concept landing page** for the hub — a single
static `index.html` (Tailwind CSS via CDN), matching the authoring convention
used by `/fieldwork` in this repository.

---

## Giving Pledge (mission-linked)

A percentage of proceeds from every oAudrey product — software, mobile apps,
autonomous systems, marketing and ecommerce — is donated to programs that
support **trafficking survivors** with:

- **Reskilling** — technical training, certifications, mentor-matching.
- **Recovery** — trauma-informed care, counseling, safe-housing support.
- **Restoration** — legal aid, re-entry resources, long-term stability.

Administered through **Freedom Angel Fighters**, the advocacy and
anti-trafficking program of Freedom Angel Corp (Colorado, EIN 86-1209156,
Non-Profit, Good Standing).

---

## Subdomain Model

Per [`docs/Master_Inventory/TEST_ENVIRONMENTS_STANDARD.md`](../docs/Master_Inventory/TEST_ENVIRONMENTS_STANDARD.md),
every Freedom Angel Corp product ships to an `<app>.oaudrey.com` subdomain
during the **live-test** stage, and is surfaced as a **tab** in the oAudrey
hub landing page.

> **Canonical domain:** `oaudrey.com`. Older copies of the standards doc may
> still reference `openaudrey.com` — `oaudrey.com` is the correct apex for
> this hub and all product subdomains.

| Product (tab) | Subdomain | Source in this repo |
|---|---|---|
| **FieldWork** | `fieldwork.oaudrey.com` | [`/fieldwork`](../fieldwork) |
| GrowlingEyes | `growlingeyes.oaudrey.com` | *(external repo)* |
| Penny Sovereign Yield Scout | `penny.oaudrey.com` | [`/penny-sovereign-yield-scout`](../penny-sovereign-yield-scout) |
| Agent Factory | `agents.oaudrey.com` | [`/agent-factory`](../agent-factory) |
| Marketing & Ecommerce | `market.oaudrey.com` | *(external repo)* |

---

## Project Layout

```
oaudrey/
├── README.md            ← You are here
└── index.html           ← Hub landing page (static, Tailwind CDN)
```

---

## Running the Landing Page Locally

No build step. Just serve the directory:

```bash
cd oaudrey
python3 -m http.server 8080
# → open http://localhost:8080
```

Or open `index.html` directly in a browser.

---

## Design System (Summary)

| Token        | Value                                          |
|--------------|------------------------------------------------|
| Background   | `#0B0F1A` (void)                               |
| Surface      | `#121828` (carbon) / `#1E2638` (steel)         |
| Text         | `#E7ECF5` (ice) / `#8A93A6` (mist)             |
| Accent 1     | `#7C5CFF` (iris — autonomy / automation)       |
| Accent 2     | `#3DDCFF` (cyan — signal / data)               |
| Mission      | `#F7C948` (gold — giving pledge)               |
| Advocacy     | `#FF6B6B` (ember — restoration)                |
| Type         | Inter (sans), JetBrains Mono (metadata)        |

Forward-looking posture: aurora gradients, subtle circuit grid, glass
surfaces. Accessible tabs with full keyboard support
(`ArrowLeft/Right/Up/Down`, `Home`, `End`) and `prefers-reduced-motion`
respected.

---

## Status

- [x] Hub landing page v1.0 (static, single file)
- [x] FieldWork tab linked to `fieldwork.oaudrey.com`
- [x] Giving Pledge section (reskilling, recovery, restoration)
- [x] Original oAudrey SVG monogram mark in nav (orbit + aperture + signal dot)
- [ ] Extend brand system: supporting illustrations, bot characters, product iconography — all original, **no third-party assets reused**.
- [ ] Connect tabs to live metrics pulled from each product subdomain
