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
