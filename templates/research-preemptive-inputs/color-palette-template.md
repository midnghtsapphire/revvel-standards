# Color Palette Template

Three palette tiers must be surfaced for any visual/branded WR with a
regional or institutional flavor. The Knoxville example in #14085 had:
official (UT orange + white + checkerboard), traditional accent (Smokey
charcoal grey), and natural environment (Smoky-Mountains blue/purple,
forest greens, river blues). Future WRs get this pattern by default.

> Cross-ref: [`README.md`](./README.md), [`regional-cultural-motif-template.md`](./regional-cultural-motif-template.md).

## 1. Subject capture

| Field | Value |
| --- | --- |
| Subject of the artifact | _e.g., banana mascot baseball logo for Knoxville-themed apparel_ |
| Primary regional anchor | _e.g., University of Tennessee Volunteers_ |
| Audience expectation | _e.g., immediately recognizable as UT-flavored without infringing UT marks_ |

## 2. Three palette tiers — required

### Tier A. Official / signature palette

The "they'd-recognize-it-in-the-dark" palette. Source: the institution's
brand guide if available; otherwise the dominant public-facing identity.

| Role | Color name | Hex | Notes / source |
| --- | --- | --- | --- |
| Primary | _e.g., Tennessee Orange_ | `#FF8200` | _brand.utk.edu — official; reference, do not infringe_ |
| Secondary | _e.g., White_ | `#FFFFFF` | _Contrast base for the primary_ |
| Pattern accent | _e.g., Orange-and-white checkerboard_ | n/a | _Functions like a color; safe as pattern_ |

### Tier B. Traditional / athletic accent palette

A 3rd color that the audience associates with the brand but isn't the
primary. Adds depth, premium feel, avoids "logo on white" sameness.

| Role | Color name | Hex | Notes / source |
| --- | --- | --- | --- |
| Accent | _e.g., Smokey Charcoal Grey_ | `#58595B` | _Named after Smokey the Bluetick Coonhound (UT mascot)_ |
| Soft neutral | _e.g., Cream_ | `#F5EFE0` | _Vintage / heritage feel_ |
| Optional 3rd | _e.g., Mustard gold_ | `#C8A55A` | _Adds warm depth_ |

### Tier C. Natural environment / place-based palette

Colors pulled from the actual geography. Lets the design feel like the
place without leaning on trademarked marks.

| Role | Color name | Hex | Notes / source |
| --- | --- | --- | --- |
| Mountain haze | _e.g., Smoky blue_ | `#7A8FAF` | _Great Smoky Mountains visual signature_ |
| Mountain haze accent | _e.g., Muted purple_ | `#6E5C7B` | _Distant ridges_ |
| Forest | _e.g., Deep pine green_ | `#1F4332` | _Heavily forested region_ |
| Water | _e.g., River blue_ | `#3D6B8C` | _Tennessee River — Vol Navy nod_ |
| Optional warm | _e.g., Sunset gold_ | `#E5A23F` | _Gameday / on-the-water mood_ |

## 3. Recommended combinations (output to the asset step)

The research lane must propose at least four combinations that mix the
tiers in distinct ways so the asset step has variety to grid out.

| Combo name | Composition | Use case |
| --- | --- | --- |
| Tradition-rich | Primary + secondary + small charcoal accents | Classic apparel, logo-forward |
| Checkerboard power | Pattern fill + solid primary + cream | Bold banners, sportswear |
| UT Natural | Primary + Smoky blue + River blue | Sunset-on-the-river illustrations |
| Elegant accent | Charcoal as field + primary used sparingly | Premium / black-tie merch |
| _add 2–4 more_ | | |

## 4. Hex contract for the asset-artifact step

When the asset step ingests this template, it expects:

```json
{
  "palettes": [
    {
      "name": "Tradition-rich",
      "hexes": ["#FF8200", "#FFFFFF", "#58595B"],
      "use_case": "Classic apparel, logo-forward"
    },
    {
      "name": "UT Natural",
      "hexes": ["#FF8200", "#7A8FAF", "#3D6B8C"],
      "use_case": "Sunset-on-the-river illustrations"
    }
  ]
}
```

Including hexes (not color names) eliminates ambiguity for downstream
generators.

## 5. Licensing call-outs

| Color / pattern | Risk | Mitigation |
| --- | --- | --- |
| Tennessee Orange (`#FF8200`) | Color itself not trademarkable, but UT brand guide governs paired use with marks | Use the hex; do not pair with Power-T or other UT marks unless licensed |
| Checkerboard endzone pattern | Pattern not trademarked; widely used | Safe as background |
| Smokey charcoal grey | Color named after mascot; no IP issue using the hex | Safe |
| _any vendor-specific palette (Pantone)_ | Pantone codes are licensed for color matching but hex equivalents are unrestricted | Use hex equivalents |

## 6. Citations

```text
- UT brand guide — https://brand.utk.edu/
- Tennessee Orange origin — https://en.wikipedia.org/wiki/University_of_Tennessee#Color
- Great Smoky Mountains palette reference — https://www.nps.gov/grsm/
- Pantone vs hex licensing — Pantone's terms apply only to PMS book usage
```

Minimum 1 source per palette tier.
