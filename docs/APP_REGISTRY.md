# App Registry

Registry of apps and products in this monorepo aligned to the $10M/3-year mission.

## Products

### PrintBank
- Path: `products/printbank/`
- Type: Static single-page app (Vercel, no build step)
- Pitch: Printable wall art bundle — every print is true vector (SVG) so one download prints losslessly at any size (4×6" to A0). Includes a "Your Photos" print sizer that grades user photography against 24 standard print sizes by effective DPI after crop and exports print-ready PNGs client-side.
- Monetization: POLAR.SH checkout gate on premium exports (roadmap).
- Entry: `products/printbank/public/index.html`
- Engine: `products/printbank/public/print-engine.js` (UMD; browser + Node `require`)
- Tests: `tests/printbank.test.js`

## Automation

### Pre-review commit gate
- Path: `.pre-commit-hooks/pre-review-gate.sh`
- Setup: `scripts/setup-pre-review.sh`
- Chains with the pre-existing wr/memory JSONL hook; reuses repo `.markdownlint.jsonc`.
