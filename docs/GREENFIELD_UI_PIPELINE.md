# Greenfield UI Pipeline Architecture

This document defines the top-to-bottom standard for designing and building web products from scratch using agentic workflows.

## 6-Phase Execution Strategy

1. **Tokens Engine (`tokens.json`):** Single source of truth for semantic colors, spacing scales, and typography.
2. **Scaffolding:** Clean Next.js + Tailwind CSS setup using Cursor/Builder agent prompts.
3. **Hybrid Vibe-Code:** Broad layout generation via AI prompts coupled with visual editor fine-tuning.
4. **Componentization:** Extraction of atomic components under `/components/ui` with explicit TypeScript props.
5. **Self-Healing Loop:** Standardized commit message formatting for automatic regression fixes:
   `Self-Healing Fix/Learned Lesson: <details>`
6. **CI Audit Logging:** Execution tracking via `.github/workflows/ui-audit-logger.yml`.

## Token Validation Gate

`scripts/validate-design-tokens.js` is the hard gate for the token engine. It
runs in `ui-audit-logger.yml` on every push/PR to `main` and exits non-zero on
any violation (missing group, non-hex color, invalid px/rem dimension,
non-kebab-case token name) — a green run means the postcondition holds, not
just that the step executed. It needs no network access or API keys, so a CI
failure always reproduces locally:

```bash
node scripts/validate-design-tokens.js                  # validate root tokens.json
node scripts/validate-design-tokens.js --emit-css       # CSS custom properties
node scripts/validate-design-tokens.js --emit-tailwind  # Tailwind theme.extend fragment
node --test tests/validate-design-tokens.test.js        # regression suite
```

The `--emit-css` / `--emit-tailwind` outputs are the design-to-code handoff
artifacts: paste the CSS variables into a global stylesheet, or spread the
Tailwind fragment into a product's `tailwind.config.ts` `theme.extend`. The
same artifacts are published to the CI job summary on every run.

## End-to-End Checklist for Building Any Web Product

| Step | Task | Output Artifact |
| --- | --- | --- |
| 01 | Export design tokens | `tokens.json` (validated by the gate above) |
| 02 | Greenfield scaffold | Next.js App Router + Tailwind setup under `products/<name>/` |
| 03 | Rapid prototyping | Working localhost UI on the product's assigned port (see `AGENTS.md`) |
| 04 | Visual fine-tuning | Polished spacing, typography, and density using token values only |
| 05 | Component extraction | Clean `/components/ui` library with explicit TypeScript prop contracts |
| 06 | Revvel CI integration | `ui-audit-logger.yml` audit log, token telemetry, and self-healing tracking |
