# [WR] Finisher-1: Produce dist sellables

## Problem
Generators exist but the actual sellable artifacts (`products/dist/*`) are missing/gitignored.

## Outcome
Run builders (build_skills_vault.py, build_packs.py, etc.) to produce the actual PDFs and zip files.

## REVENUE_GATE
Immediate path to digital products inventory.

## Research Gate
Ensure fpdf2, reportlab, pyyaml, pillow are installed to run generators.

## Acceptance Criteria
- `products/dist/` contains the generated PDFs and zipped pack inventory.
- Files are committed or saved as CI artifacts.

## Dependencies
01-WR-Finisher-0-bootstrap-revvel-finishers.md

## Effort
Medium

## Next WR
03-WR-Finisher-2-gumroad-storefront.md
