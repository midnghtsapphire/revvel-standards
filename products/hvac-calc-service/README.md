# HVAC Calc Service

## Live Deployment

▶️ **[Open the live app & test it](https://midnghtsapphire.github.io/revvel-standards/docs/hvac-calc-service/)**

## What It Is

HVAC Calc Service is a **Next.js 16 web app** that provides free, engineer-grade HVAC load calculations for contractors, mechanical engineers, and homeowners. It implements simplified **ACCA Manual J** (8th Ed.) load calculations, **Manual S** equipment selection, and **Manual D** duct sizing — the same standards used by licensed HVAC engineers.

**Market context:** The HVAC market is a $15B+ US residential sector with 5+ million new installs per year. No free, standards-based online load calculator exists — existing tools are either paywalled ($400–$2,000/yr for contractor software like Wrightsoft, Elite RHVAC, or Manual J Online) or dangerously simplified. This fills the gap for small contractors, homeowners doing due diligence, and engineering students.

---

## Features

- **Manual J Load Calculator** — Sensible cooling and heating loads by climate zone, insulation level, floor area, ceiling height, window fraction, and occupant count. Follows ACCA 8th Ed. simplified approach.
- **Equipment Sizing (Manual S)** — Recommends nominal tonnage and flags under-/over-sized selections (>115% of load triggers a warning).
- **Duct Sizing (Manual D)** — Calculates required CFM, round duct diameter, and rectangular duct dimensions from cooling load.
- **Annual Energy Cost Estimation** — Estimates annual cooling/heating kWh and cost using SEER2, HSPF2 (or AFUE for gas), and electricity/gas rates by climate zone.
- **Refrigerant Reference** — Current phase-out status for R-22, R-410A, R-32, R-454B, and R-290 under the AIM Act.
- **Report Export** — Download a Markdown brief or CSV data file for contractor proposals and engineering review.
- **REST API** — `POST /api/calculate` returns load, equipment, duct, energy, Markdown, and CSV for automations.
- **12 Climate Zones** — Covers ASHRAE 169 zones 1A through 7 with design temperature data for representative US cities.
- **SEO-optimized** — Targets "HVAC load calculator", "Manual J calculation online", "BTU calculator for house size", and related high-CPC keywords.

---

## Quick Start

```bash
cd products/hvac-calc-service
npm install
npm run test
npm run lint
npm run build
npm run dev    # starts on http://localhost:3006
```

---

## API Usage

### `POST /api/calculate`

```json
{
  "floorArea": 2000,
  "ceilingHeight": 9,
  "windowFraction": 0.15,
  "occupants": 3,
  "climateZoneId": "3a",
  "insulationLevelId": "good",
  "indoorCoolingSetpoint": 75,
  "indoorHeatingSetpoint": 70,
  "seer2": 18,
  "hspf2": 9.0,
  "electricityRateCentsKwh": 16,
  "isFurnace": false
}
```

**Response** includes `load`, `equipment`, `duct`, `energy`, `markdown`, and `csv` fields.

See `app/api/calculate/route.ts` for full request/response schema.

---

## Runtime Configuration

| Variable | Required | Description |
| --- | --- | --- |
| `NEXT_PUBLIC_POLAR_CHECKOUT_URL` | Optional | Pro checkout URL. Falls back to email contact when unset. |

Create local config (optional): create a `.env.local` file and set `NEXT_PUBLIC_POLAR_CHECKOUT_URL` if you want the Pro CTA to link somewhere.

---

## Calculations Reference

| Standard | What It Covers |
| --- | --- |
| ACCA Manual J (8th Ed.) | Residential heating/cooling load calculation |
| ACCA Manual S | Equipment selection from calculated load |
| ACCA Manual D | Duct system design and sizing |
| ASHRAE 169 | Climate zone definitions and design temperatures |
| ASHRAE HOF 2021 | U-values, infiltration, internal gains |
| DOE / EPA AIM Act | SEER2, HSPF2 minimum standards; refrigerant phase-outs |

> **Disclaimer:** This tool provides simplified Manual J estimates for preliminary sizing. Always have a licensed HVAC engineer perform a full Manual J/D/S calculation before purchasing equipment.

---

## Development

```bash
npm run dev      # dev server on :3006
npm run test     # TypeScript unit tests (node:assert)
npm run lint     # TypeScript type-check (tsc --noEmit)
npm run build    # production build
```

---

## Monetization

- **Free tier:** unlimited calculations, report export, and API access. (API rate limiting is planned but not yet implemented — see the roadmap.)
- **Pro tier (via Polar.sh):** higher API limits, white-label PDF reports, team workspaces, saved projects. Target: $29/mo individual, $99/mo team.
- **Affiliate:** link contractors to HVAC equipment retailers (Amazon Associates, Carrier/Trane dealer programs) from the equipment recommendation card.
- **SEO / organic:** targets high-intent keywords ("HVAC sizing calculator," "Manual J online free") with CPCs $3–12; organic traffic converts to Pro at 2–4%.

See [GO_TO_MARKET.md](./GO_TO_MARKET.md) for the full launch strategy.

---

## Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for repo-wide standards.

Product-specific: all calculation changes must include or update the test assertions in `tests/calculator.test.ts`. Run `npm test` before every commit.
