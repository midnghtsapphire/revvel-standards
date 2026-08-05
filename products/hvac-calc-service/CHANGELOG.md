# Changelog — HVAC Calc Service

All notable changes to this product are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [1.0.0] — 2026-06-18

### Added

- Initial release of HVAC Calc Service.
- Manual J (simplified) sensible cooling and heating load calculator with 12 ASHRAE climate zones.
- Manual S equipment sizing with over-/under-size verdict.
- Manual D duct sizing (main trunk: round diameter + rectangular equivalent).
- Annual energy cost estimator (SEER2 / HSPF2 heat pump or gas furnace AFUE).
- Refrigerant reference table: R-22, R-410A, R-32, R-454B, R-290 with GWP and AIM Act phase-out status.
- `POST /api/calculate` REST endpoint returning load, equipment, duct, energy, Markdown report, and CSV.
- Report export: Markdown brief and CSV data download.
- 4 insulation levels (poor/fair/good/excellent) with ASHRAE U-values.
- Tailwind dark-mode UI with tabbed results panel and live-updating summary cards.
- TypeScript tests with `node:assert` covering all calculation functions.
- SEO metadata targeting Manual J / HVAC calculator keywords.
- Vercel deployment configuration.
