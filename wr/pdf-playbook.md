# WR PDF Playbook

> **PRIME DIRECTIVE:** $10k/month → $10M in 3 years. Every WR PDF should map to a revenue lever.

## Purpose

This playbook defines how Work Request (WR) PDFs are produced, batched, and distributed. It replaces the earlier Flextina stub documents, which have been removed from the repo.

## Phases & Revenue Mapping

| Phase | Target | Timeline | WR PDF Focus |
|-------|--------|----------|--------------|
| 1 | $10k/month | Month 1–6 | Polar.sh funding tiers, OSINT starter reports |
| 2 | $30k/month | Month 6–18 | Productized OSINT subscriptions, automated PDF delivery |
| 3 | $100k/month | Month 18–30 | Enterprise batch reports, white-label playbooks |
| 4 | $10M total | Month 30–36 | Platform-scale pipeline, multi-tenant PDF batching |

## PDF Generation Flow

1. Author WR in Markdown under `docs/wr/`.
2. Frontmatter declares `phase`, `revenue_lever`, and `batch_id`.
3. CI renders Markdown → PDF on merge to `main`.
4. Rendered PDFs are uploaded to the release artifact store and indexed for the batch dropdown UI.

## Batch Dropdown

The WR UI exposes a **Batch** dropdown so operators can:

- Select a batch (e.g., `2025-Q1-osint`) and download all PDFs as a ZIP.
- Filter by phase (1–4) to focus on the current revenue target.
- Trigger a re-render of a single batch without rebuilding the whole catalog.

Batches are defined in `docs/wr/batches.yml` (see that file for the current list).

## Authoring Checklist

- [ ] Frontmatter includes `phase`, `revenue_lever`, `batch_id`.
- [ ] Links to the Polar.sh tier or OSINT product it supports.
- [ ] No hardcoded secrets.
- [ ] Title follows conventional-commit style when referenced from PRs.

## Removed: Flextina Stubs

The `docs/wr/flextina-*.md` stub files were speculative scaffolding with no downstream consumers. They have been removed to reduce noise. If Flextina-specific WRs return, they should be authored fresh against this playbook.
