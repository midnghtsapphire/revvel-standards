# Changelog — FDA Design Controls Tracker

All notable changes to this project will be documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and
[Conventional Commits](https://www.conventionalcommits.org/).

---

## [1.0.0] — 2026-07-06

### Added

- Initial release of the FDA Design Controls Tracker.
- 9 design phases covering all of 21 CFR 820.30 (Planning, Input, Output,
  Review, Verification, Validation, Transfer, Changes, DHF).
- 59 checklist items with required/recommended tags and expandable FDA-sourced
  guidance notes.
- Interactive phase-navigation sidebar with real-time per-phase and overall
  completion progress bars.
- Project info panel: device name, version, project lead, device class, intended
  use, start/target dates.
- DHF export: Markdown (design-history-file.md) and CSV
  (design-controls-checklist.csv) — generated client-side in the browser UI.
  Note: calling `POST /api/dhf` sends the provided payload to the serverless
  route and should not be used for strictly client-only workflows.
- REST API: `GET /api/dhf` returns phase/item schema; `POST /api/dhf` generates
  markdown, CSV, and per-phase completion summary.
- TypeScript unit tests covering phase structure, count helpers, completion
  calculation, and report generation.
- SEO-optimized metadata targeting FDA design controls and DHF keywords.
- Reference: [FDA Design Controls Slides](https://www.fda.gov/media/116762/download).
