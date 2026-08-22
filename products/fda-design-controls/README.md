# FDA Design Controls Tracker

## Live Deployment

▶️ **[Open the live app & test it](https://midnghtsapphire.github.io/revvel-standards/docs/fda-design-controls/)**

## What It Is

FDA Design Controls Tracker is a **Next.js web app** that helps medical device teams implement and track FDA Design Controls compliance per **21 CFR 820.30** — the FDA Quality System Regulation design controls requirement.

The tool provides an interactive, phase-by-phase compliance checklist based on the FDA's Design Controls training guidance ([FDA Design Controls Slides](https://www.fda.gov/media/116762/download)) and generates exportable Design History File (DHF) summaries in Markdown and CSV.

**Market context:** FDA Design Controls compliance is mandatory for Class II and Class III medical devices, and highly recommended for Class I devices. Every medical device company (10,000+ in the US) that designs a new device must maintain a DHF. No free, interactive, phase-driven checklist tool exists — existing solutions are $500–$5,000/yr eQMS platforms (Greenlight Guru, MasterControl, Qualio). This fills the gap for startups, consultants, and university programs.

---

## Features

- **9 Design Phases** — Covers all 21 CFR 820.30 phases: Planning, Design Input, Design Output, Design Review, Verification, Validation, Design Transfer, Design Changes, and DHF
- **59 Checklist Items** — Required vs. recommended items with expandable FDA-sourced guidance notes per item
- **Real-Time Progress Tracking** — Per-phase and overall completion percentages with visual progress bars
- **Project Info Panel** — Device name, version, project lead, device class (I/II/III), intended use, and date range
- **DHF Export** — Download a full Design History File summary as Markdown or a compliance checklist as CSV
- **REST API** — `POST /api/dhf` returns markdown, CSV, and a per-phase summary JSON for QMS integrations; `GET /api/dhf` returns the full phase/item schema
- **Client-side by default** — The UI generates exports locally; only optional calls to `/api/dhf` transmit the provided payload
- **SEO-optimized** — Targets "FDA design controls checklist", "21 CFR 820.30 compliance", "DHF generator", and related high-intent keywords

---

## Quick Start

```bash
cd products/fda-design-controls
npm install
npm run test
npm run lint
npm run build
npm run dev    # starts on http://localhost:3010
```

---

## API Usage

### `GET /api/dhf`

Returns the full list of design phases and checklist items:

```json
{
  "phases": [
    {
      "id": "planning",
      "cfr": "820.30(a)",
      "title": "Design & Development Planning",
      "description": "...",
      "items": [
        {
          "id": "plan-written",
          "text": "Written development plan established and dated",
          "required": true,
          "guidance": "..."
        }
      ]
    }
  ]
}
```

### `POST /api/dhf`

Generates a DHF summary from a JSON payload:

```json
{
  "project": {
    "deviceName": "CardioMonitor 3000",
    "deviceVersion": "2.1",
    "projectLead": "Jane Smith, RA",
    "intendedUse": "Continuous ECG monitoring for ICU patients",
    "deviceClass": "Class II",
    "startDate": "2024-01-15",
    "targetDate": "2025-06-30"
  },
  "checkedItems": {
    "planning": ["plan-written", "plan-interfaces", "plan-responsibilities"],
    "input": ["input-user-needs", "input-requirements"]
  }
}
```

**Response** includes `markdown`, `csv`, and `summary` fields with per-phase and overall completion metrics.

---

## Design Phases Covered (21 CFR 820.30)

| CFR Reference | Phase | Required Items |
|---------------|-------|----------------|
| 820.30(a) | Design & Development Planning | 4 of 6 |
| 820.30(c) | Design Input | 7 of 8 |
| 820.30(d) | Design Output | 5 of 6 |
| 820.30(e) | Design Review | 6 of 6 |
| 820.30(f) | Design Verification | 6 of 7 |
| 820.30(g) | Design Validation | 4 of 7 |
| 820.30(h) | Design Transfer | 5 of 6 |
| 820.30(i) | Design Changes | 6 of 6 |
| 820.30(j) | Design History File | 7 of 7 |

---

## Runtime Configuration

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_POLAR_CHECKOUT_URL` | Optional | Pro checkout URL (for future Pro tier). Falls back to email contact when unset. |

---

## Development

```bash
npm run dev      # dev server on :3010
npm run test     # TypeScript unit tests (node:assert via tsx)
npm run lint     # TypeScript type-check (tsc --noEmit)
npm run build    # production build
```

---

## Monetization

- **Free tier:** full checklist, DHF export, and API access — unlimited. Data stays client-side.
- **Pro tier (via Polar.sh):** team workspaces, saved projects (persistent storage), PDF-formatted DHF export, custom logo/branding, audit trail. Target: $49/mo per device project, $199/mo unlimited team.
- **Consulting upsell:** link regulatory consultants from the "compliance risk" card when required items are incomplete.
- **SEO / organic:** targets high-intent keywords ("FDA design controls checklist," "21 CFR 820.30 compliance tool," "DHF generator") with CPCs $5–15; organic traffic from medical device startups, QA consultants, and university biomedical engineering programs.

---

## References

- [21 CFR 820.30 — Design Controls](https://www.ecfr.gov/current/title-21/chapter-I/subchapter-H/part-820/subpart-C/section-820.30)
- [FDA Design Controls Guidance Slides](https://www.fda.gov/media/116762/download)
- [FDA Design Control Guidance for Medical Device Manufacturers (1997)](https://www.fda.gov/regulatory-information/search-fda-guidance-documents/design-control-guidance-medical-device-manufacturers)
- [ISO 13485:2016 — Medical devices QMS](https://www.iso.org/standard/59752.html)
- [ISO 14971:2019 — Risk Management](https://www.iso.org/standard/72704.html)

> **Disclaimer:** This tool is for educational and organizational assistance only. It does not constitute legal, regulatory, or compliance advice. Always consult a qualified regulatory affairs professional for formal FDA submissions.

---

## Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for repo-wide standards.

Product-specific: all logic changes must include or update the test assertions in `tests/controls.test.ts`. Run `npm test` before every commit.
